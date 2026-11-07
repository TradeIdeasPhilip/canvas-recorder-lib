/**
 * Checks dev/soundtrack.ts:  the live soundtrack, one AudioBufferSourceNode per clip.
 *
 * Each test plays the soundtrack into an OfflineAudioContext instead of the speakers, and
 * compares what it rendered with the mixer that saved videos use (`Soundtrack.mix()`).
 * `OfflineAudioContext.suspend()` stops the render at a chosen moment, so a test can make an
 * edit, or change the speed, in the middle of playing, exactly when it wants to.
 *
 * The sound files are made here, as WAV blobs:  low tones, so being off by a fraction of a
 * sample barely registers, and being off by a millisecond is obvious.
 *
 * Results go in the page's table, and in `window.soundTestResults` for Playwright.
 * @module
 */

import { Showable, SoundClip } from "canvas-recorder-lib";
import { Soundtrack } from "canvas-recorder-lib/dev/soundtrack";

const SAMPLE_RATE = 48000;
const VIDEO_MS = 6000;

// MARK: Test files

/** A 16-bit PCM WAV file, as a blob URL.  One function per channel, of time in seconds. */
function makeWav(seconds: number, channels: ((t: number) => number)[]): string {
  const frames = Math.round(seconds * SAMPLE_RATE);
  const count = channels.length;
  const view = new DataView(new ArrayBuffer(44 + frames * count * 2));
  const text = (offset: number, s: string) =>
    [...s].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  text(0, "RIFF");
  view.setUint32(4, 36 + frames * count * 2, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, count, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * count * 2, true);
  view.setUint16(32, count * 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, frames * count * 2, true);
  let offset = 44;
  for (let i = 0; i < frames; i++) {
    for (const f of channels) {
      view.setInt16(offset, Math.round(f(i / SAMPLE_RATE) * 0x7fff), true);
      offset += 2;
    }
  }
  return URL.createObjectURL(new Blob([view.buffer], { type: "audio/wav" }));
}

const tone = (hz: number, amplitude: number) => (t: number) =>
  amplitude * Math.sin(2 * Math.PI * hz * t);
/** Mono, 3 s. */
const fileA = makeWav(3, [tone(110, 0.3)]);
/** Stereo, 2.5 s, with different channels, so the mix down to mono shows. */
const leftB = tone(165, 0.4);
const rightB = tone(220, 0.2);
const fileB = makeWav(2.5, [leftB, rightB]);

// MARK: The video

/**
 * A root with some clips, and a child 1 s in with some more.
 * Only what collectSoundClips() reads:  duration, soundClips and children.
 */
function makeVideo() {
  const childClips: SoundClip[] = [
    // B at 1.2 s in the video, from 0.3 s into the file, for 1.5 s.
    { source: fileB, startMsIntoScene: 200, startMsIntoClip: 300, lengthMs: 1500 },
  ];
  const child = { description: "child", duration: 4000, show() {}, soundClips: childClips };
  const rootClips: SoundClip[] = [
    // A at 0.5 s, all of it.
    { source: fileA, startMsIntoScene: 500 },
    // A starting 0.4 s before the video does:  the first 0.4 s is never heard.
    { source: fileA, startMsIntoScene: -400, startMsIntoClip: 100, lengthMs: 1000 },
    // A with 0.25 s of silence first, playing past the end of the video.
    { source: fileA, startMsIntoScene: 4000, startMsIntoClip: -250 },
  ];
  const root = {
    description: "root",
    duration: VIDEO_MS,
    show() {},
    soundClips: rootClips,
    children: [{ child, start: 1000 }],
  } as unknown as Showable;
  return { root, childClips, rootClips };
}

// MARK: Helpers

type Result = { name: string; pass: boolean; details: string };
const results: Result[] = [];
(window as any).soundTestResults = results;

function report(name: string, pass: boolean, details: string) {
  results.push({ name, pass, details });
  const row = (document.getElementById("results") as HTMLTableElement).insertRow();
  row.insertCell().textContent = name;
  const cell = row.insertCell();
  cell.textContent = pass ? "pass" : "FAIL";
  cell.className = pass ? "pass" : "fail";
  row.insertCell().textContent = details;
}

/** The largest difference between `a` and `b`, over samples `from` to `to`. */
function maxDiff(
  a: Float32Array,
  b: (i: number) => number,
  from = 0,
  to = a.length,
): { diff: number; at: number } {
  let diff = 0;
  let at = -1;
  for (let i = from; i < to; i++) {
    const d = Math.abs(a[i] - b(i));
    if (d > diff) {
      diff = d;
      at = i;
    }
  }
  return { diff, at };
}

