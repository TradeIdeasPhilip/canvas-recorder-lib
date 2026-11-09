import { addLocalFile } from "../../src/local-files.ts";
import { SAMPLE_RATE } from "../soundtrack.ts";
import { chirpSamples, findSound } from "./chirp.ts";

/**
 * The voice recorder's engine:  the mic, the files, and the chirp.  No user interface; see
 * voice-panel.ts.  Nothing here knows about the player, except that it shares the player's
 * AudioContext.
 *
 * Sharing the AudioContext means sharing its clock, the one the video plays by.  An AudioWorklet
 * copies the mic's samples, and says exactly which frame of that clock each one belongs to.  So a
 * clip's place in the video is exact, with no clocks to match up.
 *
 * - A **session** runs from ● Record to the stop.  It starts with the chirp.
 * - A session holds one or more **clips**.  The player starts one whenever the video starts moving,
 *   and ends it whenever the video stops or jumps.  So a seek ends one clip and starts the next.
 * - Each clip is its own WAV file (32-bit float, mono, 48 kHz), written as it goes, and kept in memory
 *   too.  The file holds a little more than the clip at each end:  the chirp, or what came between
 *   two clips, at the start, and {@link TAIL_S} at the end.  The clip's trim hides the extra.
 *
 * Copied from riemann-surfaces-3d's src/recording/voice-recorder.ts (9bbe2f9), without the log or
 * the Stop and Marker sounds.  See development-plans/voice-recording.md.
 * @module
 */

/** The browser's voice processing.  Each one is a checkbox. */
export const PROCESSING = [
  {
    name: "echoCancellation",
    label: "Echo cancellation",
    help: "For calls.  Removes whatever your own speakers are playing.  It would erase the chirp.",
  },
  {
    name: "noiseSuppression",
    label: "Noise suppression",
    help: "Removes steady background noise, like fans and hum, and some clicks.",
  },
  {
    name: "autoGainControl",
    label: "Automatic gain control",
    help: "Turns the volume up and down to keep your voice level.  It turns background noise up during your pauses.",
  },
  {
    name: "voiceIsolation",
    label: "Voice isolation",
    help: "Only in newer browsers.  Tries to keep your voice and nothing else.",
  },
] as const;
export type ProcessingName = (typeof PROCESSING)[number]["name"];
export type ProcessingChoices = Partial<Record<ProcessingName, boolean>>;

/** Noise suppression on, the rest off.  From riemann's feedback:  "The helicopter is gone." */
export const DEFAULT_PROCESSING: ProcessingChoices = { noiseSuppression: true };

/** The parts of PROCESSING that this browser offers. */
export function supportedProcessing() {
  const supported = navigator.mediaDevices.getSupportedConstraints() as Record<
    string,
    boolean | undefined
  >;
  return PROCESSING.filter(({ name }) => supported[name]);
}

/** How far ahead to schedule the chirp, in seconds, so it's sure to land inside the recording. */
const CHIRP_LEAD_S = 0.25;
/**
 * How long after the chirp ends the video starts, in seconds.  The chirp reaches the mic about a
 * tenth of a second after it's played, and the clip starts after that.
 */
const AFTER_CHIRP_S = 0.15;
/** Look for the chirp from a little before it was played to this long after, in seconds. */
const SEARCH_AFTER_S = 0.3;
/** A match better than this means the chirp really was heard.  Noise scores about 0.03, speech up to about 0.08. */
const HEARD = 0.15;
/** How much more than the clip each file holds at the end, in seconds.  In case Pause cut off a word. */
const TAIL_S = 0.5;
/**
 * How long the mic and the OS take to deliver a sound, until the chirp measures it.
 * Measured on a MacBook Air:  a 106 ms round trip, less Chrome's 34 ms output.
 */
const DEFAULT_DELAY_MS = 72;
const DELAY_KEY = "voice-recorder.mic-delay-ms";

