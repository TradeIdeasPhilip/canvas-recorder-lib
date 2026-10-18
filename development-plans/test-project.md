# Test Project

A home for the main programs that test and support this library.

**Status (2026-10-17):** Planning. No code yet.

## Goals

- **Test pages.** Each one exercises a feature that is hard to see in a real video.
  The first is [slow-fonts.md](slow-fonts.md).
- **Don't lose anything from canvas-recorder.**
  canvas-recorder is historical now, and some of its features only ever got tested by hand, inside some video.
  If a test page uses a feature, a library change that breaks the feature's API breaks the test project's build.
- **Demos to screen-record.** A short video of a feature, made with the test project.
- **Development tools.** Pages like the Font Inspector, which help build the library rather than test it.

## Decision:  a folder in this repo (2026-10-15)

The test project is `test-project/`, inside canvas-recorder-lib, not a separate repository.

Both layouts are common.
three.js keeps its `examples/` in the library's repo, with an index page; many smaller libraries have a separate demo repo.
Here, the same repo wins:

- **GitHub Pages works.** A separate project depends on `"file:../canvas-recorder-lib"`, which doesn't exist on GitHub's build machine.
  (See [new-project-lessons.md](new-project-lessons.md#filecanvas-recorder-lib-breaks-github-pages-2026-10-14).)
  Inside this repo, the library is right there.
- **It's a regression test.** One push builds the library and every test page together.
- **One website.** The API docs and the live test pages share one URL, so the docs can link to working examples.
- **It stays out of the library's way.**
  - The `files` whitelist in package.json already keeps it out of the npm package.
  - The library's `tsconfig.json` and `typedoc.json` list their folders explicitly, so neither picks it up.

The trade-off: it doesn't follow the README's new-project instructions exactly (`file:..`, not `file:../canvas-recorder-lib`).
The other small projects we're about to make will test those instructions.

## Layout

```
test-project/
  package.json        private; "canvas-recorder-lib": "file:..", phil-lib, vite, typescript
  vite.config.js      copied from affine-transforms; see below
  tsconfig.json       copied from affine-transforms
  index.html          a plain list of the other pages
  slow-fonts.html     one HTML file per page …
  src/slow-fonts.ts   … and one main program for each
  public/             delay-files-sw.js, sounds, images
  properties/         saved editor state, one set per page (see the README)
```

### `vite.config.js`

Start from [affine-transforms' copy](https://github.com/TradeIdeasPhilip/affine-transforms/blob/f73595cecfc7399f278eddd699a7befa880ad78a/vite.config.js), and change:

- **`server.port: 5176`**, with `strictPort: true`.  See [Ports](../README.md#ports).
- **`fs.allow`:** `[".."]` covers the library and this folder.
- **`build.rollupOptions.input`:** list every HTML file.
  Otherwise a page works under `npm run dev`, but silently disappears from `npm run build`.
  [canvas-recorder's vite.config.js](https://github.com/TradeIdeasPhilip/canvas-recorder/blob/master/vite.config.js) shows the pattern.
- **`build.outDir`:** wherever the workflow wants it (see [Deploy](#deploy)).

Keep `base: "./"`, `target: "esnext"` and `resolve.dedupe: ["phil-lib"]`.
The library's own `node_modules` has a copy of phil-lib (a devDependency), and without `dedupe` the page can end up with two.

### `index.html`

A plain list of links, like [canvas-recorder's index.html](https://github.com/TradeIdeasPhilip/canvas-recorder/blob/master/index.html):  an `<h1>`, a `<ul>` of pages with an emoji each, and a short "About".
Add a line to it with every new page.

### One origin, many pages

Every page in the test project is served from the same origin (`localhost:5176`), so they share browser storage.

- **Give each page its own `name`** in `canvasRecorder.start(showable, { name })`.
  That keeps each page's saved editor state (IndexedDB, sessionStorage, save files) separate.
- **The service worker covers every page.**
  Its scope is the folder it's served from, which is the root.
  It only delays the files it lists, so the other pages don't notice.

## Day to day

```bash
npm run watch                      # in canvas-recorder-lib
cd test-project && npm run dev     # http://localhost:5176/
```

The test project uses the library's compiled `dist/`, like every other consumer, so keep `npm run watch` going.

## Deploy

Extend [.github/workflows/docs.yml](../.github/workflows/docs.yml), which already publishes the API docs:

1. `npm ci` and `npm run build` in the root, so `dist/` exists.
2. `npm run docs`.
3. `npm ci`, `npx tsc --noEmit` and `npm run build` in `test-project/`.
   The `tsc` is the regression test.
4. Upload one site:
   - `/` is the API docs (today's https://tradeideasphilip.github.io/canvas-recorder-lib/);
   - `/tests/` is the test project's `index.html` and pages.

Then the README can link to live examples, and so can the docs.

**Fonts on the public site.** Some test slides use macOS system fonts (see [slow-fonts.md](slow-fonts.md#the-fonts-on-slide-1)).
They work on your Mac, but a visitor on Windows sees a fallback font, and recording fails with "Font family … was not found."
That's fine for test pages; just don't make them the first thing a stranger sees.

## Pages

| Page | Status | Notes |
| --- | --- | --- |
| `index.html` | Planned | The list. |
| 🐢 Slow Fonts | Planned | [slow-fonts.md](slow-fonts.md):  the delay-files service worker, and the slides it was made for. |
| 🔍 Font Inspector + Kerning | Idea | See below. |
| ❓ Help / sample | Idea | See below. |

### Font Inspector + Kerning

- The Font Inspector is in canvas-recorder's [src/shadow-test.ts](https://github.com/TradeIdeasPhilip/canvas-recorder/blob/master/src/shadow-test.ts#L1104), at `// MARK: Font Inspector`.
  It shows the line font's metric lines and a zoomed glyph.
- Copy it without the shadow, which was what the rest of that file was testing.
- Add a "Kerning" slide: a Multi Text holding the letter pairs that have problems, as a placeholder.
  [kerning.md](from-previous-project/kerning.md) lists them.
- library-split.md called these the `canvas-recorder-dev` project, deferred until after the robots video.
  That video is out.

### Help / sample

library-split.md's `canvas-recorder-sample`:  start the library and show a help page, made from canvas-recorder's `showcase.ts`, with no external files.
That may be a better fit for the public site's `/tests/` front page than for a test.

### canvas-recorder's other pages

[library-split.md](from-previous-project/library-split.md#things-in-the-code-that-will-have-to-change) says to decide, for each one, whether it belongs in the library, in a tools project, or nowhere.
This folder is the tools project.

- 🎤 `sound-explorer.html`
- 🎬 `media-browser.html`
- 🧪 `random-tests.html`
- 🧐 `test-rig.html`

## Open items

Problems that affect every project using the library, like the separate projects' broken deploys and the gaps in the README's new-project instructions, are tracked in [new-project-lessons.md](new-project-lessons.md).

## Questions

- **Name.** `test-project/` is a placeholder.  `playground/`, `examples/` or `tools/` say different things about who it's for.
- **Shared code.** If two pages want the same helper, it goes in `test-project/src/`.  If a third wants it, maybe it belongs in the library.
