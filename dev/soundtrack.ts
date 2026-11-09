/**
 * The video's sound, live:  every sound clip in the tree, each played by its own
 * `AudioBufferSourceNode`, mixed by the browser.
 *
 * - **Decoded files are kept** for the life of the page, mixed down to mono.
 *   An edit never fetches or decodes a file again.
 * - **An edit only touches the clips it changed.**  {@link Soundtrack.request} is
 *   cheap enough to call on every mouse move:  when no clip moved, it does nothing,
 *   and otherwise it replaces only the nodes whose clips changed.  Everything else
 *   keeps playing, sample for sample.
 * - **A file that isn't decoded yet doesn't hold anything up.**  Its clips join in
 *   when it's ready.
 * - **The saved video gets one mixed buffer,** from {@link Soundtrack.mix}, after
 *   {@link Soundtrack.ready}.
 *
 * The clock belongs to the player.  It says where the video is with an
 * {@link Anchor}, and this follows.
 *
 * See development-plans/live-sound-mixing.md.
 * @module
 */

import { debugLog } from "../src/debug-log.ts";
import { fetchMedia } from "../src/local-files.ts";
import { Showable } from "../src/showable.ts";
import { AudioBuilder } from "./audio-builder.ts";

/**
 * Every file is decoded at this rate, and the saved video's sound uses it too.
 * So do the player's AudioContext and the voice recorder.
 */
export const SAMPLE_RATE = 48000;

/**
 * How far ahead a change while playing takes effect, in seconds.
 * The old node stops and the new one starts at the same moment, so both requests
 * must reach the audio thread before that moment comes.
 */
const SWAP_AHEAD_S = 0.03;

/** One sound clip, in the video's time. */
export type PlacedSoundClip = {
  readonly source: string;
  /** When the clip starts, in ms from the start of the video.  Can be negative. */
  readonly startMs: number;
  /** Where in the file to start, in ms.  Negative means silence first. */
  readonly trimMs: number;
  /** How much to play.  Infinity plays to the end of the file. */
  readonly lengthMs: number;
};

/**
 * Every sound clip in the tree, in the video's time.  Read only.
 *
 * A clip with no source yet is left out:  a brand new clip, or a URL that's still
 * being typed.
 */
export function collectSoundClips(root: Showable): PlacedSoundClip[] {
  const result: PlacedSoundClip[] = [];
  function walk(item: Showable, offset: number) {
    for (const clip of item.soundClips ?? []) {
      if (clip.source === "") continue;
      result.push({
        source: clip.source,
        startMs: offset + clip.startMsIntoScene,
        trimMs: clip.startMsIntoClip ?? 0,
        lengthMs: clip.lengthMs ?? Infinity,
      });
    }
    for (const { child, start } of item.children ?? []) {
      walk(child, offset + start);
    }
  }
  walk(root, 0);
  return result;
}

/**
 * Where the video is:  at `contextTime`, in the audio context's clock, the video
 * is at `mediaMs`, moving at `rate`.
 */
export type Anchor = {
  readonly contextTime: number;
  readonly mediaMs: number;
  readonly rate: number;
};

type PlayingNode = {
  readonly node: AudioBufferSourceNode;
  /** Which clip this plays.  See {@link Soundtrack.#keyOf}. */
  readonly key: string;
  /** The {@link Soundtrack.#anchorVersion} it was scheduled for. */
  readonly anchorVersion: number;
};

export type SoundtrackOptions = {
  /** Where the clips play.  An `OfflineAudioContext` works too, for testing. */
  readonly context: BaseAudioContext;
  /** Usually a gain node, for the volume and mute controls. */
  readonly destination: AudioNode;
  /** The whole video.  Read on every {@link Soundtrack.request}. */
  readonly root: () => Showable;
  /** A file finished decoding:  its waveform and length are known now. */
  readonly onDecoded?: () => void;
  /** A file couldn't be read or decoded.  See {@link Soundtrack.failure}. */
  readonly onFailed?: () => void;
  /** A clip names a file that wasn't in the list before. */
  readonly onNewSource?: () => void;
};

export class Soundtrack {
  readonly #options: SoundtrackOptions;

