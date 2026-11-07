/**
 * The chirp that starts a voice recording, and the code that finds it in the recording.
 *
 * The chirp is a sweep:  a tone that slides smoothly from one pitch to another.  Lining a sweep up
 * with its recording only works at one exact position, so it can be found to a small fraction of a
 * millisecond, even with a train going by.  A plain beep's start is fuzzy.
 *
 * Copied from riemann-surfaces-3d's src/recording/calibration-sounds.ts (9bbe2f9), with only the
 * Start sound, and quieter.  See development-plans/voice-recording.md.
 * @module
 */

/** One sweep, from one frequency to another, in Hz. */
type Sweep = { from: number; to: number; seconds: number };

/** Riemann's Start sound:  a rising sweep. */
const CHIRP: Sweep = { from: 400, to: 4000, seconds: 0.2 };

/**
 * About −28 dBFS.  Riemann's was 0.3, about −10 dBFS, and it reached a MacBook Air's mic at almost 5
 * times full scale.  It was found easily (matches 0.37–0.75), so 17 dB quieter should still work.
 */
const AMPLITUDE = 0.04;
/** Fade in and out over this long, so there are no clicks. */
const FADE_SECONDS = 0.006;

/** The chirp's samples, at this sample rate. */
export function chirpSamples(sampleRate: number): Float32Array<ArrayBuffer> {
  return sweepSamples(CHIRP, sampleRate);
}

/** An exponential sweep:  every octave gets the same amount of time, so it sounds even. */
function sweepSamples({ from, to, seconds }: Sweep, sampleRate: number) {
  const count = Math.round(seconds * sampleRate);
  const samples = new Float32Array(count);
  const k = Math.log(to / from);
  for (let i = 0; i < count; i++) {
    const t = i / sampleRate;
    const phase = (2 * Math.PI * from * seconds * (Math.exp((t * k) / seconds) - 1)) / k;
    samples[i] = AMPLITUDE * Math.sin(phase);
  }
  const fade = Math.min(count / 2, Math.round(FADE_SECONDS * sampleRate));
  for (let i = 0; i < fade; i++) {
    const gain = 0.5 - 0.5 * Math.cos((Math.PI * i) / fade);
    samples[i] *= gain;
    samples[count - 1 - i] *= gain;
  }
  return samples;
}

export type Found = {
  /** Where the sound starts in the recording, in samples.  Not a whole number:  it's interpolated. */
  position: number;
  /** How well it matched, 0 to 1.  Above about 0.1 means it really is there.  Noise alone scores about 0.03. */
  match: number;
  /** The loudest sample in the match, as dBFS. */
  peakDb: number;
};

/**
 * Find a sound in a recording, starting somewhere from `from` to `to` (sample indexes).  It searches
 * coarsely first, at a quarter of the sample rate, then exactly around the best spot.
 */
export function findSound(
  recording: Float32Array,
  sound: Float32Array,
  from: number,
  to: number,
): Found {
  const first = Math.max(0, Math.floor(from));
  const last = Math.min(recording.length - sound.length, Math.ceil(to));
  if (last < first) {
    return { position: NaN, match: 0, peakDb: -Infinity };
  }
  const soundEnergy = energy(sound, 0, sound.length, 1);
  const score = (lag: number, step: number) => {
    let sum = 0;
    for (let i = 0; i < sound.length; i += step) {
      sum += sound[i] * recording[lag + i];
    }
    const norm = Math.sqrt(energy(recording, lag, sound.length, step) * (soundEnergy / step));
    return norm > 0 ? sum / norm : 0;
  };
  // Coarse:  every 4th lag, every 4th sample.
  let best = first;
  let bestScore = -Infinity;
  for (let lag = first; lag <= last; lag += 4) {
    const s = score(lag, 4);
    if (s > bestScore) {
      bestScore = s;
      best = lag;
    }
  }
  // Exact:  every lag near the best one, every sample.
  const exact = new Map<number, number>();
  for (let lag = Math.max(first, best - 6); lag <= Math.min(last, best + 6); lag++) {
    exact.set(lag, score(lag, 1));
  }
  for (const [lag, s] of exact) {
    if (s > (exact.get(best) ?? -Infinity)) {
      best = lag;
    }
  }
  // Between samples:  fit a parabola through the best score and its neighbors.
  const here = exact.get(best) ?? 0;
  const before = exact.get(best - 1);
  const after = exact.get(best + 1);
  let position = best;
  if (before !== undefined && after !== undefined) {
    const curve = before - 2 * here + after;
    if (curve < 0) {
      position += (0.5 * (before - after)) / curve;
    }
  }
  let peak = 0;
  for (let i = best; i < best + sound.length; i++) {
    peak = Math.max(peak, Math.abs(recording[i]));
  }
  return { position, match: Math.max(0, here), peakDb: 20 * Math.log10(peak || 1e-12) };
}

function energy(samples: Float32Array, start: number, length: number, step: number) {
  let sum = 0;
  for (let i = 0; i < length; i += step) {
    const v = samples[start + i];
    sum += v * v;
  }
  return sum;
}
