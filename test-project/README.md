# Showcase, tests and tools

The **showcase** for canvas-recorder-lib, plus pages that test and support the library.
**Looking for code or ideas to copy?  Start in the showcase.**

The published copy is at https://tradeideasphilip.github.io/canvas-recorder-lib/tests/.

| Page | What |
| --- | --- |
| [showcase.html](showcase.html) | 🖼️ Slides that show what the library can do, one topic per slide.  New library features usually show up here first. |
| [sound-test.html](sound-test.html) | 🔊 Checks that live playback sounds the same as a saved video, through edits and speed changes.  Silent:  it plays into an `OfflineAudioContext`.  Run it after changing `dev/soundtrack.ts` or `dev/audio-builder.ts`. |

The showcase, the user documentation and the test cases overlap a lot.
A slide shows off a feature, shows how to use it, and fails to build when a library change breaks it.

## The showcase

- [src/showcase/](src/showcase/):  one file per slide.  Each file exports one function that builds its slide.
  If you're looking for one feature, look for its file.
- [src/showcase/scene-list.ts](src/showcase/scene-list.ts):  which slides play, in what order, all in one place.
- [src/showcase/shared.ts](src/showcase/shared.ts):  the few settings many slides use, like the title font.
  Helpers shared by just a few slides have their own files:  `lissajous-shared.ts`, `multi-text-manual.ts` and `walking-man.ts`.
- [src/showcase.ts](src/showcase.ts):  the page's main program.

**To add a slide:**  copy a small slide file, change it, and add its function to `showcaseSlides` in `scene-list.ts`.

The slides came from canvas-recorder's `src/showcase.ts` (5,800 lines in one file), split up on 2026-11-02.
Its sound track wasn't copied.

## Running it locally

```
# Once, and after changing the library:  build the library, in the repo's root folder.
npm install
npm run build

# Then, in this folder:
cd test-project
npm install
npm run dev        # http://localhost:5176/
```

Leave `npm run watch` running in the root folder, in its own terminal.
It compiles each change to the library into `dist/`, and Vite reloads the page by itself.
(Or run `npm run build` there after each change.)
`watch` copies the CSS only when it starts, so restart it after changing a library `.css` file.

The first `npm install` here may leave out `fsevents` (Vite's file watcher on macOS), although it's in `package-lock.json`.  A second `npm install` adds it.

## A package inside a package

This folder is its own npm project, like [simple-video-editor/](../simple-video-editor/).
Its one dependency on the library is `"canvas-recorder-lib": "file:.."`, so it always uses the library's newest *compiled* code, in `../dist/`.
That's why the library has to be built first, and why the showcase is a good place to try a library change before it's published.

The library's own dependencies, like phil-lib and colorizr, aren't installed here.
Imports of them find the library's copies in `../node_modules/`, so there's only ever one copy.

## Publishing

Nothing to do by hand.  On every push to master, [.github/workflows/docs.yml](../.github/workflows/docs.yml) builds the library, then this project (`npm ci`, `npm run build`), and publishes it under `/tests/`, next to the API docs and the Simple Video Editor.

`npm run build` runs `tsc`, then `vite build`, into `dist/`.
Every page has to be listed in `vite.config.js`'s `input`, or it silently disappears from the build.

See [development-plans/test-project.md](../development-plans/test-project.md) for the plans.
