# canvas-recorder-lib

Preview, edit, annotate and record HTML canvas animations.
This is the tooling from [canvas-recorder](https://github.com/TradeIdeasPhilip/canvas-recorder), packaged as a library, so each video can be its own small project.

**Status:** version 0.x, a first version. Expect breaking changes.

**API docs:** https://tradeideasphilip.github.io/canvas-recorder-lib/

**Try it:** the [Simple Video Editor](https://tradeideasphilip.github.io/canvas-recorder-lib/simple-video-editor/) is this library's player and Visual Editor with an empty project:  open video clips from your computer, add text and callouts, and save an MP4.
Its source is in [simple-video-editor/](https://github.com/TradeIdeasPhilip/canvas-recorder-lib/tree/master/simple-video-editor).

## Use

```ts
import { canvasRecorder } from "canvas-recorder-lib";
import { myVideo } from "./my-video.ts"; // Any Showable.

// Optional.  The defaults are 3840 × 2160 pixels, 16 × 9 units, 60 fps.
// canvasRecorder.pixelWidth = 1920;
// canvasRecorder.pixelHeight = 1080;

// Optional.  For a video drawn for one specific size.
// canvasRecorder.lockSize();

canvasRecorder.start(myVideo, { name: "my-video" });
```

The player shows the video's size (pixels and units) in four fields.
Unless the program calls `lockSize()`, the user can change them, and the player remembers the change for this video.
So read `canvasRecorder.width` and the rest while drawing, not once at startup.
The Save dialog can also save one file at a different size, without changing the video.

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

### Installing

```bash
npm install canvas-recorder-lib
npm install-scripts deny onnxruntime-node protobufjs
npm install-scripts ls     # should say "No packages with unreviewed install scripts."
```

- **Depend on the published version,** not `"file:../canvas-recorder-lib"`.
  A `file:` dependency works on your machine, but GitHub's build machine has no `../canvas-recorder-lib`, so your GitHub Pages deploy fails.
  `npm ci` doesn't notice; `tsc` stops with "Cannot find module 'canvas-recorder-lib'."
- **Deny those two install scripts.** npm 11 skips dependencies' install scripts until your project approves or denies them, and warns about each one.
  Both come from `@huggingface/transformers`, which the library uses for transcription, and neither is needed in a browser.
  `deny` records that in your `package.json`'s `allowScripts`.
  - That field replaces any `allow-scripts` setting in your `~/.npmrc`.
    If your `~/.npmrc` approves `fsevents` (Vite's file watcher on macOS), approve it again here:  `npm install-scripts approve fsevents --no-allow-scripts-pin`.
- **Expect a big `package-lock.json`.** The library's dependencies are installed in your project, including some that only Node.js uses.

### Working on the library at the same time

```bash
npm link ../canvas-recorder-lib    # in your project
npm run watch                      # in canvas-recorder-lib
```

- `npm link` replaces `node_modules/canvas-recorder-lib` with a symlink to your copy, without touching `package.json` or `package-lock.json`.
  So your deploy keeps using the published version.
- `npm ls canvas-recorder-lib` shows `-> ./../canvas-recorder-lib` while the link is active.
- Any later `npm install` or `npm ci` quietly puts the published copy back.
- Your project uses the library's compiled `dist/`, so keep `npm run watch` running in the library.
- When the library change is ready, publish a new version, then `npm install canvas-recorder-lib@<version>` in your project and commit both package files.

### Vite setup

Add this to your `vite.config.js`:

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
  optimizeDeps: {
    include: ["canvas-recorder-lib > @huggingface/transformers"],
  },
});
```

- **`fs.allow`:** needed while the library is linked.
  Without it, the server console says the transcription worker is "outside of Vite serving allow list", and transcripts fail.
  A linked library lives outside your project. Vite serves files that are imported, but the worker is loaded by URL.
  Setting `allow` turns off Vite's default, so your own folder has to be listed too; that's what `searchForWorkspaceRoot()` is for.
- **`optimizeDeps.include`:** without it, the first Import audio or transcript reloads the page, under `npm run dev` only.
  Only the transcription worker imports that package, and Vite doesn't look inside workers when it starts, so it finds the package late and reloads to use it.
- **A fixed port:** the editor saves your work in the browser (IndexedDB), and the browser keeps a separate copy for each origin.
  If another project already has the port, Vite quietly moves to the next one (5173 → 5174), and the editor seems to forget everything.
  `strictPort` makes that an error instead.

### Ports

Each project that uses this library gets its own port, forever.
Changing the port loses the editor's saved work, because IndexedDB belongs to the origin, and the port is part of the origin.
For a new project, take the next number and add it here.

| Port | Project |
| --- | --- |
| 5173 | [canvas-recorder](https://github.com/TradeIdeasPhilip/canvas-recorder) (Vite's default; historical) |
| 5174 | [riemann-surfaces-3d](https://github.com/TradeIdeasPhilip/riemann-surfaces-3d) |
| 5175 | [affine-transforms](https://github.com/TradeIdeasPhilip/affine-transforms) |
| 5176 | `test-project/` in this repo (planned; see [development-plans/test-project.md](development-plans/test-project.md)) |
| 5177 | [`simple-video-editor/`](https://github.com/TradeIdeasPhilip/canvas-recorder-lib/tree/master/simple-video-editor) in this repo |

### Starting the editor

- **Load the library only when you need it,** e.g. `await import("./video-editor")` from a button.
  The rest of your program never pays for it.
- **Don't `await canvasRecorder.start()` at the top level of a module.** The page hangs with no error message.
- **Turn off your own CSS first.** `start()` replaces your `<body>`, but your stylesheets are still there, and they restyle the editor.
  Disabling every sheet that has more than `@font-face` rules works (see `hideOurStyles()` in riemann-surfaces-3d's `src/video-editor.ts`).
- **Stop your own animation loop and keyboard handlers.** Otherwise typing in the Visual Editor's text boxes drives your program.
- **Put sound files in your `public/` folder** and refer to them as `"./name.m4a"`.
- **Or use files on your computer.** The Video File and Image File panels have **📂 Open file…**, which stores a URL like `local:Screen Recording.mov`.
  The browser remembers the file, but only in this browser on this computer.
  After a reload it may want your OK again:  click **🔓 Allow local files**.
  The Save dialog checks every local file before it starts, so a long recording can't stop halfway to ask.
  In your own code, read media with `fetchMedia()`, which understands `local:` URLs.
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

The code came from [canvas-recorder](https://github.com/TradeIdeasPhilip/canvas-recorder), which is now historical.
Since 2026-10-14, this library is the master copy:  new features and fixes start here.
`imported-files.txt` lists what was copied, and from which canvas-recorder commit.

## Build

```
npm install
npm run build    # or:  npm run watch
npm run docs     # API docs, in docs/
```

Output goes to `dist/`: `.js`, `.d.ts`, source maps, plus the CSS and JSON files the JavaScript imports.

A project that has linked this library (see [Working on the library at the same time](#working-on-the-library-at-the-same-time)) sees a change as soon as `npm run watch` recompiles it.

## Releasing

1. Bump the version:  `npm version minor --no-git-tag-version` (or `patch`).  Commit and push.
2. `npm publish`.  `prepublishOnly` rebuilds `dist/` first.
3. In each project:  `npm install canvas-recorder-lib@<version>`, `npx tsc --noEmit`, and commit `package.json` and `package-lock.json`.

The API docs publish themselves on every push to master.