/**
 * The AudioWorklet.  It runs on the audio thread, and sends the mic's samples to the page in blocks of
 * 2048, with the clock frame of the first one, and the levels for the meter.  It's a string, so it
 * needs no build setup.
 */
const WORKLET = /* js */ `
class VoiceRecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.reset();
  }
  reset() {
    this.samples = new Float32Array(2048);
    this.filled = 0;
    this.peak = 0;
    this.squares = 0;
  }
  process(inputs) {
    const channels = inputs[0];
    const length = channels.length ? channels[0].length : 128;
    if (this.filled + length > this.samples.length) {
      this.send();
    }
    if (this.filled == 0) {
      this.first = currentFrame;
    }
    for (let i = 0; i < length; i++) {
      // Mono.  Average the channels if there's more than one.
      let v = 0;
      for (const channel of channels) {
        v += channel[i];
      }
      if (channels.length > 1) {
        v /= channels.length;
      }
      this.samples[this.filled + i] = v;
      this.peak = Math.max(this.peak, Math.abs(v));
      this.squares += v * v;
    }
    this.filled += length;
    if (this.filled == this.samples.length) {
      this.send();
    }
    return true;
  }
  send() {
    const samples = this.samples.subarray(0, this.filled);
    const rms = Math.sqrt(this.squares / Math.max(1, this.filled));
    this.port.postMessage({ first: this.first, samples, peak: this.peak, rms }, [this.samples.buffer]);
    this.reset();
  }
}
registerProcessor("voice-recorder", VoiceRecorderProcessor);
`;

/** addModule() for each context only once:  registering the processor twice is an error. */
const workletLoaded = new WeakMap<BaseAudioContext, Promise<void>>();

type Chunk = {
  first: number;
  samples: Float32Array;
  peak: number;
  rms: number;
};

export type HeardResult = {
  /** Undefined if the chirp wasn't found:  speakers off, or headphones. */
  roundTripMs?: number;
  match: number;
  peakDb: number;
};

/** A finished clip:  its file, and the part of the file that goes in the video. */
export type RecordedClip = {
  /** The file's `local:` URL. */
  readonly url: string;
  /** The whole file, mono, at {@link SAMPLE_RATE}.  For `Soundtrack.provide()`. */
  readonly buffer: AudioBuffer;
  /** Where in the file the clip starts, in ms. */
  readonly trimMs: number;
  /** How long the clip is, in ms. */
  readonly lengthMs: number;
};

/** The clip being recorded now, for the live waveform. */
export type LiveClip = {
  /** The file so far.  It's longer than the recording:  it grows by doubling. */
  readonly buffer: AudioBuffer;
  /** Where in `buffer` the clip starts, in ms. */
  readonly trimMs: number;
  /** How long the clip is so far, in ms. */
  readonly lengthMs: number;
};

/** One file, and the clip it holds. */
type ClipFile = {
  readonly folder: FileSystemDirectoryHandle;
  readonly name: string;
  /** The clock frame of the file's first sample. */
  readonly startFrame: number;
  /** Stop writing at this clock frame.  Undefined until the clip ends. */
  endFrame?: number;
  /** The samples so far.  Longer than {@link frames}:  it grows by doubling. */
  buffer: AudioBuffer;
  frames: number;
  readonly handle: Promise<FileSystemFileHandle>;
  /** Writes happen in order, one after another. */
  writing: Promise<FileSystemWritableFileStream>;
  /** In the clock's time, in seconds.  Undefined until the player starts the clip. */
  clipStart?: number;
  clipEnd?: number;
  readonly finished: Promise<RecordedClip>;
  readonly resolve: (clip: RecordedClip) => void;
  readonly reject: (reason: unknown) => void;
  done: boolean;
};

type Session = {
  readonly folder: FileSystemDirectoryHandle;
  /** The start of every file name, usually the video's name. */
  readonly prefix: string;
  /** The file for the clip being recorded, or the next one. */
  current?: ClipFile;
  /** Where the next file starts:  where the last clip ended. */
  nextStartFrame: number;
};

