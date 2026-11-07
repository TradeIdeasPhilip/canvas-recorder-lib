# Test Project

A home for the main programs that test and support this library, starting with the showcase.

**Status (2026-11-02):** The folder exists, with one page:  the [showcase](../test-project/README.md), moved from canvas-recorder and split into one file per slide.
It's built and published with the API docs.  The other pages below are still plans.

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
  package.json        private; "canvas-recorder-lib": "file:..", vite, typescript
  vite.config.js      copied from simple-video-editor; see below
  tsconfig.json       copied from simple-video-editor
  index.html          a plain list of the other pages
  showcase.html       one HTML file per page …
  src/showcase.ts     … and one main program for each
  src/showcase/       the showcase's slides, one per file; scene-list.ts puts them in order
  public/             icon.png; later delay-files-sw.js, sounds, images
  properties/         (later) saved editor state, one set per page
```

phil-lib and the library's other dependencies aren't in `package.json`.
A `file:` link's dependencies aren't installed in the project that links it, so imports of them find the library's copies in `../node_modules/`.
That's also what keeps it to one copy of phil-lib.

### `vite.config.js`

Copied from [simple-video-editor's](../simple-video-editor/vite.config.js), with two changes:

- **`server.port: 5176`**, with `strictPort: true`.  See [Ports](../README.md#ports).
- **`build.rolldownOptions.input`:** lists every HTML file.
  Otherwise a page works under `npm run dev`, but silently disappears from `npm run build`.

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

Done (2026-11-02).  [.github/workflows/docs.yml](../.github/workflows/docs.yml) does the same steps for `test-project/` as for `simple-video-editor/`:
`npm ci` and `npm run build`, whose `tsc` is the regression test, then it copies `dist/` into the site:

- `/` is the API docs (https://tradeideasphilip.github.io/canvas-recorder-lib/);
- `/simple-video-editor/`;
- `/tests/` is the test project's `index.html` and pages.

The README links to the showcase.  The docs could link to slides too.

**Fonts on the public site.** Some test slides use macOS system fonts (see [slow-fonts.md](slow-fonts.md#the-fonts-on-slide-1)).
They work on your Mac, but a visitor on Windows sees a fallback font, and recording fails with "Font family … was not found."
That's fine for test pages; just don't make them the first thing a stranger sees.

## Pages

| Page | Status | Notes |
| --- | --- | --- |
| `index.html` | Done | The list. |
| 🖼️ Showcase | Done | canvas-recorder's `showcase.ts`, one slide per file.  See the [README](../test-project/README.md). |
| 🐢 Slow Fonts | Planned | [slow-fonts.md](slow-fonts.md):  the delay-files service worker, and the slides it was made for.  Maybe as showcase slides, now that there's a place for them. |
| 🎤 Sound Explorer | Later | Moved from canvas-recorder.  The voice recorder goes in the player first.  See [voice-recording.md](voice-recording.md#later). |
| 🔍 Font Inspector + Kerning | Idea | See below. |

### Font Inspector + Kerning

- The Font Inspector is in canvas-recorder's [src/shadow-test.ts](https://github.com/TradeIdeasPhilip/canvas-recorder/blob/master/src/shadow-test.ts#L1104), at `// MARK: Font Inspector`.
  It shows the line font's metric lines and a zoomed glyph.
- Copy it without the shadow, which was what the rest of that file was testing.
- Add a "Kerning" slide: a Multi Text holding the letter pairs that have problems, as a placeholder.
  [kerning.md](from-previous-project/kerning.md) lists them.
- library-split.md called these the `canvas-recorder-dev` project, deferred until after the robots video.
  That video is out.

### The showcase (done 2026-11-02)

This was library-split.md's `canvas-recorder-sample` idea:  start the library and show what it can do, made from canvas-recorder's `showcase.ts`, with no external files.

- canvas-recorder's 5,800-line `showcase.ts` became `src/showcase/`, one file per slide, each exporting the function that builds its slide.
  `scene-list.ts` lists them in order, like `src/slide-components/registry.ts` does for components.
  The few things many slides share are in `shared.ts`.
- **The sound track wasn't copied,** on purpose.  Neither was any reference to it.
  One slide's timing came from a sound clip's length; that's a plain number now.
- `fancy-text.ts` and `corner-rounder.ts` moved into the library's `src/`.  The import script had missed them, because nothing in the player uses them.
- The "Pixel Perfect Freaky Dot Patterns" slide is in `freaky-dots.ts` but not on the list, as in canvas-recorder:  not ready.
- New:  `fourier-morph.ts`, an experiment.  It morphs one shape into another by decomposing their difference.

### canvas-recorder's other pages

[library-split.md](from-previous-project/library-split.md#things-in-the-code-that-will-have-to-change) says to decide, for each one, whether it belongs in the library, in a tools project, or nowhere.
This folder is the tools project.

| Page | Suggestion |
| --- | --- |
| 🎤 `sound-explorer.html` | Move it here, after the player's voice recorder.  [voice-recording.md](voice-recording.md#later) has the steps. |
| 🎬 `media-browser.html` | A "quick strawman" for a CapCut-style media list (350 lines).  Easy to port:  it only imports Mediabunny and `src/slide-components/video-info.ts`, both in the library.  But first check whether the editor's Video Clip panel, now with local files, already does its job.  If it does, leave it in canvas-recorder's history. |
| 🧪 `random-tests.html` | "Scratch space for trying out browser APIs":  file handles, video, Mediabunny, fonts.  The experiments behind features that now exist.  History, unless one of them is needed again. |
| 🧐 `test-rig.html` | Opens every video on canvas-recorder's menu and clicks each one's save button.  The videos are separate projects now, with no shared menu.  History. |

### canvas-recorder's scripts

They're in canvas-recorder's [record/](https://github.com/TradeIdeasPhilip/canvas-recorder/tree/00058ed3fa7d3beec6bb21eebf6aa34094d355bf/record), run with `tsx`.
These belong in the library or nowhere, not in this folder.

| Script | Suggestion |
| --- | --- |
| `cli-info.ts` (`npm run info`) | An `ffprobe` replacement built on Mediabunny, which is already a library dependency.  Useful in every video project.  Maybe a `bin` in the library, so any project can run it with `npx`. |
| `cli-internals.ts` (`npm run internals`) | Writes `internals.md`.  CLAUDE.md notes that the library doesn't have this generator yet.  It belongs in the library's `scripts/`, with `@napi-rs/canvas` as a new devDependency. |
| `cli-record.ts` (`npm run record`) | Renders a video without a browser, with `@napi-rs/canvas`, and pipes it to ffmpeg as ProRes 4444 with alpha.  Tied to canvas-recorder's `dynamic-exports.ts`.  Leave it unless alpha output is needed again.  See [puppeteer-and-ffmpeg.md](from-previous-project/puppeteer-and-ffmpeg.md). |

## Open items

Problems that affect every project using the library, like the separate projects' broken deploys and the gaps in the README's new-project instructions, are tracked in [new-project-lessons.md](new-project-lessons.md).

## Questions

- **Name.** `test-project/` is a placeholder.  `playground/`, `examples/` or `tools/` say different things about who it's for.
  Sound Explorer and the voice recorder lean toward `tools/`, the showcase toward `examples/`.
  Renaming means changing the port table, CLAUDE.md, docs.yml and the published URL (`/tests/`).
- **Shared code.** If two pages want the same helper, it goes in `test-project/src/`.  If a third wants it, maybe it belongs in the library.
