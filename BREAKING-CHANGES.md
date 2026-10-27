# Breaking Changes

Changes that can break a project using this library, newest first, and what to do about each.
This is not a full list of changes:  new features and fixes aren't here.

While the version is 0.x, every breaking change comes with a new minor version (0.5 → 0.6), and nothing else does.
A project that depends on `"^0.5.0"` gets 0.5.x updates but never 0.6.0, so it only meets these changes when someone installs the new version on purpose.

## Unreleased (will be 0.6.0)

- **`CANVAS_WIDTH_UNITS`, `CANVAS_HEIGHT_UNITS` and `PIXELS_PER_UNIT` are gone** from `src/slide-components/video-info`.
  The video's size can change now, from the GUI or from `canvasRecorder.size`, so a constant can't hold it.
  Use `canvasWidthUnits()`, `canvasHeightUnits()` and `pixelsPerUnit()` instead, and call them while drawing, not when the module loads.
  To keep the old fixed size, set it in your main program and call `canvasRecorder.lockSize()`.

## 0.5.0 (2026-10-18)

The first version on npm.
