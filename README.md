# canvas-recorder-lib

Preview, edit, annotate and record HTML canvas animations.
This is the tooling from [canvas-recorder](https://github.com/TradeIdeasPhilip/canvas-recorder), packaged as a library, so each video can be its own small project.

**Status:** in use for published videos.
It's still growing: while the version is 0.x, a change that could break your project comes with a new minor version (0.5 → 0.6), and [BREAKING-CHANGES.md](BREAKING-CHANGES.md) says what changed and how to update.

**Source:** https://github.com/TradeIdeasPhilip/canvas-recorder-lib

**API docs:** https://tradeideasphilip.github.io/canvas-recorder-lib/

**Try it:** the [Simple Video Editor](https://tradeideasphilip.github.io/canvas-recorder-lib/simple-video-editor/) is this library's player and Visual Editor with an empty project: open video clips from your computer, add text and callouts, and save an MP4.
Its source is in [simple-video-editor/](https://github.com/TradeIdeasPhilip/canvas-recorder-lib/tree/master/simple-video-editor).

**Showcase:** the [showcase](https://tradeideasphilip.github.io/canvas-recorder-lib/tests/showcase.html) is a series of slides that show what the library can do, one topic per slide.
Looking for code or ideas to copy? Start there.
Its source is in [test-project/src/showcase/](https://github.com/TradeIdeasPhilip/canvas-recorder-lib/tree/master/test-project/src/showcase), one file per slide.

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

## Quick Examples to Copy

If you want to create a new video you need to start by creating a new project.
At the time of this writing the [7 pointed stars](https://github.com/TradeIdeasPhilip/7-pointed-star) video is the most up to date example.
You can start a new project using [degit](https://github.com/Rich-Harris/degit) to copy this.

Note: The embedded test projects show how to write code that uses this library.
But don't try to copy the entire project.
Files like .gitignore and package.json will be different for embedded projects like these and stand alone projects like yours.
This refers to simple-video-editor and showcase found in this repository.

Note: [Riemann](https://github.com/TradeIdeasPhilip/riemann-surfaces-3d) provides a different type of example.
This shows how to attach this library to a project that was not specifically developed for this library.

## Quick Instructions for Publishing

Start with everything committed.

1. **Check.** `npm run check` looks for Prettier formatting (without changing anything), checks the imports, and type-checks.
   If Prettier complains: `npm run format`, test again, and commit.
2. **Breaking changes?** If [BREAKING-CHANGES.md](BREAKING-CHANGES.md) has an "Unreleased" section, change that heading to the new version and today's date, and commit.
3. **Bump the version.** This makes a commit and a tag.

   | Command             | When                                                                  | Example       |
   | ------------------- | --------------------------------------------------------------------- | ------------- |
   | `npm version patch` | Nothing breaking                                                      | 0.7.1 → 0.7.2 |
   | `npm version minor` | BREAKING-CHANGES.md has an "Unreleased" section                       | 0.7.1 → 0.8.0 |
   | `npm version major` | Going to 1.0 (see [release-1.0.md](development-plans/release-1.0.md)) | 0.7.1 → 1.0.0 |

4. `git push --follow-tags`. Pushing also publishes the API docs and the showcase.
5. `npm whoami` says whether you're logged in. If not, `npm login`, which opens a browser. Logins time out eventually.
6. `npm publish`. It opens a browser to confirm, even right after `npm login`.
   It empties and rebuilds `dist/` first, so restart `npm run dev` in `test-project/` or `simple-video-editor/` if it's running. `npm run watch` can keep running.

The new version can take a few minutes to appear. Check the library's [npm page](https://www.npmjs.com/package/canvas-recorder-lib) before installing it.

Then, in each project that uses the library:

```bash
npm install canvas-recorder-lib@0.7.2    # the new version
npx tsc --noEmit                         # a breaking change shows up here
git commit -m "canvas-recorder-lib 0.7.2" package.json package-lock.json
```

Restart that project's `npm run dev`: Vite only notices a new version of a dependency when it starts.

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
    If your `~/.npmrc` approves `fsevents` (Vite's file watcher on macOS), approve it again here: `npm install-scripts approve fsevents --no-allow-scripts-pin`.
    In a new project that fails with `ENOMATCH`, because the first `npm install` doesn't put `fsevents` in `node_modules`.
    Run `npm install` again (it warns that `fsevents` isn't approved), then approve it.
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
  base: "./",
  resolve: {
    dedupe: ["phil-lib"],
  },
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
  build: {
    rolldownOptions: { output: { keepNames: true } }, // Vite 8.  Vite 7:  rollupOptions.
  },
});
```

- **`base: "./"`:** relative paths, so the build works on GitHub Pages, or in any subdirectory.
- **`dedupe`:** one copy of phil-lib. With the library linked, Vite would otherwise load two: yours, and the one in the library's `node_modules`.
- **`fs.allow`:** needed while the library is linked.
  Without it, the server console says the transcription worker is "outside of Vite serving allow list", and transcripts fail.
  A linked library lives outside your project. Vite serves files that are imported, but the worker is loaded by URL.
  Setting `allow` turns off Vite's default, so your own folder has to be listed too; that's what `searchForWorkspaceRoot()` is for.
- **`optimizeDeps.include`:** without it, the first Import audio or transcript reloads the page, under `npm run dev` only.
  Only the transcription worker imports that package, and Vite doesn't look inside workers when it starts, so it finds the package late and reloads to use it.
- **`keepNames`:** the Visual Editor writes TypeScript that names each component's class (Sync diffs, and `properties/*.txt`).
  In a minified production build, like your GitHub Pages copy, those names come out as `hi` and `Nr` without it.
- **A fixed port:** the editor saves your work in the browser (IndexedDB), and the browser keeps a separate copy for each origin.
  If another project already has the port, Vite quietly moves to the next one (5173 → 5174), and the editor seems to forget everything.
  `strictPort` makes that an error instead.

### Ports

Each project that uses this library gets its own port, forever.
Changing the port loses the editor's saved work, because IndexedDB belongs to the origin, and the port is part of the origin.
For a new project, take the next number and add it here.

| Port | Project                                                                                                                                         |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 5173 | [canvas-recorder](https://github.com/TradeIdeasPhilip/canvas-recorder) (Vite's default; historical)                                             |
| 5174 | [riemann-surfaces-3d](https://github.com/TradeIdeasPhilip/riemann-surfaces-3d)                                                                  |
| 5175 | [affine-transforms](https://github.com/TradeIdeasPhilip/affine-transforms)                                                                      |
| 5176 | [`test-project/`](https://github.com/TradeIdeasPhilip/canvas-recorder-lib/tree/master/test-project) in this repo: the showcase, tests and tools |
| 5177 | [`simple-video-editor/`](https://github.com/TradeIdeasPhilip/canvas-recorder-lib/tree/master/simple-video-editor) in this repo                  |
| 5178 | 7-pointed-star                                                                                                                                  |

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
  After a reload it may want your OK again: click **🔓 Allow local files**.
  The Save dialog checks every local file before it starts, so a long recording can't stop halfway to ask.
  In your own code, read media with `fetchMedia()`, which understands `local:` URLs.
- **Save the editor's state into your project, so it's in git.** The editor always saves inside the browser (IndexedDB), which git can't see.
  Make a `properties/` folder, and point **💾 Save As**, the **Save defaults** checkbox, and **Save Diffs** at it.
  The browser remembers each choice, so after the first time they keep saving there.
  Add a `properties/README.md` explaining the three files; copy [riemann-surfaces-3d's](https://github.com/TradeIdeasPhilip/riemann-surfaces-3d/blob/master/properties/README.md).
- **Register your own components** with `componentRegistry.set(key, { create })`.
  Then the Visual Editor can add, save and load them, and "TypeScript defaults" can rebuild them.
- **A mistake in the Visual Editor is a state, not an error.** Your components should treat it that way:
  - Show a warning, in the editor or on the canvas. Never throw, and never a dialog box.
  - Save it like any other state. Editing between two good states often passes through bad ones.
  - Draw as much as still makes sense. Values in worse shape can come back from IndexedDB or a file, so fail gracefully and make them easy to fix.
  - Throwing while saving a video is only for external failures, like an image or video that doesn't load.
  - Assertions are still fine for the programmer's own mistakes, like a table of values checked when the program starts.
- **Name a replaceable child with `userEditableDescription`,** not the constructor's `description`, when your code adds one with `replaceableComponents.push()`.
  When the editor loads saved changes, it rebuilds those children from the registry, so a `description` from your constructor comes back as the registry's default.
  `userEditableDescription` is saved with the rest, and the diff file uses it to match each child with its TypeScript.

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
Since 2026-10-14, this library is the master copy: new features and fixes start here.
`imported-files.txt` lists what was copied, and from which canvas-recorder commit.

## Build

```
npm install
npm run build    # or:  npm run watch
npm run clean    # empty dist/
npm run docs     # API docs, in docs/
npm run format   # Prettier
npm run check    # Prettier, imports and types, without changing anything
```

VS Code formats TypeScript, JavaScript, CSS and JSON on save, with the Prettier in `devDependencies` (see `.vscode/settings.json`).
Markdown and HTML are left alone: `.prettierignore` says why.

Output goes to `dist/`: `.js`, `.d.ts`, source maps, plus the CSS and JSON files the JavaScript imports.

Every relative import names its file, like `from "./utility.ts"`, and `npm run build` stops if one doesn't.
tsc turns `.ts` into `.js` in `dist/`, which works everywhere; an import with no extension only works where a tool like Vite guesses it.

`build` and `watch` only add and overwrite files in `dist/`, so a project's running dev server never sees it empty.
A deleted or renamed source file leaves its old output behind until `npm run clean`.

A project that has linked this library (see [Working on the library at the same time](#working-on-the-library-at-the-same-time)) sees a change as soon as `npm run watch` recompiles it.

The Simple Video Editor is a separate npm project inside this repo. [simple-video-editor/README.md](simple-video-editor/README.md) says how to run it.

To publish a new version, see [Quick Instructions for Publishing](#quick-instructions-for-publishing).
