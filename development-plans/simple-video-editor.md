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

**To try:**

```bash
npm run watch                                # in canvas-recorder-lib
cd simple-video-editor && npm install && npm run dev    # http://localhost:5177/
```

**Next:**

- Hide the programmer-only controls (Sync defaults, Sync diffs, TypeScript defaults, Debug Log) for this audience.
- A help page.  The player replaces the whole `<body>`, so it would be a link or a dialog.
- A shorter component list in the Insert dialog:  clips, text, rectangles, arrows, images.
