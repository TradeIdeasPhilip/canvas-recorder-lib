# Configurable Video Size

We recently changed the code so the external and internal dimensions are both configurable.
They still default to 4k and 16x9, but each video can select different values.
I have not tested this, but I've see the code.

Question: Is there a way for the user to see and/or modify these values?

## `<input>` Fields

The GUI should always list all four values (pixels across, user space units across, pixels down, user space units down) in `<input>` elements.
These should always show the values from the API's new properties.

There should be an easy API call for the main program to make all four of these read-only at once.
Some projects, like some5 or showcase are all created to work a specific way.
If the user changed one of those value, it could cause code to break.
Other projects are meant to be more of a playground, where the main program only provides a framework and the user can add anything he wants.
E.g. the [robot math video](https://github.com/TradeIdeasPhilip/riemann-surfaces-3d) only creates a robot widget and a sample layout that the user can completely rip apart.
And the proposed simple video editor program would be nothing but the standard components and a simple container.
In those cases the user should have full control over the inner and outer size.

If the sizes are user configurable, then they should be saved in IndexedDB with the video.
This is something that should be shared between windows and sessions, but not between videos.
The main program can _always_ override those settings via the properties.
If the program locks the GUI out of changing these values, then we don't read the user's saved values.

## Questions When Rendering

When it comes time to render the video we already ask a lot of questions.
(E.g. The entire video or a specific range of timestamps?)
Let's add the option of changing the final dimensions of the output here.
The input fields will always default to the saved values (not the last ones used in that dialog box) but they can be overwritten.
Some type of button or control will help you resize without changing the aspect ratio.
If the user does change the aspect ratio, we stretch or squish the image to match.
(In most cases I like to fit or cover and keep the aspect ratio, but this seemed like a silly way to add custom letterboxing and pillarboxing and it seems like the user is asking for this.)

It doesn't really hurt anything if we render to a size other than the size requested at the top level of the api.
We already do this with the live display, where the canvas's bitmap size automatically changes to match the size of the element on the screen.
We keep the properties in the main API as requested, not making this temporary size obvious to any other parts of the code, just like we do for the live displays.
(In case the main program or a library tries to read these values, it will not see the current canvas size or this temporary override for saving files.)

There is no override for the inner dimensions.
If you needed something like that you could use a slide component at the top level of your video.

## Prototype (2026-10-18)

Built along with [simple-video-editor.md](simple-video-editor.md).  Decisions made along the way:

- **The four properties can change after `start()`.**  `fps` still can't.
  `canvasRecorder.size` sets all four at once; `canvasRecorder.onSizeChange()` tells the player.
  Setting one property alone works too.  Each must be positive; pixel sizes are rounded to whole pixels.
- **`canvasRecorder.lockSize()`** makes the four fields read-only and ignores any saved size.  Call it before `start()`.
  The default is unlocked, as this plan says:  a playground is the common case, and a fixed-layout video opts out.
  affine-transforms is built for 16 × 9 and should probably call it.
- **Saved in localStorage, not IndexedDB.**  Key `canvas-recorder-size|<name>`, so it's per video, and shared by windows and sessions.
  It's synchronous, so a saved size is in place before the first frame, and its `storage` event updates other open windows for free.
  It isn't in the JSON save file.  A save file opened on another computer gets that computer's size.
- **The fields** are next to Zoom.  They update on every keystroke, ignoring numbers that can't be right yet (empty, 0).
  "⚠ stretched" appears when the pixels and units have different shapes.
- **The Save dialog** has Size, **Keep aspect ratio** (on by default) and **Video size** (reset).
  It starts from the video's own size every time.  Both numbers must be even, because HEVC stores color at half resolution; OK is disabled until they are.
  The shape for Keep aspect ratio always comes from the video's size, so repeated edits can't drift.
- **16 × 9 assumptions fixed:**  `video-info.ts`'s constants became `canvasWidthUnits()`, `canvasHeightUnits()` and `pixelsPerUnit()`, so Fit canvas, Cover canvas, Native pixels and the snap buttons use the real size.  `blackBackground` fills the real canvas.
  A Video Clip added with **Insert** fills the canvas.  The class default is still 16 × 9, because save files leave out default values, and a default that changed with the canvas would load differently later.

**Still open:**

- Other components with 16 × 9 in them:  `halftone-shadow.ts`, and the class defaults of Rectangle and Image.
- Whether the size belongs in the JSON save file.
- Changing the units doesn't move anything:  the components keep their coordinates.  That's expected for a playground, but a "scale everything" button might be nice.

## Proposal:  the size and the last Save range in the JSON file (2026-10-24)

Today the size lives only in localStorage (`canvas-recorder-size|<name>`).
The JSON file is the movie, minus the media files, so the size belongs in it too.
And while we're there, the Save dialog's last range:  a video often holds development material next to the real thing, and only one chapter gets rendered.

### The size

Make it part of the video's saved state, exactly like the tree:

- `VideoSnapshot` ([src/snapshot.ts](../src/snapshot.ts)) gets an optional `videoSize: VideoSize`, next to `tree`.
  Optional, so old files still load (they keep whatever size is in effect), and `SNAPSHOT_FORMAT_VERSION` can stay 2.
- Each IndexedDB history entry (`VideoDataEntry` in dev/canvas-recorder.ts) gets it too.  Then Load and undo bring the size back with everything else.
- `currentTreeJson()` / `isVideoDirty()` include it, so a size change is an edit like any other, and gets saved and synced.
- **Which size wins:**  with `lockSize()`, the program's, always.  Otherwise the loaded state's, if it has one, or else the program's defaults.
- The localStorage key then has no job, and goes away.

### The last Save range

- Saved when the user clicks OK in the Save dialog, along with the size override if any.
- Stored by **chapter** when one was chosen:  its path of descriptions from the root, plus the start and end in ms as a fallback.
  A chapter follows the edits; raw milliseconds go stale as soon as anything before them changes length.
- When the Save dialog opens:  the saved chapter, at its current start and end, if it still exists.  Otherwise the saved times, if they're still inside the video.  Otherwise Entire video.
- **Not an edit:**  choosing a range shouldn't make the video dirty or add an undo step.
  So it goes in the JSON file and in the IndexedDB `videos` record, but outside the dirty comparison.
  It reaches the synced file with the next real save.

### Questions

- Should the Save dialog's output size (when it differs from the video's) be remembered with the range?  I'd say yes:  it's part of "how I render this".
