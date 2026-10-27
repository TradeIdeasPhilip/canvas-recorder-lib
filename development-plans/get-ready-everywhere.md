# Get Ready Everywhere

A reminder, not a plan:  how the red ✕ at the start of a video clip was fixed in one place, and where the same fix could go next.

**Status (2026-10-25):** Done for a Video Clip that is a direct child of an In Series.  The rest waits for a real case to test with.

## What was done

In live playback nothing can wait, so anything slow has to be requested before it's needed.
A Video Clip used to hear about itself only on the frame it was drawn, and decoding takes longer than a frame, so the first frame of each clip was usually a red ✕.

- **`Showable.getReady?(timeInMs)`** in [src/showable.ts](../src/showable.ts):  "you'll be shown soon; start loading; draw nothing".
  `timeInMs` is negative, the object's own time:  -2000 means it starts in 2 s of the video's time, not the wall clock's.
  It's the live-playback counterpart of `getFramePromises()`, which only recording uses.
- **`InSeriesComponent.showChild()`** in [src/slide-components/in-series.ts](../src/slide-components/in-series.ts) calls it on every child that hasn't started yet, on every frame, unless `playSpeed` is `"exact"` (recording).
- **`VideoClipComponent.getReady()`** in [src/slide-components/video-clip.ts](../src/slide-components/video-clip.ts):  within `GET_READY_MS` (5 s), open the file and call `frameSource.getRaf(locationInClip(0))`, the same request `show()` makes at time 0.
  Further ahead it does nothing, so starting the movie doesn't start every clip at once.
  Asking again every frame is cheap:  the first request opens a stream, and the rest are cache hits.

**Why a separate method, not `show()` at out-of-range times:**  the series already does that for `PaddingComponent`, which expects it.
But a Video Clip can have children of its own, and calling its `show()` early would draw them early.
Some components are *aware* of times outside 0 … duration and most are *naive*; a separate method keeps the naive ones safe.

## Containers

The leaf components only hear about `getReady()` if every container between them and the series passes it on.  Today none do.

- **`InParallelComponent`** ([in-parallel.ts](../src/slide-components/in-parallel.ts)) is the base of most containers:  Duration Agnostic, Multi Text, Padding…
  One `getReady(t)` there that calls `child.getReady?.(t - start)` on each child, like its `getFramePromises()`, covers most of them.
  That's what makes a clip inside a Slide, inside a series, work.
- **`PaddingComponent`** is the case that started this.  The series shows it at every time (`#allowExtendedTimes()`), so it never gets `getReady()` from the series.
  It would have to call `getReady()` on its primary child itself, when its own time is before the primary child's start (`initialTimeScalar`), with the primary child's time.
  The Visual Editor wraps a component in Padding to move it on the timeline, so this is the next most likely case.
- **Transitions** (Slide Left, Cross Fade, Hold Previous/Next) draw the child before and after them.
  The child after a transition hasn't started yet, so the series already tells it to get ready.  Probably nothing to do; check when a transition shows a ✕.
- **`MakeShowableInSeries`** and friends in showable.ts (the older helpers) don't pass on `getFramePromises()` either.  Same question for both.

## Leaf components

The same three that add promises in `getFramePromises()`:

- **Video Clip:**  done.
- **Image** ([image.ts](../src/slide-components/image.ts)):  a ✕ only until a new URL has loaded once; after that it's cached.
  `getReady()` would just make the `SingleImage` early (`#getImage()`), which starts the load.  Low priority.
- **Traditional Text** ([traditional-text.ts](../src/slide-components/traditional-text.ts)):  a font that hasn't loaded shows the fallback font, not a ✕, and only the first time a font is used.
  `getReady()` could start `document.fonts.load(fontString, text)` early.  Low priority, and it would spoil the slow-fonts demo ([slow-fonts.md](slow-fonts.md)).

## Open questions

- **How far ahead:**  5 s, fixed, per component.  Should it be one setting for everything?
- **The opposite, letting go:**  a clip keeps its last decoded frames and its open decoder after it ends, forever:  about 100 MB per clip at 2880 × 1800.
  The same series code could tell children far behind the playhead (say more than 5 s past their end) to close their stream and drop their frames.
  A second method, or `getReady()` with a positive time meaning "you're done"?
- **Testing:**  a ✕ at a clip boundary means a miss.  The Debug Log's `RafFrameSource … MISS -- nothing decoded yet` lines show every cold start, so it's easy to see whether a new container passes the notice on.
