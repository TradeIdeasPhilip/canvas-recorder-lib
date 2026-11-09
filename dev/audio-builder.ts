/**
 * The soundtrack mixed into one buffer, for the saved video and 🎤 Record Just Sound.
 *
 * Live playback doesn't use this:  it gives each clip its own node, and the browser
 * mixes them.  See dev/soundtrack.ts.
 *
 * It starts with all silence and you can add the clips wherever you need them.
 * Overlapping clips are mixed:  each one is added to whatever is already
 * there, so two sounds at the same time are both heard.
 *
 * The result is always **mono**, and so are the sources:  dev/soundtrack.ts mixes
 * each file down to one channel when it decodes it.  Nothing recorded for these
 * videos is really stereo:  a Mac screen recording, for example, writes its one
 * microphone signal into both channels, and CapCut's exports have done the same.
 * One channel is less to test and can't put a sound in only one ear by accident.
 */
export class AudioBuilder {
  /**
   * This is the sound we are building.
   */
  private buffer: AudioBuffer;

  getAudioBuffer(): AudioBuffer {
    return this.buffer;
  }

  constructor(totalDurationMs: number, sampleRate = 48000) {
    // A project can legitimately be 0 ms long (an empty timeline), and an
    // AudioBuffer needs at least one sample.
    const totalSamples = Math.max(
      1,
      Math.ceil((totalDurationMs / 1000) * sampleRate),
    );
    this.buffer = new AudioBuffer({
      numberOfChannels: 1,
      length: totalSamples,
      sampleRate,
    });
  }

  /**
   * Add a new clip to the soundtrack.
   * It is mixed with (added to) any sounds already at that position.
   *
   * The sum can go past ±1, which clips.  That's fine for what this is used
   * for, a voiceover with the occasional overlap; the WAV encoder clamps, and
   * live playback clips the same way.
   * @param sourceBuffer The decoded sound, mono, at this builder's sample rate.
   * @param startMsInDestination 0 to play the new clip at the the beginning of the video.
   * 1000 to start this clip 1 second after the video starts.
   *
   * Negative numbers are allowed:  the part of the clip that would play before
   * the video starts is skipped.  A sound clip may legally start before the
   * component that owns it, and that component may be at the very start.
   * @param trimFromStartMs Where to start the clip.
   * 0 to play the entire clip.
   * 500 to trim the first half second from the clip.
   * The default is 0.
   *
   * Negative numbers mean silence before the clip starts:  -500 starts the
   * clip half a second after `startMsInDestination`.
   *
   * If you fast forward the resulting video to `startMsInDestination` in your video player,
   * and you fast forward the initial clip in another player to `trimFromStartMs`,
   * and you hit play in both at the same time,
   * they'd play the same thing.
   *
   * **Video files and edit lists**: `decodeAudioData()` ignores the MP4/MOV container's
   * edit list. If the source is a video file (e.g. a Mac screen recording), the audio
   * samples start at media-time 0, but the *presentation* timeline may start later.
   * The caller is responsible for computing the offset from
   * `InputTrack.getFirstTimestamp()` (Mediabunny) and adding it to `trimFromStartMs`
   * so the audio aligns with the video's visible frames.
   * See `development-plans/import-audio-button.md` for the full plan.
   * @param length How much of this clip to include.
   * Stop copying this many milliseconds after `trimFromStartMs`.
   *
   * This value will be clamped to a reasonable range.
   * Requesting 0 or fewer milliseconds means to copy nothing.
   * We stop copying when we get to this much time,
   * the end of the source, or the end of the destination,
   * whichever comes first.
   *
   * The default is `Infinity`, to copy the entire clip or as much as will fit.
   */
  add(
    sourceBuffer: AudioBuffer,
    startMsInDestination: number,
    trimFromStartMs: number = 0,
    length: number = Infinity,
  ): void {
    if (startMsInDestination < 0) {
      // Skip the part that would play before the video starts.
      trimFromStartMs -= startMsInDestination;
      length += startMsInDestination;
      startMsInDestination = 0;
    }
    if (trimFromStartMs < 0) {
      // Nothing to play before the source starts:  start later instead.
      startMsInDestination -= trimFromStartMs;
      length += trimFromStartMs;
      trimFromStartMs = 0;
    }

    const samplesPerMs = this.buffer.sampleRate / 1000;
    const destinationStart = Math.floor(startMsInDestination * samplesPerMs);
    const sourceStart = Math.floor(trimFromStartMs * samplesPerMs);
    // Stop at whichever runs out first:  the requested length, the source, or
    // the destination.  (decodeAudioData() already resampled the source to
    // our sample rate, so one count works for both.)
    const count = Math.max(
      0,
      Math.min(
        Math.floor(length * samplesPerMs),
        sourceBuffer.length - sourceStart,
        this.buffer.length - destinationStart,
      ),
    );
    if (count === 0) {
      return;
    }
    const destination = this.buffer
      .getChannelData(0)
      .subarray(destinationStart, destinationStart + count);
    const source = sourceBuffer
      .getChannelData(0)
      .subarray(sourceStart, sourceStart + count);
    for (let i = 0; i < count; i++) {
      destination[i] += source[i];
    }
  }

  toBlob(): Blob {
    return new Blob([audioBufferToWav(this.buffer)], { type: "audio/wav" });
  }
}

/**
 * Simple 16-bit PCM WAV encoder.
 * This takes about 0.6 seconds to save 8½ minutes of data.
 */
function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length * numChannels * 2 + 44;
  const arrayBuffer = new ArrayBuffer(length);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++)
      view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + buffer.length * numChannels * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, buffer.length * numChannels * 2, true);

  let offset = 44;
  for (let ch = 0; ch < numChannels; ch++) {
    const channel = buffer.getChannelData(ch);
    for (let i = 0; i < buffer.length; i++) {
      const sample = Math.max(-1, Math.min(1, channel[i]));
      view.setInt16(
        offset,
        sample < 0 ? sample * 0x8000 : sample * 0x7fff,
        true,
      );
      offset += 2;
    }
  }

  return arrayBuffer;
}
