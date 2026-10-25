# Audio From Large Videos

Import audio, and transcripts, fail for big video files.

**Status (2026-10-24):** Planning.  No code yet.

## What happened

In simple-video-editor, a third clip was a 17:33 screen recording, 2880 × 1800:
`Screen Recording 2026-10-22 at 1.00.44 PM.mov`, **7.2 GB**.

- The picture was fine.
- The transcript waited a while, then said "no transcript: TypeError: Failed to fetch."
- There was never any sound, but the panel said "Audio imported ✓":  the sound clip was added, but its audio never loaded.
- The console said "Audio ready in 22613 ms", and nothing else.  The sound loader catches the error and only writes it to the Debug Log (`Skipped "local:…": …` in `initAudio()`).

The two earlier clips were small, and worked.

## Why

Both readers fetch the **whole file** into one `ArrayBuffer` and hand it to the browser's audio decoder:

- [dev/audio-builder.ts](../dev/audio-builder.ts) `#createNewAudioBuffer()`:  `fetchMedia(url)`, `arrayBuffer()`, `decodeAudioData()`.
- [dev/transcripts.ts](../dev/transcripts.ts) `decode()`:  the same, into an `OfflineAudioContext` at 16 kHz.

That's 7.2 GB of video to reach about 30 MB of AAC audio.  Chrome won't read a file that big into a single buffer; "Failed to fetch" is how it reports that.
(Probably a limit around 2 GB.  Not measured.)

## Proposal

Read only the audio track, with Mediabunny, which already reads the video frames ([src/slide-components/video-clip.ts](../src/slide-components/video-clip.ts) `openVideo()`).

- `new Input({ source, formats: ALL_FORMATS })`, with `BlobSource` for a local file or `UrlSource` for a URL, exactly like `openVideo()`.
  Both read only the bytes they need:  `UrlSource` with range requests, `BlobSource` with `slice()`.
- `getPrimaryAudioTrack()`, then an `AudioBufferSink` to decode it, one piece at a time.
- Copy the pieces into one buffer, then convert it to the sample rate the caller needs:  the soundtrack's for audio-builder.ts, 16 kHz mono for transcripts.
  `decodeAudioData()` does that conversion for free today; an `OfflineAudioContext` can do it here.
- One shared helper, e.g. `decodeAudioTrack(url, sampleRate)`, in its own module, used by both readers.

Small audio-only files (`.m4a`, `.flac`, `.wav`) could keep `decodeAudioData()`.  It's fast, and it's how every sound clip has worked so far.

### Timing:  keep the old convention

`decodeAudioData()` ignores the MP4/MOV edit list, so decoded sample *p* plays at presentation time *p* + the audio track's first timestamp.
`expectedSoundClip()` in [dev/video-clip-panel.ts](../dev/video-clip-panel.ts) compensates for exactly that, using `audio.firstTimestampMs` (the "offset 33.5 ms" in the panel).

Mediabunny gives real presentation timestamps.  If the new reader used them, every sound clip already imported would move by that offset.
So the new reader should produce what `decodeAudioData()` would have:  the samples in order, starting from the first packet, whatever its timestamp.
Then nothing that's already saved changes.

Check it:  import the same small file both ways and compare the buffers, sample for sample, or at least their lengths and first samples.

## Also

- **Say when it fails.**  A sound clip that can't load should show up somewhere other than the Debug Log:  the Video File panel's audio line, at least.
  "Audio imported ✓" was wrong here.
- **Memory.**  17½ minutes of mono 48 kHz float audio is about 200 MB.  The soundtrack itself is already that big, so this isn't new, but the shared helper shouldn't hold a second full-length copy longer than it must.
- **Speed.**  Reading only the audio should make every video's audio load faster, not just the big ones.