/** `samples` at a fractional index, by linear interpolation.  0 outside. */
function sampleAt(samples: Float32Array, index: number): number {
  const i = Math.floor(index);
  if (i < 0 || i + 1 >= samples.length) return samples[i] ?? 0;
  const f = index - i;
  return samples[i] * (1 - f) + samples[i + 1] * f;
}

/** The loudest sample, so a test can't pass by comparing silence with silence. */
function peak(samples: Float32Array): number {
  let result = 0;
  for (const sample of samples) result = Math.max(result, Math.abs(sample));
  return result;
}

const describe = ({ diff, at }: { diff: number; at: number }) =>
  `max difference ${diff.toExponential(2)}` +
  (at >= 0 ? ` at ${((at / SAMPLE_RATE) * 1000).toFixed(2)} ms` : "");

/**
 * A soundtrack that plays into a fresh OfflineAudioContext, `seconds` long.
 * `nodesMade()` counts the source nodes it has made.
 */
async function offlineSoundtrack(root: Showable, seconds: number) {
  const context = new OfflineAudioContext({
    numberOfChannels: 1,
    length: Math.round(seconds * SAMPLE_RATE),
    sampleRate: SAMPLE_RATE,
  });
  let made = 0;
  const original = context.createBufferSource.bind(context);
  context.createBufferSource = () => {
    made++;
    return original();
  };
  const soundtrack = new Soundtrack({ context, destination: context.destination, root: () => root });
  soundtrack.request();
  await soundtrack.ready();
  return { context, soundtrack, nodesMade: () => made };
}

/**
 * The mix as the saved video's mixer should make it, worked out separately, one sample at a
 * time, from what each clip means.
 */
function expectedMix(soundtrack: Soundtrack, root: Showable, fromMs: number, toMs: number) {
  const out = new Float32Array(Math.ceil(((toMs - fromMs) / 1000) * SAMPLE_RATE));
  function walk(item: Showable, offset: number) {
    for (const clip of item.soundClips ?? []) {
      const file = soundtrack.getDecodedBuffer(clip.source)!.getChannelData(0);
      let start = offset + clip.startMsIntoScene;
      let trim = clip.startMsIntoClip ?? 0;
      let length = clip.lengthMs ?? Infinity;
      if (trim < 0) {
        start -= trim;
        length += trim;
        trim = 0;
      }
      const end = Math.min(start + length, start + (file.length / SAMPLE_RATE) * 1000 - trim, root.duration);
      for (let n = 0; n < out.length; n++) {
        const ms = fromMs + (n / SAMPLE_RATE) * 1000;
        if (ms >= Math.max(start, 0) && ms < end) {
          out[n] += file[Math.round(((trim + ms - start) / 1000) * SAMPLE_RATE)];
        }
      }
    }
    for (const { child, start } of item.children ?? []) walk(child, offset + start);
  }
  walk(root, 0);
  return out;
}

// MARK: Tests

async function decodingTest() {
  const { root } = makeVideo();
  const { soundtrack } = await offlineSoundtrack(root, 1);
  const a = soundtrack.getDecodedBuffer(fileA);
  const b = soundtrack.getDecodedBuffer(fileB);
  const mono = !!a && !!b && a.numberOfChannels === 1 && b.numberOfChannels === 1;
  report("ready() decodes every file", !!a && !!b, a && b ? "both decoded" : "missing a file");
  if (!b) return;
  // Within 16 bits of rounding.
  const average = maxDiff(b.getChannelData(0), (i) => (leftB(i / SAMPLE_RATE) + rightB(i / SAMPLE_RATE)) / 2);
  report("Stereo files become mono, by averaging", mono && average.diff < 1e-4, describe(average));
}

async function mixerTest() {
  const { root } = makeVideo();
  const { soundtrack } = await offlineSoundtrack(root, 1);
  for (const [from, to] of [
    [0, VIDEO_MS],
    [1700, 4300],
  ]) {
    const mixed = soundtrack.mix(from, to).getAudioBuffer().getChannelData(0);
    const expected = expectedMix(soundtrack, root, from, to);
    const result = maxDiff(mixed, (i) => expected[i]);
    report(`mix(${from}, ${to}) puts every clip in the right place`, result.diff < 1e-6, describe(result));
  }
}

async function playTest(fromMs: number) {
  const { root } = makeVideo();
  const seconds = (VIDEO_MS - fromMs) / 1000;
  const { context, soundtrack } = await offlineSoundtrack(root, seconds);
  soundtrack.play({ contextTime: 0, mediaMs: fromMs, rate: 1 });
  const rendered = (await context.startRendering()).getChannelData(0);
  const mixed = soundtrack.mix(fromMs, VIDEO_MS).getAudioBuffer().getChannelData(0);
  const result = maxDiff(rendered, (i) => mixed[i] ?? 0);
  report(
    `Playing from ${fromMs} ms sounds like the saved mix`,
    result.diff < 0.01 && peak(rendered) > 0.2,
    `${describe(result)}, peak ${peak(rendered).toFixed(2)}`,
  );
}

