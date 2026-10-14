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

## Notes for a project that uses this library

Things the first project to use this library ([riemann-surfaces-3d](https://github.com/TradeIdeasPhilip/riemann-surfaces-3d)) ran into.

### Vite setup

While both projects are on your disk, link the library with `"canvas-recorder-lib": "file:../canvas-recorder-lib"` in package.json.
Then add this to your `vite.config.js`:

```js
import { defineConfig, searchForWorkspaceRoot } from "vite";

export default defineConfig({
  server: {
    port: 5174, // Pick one per project, and keep it.
    strictPort: true,
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd()), "../canvas-recorder-lib"],
    },
  },
});
```

- **`fs.allow`:** without it, the server console says the transcription worker is "outside of Vite serving allow list", and transcripts fail.
  A linked library lives outside your project. Vite serves files that are imported, but the worker is loaded by URL.
  Setting `allow` turns off Vite's default, so your own folder has to be listed too; that's what `searchForWorkspaceRoot()` is for.
- **A fixed port:** the editor saves your work in the browser (IndexedDB), and the browser keeps a separate copy for each origin.
  If another project already has the port, Vite quietly moves to the next one (5173 → 5174), and the editor seems to forget everything.
  `strictPort` makes that an error instead.
- **`npm run watch`:** your project uses the library's compiled `dist/`, so keep this running in the library while you change it.

### Starting the editor

- **Load the library only when you need it,** e.g. `await import("./video-editor")` from a button.
  The rest of your program never pays for it.
- **Don't `await canvasRecorder.start()` at the top level of a module.** The page hangs with no error message.
- **Turn off your own CSS first.** `start()` replaces your `<body>`, but your stylesheets are still there, and they restyle the editor.
  Disabling every sheet that has more than `@font-face` rules works (see `hideOurStyles()` in riemann-surfaces-3d's `src/video-editor.ts`).
- **Stop your own animation loop and keyboard handlers.** Otherwise typing in the Visual Editor's text boxes drives your program.
- **Put sound files in your `public/` folder** and refer to them as `"./name.m4a"`.
- **Save the editor's state into your project, so it's in git.** The editor always saves inside the browser (IndexedDB), which git can't see.
  Make a `properties/` folder, and point **💾 Save As**, the **Save defaults** checkbox, and **Save Diffs** at it.
  The browser remembers each choice, so after the first time they keep saving there.
  Add a `properties/README.md` explaining the three files; copy [riemann-surfaces-3d's](https://github.com/TradeIdeasPhilip/riemann-surfaces-3d/blob/master/properties/README.md).
- **Register your own components** with `componentRegistry.set(key, { create })`.
  Then the Visual Editor can add, save and load them, and "TypeScript defaults" can rebuild them.

### Recording a program that has its own state

Most of canvas-recorder's components draw any time you ask, in any order.
A program that steps its own animation forward (physics, a game loop, three.js robots with smooth walking) can't do that.
riemann-surfaces-3d's `src/full-screen-component.ts` handles this, and it's meant to be copied as is. What it learned:

- **Step with a fixed dt** (1 / `canvasRecorder.fps`), never the clock. Then recording, preview and every re-run match.
- **Going backwards means restart and replay.** Recording always moves forward, so it's always exact.
  The live preview spends a few milliseconds per frame catching up, and shows a warning light until it does.
- **Take one step right after a restart.** Many programs only update their scene (camera, headings) when they step.
  Without that step, frame 0 shows whatever was on screen before the restart, and jumps to frame 1.
- **Parents call `getFramePromises()` on every child, even ones that aren't on screen.**
  A component that steps a program there must ignore times outside `0` to `duration`, or two of them in a series will keep restarting each other.
- **Only the player calls `show()`.** There are no thumbnails or other random-time calls.

### Size

The transcription feature brings a 27 MB speech-recognition file (`ort-wasm…wasm`) into your production build.
It is only downloaded if someone uses transcription.

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