  constructor(options: SoundtrackOptions) {
    this.#options = options;
  }

  // MARK: Decoded files

  /** Decodes, and resamples to {@link SAMPLE_RATE}.  It never renders anything. */
  readonly #decoder = new OfflineAudioContext({
    length: 1,
    sampleRate: SAMPLE_RATE,
  });
  readonly #decoding = new Map<string, Promise<AudioBuffer>>();
  readonly #decoded = new Map<string, AudioBuffer>();
  /** Files that couldn't be read, and why.  Not tried again until {@link forgetFailures}. */
  readonly #failed = new Map<string, unknown>();

  /**
   * The decoded file, mono, or null if it hasn't been decoded yet (or can't be).
   * Its length is the file's length.
   */
  getDecodedBuffer(url: string): AudioBuffer | null {
    return this.#decoded.get(url) ?? null;
  }

  /** Why the file couldn't be read or decoded, or undefined if it hasn't failed (yet). */
  failure(url: string): unknown {
    return this.#failed.get(url);
  }

  /**
   * Every file the clips name that couldn't be read or decoded, and why.
   * Call {@link ready} first, or the files still loading aren't known yet.
   */
  failures(): { url: string; reason: unknown }[] {
    if (this.#requested) this.#update();
    const urls = new Set(this.#clips.map(({ source }) => source));
    return [...urls]
      .filter((url) => this.#failed.has(url))
      .map((url) => ({ url, reason: this.#failed.get(url) }));
  }

  /** Read and decode every file again, e.g. one re-recorded under the same name. */
  forget(): void {
    this.#decoding.clear();
    this.#decoded.clear();
    this.#failed.clear();
    this.#knownSources.clear();
    this.#loadAgain();
  }

  /**
   * Use `buffer` as the decoded file for `url`, instead of reading the file.
   * For a file this page just wrote, like a voice recording, whose samples are
   * already in memory.  It must be mono, at {@link SAMPLE_RATE}, and exactly as
   * long as the file.
   */
  provide(url: string, buffer: AudioBuffer): void {
    this.#decoding.set(url, Promise.resolve(buffer));
    this.#decoded.set(url, buffer);
    this.#failed.delete(url);
    this.#options.onDecoded?.();
    if (this.#anchor) this.#resync();
  }

  /** Try the files that couldn't be read again, e.g. after 🔓 Allow local files. */
  forgetFailures(): void {
    for (const url of this.#failed.keys()) this.#decoding.delete(url);
    this.#failed.clear();
    this.#loadAgain();
  }

  /** Load every clip's file that isn't loaded or loading.  {@link request} skips that when no clip moved. */
  #loadAgain(): void {
    this.#clipsJson = "";
    this.request();
  }

  #load(url: string): Promise<AudioBuffer> {
    return this.#decoding.getOrInsertComputed(url, () => {
      const promise = this.#decode(url).then(
        (buffer) => {
          // forget() may have come in the meantime.
          if (this.#decoding.get(url) === promise) {
            this.#decoded.set(url, buffer);
            this.#options.onDecoded?.();
            if (this.#anchor) this.#resync();
          }
          return buffer;
        },
        (reason) => {
          if (this.#decoding.get(url) === promise) {
            this.#failed.set(url, reason);
            this.#options.onFailed?.();
          }
          debugLog("audio", `Skipped "${url}": ${reason}`);
          throw reason;
        },
      );
      // ready() looks at failures with allSettled().  This is for everyone else.
      promise.catch(() => {});
      return promise;
    });
  }

  async #decode(url: string): Promise<AudioBuffer> {
    const time1 = performance.now();
    const response = await fetchMedia(url);
    // Or the error page would be decoded, and fail with a message that doesn't say why.
    if (!response.ok)
      throw new Error(`${response.status} ${response.statusText}`);
    const encoded = await response.arrayBuffer();
    // Before decoding:  decodeAudioData() detaches the buffer, so it reads as 0 bytes after.
    const bytes = encoded.byteLength;
    const time2 = performance.now();
    // decodeAudioData() takes about ⅜ - ¾ of a second to decode 4 minutes and 18 seconds of audio.
    const decoded = await this.#decoder.decodeAudioData(encoded);
    const time3 = performance.now();
    debugLog(
      "audio",
      `Decoded "${url}":  ${(bytes / 1024).toFixed(0)} KB, ` +
        `read ${(time2 - time1).toFixed(0)} ms, decode ${(time3 - time2).toFixed(0)} ms`,
    );
    if (decoded.numberOfChannels === 1) return decoded;
    // Average the channels, don't sum them:  identical channels (the usual
    // "stereo") come out exactly as they went in, where a sum would double
    // the level and clip.
    const mono = new AudioBuffer({
      numberOfChannels: 1,
      length: decoded.length,
      sampleRate: decoded.sampleRate,
    });
    const out = mono.getChannelData(0);
    for (let channel = 0; channel < decoded.numberOfChannels; channel++) {
      const data = decoded.getChannelData(channel);
      for (let i = 0; i < out.length; i++) out[i] += data[i];
    }
    const scale = 1 / decoded.numberOfChannels;
    for (let i = 0; i < out.length; i++) out[i] *= scale;
    return mono;
  }

  // MARK: The clip list

  #clips: readonly PlacedSoundClip[] = [];
  /** {@link #clips} and the video's length, as JSON:  how a request knows nothing changed. */
  #clipsJson = "";
  #requested = false;
  /** Every source a clip has named, so {@link SoundtrackOptions.onNewSource} only fires for new ones. */
  readonly #knownSources = new Set<string>();

  /**
   * Something may have changed:  a clip, a component's timing, the tree.
   *
   * Call it as often as you like, even several times per mouse move.  Calls in the
   * same task are combined into one, and that one does almost nothing unless a clip
   * moved.  Nothing here allocates anything the size of the video.
   */
  request(): void {
    if (this.#requested) return;
    this.#requested = true;
    queueMicrotask(() => this.#update());
  }

  #update(): void {
    this.#requested = false;
    const root = this.#options.root();
    const clips = collectSoundClips(root);
    const json = JSON.stringify([root.duration, clips]);
    if (json === this.#clipsJson) return;
    this.#clipsJson = json;
    this.#clips = clips;
    let newSource = false;
    for (const { source } of clips) {
      if (!this.#knownSources.has(source)) {
        this.#knownSources.add(source);
        newSource = true;
      }
      void this.#load(source).catch(() => {});
    }
    if (newSource) this.#options.onNewSource?.();
    if (this.#anchor) this.#resync();
  }

  /**
   * Resolves when every file the newest clip list names has been decoded, or has
   * failed.  The newest:  if the list changes while this waits, it waits for that
   * one too.
   */
  async ready(): Promise<void> {
    for (;;) {
      if (this.#requested) this.#update();
      const json = this.#clipsJson;
      await Promise.allSettled(
        this.#clips.map(({ source }) => this.#load(source)),
      );
      if (!this.#requested && json === this.#clipsJson) return;
    }
  }

  /**
   * The soundtrack from `fromMs` to `toMs`, mixed into one mono buffer, for saving.
   * Call {@link ready} first, or clips whose file isn't decoded yet are left out.
   */
  mix(fromMs: number, toMs: number): AudioBuilder {
    if (this.#requested) this.#update();
    const builder = new AudioBuilder(Math.max(0, toMs - fromMs), SAMPLE_RATE);
    for (const clip of this.#clips) {
      const buffer = this.#decoded.get(clip.source);
      if (buffer) {
        builder.add(buffer, clip.startMs - fromMs, clip.trimMs, clip.lengthMs);
      }
    }
    return builder;
  }

  // MARK: Playing

  /** Undefined when stopped. */
  #anchor: Anchor | undefined;
  /**
   * Changes whenever the anchor moves (a seek, a new speed).  A node scheduled for an
   * older anchor plays at the wrong times, so it has to be replaced.
   */
  #anchorVersion = 0;
  #nodes: PlayingNode[] = [];

  /** Start playing at `anchor`, from scratch. */
  play(anchor: Anchor): void {
    this.stop();
    this.#anchor = anchor;
    this.#anchorVersion++;
    for (const clip of this.#clips) {
      this.#schedule(clip, anchor.mediaMs);
    }
  }

  /**
   * Keep playing, at a new speed.  `anchor` must agree with the old one about where
   * the video is now, so nothing jumps.
   */
  changeRate(anchor: Anchor): void {
    if (!this.#anchor) return;
    // The nodes already playing are right again at once.  The ones waiting to start
    // were timed for the old speed, so all of them are replaced, a moment from now.
    for (const { node } of this.#nodes) node.playbackRate.value = anchor.rate;
    this.#anchor = anchor;
    this.#anchorVersion++;
    this.#resync();
  }

  /** Stop at once. */
  stop(): void {
    for (const { node } of this.#nodes) {
      try {
        node.stop();
      } catch {
        // Already stopped.
      }
      node.disconnect();
    }
    this.#nodes = [];
    this.#anchor = undefined;
  }

  /** The video's time at `contextTime`, by the current anchor. */
  #mediaMsAt(contextTime: number): number {
    const anchor = this.#anchor!;
    return (
      anchor.mediaMs + (contextTime - anchor.contextTime) * anchor.rate * 1000
    );
  }

  /**
   * Identifies one clip at one place:  equal keys play exactly the same sound at the
   * same time, so a node can be kept.
   */
  #keyOf(clip: PlacedSoundClip): string {
    return JSON.stringify([
      clip.source,
      clip.startMs,
      clip.trimMs,
      clip.lengthMs,
    ]);
  }

  /**
   * Bring the nodes up to date with {@link #clips}, while playing.
   * A node whose clip is unchanged keeps playing.  Every other node stops, and its
   * replacement starts, at the same moment, {@link SWAP_AHEAD_S} from now.
   */
  #resync(): void {
    const swapTime = this.#options.context.currentTime + SWAP_AHEAD_S;
    const fromMs = this.#mediaMsAt(swapTime);
    /** Clips with no node yet, by key.  An array, in case two clips are identical. */
    const unplayed = new Map<string, PlacedSoundClip[]>();
    for (const clip of this.#clips) {
      unplayed.getOrInsertComputed(this.#keyOf(clip), () => []).push(clip);
    }
    const kept: PlayingNode[] = [];
    for (const playing of this.#nodes) {
      const waiting = unplayed.get(playing.key);
      if (playing.anchorVersion === this.#anchorVersion && waiting?.length) {
        waiting.pop();
        kept.push(playing);
      } else {
        try {
          playing.node.stop(swapTime);
        } catch {
          // Already stopped.
        }
        playing.node.onended = () => playing.node.disconnect();
      }
    }
    this.#nodes = kept;
    for (const clips of unplayed.values()) {
      for (const clip of clips) this.#schedule(clip, fromMs);
    }
  }

  /**
   * Start a node for the part of `clip` from `fromMs` on, in the video's time, if
   * its file is decoded and there's anything left to play.
   */
  #schedule(clip: PlacedSoundClip, fromMs: number): void {
    const buffer = this.#decoded.get(clip.source);
    const anchor = this.#anchor;
    if (!buffer || !anchor) return;
    let { startMs, trimMs, lengthMs } = clip;
    if (trimMs < 0) {
      // Nothing to play before the file starts:  start later instead.
      startMs -= trimMs;
      lengthMs += trimMs;
      trimMs = 0;
    }
    const endMs = Math.min(
      startMs + lengthMs,
      startMs + buffer.duration * 1000 - trimMs,
      this.#options.root().duration,
    );
    // Nothing before the video starts, either, and nothing already played.
    const beginMs = Math.max(startMs, fromMs, 0);
    if (endMs - beginMs < 0.001) return;
    const node = this.#options.context.createBufferSource();
    node.buffer = buffer; // Shared, not copied.
    node.playbackRate.value = anchor.rate;
    node.connect(this.#options.destination);
    // Only `when` depends on the speed.  The offset and the duration are in the
    // file's own time.
    node.start(
      anchor.contextTime + (beginMs - anchor.mediaMs) / 1000 / anchor.rate,
      (trimMs + beginMs - startMs) / 1000,
      (endMs - beginMs) / 1000,
    );
    this.#nodes.push({
      node,
      key: this.#keyOf(clip),
      anchorVersion: this.#anchorVersion,
    });
  }
}