async function editTest() {
  const { root, childClips } = makeVideo();
  const { context, soundtrack, nodesMade } = await offlineSoundtrack(root, VIDEO_MS / 1000);
  const before = soundtrack.mix(0, VIDEO_MS).getAudioBuffer().getChannelData(0);
  soundtrack.play({ contextTime: 0, mediaMs: 0, rate: 1 });
  let nodesForEdit = 0;
  let editsMade = 0;
  // At 2 s, while B is playing, drag B 0.6 s later, one step per task, like a mouse.
  void context.suspend(2).then(async () => {
    const madeBefore = nodesMade();
    for (let step = 1; step <= 60; step++) {
      childClips[0].startMsIntoScene = 200 + step * 10;
      for (let i = 0; i < 20; i++) soundtrack.request();
      editsMade++;
      await new Promise((resolve) => setTimeout(resolve));
    }
    await soundtrack.ready();
    nodesForEdit = nodesMade() - madeBefore;
    void context.resume();
  });
  const rendered = (await context.startRendering()).getChannelData(0);
  const after = soundtrack.mix(0, VIDEO_MS).getAudioBuffer().getChannelData(0);
  // The change takes effect 30 ms after the request.
  const swap = Math.round(2.03 * SAMPLE_RATE);
  const early = maxDiff(rendered, (i) => before[i], 0, swap - 1);
  const late = maxDiff(rendered, (i) => after[i], swap + 1);
  report("An edit while playing:  the old mix until the swap", early.diff < 0.01, describe(early));
  // And the edit really changed what's heard.
  const changed = maxDiff(before, (i) => after[i], swap);
  report(
    "An edit while playing:  the new mix after it",
    late.diff < 0.01 && changed.diff > 0.2,
    `${describe(late)}; the edit changed the mix by up to ${changed.diff.toFixed(2)}`,
  );
  report(
    "An edit replaces only the clip that changed",
    nodesForEdit === editsMade,
    `${editsMade} edits to one clip made ${nodesForEdit} nodes; the other clips kept theirs`,
  );
}

async function nothingChangedTest() {
  const { root } = makeVideo();
  const { soundtrack, nodesMade } = await offlineSoundtrack(root, 1);
  soundtrack.play({ contextTime: 0, mediaMs: 0, rate: 1 });
  const made = nodesMade();
  const start = performance.now();
  for (let i = 0; i < 1000; i++) {
    soundtrack.request();
    await Promise.resolve();
  }
  const elapsed = performance.now() - start;
  report(
    "A request that changes no clip does nothing",
    nodesMade() === made,
    `1,000 requests:  ${nodesMade() - made} new nodes, ${elapsed.toFixed(1)} ms`,
  );
}

async function speedTest(name: string, startRate: number, change?: { atS: number; rate: number }) {
  const { root } = makeVideo();
  const seconds = 4;
  const { context, soundtrack } = await offlineSoundtrack(root, seconds);
  const startMs = 500;
  soundtrack.play({ contextTime: 0, mediaMs: startMs, rate: startRate });
  if (change) {
    void context.suspend(change.atS).then(() => {
      soundtrack.changeRate({
        contextTime: change.atS,
        mediaMs: startMs + change.atS * 1000 * startRate,
        rate: change.rate,
      });
      void context.resume();
    });
  }
  const rendered = (await context.startRendering()).getChannelData(0);
  const mixed = soundtrack.mix(0, VIDEO_MS).getAudioBuffer().getChannelData(0);
  /** Where the video is at render sample `i`, in mix samples. */
  const mediaSample = (i: number) => {
    const s = i / SAMPLE_RATE;
    const ms =
      change && s > change.atS
        ? startMs + change.atS * 1000 * startRate + (s - change.atS) * 1000 * change.rate
        : startMs + s * 1000 * startRate;
    return (ms / 1000) * SAMPLE_RATE;
  };
  const result = maxDiff(rendered, (i) => sampleAt(mixed, mediaSample(i)));
  report(
    name,
    result.diff < 0.02 && peak(rendered) > 0.2,
    `${describe(result)}, peak ${peak(rendered).toFixed(2)}`,
  );
}

async function main() {
  try {
    await decodingTest();
    await mixerTest();
    await playTest(0);
    await playTest(1300);
    await editTest();
    await nothingChangedTest();
    await speedTest("Playing at ½× stays in time", 0.5);
    await speedTest("Playing at 2× stays in time", 2);
    await speedTest("Changing from 1× to 2× while playing stays in time", 1, { atS: 1, rate: 2 });
  } catch (error) {
    report("The test itself", false, String(error));
    console.error(error);
  }
  (window as any).soundTestDone = true;
}
void main();
