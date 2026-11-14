# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

canvas-recorder-lib: the tooling for making math animation videos, as an npm library.
That means the player GUI, the Visual Editor, the HEVC encoder glue, the audio mixer, the slide components and the graphics library (glib).
Each video is its own small project that depends on this library.
The author makes math education videos (3b1b/SoME audience).

**This library is the master copy** (since 2026-10-14).
It came from [canvas-recorder](../canvas-recorder), which is now historical: look there for history, old videos and `development-plans/`, but make changes here.

## Commands

```bash
npm run build   # check the imports, tsc → dist/, plus CSS copied by scripts/copy-assets.mjs
npm run watch   # the same, continuously
npm run clean   # empty dist/.  build and watch never do, so a consumer's running Vite never sees it empty.
npm run docs    # TypeDoc → docs/ (gitignored).  Config in typedoc.json.
npm run format  # Prettier, in place
npm run check   # Prettier, imports and tsc, changing nothing.  Step 1 of a release.
```

**Prettier:**  VS Code formats on save (`.vscode/settings.json`), so format code as you write it:  run `npx prettier --write` on each code file you change, before testing.  Never reformat a file the user didn't ask to change.
Markdown, HTML and the editor's `properties/` files are excluded (`.prettierignore` says why).  Keep the two spaces after a period in markdown.

The API docs publish themselves:  `.github/workflows/docs.yml` runs TypeDoc on every push to master and deploys to https://tradeideasphilip.github.io/canvas-recorder-lib/.
They come from the JSDoc comments, so a `{@link}` should name something TypeDoc can resolve; `npm run docs` lists the ones it can't.

**Don't run `npm run import`.** It copies `dev/` and `src/` from canvas-recorder, replacing everything there, which only made sense while canvas-recorder was the master.

No test runner, no linter, no dev server.  TypeScript errors surface in the IDE and on `npm run build`.

## Seeing a change

There's no page in this repo.  Run a project that uses the library (add it with `/add-dir`):

