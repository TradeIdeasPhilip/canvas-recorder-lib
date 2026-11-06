# Automated Tests

Start testing automatically, with Playwright, in the test project.  The first test:  save files round-trip.

**Status (2026-11-03):** Planning.  No test framework yet.

## Why now

The only automatic check today is `tsc`:  the GitHub workflow builds the showcase, so an API change that breaks a slide fails the deploy.
That catches renames.  It doesn't catch a component that saves its settings wrong.

Save files are the one thing that hurts to get wrong:  they're your work, and a property that doesn't round-trip looks fine until a reload loses it.
The save code is self-contained, so it's an easy first test.

## The tool

[Playwright Test](https://playwright.dev/docs/intro) (`@playwright/test`) drives a real Chrome, so it tests exactly what the videos run on:  canvas, WebCodecs, IndexedDB, the File System Access API.

- **Where:**  in `test-project/`, as a devDependency.  Tests in `test-project/tests/*.spec.ts`.  `npm test` runs them.
- **The server:**  Playwright's `webServer` setting starts `npm run dev` on port 5176 and waits for it, or reuses one that's already running.
- **The browser:**  `channel: "chrome"` uses the Google Chrome already in /Applications, so nothing big is downloaded.
  (Playwright's own Chromium, chromium-1243, is also already in `~/Library/Caches/ms-playwright/`, from earlier checks.)
- **Chrome only.**  The library uses Chrome-only APIs, so there's no point testing Firefox or Safari.
- **The library has to be built first**, like any other use of the test project:  `npm run build` in the root.
- **Later, in CI:**  `npx playwright install --with-deps chromium` in the workflow, then `npm test`.  Not needed to start.

## The first test:  save and load

A page that uses the library directly, without the player:  `test-project/round-trip.html` and `src/round-trip.ts`.
Add it to `vite.config.js`'s `input`.

For **every component in `componentRegistry`**, the same steps:

1. `create()` a fresh one.
2. Give **every** schedule and scalar a value that isn't its default, chosen by type:  a number plus 1, a string with "x" added, the next choice in a select, a different color, a moved rectangle.
   Two keyframes instead of one for schedules, with an easing on one of them.
3. `serializeTree()` ([src/snapshot.ts:253](../src/snapshot.ts#L253)), `JSON.stringify()`, `JSON.parse()`.
4. `create()` another fresh one, and `applyTree()` the parsed tree to it.
5. `serializeTree()` that one too.  The two JSON strings must be identical.

Then the same again through the path a file takes:  `omitTreeDefaults()` on the way out and `fillTreeDefaults()` on the way in ([:442](../src/snapshot.ts#L442), [:507](../src/snapshot.ts#L507)).

The page puts its results on `window`, and the test reads them with `page.evaluate()` and checks every component passed.
One failure names the component and the property.

**Why every component and every property, generically:**  the usual bug is a new property that never got pushed onto `schedules` or `scalars`, or a constructor that ignores a saved value.
A generic test finds those in components nobody thought to test, including ones added later.

## More tests, later

Ideas, roughly in order of value:

- **Pure functions.**  Frame math (`firstFrameAtOrAfter()` in the player), `parseTermGroups()`, sound clip cutting (`cutOutOfSoundClip()`).  Small, fast, easy.
- **Record a second of video.**  Replace `window.showSaveFilePicker()` in the page with one that returns a file from the browser's private file system (`navigator.storage.getDirectory()`), click Record, then read the file back with Mediabunny:  the frame count, the size, a sound track.
- **The sound fixes** in [live-sound-mixing.md](live-sound-mixing.md):  call the rebuild from a fake drag many times per frame, and check that memory stays flat and the last request wins.
- **Screenshots** of showcase slides at fixed times (`toHaveScreenshot()`).  Catches drawing changes, but fonts and GPUs differ between machines, so keep it local, or use a tolerance.

## Steps

1. `npm install -D @playwright/test` in `test-project/`, a `playwright.config.ts`, and `"test": "playwright test"`.
2. `round-trip.html` and the test.
3. A line in test-project/README.md and CLAUDE.md:  `npm test` in `test-project/`.
