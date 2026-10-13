# canvas-recorder-lib

Preview, edit, annotate and record HTML canvas animations.
This is the tooling from [canvas-recorder](https://github.com/TradeIdeasPhilip/canvas-recorder), packaged as a library, so each video can be its own small project.

**Status:** version 0.x, a first version. Expect breaking changes.

## Use

```ts
import { canvasRecorder } from "canvas-recorder-lib";
import { myVideo } from "./my-video.ts"; // Any Showable.

// Optional.  The defaults are 3840 × 2160 pixels, 16 × 9 units, 60 fps.
// canvasRecorder.pixelWidth = 1920;
// canvasRecorder.pixelHeight = 1080;

canvasRecorder.start(myVideo, { name: "my-video" });
```

`start()` replaces the page's `<body>` with the player and its Visual Editor.
Leave your HTML's body empty, or put "Please wait…" in it.

- Don't `await` `start()` at the top level of your main module. The page would hang with no error message.
- `name` keeps this video's saved editor state separate from other videos served from the same origin.

Imports:

- `canvas-recorder-lib` exports the main control object and the common building blocks.
- Anything else is available by path, e.g. `canvas-recorder-lib/src/glib/path-shape`.

The package includes the TypeScript source next to the compiled JavaScript, and Go to Definition takes you to the source.

## How this library is made

canvas-recorder is the source of truth.
`npm run import` copies the player, and everything it imports, from `../canvas-recorder` into `dev/` and `src/`, verbatim.
The library's own code lives in `lib/`.

To pick up newer code from canvas-recorder:

1. Make a branch, run `npm run import`, and commit: "Verbatim import from canvas-recorder <hash>".
2. Rebase the hand edits (the commits after the previous verbatim import) onto it.

`imported-files.txt` lists what was copied, and from which commit.

## Build

```
npm install
npm run build    # or:  npm run watch
```

Output goes to `dist/`: `.js`, `.d.ts`, source maps, plus the CSS and JSON files the JavaScript imports.

A project that depends on this library through `"canvas-recorder-lib": "file:../canvas-recorder-lib"` sees a change as soon as `npm run watch` recompiles it.
