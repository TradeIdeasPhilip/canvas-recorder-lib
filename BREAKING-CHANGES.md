# Breaking Changes

Changes that can break a project using this library, newest first, and what to do about each.
This is not a full list of changes:  new features and fixes aren't here.

While the version is 0.x, every breaking change comes with a new minor version (0.5 → 0.6), and nothing else does.
A project that depends on `"^0.5.0"` gets 0.5.x updates but never 0.6.0, so it only meets these changes when someone installs the new version on purpose.

## Unreleased

- **`samplesToFourier()` leaves out the frequency 0 term,** the center, unless you pass `{ keepCenter: true }`.
  That term is the average of the samples, a fixed offset.  Without it the curve is the same shape, centered on that average.
  `FourierComponent` gets the new default, and so does `getAnimationRules()` given a path string.
  A Fourier component still puts the finished curve in the same place in Dest Rect.
  - **Every term after the center moves down one number,** so Term Groups can add different terms than before.
    For art drawn away from the origin, the center is often term 0, and everything moves.  (The showcase's Walking Man:  term 0, 45% of the total amplitude.)
    For a shape centered on the origin, the center is tiny and far down the list (the showcase's Star:  term 42), so only a group that ends past it changes, by one small term.
  - To get the same picture, subtract 1 from every term number after the center's.  The showcase's Fourier Component slide did:  `0 1, 2, 3-5, 6-8, 9-11` became `0, 1, 2-4, 5-7, 8-10`.
    The finished curve is the same either way.  What goes away is the step that slid the curve to the center.
  - Code that needs the terms to add up to exactly the samples, in place, should pass `{ keepCenter: true }`.  The showcase's Fourier Morph does.

## 0.7.0 (2026-11-07)

- **`VisualEditorAPI.getDecodedBuffer()` returns a mono buffer,** at 48 kHz, for every file.
  It used to return the file's own channels, so a stereo file's channel 0 was its left channel; now it's the average of both.
  A waveform drawn from channel 0 still works, and shows the whole sound.  Code that reads channel 1 should read channel 0.

## 0.6.0 (2026-11-05)

- **`CANVAS_WIDTH_UNITS`, `CANVAS_HEIGHT_UNITS` and `PIXELS_PER_UNIT` are gone** from `src/slide-components/video-info`.
  The video's size can change now, from the GUI or from `canvasRecorder.size`, so a constant can't hold it.
  Use `canvasWidthUnits()`, `canvasHeightUnits()` and `pixelsPerUnit()` instead, and call them while drawing, not when the module loads.
  To keep the old fixed size, set it in your main program and call `canvasRecorder.lockSize()`.

## 0.5.0 (2026-10-18)

The first version on npm.
