# Clipping in the Slide Component

A Slide can show its children through a window: anything outside the rectangle isn't drawn.
It has two jobs: the **visible effect** of a window, and a **smaller off-screen canvas** for any effect that needs one.

**Status (2026-11-14):** Decided, not started. **Priority: reasonably high.**
It isn't blocking anything, but the user has been thinking about it for their current work on 7-pointed-star.

## Decision

Start with a **rectangle** clip on [SlideComponent](../src/slide-components/slide-component.ts).
Don't build general clipping and masking first.

The user asked whether Slide should get generalized clipping and masking.
The answer, and the user's conclusion after thinking about it, was to do the simple rectangle first.
(That discussion happened before this note existed, so the reasons here are reconstructed and the design below is a proposal.
The user thinks it may have come up in 7-pointed-star and been dropped then. Nothing about it is in that project's markdown files.)

## Why 7-pointed-star wants it

- Zoom into one spot on a star circuit **without taking over the whole screen**. The zoomed view is a window, not the full frame.
- Show **the same part of several circuits at the same time**, each in its own window. Without clipping, the zoomed copies would cover each other and the rest of the picture.
- Overlap isn't always bad: it's usually just at the extremes, and it can be fun when not overused.
  So clipping is a choice you make per Slide, not something every Slide does.

## The second job: a smaller off-screen canvas

The user's intent from the start (2026-11-14): besides the obvious visual effect, a clip rectangle can reduce what an effect that needs an off-screen canvas costs.

- **Today** (checked in the code): a Slide with Alpha below 1 makes a **new canvas the size of the whole output** every time it draws, which is every frame.
  At the default 3840 × 2160 that's about 33 MB per frame, per such Slide.
  See `show()` in [slide-component.ts](../src/slide-components/slide-component.ts).
- **The same pattern** is in [cross-fade-transition.ts](../src/slide-components/cross-fade-transition.ts), which makes two full-size canvases per frame, and in [halftone-shadow.ts](../src/slide-components/halftone-shadow.ts), which has a small one.
- **With a clip rectangle,** nothing outside it can appear, so the temporary canvas only needs to cover the rectangle:
  - Take the rectangle's bounding box in device pixels, rounded **outward** to whole pixels.
  - Make the canvas that size, translate so the box's corner is at (0, 0), draw the children, then composite at the box's position.
  - A window covering a tenth of the screen needs about a tenth of the memory and fill work.
  - If the parent's transform is rotated, the bounding box is bigger than the rectangle. Still correct, and still cheaper than the whole screen, with the clip path cutting the composite.
- **Why it matters for 7PS:** several windows at once, each with a fading Slide inside, is exactly where several full-size canvases per frame would add up.
- **Other effects could use it too** (speculation): a clip rectangle as the "this is where I draw" hint for anything that needs an off-screen canvas, like the cross fade or the halftone shadow.
  That's a separate step. The Slide comes first.
- **Independent of clipping, and cheap:** the temporary canvas could be kept from one frame to the next instead of made every time.
  Worth a look when this gets built, because it helps a Slide with no clip at all.

## The proposal (speculation)

- **A "Clip" choice**, off by default, in the style of a `SelectScheduleInfo` ([schedule-helper.ts](../src/schedule-helper.ts)).
  - "Off" and "Rectangle" to start. Later choices (a path, a mask) would be more entries in the same list, so the save format has room to grow.
  - A switch, not "a rectangle that covers everything": CLAUDE.md says a default must never depend on the canvas size, since save files leave out defaults.
    "Off" doesn't depend on anything, so old saves and old videos load exactly as before.
- **A "Clip Rect" schedule**, a `RectangleScheduleInfo`, animatable like Position is.
  - It can move and resize, so a window can open, slide across, or follow something.
  - The editor already draws and drags rectangles for rectangle schedules (see "Rect marker helpers" in [dev/canvas-recorder.ts](../dev/canvas-recorder.ts)), so the window might be draggable on the canvas for free.
- **Which coordinates?** The rectangle is in the **parent's** coordinates, applied **before** the Slide's own transform.
  - This is what the zoom needs: the window stays where you put it, while the Slide's scale and translate zoom the children inside it.
  - If the clip were in the Slide's own coordinates, zooming would also zoom the window.
  - Say which it is, in the property's JSDoc and in the showcase.
- **Drawing it.** In `show()`, around `super.show()`: `context.save()`, `beginPath()`, `rect()`, `clip()`, then the existing transform and children, then `context.restore()`.
  - The Slide today undoes its transform with `setTransform()`, not `save()`/`restore()`. A clip can only be undone by `restore()`, so this path needs one.
    CLAUDE.md's canvas state contract allows it.
  - The alpha < 1 path draws into a temporary canvas and composites it.
    With a clip, make that canvas only as big as the rectangle, as described above, and clip the composite to the rectangle too, which keeps the edge exact.
    (Check this when building it.)

## Not now

- **Clipping to a path**, like a circle or a star: a later "Clip" choice. `PathShape` already makes a `Path2D`.
- **Masks** whose alpha or brightness controls what shows.
- **Soft edges.** CLAUDE.md warns against blurs and gradients because they degrade badly after HEVC and YouTube compression.
  A hard-edged clip survives encoding. If soft edges ever come, they'd need their own look at that.
- **Rounded corners.** A cheap addition to the rectangle, if it's ever wanted.

## Finishing it

- **A showcase slide.** CLAUDE.md: a new feature gets one. The slide should show:
  - the same content zoomed into different spots, in several windows at once;
  - a window that moves, and one that opens;
  - clipping off, so overlap is visible for comparison;
  - a fading Slide in a window, which uses the smaller canvas.
- **Measure the saving.** Count the pixels of the temporary canvas, or time a frame, with and without the window.
  It should be proportional to the window's area. If it isn't, the plan above is wrong.
- **Check old saves.** A Slide from before this loads with Clip off and draws the same pixels.
  Compare frames of the existing Slide showcase slides before and after, like the text regression frames.
- **Release:** new optional properties that default to off, so not breaking.

## Open questions

- Should a clip also apply to what the Slide's children register for hit-testing and dragging on the canvas?
  Today `registerTransform` tells the editor where each child is. A child clipped away might still be draggable where it can't be seen.
- Should the edge be pixel-aligned? A clip edge on a fraction of a pixel is anti-aliased, so two neighboring windows may show a faint seam between them.
  The smaller canvas has to round outward to whole pixels anyway, so snapping the clip edge to whole pixels could come with it.
