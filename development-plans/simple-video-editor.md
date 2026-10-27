# Simple Video Editor

I want a _very_ stripped down version of our main program.
It is aimed at someone editing video clips and adding standard text and callouts.
It is made to be used directly from github pages by a non programmer.
Any saves will be made locally, and never rolled back into the source code.

## Prerequisites

[loading-video-clips-from-local-files.md](./loading-video-clips-from-local-files.md) should be finished.
This is good for a lot of reasons.
But it's pretty much essential for the non programmer / person running from github pages.
And this main program would be a great way to test that feature.
We can do these all at once.

[configurable-video-size.md](./configurable-video-size.md) should also be finished.
The user will be in full control of the video, and have no access to TypeScript, so he will need these controls.
Again, this main program would be a great way to test that feature.
We can do these all at once.

## Defaults

2880 × 1800 pixels to match my M1 MacBook Air screen recordings.
That's my primary use for this project at the moment.
Let YouTube handle the resizing (when it first encodes) and the pillarboxing (when it displays).

16 × 10 for the internal dimensions.
That's how I usually hear it quoted.

## Use Case

I really don't need but a small fraction of the features CapCut or DaVinci Resolve offer.
But those are often unnecessarily confusing and annoying.
I wouldn't have created this whole library just for this one super simplified video editor.
But since we already have the pieces, why not publish the generic video editor?

My primary use case for the library remains videos like some5 with lots of typescript driven custom graphics and the [robot math video](https://github.com/TradeIdeasPhilip/riemann-surfaces-3d) which was an interactive program that was adapted after the fact to make videos.

All use cases will benefit from custom features as they are added to the library.

## Prototype (2026-10-18)

[simple-video-editor/](../simple-video-editor/), with both prerequisites built at the same time
(see their "Prototype" sections).

- **It lives in this repo,** not in its own.  It uses the library from `file:..`, so it always has the newest library, locally and on GitHub Pages, with no npm release in between.
  [.github/workflows/docs.yml](../.github/workflows/docs.yml) builds it with the API docs and publishes it at https://tradeideasphilip.github.io/canvas-recorder-lib/simple-video-editor/.
- **Port 5177** (see the README's Ports table).
- **Defaults:**  2880 × 1800 pixels, 16 × 10 units, unlocked.
- **The starting project:**  a black Background, a Clips series holding one empty 10 s Clip 1, and an Instructions text ("Select Clip 1, then 📂 Open file…") to delete.
  Everything is replaceable, so the user can rebuild it in the Visual Editor.
- **Saves stay in the browser** (IndexedDB), or in JSON files the user picks.

**To try:**  see [simple-video-editor/README.md](../simple-video-editor/README.md).

**Next:**

- One editor, many videos.  See below.
- Hide the programmer-only controls (Sync defaults, Sync diffs, TypeScript defaults, Debug Log) for this audience.
- A help page.  The player replaces the whole `<body>`, so it would be a link or a dialog.
- A shorter component list in the Insert dialog:  clips, text, rectangles, arrows, images.

## One editor, many videos (2026-10-27)

Found while finishing the first real video made with this editor (https://youtube.com/shorts/Z_2XEJ6KVmA).

Everything the player remembers is keyed by the name passed to `canvasRecorder.start()`.
That was right when each video was its own program with its own name.
This editor uses one name, `simple-video-editor`, for every video anyone makes with it.

### What goes wrong

1. **Load can overwrite another video's file.**  This is the dangerous one.
   Loading a `.json` doesn't change which file is synced, on purpose:  see the comment in `loadFromJsonFile()` in [dev/canvas-recorder.ts](../dev/canvas-recorder.ts) ("Opening a file doesn't change which file is synced").
   So while syncing to `video1.json`, loading `video2.json` writes video 2 into `video1.json`.
   With one video per program, Load always meant "an older version of this video", and that was correct.
   Here it means "open a different video".
   **Workaround until it's fixed:**  uncheck Sync to file before loading or starting a different video, then check it again and pick that video's own file.
2. **Every video shares one autosave and one Load/undo history.**  IndexedDB is keyed by the same name (`toShowKey` in dev/canvas-recorder.ts).
   Nothing is lost, but the history mixes videos, and a reload comes back to whichever video was edited last.
3. **The video size isn't in the save file.**  It's in localStorage under `canvas-recorder-size|<name>` (`videoSizeStorageKey`).
   Loading another video's `.json` keeps the current size.
   The fix is already proposed:  [configurable-video-size.md](configurable-video-size.md#proposal--the-size-and-the-last-save-range-in-the-json-file-2026-10-24).
4. **File names.**  Each Sync checkbox opens a Save dialog that suggests `<name>.json`, `<name>.txt` or `<name>-ts-defaults.json` (`defaultName` in dev/canvas-recorder.ts).
   The user can type any name, but the suggestion is the same for every video, so it's easy to accept without noticing.
   To rename later:  uncheck Sync, check it again, and pick a new name.  The old file stays.
5. **Sync defaults and Sync diffs are for programmers.**  Here they only ever describe the empty starting project.  (Already in Next, above.)

### Possible direction (speculation)

Give the editor a real idea of a *project*:  one video, one `.json` file.

- **Open…** picks a `.json` and makes it the synced file, so later saves go back to the file that was opened.  **New** starts the empty project, and the first save asks for a name.
  Load (the history dialog) stays as it is:  older versions of the *current* video.
- Show the current file name prominently, near the top, so it's always clear which video this is.
- Key the IndexedDB history by the project's file, not by the program's name.  Unknown:  how to name a project before its first save, and what to do with the history already stored under `simple-video-editor`.
- Put the size (and the last Save range) in the `.json`, per configurable-video-size.md, so opening a project restores everything.
- Should this be a `start()` option, so other programs could opt in, or just how this editor works?  The one-video programs (affine-transforms, riemann) want today's behavior.
