# Video Clip Memory

Let a video clip give back its decoder and frames when it isn't being shown, so memory grows with what's on screen, not with the length of the project.
And make the first frame of a repeated section perfect.

**Status (2026-11-03):** Planning.  No code yet.  Not urgent:  nothing has run out of memory yet.

## The problem

Found by reading, in the [review](review-2026-11.md).  The sizes are arithmetic, not measurements.

- **A clip that has played keeps its stream open forever.**
  `RafFrameSource` ([src/slide-components/video-clip.ts:161](../src/slide-components/video-clip.ts#L161)) reads up to `MAX_FRAMES` (5) frames ahead, and keeps them.
  When the playhead moves on, nobody calls it again, so nothing closes the stream:  the decoder stays open and the frames stay in memory.
- **Every frame is a new canvas** at the file's full size:  `CanvasSink` has no `poolSize` ([:456-460](../src/slide-components/video-clip.ts#L456-L460)).
  A 2880 × 1800 frame is about 20 MB, so about 100 MB per clip that has played, plus Mediabunny's own read-ahead.
  A simple-video-editor project of twenty screen recordings could hold 2 GB it doesn't need.
- **A new URL drops the old stream without closing it** ([:535-543](../src/slide-components/video-clip.ts#L535-L543)).
  Its decoder waits for garbage collection.  Browsers only have a few hardware decoders.

## Release what isn't being shown

- **Idle timeout.**  `FrameSource` notes the time of the last `getRaf()` or `getReady()`.
  After about 2 s with neither, it cancels its stream:  the read-ahead frames and the decoder go.
  The open file (`Input` and `CanvasSink`) stays; that's cheap, and reopening a stream from it is fast.
  Self-contained in video-clip.ts:  no other code has to tell a clip it's done.
- **Close the old stream when the URL changes:**  `this.#video?.frameSource.cancel()` before opening the new one.
- **Optional:**  a `poolSize` of about `MAX_FRAMES + 2`, so playing reuses a few canvases instead of making 60 new 20 MB ones a second.
  The comment at [:456-459](../src/slide-components/video-clip.ts#L456-L459) explains why it's off:  a pool too small would overwrite a frame still on screen.

## Will there be more ✕s?

Not in normal playback.

- **The next clip** is warned 5 s ahead by `getReady()` (see [get-ready-everywhere.md](get-ready-everywhere.md)), and asked again every frame until it starts, so it never goes idle.
- **The clip that just ended** is the one that gets released.  Nothing needs it.
- **Scrubbing back** into a released clip shows a ✕ until the new stream's first frame arrives, usually a few frames.
  Today it shows the old frames with an orange "close enough" dot instead.
  That's what scrubbing into a clip that never played already does.

## Repeating a section:  the first frame must be perfect

**Today:**  at the end of a section with Repeat on, the player jumps back to the start ([dev/canvas-recorder.ts:907](../dev/canvas-recorder.ts#L907)).
A clip that's playing at the start of the section is a reseek ("too far behind"):  its old frames, with an orange dot, until the decoder catches up.
A clip that's only at the start of the section has been idle the whole time; with the release above it would be a ✕.

**Nobody warns them.**  `getReady()` only comes from an In Series, for children that haven't started yet ([src/slide-components/in-series.ts:210-213](../src/slide-components/in-series.ts#L210-L213)).
The player knows about the loop, but never calls it.

**The plan:**

1. **Generalize `getReady(timeInMs)`** from "you start in this long" to "the next time you're shown, it will be at this time."
   Negative times keep today's meaning, so the In Series call doesn't change.
   A Video Clip prepares `locationInClip(max(0, timeInMs))`.
2. **The player calls it.**  When Repeat is on and the playhead is within `GET_READY_MS` of the section's end, call `toShow.getReady(sectionStartTime)` every frame.
   That also keeps the clips at the start of the loop from going idle.
3. **Containers pass it along** to whichever children are showing at that time, the way they already do for `getFramePromises()`.
   [get-ready-everywhere.md](get-ready-everywhere.md) has the details:  `InParallelComponent` covers most of them, and `InSeriesComponent` needs the child that's active at that time.
4. **A standby stream.**  A clip that's playing now *and* is at the start of the loop needs two streams:  the one it's playing, and one waiting at the loop's first frame.
   `FrameSource` gets a second `RafFrameSource` for the standby.
   When a request lands where the standby is waiting, swap it in instead of reseeking.
   Either stream left over after the jump is released by the idle timeout.

Then the jump back finds the frame it needs already decoded:  no ✕, no orange dot.

## How to test

In simple-video-editor (port 5177), with four or five screen recordings:

- **Memory:**  Chrome's Task Manager (Window → Task Manager) shows the tab's memory.
  Play the whole project.  Today memory grows with every clip; afterward it should level off.
- **The Debug Log:**  `RafFrameSource` lines say when streams open, reseek and end.  Add one for "released (idle)".
- **Repeat:**  set the play limits to the middle of one clip, Repeat on, and watch the first frame after each jump.  No dot, no ✕.
  Then a section that starts at the beginning of a clip, and one that spans two clips.
- **Scrub** back and forth across clip boundaries.  A short ✕ is fine; a stuck one isn't.