/** A file name made from the video's name and the time, like `my-video 2026-11-07 14-05-33.250.wav`. */
function fileName(prefix: string, now: Date): string {
  const pad = (n: number, width = 2) => String(n).padStart(width, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}.${pad(now.getMilliseconds(), 3)}`;
  // No colons or slashes:  Windows doesn't allow them, and the Finder shows a colon as a slash.
  const safe = prefix.replace(/[\\/:*?"<>|]/g, "-");
  return `${safe} ${date} ${time}.wav`;
}

export class VoiceRecorder {
  readonly context: AudioContext;
  readonly #node: AudioWorkletNode;
  #source?: MediaStreamAudioSourceNode;
  #stream?: MediaStream;
  #choices: ProcessingChoices;
  #session?: Session;
  /** Every file still receiving samples:  the current one, and any finishing their tails. */
  readonly #files = new Set<ClipFile>();
  /** The chirp, while we wait to find it. */
  #listening?: { file: ClipFile; samples: Float32Array };
  /** How long the mic and the OS take to deliver a sound, in ms.  Measured by the chirp. */
  micDelayMs: number;
  /** Called for each block of audio, about 23 times a second, with levels from 0 to 1. */
  onLevel?: (peak: number, rms: number) => void;
  /** Called when the chirp is found in the recording, or isn't. */
  onHeard?: (result: HeardResult) => void;

  private constructor(
    context: AudioContext,
    node: AudioWorkletNode,
    choices: ProcessingChoices,
  ) {
    this.context = context;
    this.#node = node;
    this.#choices = choices;
    const saved = Number(localStorage.getItem(DELAY_KEY));
    this.micDelayMs = saved > 0 ? saved : DEFAULT_DELAY_MS;
    node.port.onmessage = (event: MessageEvent<Chunk>) =>
      this.#receive(event.data);
  }

  /**
   * Turn on the mic.  Call this from a click, so the browser lets the audio start.
   * The browser asks for permission to use the mic the first time.
   */
  static async open(
    context: AudioContext,
    choices: ProcessingChoices,
  ): Promise<VoiceRecorder> {
    await workletLoaded.getOrInsertComputed(context, async () => {
      const url = URL.createObjectURL(
        new Blob([WORKLET], { type: "text/javascript" }),
      );
      try {
        await context.audioWorklet.addModule(url);
      } finally {
        URL.revokeObjectURL(url);
      }
    });
    const node = new AudioWorkletNode(context, "voice-recorder");
    // An audio node only runs if it leads to the speakers.  The worklet never writes anything to its
    // output, so this is silent.
    node.connect(context.destination);
    const recorder = new VoiceRecorder(context, node, choices);
    try {
      await recorder.#connectMic();
    } catch (error) {
      node.disconnect();
      throw error;
    }
    await context.resume();
    return recorder;
  }

  #constraints(): MediaTrackConstraints {
    const result: Record<string, unknown> = { channelCount: { ideal: 1 } };
    for (const { name } of supportedProcessing()) {
      result[name] = this.#choices[name] ?? false;
    }
    return result as MediaTrackConstraints;
  }

  async #connectMic() {
    this.#stream = await navigator.mediaDevices.getUserMedia({
      audio: this.#constraints(),
    });
    this.#source = new MediaStreamAudioSourceNode(this.context, {
      mediaStream: this.#stream,
    });
    this.#source.connect(this.#node);
  }

  get #track() {
    return this.#stream?.getAudioTracks()[0];
  }

  /** What the mic actually got.  The browser can quietly ignore a request. */
  actualSettings(): Record<string, unknown> {
    return (this.#track?.getSettings() ?? {}) as Record<string, unknown>;
  }

  /** The mic's name, like "MacBook Pro Microphone". */
  get micName(): string {
    return this.#track?.label ?? "";
  }

  /**
   * Turn one kind of voice processing on or off.  Works in the middle of a recording.  First try
   * changing the mic that's already open.  If the browser won't, open the mic again.  The recording
   * keeps going, on the same clock, with maybe a moment of silence.
   */
  async setProcessing(name: ProcessingName, on: boolean): Promise<void> {
    this.#choices = { ...this.#choices, [name]: on };
    try {
      await this.#track?.applyConstraints(this.#constraints());
    } catch {
      // Handled below.
    }
    if (this.actualSettings()[name] !== on) {
      const old = this.#source;
      this.#stream?.getTracks().forEach((track) => track.stop());
      old?.disconnect();
      await this.#connectMic();
    }
  }

  // MARK: Sessions and clips

  /** True from {@link start} to {@link stop}. */
  get recording(): boolean {
    return this.#session !== undefined;
  }

  /**
   * Start a session:  play the chirp, and start recording.
   * Resolves a moment after the chirp, when the video should start.
   *
   * @param prefix The start of each file's name, usually the video's name.
   */
  async start(
    folder: FileSystemDirectoryHandle,
    prefix: string,
  ): Promise<void> {
    if (this.#session) return;
    await this.context.resume();
    const chirp = chirpSamples(SAMPLE_RATE);
    const when = this.context.currentTime + CHIRP_LEAD_S;
    const chirpFrame = Math.round(when * SAMPLE_RATE);
    const session: Session = { folder, prefix, nextStartFrame: chirpFrame };
    this.#session = session;
    // The first file starts with the chirp.
    const file = this.#openFile(session, chirpFrame);
    session.current = file;
    this.#listening = { file, samples: chirp };
    // Straight to the speakers, so the player's mute doesn't silence it.
    const buffer = new AudioBuffer({
      numberOfChannels: 1,
      length: chirp.length,
      sampleRate: SAMPLE_RATE,
    });
    buffer.copyToChannel(chirp, 0);
    const node = new AudioBufferSourceNode(this.context, { buffer });
    node.connect(this.context.destination);
    node.onended = () => node.disconnect();
    node.start(when);
    const videoStarts = when + buffer.duration + AFTER_CHIRP_S;
    await new Promise((resolve) =>
      setTimeout(
        resolve,
        Math.max(0, videoStarts - this.context.currentTime) * 1000,
      ),
    );
  }

  /**
   * The video started moving at `contextTime`, on the AudioContext's clock.
   * Resolves when the clip's file is finished and on the `local:` list:  {@link TAIL_S} after
   * {@link endClip}.  Does nothing (and never resolves) outside a session.
   */
  beginClip(contextTime: number): Promise<RecordedClip> {
    const session = this.#session;
    if (!session) return new Promise(() => {});
    if (session.current?.clipStart !== undefined) this.endClip(contextTime);
    session.current ??= this.#openFile(session, session.nextStartFrame);
    session.current.clipStart = contextTime;
    return session.current.finished;
  }

  /** The video stopped or jumped at `contextTime`.  Does nothing if no clip is being recorded. */
  endClip(contextTime: number): void {
    const session = this.#session;
    const file = session?.current;
    if (!session || file?.clipStart === undefined) return;
    file.clipEnd = Math.max(file.clipStart, contextTime);
    file.endFrame = Math.round(
      (file.clipEnd + this.micDelayMs / 1000 + TAIL_S) * SAMPLE_RATE,
    );
    session.current = undefined;
    session.nextStartFrame = Math.round(file.clipEnd * SAMPLE_RATE);
  }

  /** The clip being recorded now, if there is one. */
  liveClip(): LiveClip | undefined {
    const file = this.#session?.current;
    if (file?.clipStart === undefined) return undefined;
    const trimMs = this.#trimMs(file);
    return {
      buffer: file.buffer,
      trimMs,
      lengthMs: Math.max(0, (file.frames / SAMPLE_RATE) * 1000 - trimMs),
    };
  }

  /** End the session.  Any clip ends now; its file finishes {@link TAIL_S} later. */
  stop(): void {
    const session = this.#session;
    if (!session) return;
    this.endClip(this.context.currentTime);
    // A file with no clip yet:  ■ Stop during the chirp.
    if (session.current) void this.#finish(session.current);
    this.#session = undefined;
  }

  /**
   * Finish every file now, without waiting for the tails.  For a page that's closing.
   * Each write still has to reach the disk, so this may not finish in time.
   */
  flush(): void {
    this.stop();
    for (const file of this.#files) void this.#finish(file);
  }

  /** Turn off the mic.  Stops recording first, and waits a little for the files to finish. */
  async close(): Promise<void> {
    this.stop();
    const files = [...this.#files];
    // The tails need the mic.  Wait for them, but not forever.
    await Promise.race([
      Promise.allSettled(files.map((file) => file.finished)),
      new Promise((resolve) => setTimeout(resolve, (TAIL_S + 1) * 1000)),
    ]);
    for (const file of files) void this.#finish(file);
    this.#stream?.getTracks().forEach((track) => track.stop());
    this.#source?.disconnect();
    this.#node.disconnect();
  }

  // MARK: Files

  #openFile(session: Session, startFrame: number): ClipFile {
    const name = fileName(session.prefix, new Date());
    const handle = session.folder.getFileHandle(name, { create: true });
    let resolve!: (clip: RecordedClip) => void;
    let reject!: (reason: unknown) => void;
    const finished = new Promise<RecordedClip>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    // The player may never use this file (■ Stop during the chirp), and then nobody listens.
    finished.catch(() => {});
    const file: ClipFile = {
      folder: session.folder,
      name,
      startFrame,
      buffer: new AudioBuffer({
        numberOfChannels: 1,
        length: 10 * SAMPLE_RATE,
        sampleRate: SAMPLE_RATE,
      }),
      frames: 0,
      handle,
      writing: handle
        .then((handle) => handle.createWritable())
        .then(async (stream) => {
          await stream.write(wavHeader(0));
          return stream;
        }),
      finished,
      resolve,
      reject,
      done: false,
    };
    // A failed write is reported once, by #finish().
    file.writing.catch(() => {});
    this.#files.add(file);
    return file;
  }

  /** Where in the file the clip starts, in ms, corrected for the mic's delay. */
  #trimMs(file: ClipFile): number {
    const fileStart = file.startFrame / SAMPLE_RATE;
    return ((file.clipStart ?? fileStart) - fileStart) * 1000 + this.micDelayMs;
  }

  /** A block of audio from the worklet. */
  #receive(chunk: Chunk) {
    this.onLevel?.(chunk.peak, chunk.rms);
    for (const file of this.#files) {
      const from = Math.max(0, file.startFrame - chunk.first);
      const to = Math.min(
        chunk.samples.length,
        (file.endFrame ?? Infinity) - chunk.first,
      );
      if (to > from) this.#append(file, chunk.samples.subarray(from, to));
      if (
        file.endFrame !== undefined &&
        chunk.first + chunk.samples.length >= file.endFrame
      ) {
        void this.#finish(file);
      }
    }
    this.#lookForChirp();
  }

  #append(file: ClipFile, samples: Float32Array) {
    const needed = file.frames + samples.length;
    if (needed > file.buffer.length) {
      const bigger = new AudioBuffer({
        numberOfChannels: 1,
        length: Math.max(needed, file.buffer.length * 2),
        sampleRate: SAMPLE_RATE,
      });
      bigger
        .getChannelData(0)
        .set(file.buffer.getChannelData(0).subarray(0, file.frames));
      file.buffer = bigger;
    }
    file.buffer.getChannelData(0).set(samples, file.frames);
    file.frames = needed;
    const data = samples.slice();
    file.writing = file.writing.then(async (stream) => {
      await stream.write(data);
      return stream;
    });
    file.writing.catch(() => {});
  }

  /** Once enough has arrived, find the chirp, and measure the mic's delay with it. */
  #lookForChirp() {
    const listening = this.#listening;
    if (!listening) return;
    const { file, samples } = listening;
    // The file starts when the chirp was played, so a sound that took no time at all would be at 0.
    if (
      !file.done &&
      file.frames < samples.length + SEARCH_AFTER_S * SAMPLE_RATE
    )
      return;
    this.#listening = undefined;
    const recording = file.buffer.getChannelData(0).subarray(0, file.frames);
    const found = findSound(
      recording,
      samples,
      0,
      SEARCH_AFTER_S * SAMPLE_RATE,
    );
    const heard = found.match > HEARD;
    const result: HeardResult = {
      roundTripMs: heard ? (found.position / SAMPLE_RATE) * 1000 : undefined,
      match: found.match,
      peakDb: found.peakDb,
    };
    if (result.roundTripMs !== undefined) {
      const delayMs = result.roundTripMs - this.context.outputLatency * 1000;
      if (delayMs > 0 && delayMs < 500) {
        this.micDelayMs = delayMs;
        localStorage.setItem(DELAY_KEY, String(delayMs));
      }
    }
    this.onHeard?.(result);
  }

  /** Close the file, and put it on the `local:` list.  Safe to call more than once. */
  async #finish(file: ClipFile): Promise<void> {
    if (file.done) return;
    file.done = true;
    this.#files.delete(file);
    // A file that's finished early, like a closing page's, may still hold the chirp's search.
    this.#lookForChirp();
    const frames = file.frames;
    try {
      const stream = await file.writing;
      await stream.write({
        type: "write",
        position: 0,
        data: wavHeader(frames),
      });
      await stream.close();
      const handle = await file.handle;
      if (file.clipStart === undefined) {
        // ■ Stop during the chirp:  there's no clip.
        await file.folder.removeEntry(file.name).catch(() => {});
        file.reject(new Error("No clip"));
        return;
      }
      const buffer = new AudioBuffer({
        numberOfChannels: 1,
        length: Math.max(1, frames),
        sampleRate: SAMPLE_RATE,
      });
      buffer.copyToChannel(
        file.buffer.getChannelData(0).subarray(0, frames),
        0,
      );
      const trimMs = this.#trimMs(file);
      const lengthMs =
        ((file.clipEnd ?? file.clipStart) - file.clipStart) * 1000;
      file.resolve({
        url: await addLocalFile(handle),
        buffer,
        trimMs,
        lengthMs,
      });
    } catch (error) {
      file.reject(error);
    }
  }
}

/**
 * The header for a 32-bit float, mono WAV file with this many samples.  58 bytes.  It's written as a
 * placeholder first, and again with the real length when the file is finished.
 */
function wavHeader(frames: number) {
  const dataBytes = frames * 4;
  const header = new DataView(new ArrayBuffer(58));
  const text = (at: number, value: string) =>
    [...value].forEach((c, i) => header.setUint8(at + i, c.charCodeAt(0)));
  text(0, "RIFF");
  header.setUint32(4, 50 + dataBytes, true);
  text(8, "WAVE");
  text(12, "fmt ");
  header.setUint32(16, 18, true);
  // 3 is IEEE float.
  header.setUint16(20, 3, true);
  header.setUint16(22, 1, true);
  header.setUint32(24, SAMPLE_RATE, true);
  header.setUint32(28, SAMPLE_RATE * 4, true);
  header.setUint16(32, 4, true);
  header.setUint16(34, 32, true);
  header.setUint16(36, 0, true);
  text(38, "fact");
  header.setUint32(42, 4, true);
  header.setUint32(46, frames, true);
  text(50, "data");
  header.setUint32(54, dataBytes, true);
  return header.buffer;
}
