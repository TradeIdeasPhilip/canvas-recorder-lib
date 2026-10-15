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
npm run build   # tsc → dist/, plus CSS copied by scripts/copy-assets.mjs
npm run watch   # the same, continuously
```

**Don't run `npm run import`.** It copies `dev/` and `src/` from canvas-recorder, replacing everything there, which only made sense while canvas-recorder was the master.

No test runner, no linter, no dev server.  TypeScript errors surface in the IDE and on `npm run build`.

## Seeing a change

There's no page in this repo.  Run a project that uses the library (add it with `/add-dir`):

| Project | Port | What |
| --- | --- | --- |
| `../affine-transforms` | 5175 | The video in active development (formerly canvas-recorder's `some5`) |
| `../riemann-surfaces-3d` | 5174 | three.js robots, recorded with `src/full-screen-component.ts` |

Each links the library with `"canvas-recorder-lib": "file:../canvas-recorder-lib"` and uses its compiled `dist/`.
So run `npm run build` (or keep `npm run watch` going) here, then reload the page there.

## Releasing a change

1. `npm run build`, then bump the version: `npm version minor --no-git-tag-version` (or `patch`).  Commit.
2. In each project that uses the library:  `npm install`, `npx tsc --noEmit`, and commit `package-lock.json`.
3. Plain `git push`.

## Layout

```
lib/main-control.ts   ← canvasRecorder: the main control object (resolution, units, fps, start())
lib/index.ts          ← what `import … from "canvas-recorder-lib"` gets
dev/                  ← the player GUI and Visual Editor (the folder name is historical)
dev/canvas-recorder.ts← the player:  one big module, loaded by canvasRecorder.start()
dev/player-body.ts    ← the player's HTML, which start() puts in the page
src/                  ← Showable, components, interpolation, glib…
src/slide-components/ ← everything the Visual Editor can create; registry.ts lists them
scripts/              ← build helpers (and the old import script)
dist/                 ← build output, gitignored
README.md             ← for users of the library, including notes for consumer projects
```

Consumers import the common pieces from `canvas-recorder-lib` and anything else by path,
e.g. `canvas-recorder-lib/src/glib/path-shape` (the `"./*"` export maps to `dist/*.js`).

## Library Gotchas

- **The output is compiled JavaScript.**  tsc rewrites `import "./x.ts"` to `./x.js` (`rewriteRelativeImportExtensions`), but not strings.  So `new URL("./worker.js", import.meta.url)` must name the `.js` file.
- **tsc doesn't copy CSS.**  `scripts/copy-assets.mjs` does.  JSON imports are emitted by tsc.
- **`start()` loads the player with one dynamic `import()`**, so the player's top-level code runs after the request is in place.  Don't add a top-level `await` to the player, and tell consumers not to `await start()` at their top level:  either one can hang the page with no error.
- **`canvasRecorder` settings freeze at `start()`.**  Read them while drawing, not at module load.  Some components still assume 16 × 9.
- **Export names must be ASCII.**  Rollup truncates names at the first character above U+00FF.

## Coordinate System

The canvas is always **16 units wide × 9 units tall**, regardless of actual pixel dimensions. The root transform (`scale(canvas.width/16, canvas.height/9)`) is applied before any `show()` call. All drawing uses these logical units. Never work in pixels directly.

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

| Class                                | Purpose                                                                                                     |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `MakeShowableInSeries`               | Plays children one after another. `duration=0` children are hidden in the GUI — give them nonzero duration. |
| `MakeShowableInParallel`             | Plays all children simultaneously; total duration = max of children. `duration=0` children are fine here.   |
| `makeRepeater(showable, count)`      | Loops a showable. `count` can be `Infinity`.                                                                |
| `addMargins(base, extra)`            | Adds hidden/frozen time before or after a showable.                                                         |
| `reschedule(base, duration, offset)` | Changes duration and/or start time.                                                                         |

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

**`src/glib/my-rainbow.ts`** — `myRainbow`: a curated array of colors used as the default palette throughout.

**`src/glib/line-font.ts`** + **`src/glib/paragraph-layout.ts`** — stroke-based text rendered as `PathShape` (encoder-friendly, no raster fonts).

**Available font characters:** `internals.md` lists every character in `makeLineFont()`, `Font.futuraL()`, and `Font.cursive()` with Unicode code points. Consult it before using any non-ASCII character in text content. (It was generated by canvas-recorder's `npm run internals`; this library doesn't have the generator yet.)

## Pixel-Perfect Encoding Notes

- **Avoid blurs, noise, and gradients** — they look fine on screen but degrade badly after HEVC encoding and YouTube compression.
- **Prefer filled/stroked paths** — solid objects with crisp edges survive encoding best.
- Time and space stay continuous until the last moment; never convert to pixels/frames early.

## GUI Inputs

HTML input elements listen for `input` (fires on every keystroke), not `change` (fires only when the field loses focus or Enter is pressed). Previews, status panels and validation should update while the user types. Use `change` only with a specific reason, and say why in a comment.

## Comments

The user likes JSDoc style comments and VS Code's "MARK:" style comments.