| Project | Port | What |
| --- | --- | --- |
| `../affine-transforms` | 5175 | The video in active development (formerly canvas-recorder's `some5`) |
| `../riemann-surfaces-3d` | 5174 | three.js robots, recorded with `src/full-screen-component.ts` |
| `test-project/` | 5176 | In this repo:  the **showcase** (`src/showcase/`, one file per slide, order in `scene-list.ts`), and later test and tool pages.  Uses `file:..`.  Published at `/tests/` |
| `simple-video-editor/` | 5177 | In this repo:  the library's editor with an empty project, for non-programmers.  Uses `file:..`.  Published at `/simple-video-editor/` |

Every project gets its own fixed port.  README.md's "Ports" table is the master list; add new projects there.

Each links the library with `"canvas-recorder-lib": "file:../canvas-recorder-lib"` and uses its compiled `dist/`.
So run `npm run build` (or keep `npm run watch` going) here, and Vite reloads the page there by itself.
That works for `test-project/`, `simple-video-editor/` and an `npm link`ed project, whose copy of the library is outside `node_modules`.

## Releasing a change

README.md's "Quick Instructions for Publishing" is the checklist the user follows.  Keep it right, and give the same advice.  In short:

0. `npm run check`.
1. If BREAKING-CHANGES.md has an "Unreleased" section, replace it with the version and date and commit, then `npm version minor`.  Otherwise `npm version patch`.  Either one commits and tags.  `git push --follow-tags`.
2. `npm publish`.  `prepublishOnly` empties and rebuilds `dist/` first.  (The user runs this:  it needs their npm login and 2FA.)
3. In each project that uses the library:  `npm install canvas-recorder-lib@<new version>`, `npx tsc --noEmit`, commit `package.json` and `package-lock.json`, and restart `npm run dev`.

**A breaking change gets an entry in BREAKING-CHANGES.md, under "Unreleased", in the same commit.**  Breaking means a project that uses the library could stop compiling or look different:
removing or renaming an export, changing a signature, or changing a component's default value (save files leave out defaults, so an old save would load differently).
Say what to do instead.  The library is a production tool now.
**A bug fix is a patch, even when it changes what's drawn:**  nobody depended on the wrong output.  Breaking means changing behavior that was working as intended.

Projects depend on the published version, so their GitHub Pages builds work.
To try unpublished library changes in a project, run `npm link ../canvas-recorder-lib` there.
That replaces `node_modules/canvas-recorder-lib` with a symlink, without touching `package.json` or the lock file.
`npm ls canvas-recorder-lib` shows `-> ./../canvas-recorder-lib` while the link is active.
Any later `npm install` or `npm ci` quietly puts the published copy back.

## Layout

```
lib/main-control.ts   ← canvasRecorder: the main control object (resolution, units, fps, start())
lib/index.ts          ← what `import … from "canvas-recorder-lib"` gets
dev/                  ← the player GUI and Visual Editor (the folder name is historical)
dev/canvas-recorder.ts← the player:  one big module, loaded by canvasRecorder.start()
dev/player-body.ts    ← the player's HTML, which start() puts in the page
dev/soundtrack.ts     ← live sound:  one node per sound clip; soundtrack.request() after any edit.  Tested by test-project/sound-test.html
dev/voice/            ← the voice recorder (🎙 Record mode):  mic, chirp, one WAV per clip.  Forked from riemann-surfaces-3d.  See development-plans/voice-recording.md
src/                  ← Showable, components, interpolation, glib…
src/slide-components/ ← everything the Visual Editor can create; registry.ts lists them
src/local-files.ts    ← `local:<name>` URLs for files on the user's computer; fetchMedia()
simple-video-editor/  ← a small app in this repo; .github/workflows/docs.yml builds and publishes it
test-project/         ← the showcase, and test pages; built and published the same way.  A new feature gets a slide here.
scripts/              ← build helpers (and the old import script)
dist/                 ← build output, gitignored
README.md             ← for users of the library, including notes for consumer projects
```

Consumers import the common pieces from `canvas-recorder-lib` and anything else by path,
e.g. `canvas-recorder-lib/src/glib/path-shape` (the `"./*"` export maps to `dist/*.js`).

## Library Gotchas

- **The output is compiled JavaScript.**  tsc rewrites `import "./x.ts"` to `./x.js` (`rewriteRelativeImportExtensions`), but not strings.  So `new URL("./worker.js", import.meta.url)` must name the `.js` file.
- **Every relative import names its file:  `"./x.ts"`, never `"./x"`.**  tsc leaves `"./x"` alone, and only Vite and tsx can guess the rest.  `npm run build` stops on one (scripts/check-imports.mjs).
- **tsc doesn't copy CSS.**  `scripts/copy-assets.mjs` does.  JSON imports are emitted by tsc.
- **`start()` loads the player with one dynamic `import()`**, so the player's top-level code runs after the request is in place.  Don't add a top-level `await` to the player, and tell consumers not to `await start()` at their top level:  either one can hang the page with no error.
- **Read `canvasRecorder`'s settings while drawing, not at module load.**  The size (`pixelWidth`, `pixelHeight`, `width`, `height`) can change at any time, from the GUI or from code, unless the main program calls `lockSize()`.  `fps` freezes at `start()`.  Some components still assume 16 × 9.
- **A component's default values must never depend on the canvas size.**  Save files leave out values equal to a fresh component's (`registryDefault()` in snapshot.ts), so a size-dependent default would load differently later.  Set a size-dependent value explicitly, as the Insert button does for a new Video Clip.
- **Media is read through `fetchMedia()`** (src/local-files.ts), not `fetch()`, so `local:` URLs work everywhere.
- **Export names must be ASCII.**  Rollup truncates names at the first character above U+00FF.

## Coordinate System

The canvas is **`canvasRecorder.width` units wide × `canvasRecorder.height` units tall** (16 × 9 by default), regardless of actual pixel dimensions. The root transform (`scale(canvas.width/width, canvas.height/height)`) is applied before any `show()` call. All drawing uses these logical units. Never work in pixels directly.

## Core Abstraction: `Showable`

Everything renderable is a `Showable` (defined in `src/showable.ts`):

```ts
type Showable = {
  description: string; // shown in the GUI tree
  duration: number; // milliseconds; must be > 0 in a series
  show(options: ShowOptions): void;
};
```

`ShowOptions` provides:

- `context` — the `CanvasRenderingContext2D` (16×9 space)
- `timeInMs` — time within this showable (0 → duration)
- `globalTime` — wall-clock ms from program start (use for effects that must not reset on loop)

**Canvas state contract:** `fillStyle`, `strokeStyle`, `lineCap`, `lineJoin`, `lineWidth`, and the current path are disposable. `transform` and `globalAlpha` must be restored with `save()`/`restore()`.

## Composing Showables

Use the components in `src/slide-components/`:

| Class                     | Purpose                                                                                                     |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `InSeriesComponent`       | Plays children one after another. `duration=0` children are hidden in the GUI — give them nonzero duration. |
| `InParallelComponent`     | Plays all children simultaneously.  `ComponentWithFixedDuration` and `DurationAgnosticComponent` build on it. |
| `PaddingComponent`        | Adds hidden, frozen or live time before or after its child, and shifts its start.                           |

**Deprecated:** `MakeShowableInSeries`, `MakeShowableInParallel`, `makeRepeater()`, `addMargins()` and `reschedule()` in `src/showable.ts`.
They only pass along `show()`, not `getFramePromises()` or `getReady()`, so recording won't wait for an image, video or font inside one.
Don't use them in new code.  See "Old builders" in `src/showable.ts` and `development-plans/release-1.0.md`.

## Seamless Loops

For a `Showable` meant to repeat seamlessly, any animated offset must return to its starting value at `timeInMs === duration`. The pattern for `strokeColors`:

```ts
// N must be a positive integer — ensures the offset completes exactly N full cycles
const relativeOffset = (timeInMs / DURATION_MS) * N;
```

## Key Modules (`src/`)

**`src/interpolate.ts`** — animation math:

- `Keyframe<T>` / `timedKeyframes()` — time-based keyframe lookup with interpolation
- `interpolateNumbers/Colors/Points/Rects()` — typed interpolators
- `ease`, `easeIn`, `easeOut`, `easeAndBack` — standard easing curves
- `progress` conventionally means a `number` in `[0, 1]`

**`src/stroke-colors.ts`** — `strokeColors(options)`:
Strokes a `PathShape` with multiple colors, cycling through them. Key options:

- `pathShape` — a `PathShape` (not a raw `Path2D`)
- `relativeOffset` — shift the color pattern along the path (animate for moving colors)
- `repeatCount` — how many full rainbow cycles appear along the path at once
- `sectionLength` / `colorCount` — alternative sizing controls
- `colors` — defaults to `myRainbow`

**`src/glib/path-shape.ts`** — `PathShape` and friends:

- `LCommand(x0, y0, x, y)` — line segment
- `QCommand` / `CCommand` — quadratic/cubic Bézier
- `PathBuilder` — fluent builder for complex paths
- `ParametricToPath` — converts a parametric function `(t) => {x, y}` into a `PathShape`
- `PathShape` methods: `.translate()`, `.transform()`, `.reverse()`, `.scale()`, `.canvasPath` (→ `Path2D`)

**`src/glib/transforms.ts`** — coordinate mapping:

- `panAndZoom(srcRect, destRect, mode)` — fits one rect into another (like SVG `preserveAspectRatio`)
- `applyTransform(context, matrix)` — applies a `DOMMatrix` to a context

**`src/glib/grid.ts`** — `drawGrid(context, { destRect, viewRect, ... })`:
Draws a labeled Cartesian grid. Uses math y-up convention. Labels render _outside_ `destRect`, so inset it from canvas edges to keep them visible.

**`src/glib/my-rainbow.ts`** — `myRainbow`: a curated array of colors used as the default palette throughout.  Its blue is `myRainbow.myBlue`; there's no `.blue`.  `cssBlue` is the darker one.

**`src/glib/line-font.ts`** + **`src/glib/paragraph-layout.ts`** — stroke-based text rendered as `PathShape` (encoder-friendly, no raster fonts).

**Available font characters:** `internals.md` lists every character in `makeLineFont()`, `Font.futuraL()`, and `Font.cursive()` with Unicode code points. Consult it before using any non-ASCII character in text content. (It was generated by canvas-recorder's `npm run internals`; this library doesn't have the generator yet.)
`fontCharacters()` and `missingCharacters()` in `src/glib/font-choices.ts` answer the same question in code, and the Visual Editor's Characters panel (select a Text Format or a Text) shows them all.

## Pixel-Perfect Encoding Notes

- **Avoid blurs, noise, and gradients** — they look fine on screen but degrade badly after HEVC encoding and YouTube compression.
- **Prefer filled/stroked paths** — solid objects with crisp edges survive encoding best.
- Time and space stay continuous until the last moment; never convert to pixels/frames early.

## User Errors

A mistake in the Visual Editor is a state, not an error.  Show a warning (in the editor or on the canvas), save it like any other state, and draw as much as still makes sense.
Never throw from `show()` over a user's value, and never a dialog box.  Throwing while saving a video is only for external failures, like a file that doesn't load.
Assertions are fine for the programmer's own mistakes.  README.md's "Starting the editor" says the same for consumers.

## GUI Inputs

HTML input elements listen for `input` (fires on every keystroke), not `change` (fires only when the field loses focus or Enter is pressed). Previews, status panels and validation should update while the user types. Use `change` only with a specific reason, and say why in a comment.

## Dialogs with live changes

A dialog whose changes show while it's open reverts the way ✎ Edit Text… does (dev/multi-text-dialog.ts):

- Every change is made right away, and the canvas follows.
- **Revert** puts back everything as it was when the dialog opened, and leaves the dialog open.  It's disabled until something changes.
- **Done** closes, and so does Escape.  Closing is always safe, since every change is already made.
- Save before the dialog changes anything (the `saveNow` hook), so the History dialog can bring back the state from before it opened.

The Load dialog and the font picker don't work this way yet:  see development-plans/saturday-afternoon.md.

## Comments

The user likes JSDoc style comments and VS Code's "MARK:" style comments.
