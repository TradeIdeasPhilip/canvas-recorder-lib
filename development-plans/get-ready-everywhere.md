# Get Ready Everywhere

A reminder, not a plan: how the red ✕ at the start of a video clip was fixed in one place, and where the same fix could go next.

**Status (2026-10-25):** Done for a Video Clip that is a direct child of an In Series. The rest waits for a real case to test with.
**A real case (2026-11-15):** 7-pointed-star's video №8. Reasonably high priority to look at, and probably a small fix (the user). See "The real case" below.

## What was done

In live playback nothing can wait, so anything slow has to be requested before it's needed.
A Video Clip used to hear about itself only on the frame it was drawn, and decoding takes longer than a frame, so the first frame of each clip was usually a red ✕.

- **`Showable.getReady?(timeInMs)`** in [src/showable.ts](../src/showable.ts): "you'll be shown soon; start loading; draw nothing".
  `timeInMs` is negative, the object's own time: -2000 means it starts in 2 s of the video's time, not the wall clock's.
  It's the live-playback counterpart of `getFramePromises()`, which only recording uses.
- **`InSeriesComponent.showChild()`** in [src/slide-components/in-series.ts](../src/slide-components/in-series.ts) calls it on every child that hasn't started yet, on every frame, unless `playSpeed` is `"exact"` (recording).
- **`VideoClipComponent.getReady()`** in [src/slide-components/video-clip.ts](../src/slide-components/video-clip.ts): within `GET_READY_MS` (5 s), open the file and call `frameSource.getRaf(locationInClip(0))`, the same request `show()` makes at time 0.
  Further ahead it does nothing, so starting the movie doesn't start every clip at once.
  Asking again every frame is cheap: the first request opens a stream, and the rest are cache hits.

**Why a separate method, not `show()` at out-of-range times:** the series already does that for `PaddingComponent`, which expects it.
But a Video Clip can have children of its own, and calling its `show()` early would draw them early.
Some components are _aware_ of times outside 0 … duration and most are _naive_; a separate method keeps the naive ones safe.

## The real case: 7-pointed-star's Scratch 8

The user, 2026-11-15: "I saw more red x's than I would have expected", in video №8, which has video from a phone. There were notes in the Debug Log. Not looked at together yet; the user expects it to be repeatable.

Found by reading that project's `properties/7-pointed-star-shorts.txt` and this library's code. Not run, and I haven't seen the log.

- **Scratch 8 has four Video Clips,** all direct children of the scene or one level down:
  - an In Series holding the first two
  - "Padding #1" holding the third, starting at 79.4 s. Later that day the user put an In Series between the two, to be able to split the clip. That doesn't change this: the clip is the first thing in that series, and nothing calls the series before the Padding's start.
  - "Padding #2" holding the fourth, starting at 34.0 s
- **Only the second clip is ever told to get ready.** The series tells it. The scene is a parallel container, and the other two wrappers are Paddings, and neither kind passes `getReady()` on. That's the gap listed under "Containers", next.
- **So I expect a ✕ at the start of the third and fourth clips, and none at the start of the second.** That's the check to make first.
  The first clip starts when the scene does, so it depends on how you got there: a ✕ when playing in from the scene before, none when starting from a pause at the scene's start.
  The second time through, a clip still has frames from the first time, so it shows an old frame with a corner mark, not a ✕.
  The Debug Log lines to look for: `VideoClip … drawing X` with its reason, and `RafFrameSource … MISS -- nothing decoded yet`.
- **A phone's video probably makes it worse,** not different: a bigger picture takes longer to decode its first frame, so the ✕ stays for more frames. A guess.
- **The fix is the one below:** a `getReady()` in the base container, and one in Padding. A bug fix, so a patch.
- If the ✕ marks are somewhere else, such as the middle of a clip, this isn't the cause, and the log will say what is.

## Containers

The leaf components only hear about `getReady()` if every container between them and the series passes it on. Today none do.

- **`InParallelComponent`** ([in-parallel.ts](../src/slide-components/in-parallel.ts)) is the base of most containers: Duration Agnostic, Multi Text, Padding…
  One `getReady(t)` there that calls `child.getReady?.(t - start)` on each child, like its `getFramePromises()`, covers most of them.
  That's what makes a clip inside a Slide, inside a series, work.
- **`PaddingComponent`** is the case that started this. The series shows it at every time (`#allowExtendedTimes()`), so it never gets `getReady()` from the series.
  It would have to call `getReady()` on its primary child itself, when its own time is before the primary child's start (`initialTimeScalar`), with the primary child's time.
  The Visual Editor wraps a component in Padding to move it on the timeline, so this is the next most likely case.
- **Transitions** (Slide Left, Cross Fade, Hold Previous/Next) draw the child before and after them.
  The child after a transition hasn't started yet, so the series already tells it to get ready. Probably nothing to do; check when a transition shows a ✕.
- **`MakeShowableInSeries`** and friends in showable.ts (the older helpers) don't pass on `getFramePromises()` either. Same question for both.

## Leaf components

The same three that add promises in `getFramePromises()`:

- **Video Clip:** done.
- **Image** ([image.ts](../src/slide-components/image.ts)): a ✕ only until a new URL has loaded once; after that it's cached.
  `getReady()` would just make the `SingleImage` early (`#getImage()`), which starts the load. Low priority.
- **Traditional Text** ([traditional-text.ts](../src/slide-components/traditional-text.ts)): a font that hasn't loaded shows the fallback font, not a ✕, and only the first time a font is used.
  `getReady()` could start `document.fonts.load(fontString, text)` early. Low priority, and it would spoil the slow-fonts demo ([slow-fonts.md](slow-fonts.md)).

## Open questions

- **How far ahead:** 5 s, fixed, per component. Should it be one setting for everything?
- **The opposite, letting go:** a clip keeps its last decoded frames and its open decoder after it ends, forever: about 100 MB per clip at 2880 × 1800.
  The same series code could tell children far behind the playhead (say more than 5 s past their end) to close their stream and drop their frames.
  A second method, or `getReady()` with a positive time meaning "you're done"?
- **Testing:** a ✕ at a clip boundary means a miss. The Debug Log's `RafFrameSource … MISS -- nothing decoded yet` lines show every cold start, so it's easy to see whether a new container passes the notice on.
