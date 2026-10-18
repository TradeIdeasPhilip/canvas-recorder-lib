# Slow Fonts

Bring back canvas-recorder's delay-files service worker, and the slides it was made to test.
They become the first page of the [test project](test-project.md).

**Status (2026-10-17):** Planning. No code yet. This tests a feature that already works, so there's no rush.

## The story

This library renders movies with web technology.
When a web font is slow, a web page falls back to another font and swaps the real one in later.
That's a fine way to show a web page, and a terrible way to record a movie.

It really happened.
Frames looked wrong, and then they fixed themselves before I looked again.
It took a while to believe it wasn't my imagination.

Now the code knows how to wait (see [How waiting works](#how-waiting-works)).
But real slow downloads were hard to reproduce, so I made a service worker that delays specific files by a fixed time.

The sample is "Witaj, świecie!", Polish for "Hello, world!", in Bevan.
It's all one language, but Google serves its characters in two different files, and the `ś` is in the other one.
So most of the phrase switches to Bevan, and then, a moment later, the `ś` does.
That looks really cool.

## Goals

- **Don't lose anything from canvas-recorder.**  This feature came with the library, but nothing has exercised it since.
- **A screen recording** for a short video about the effect.
- **A repeatable test** for the next time someone touches font loading or `getFramePromises()`.

## What's already here, and what isn't

**Already in the library:**

- [dev/delay-files.ts](../dev/delay-files.ts), unchanged from canvas-recorder.
  It adds `philDebug.loadServiceWorker()` and `philDebug.unloadServiceWorker()` to the console, and reports the worker's status.
- The player calls `watchServiceWorkerReady()` when it starts ([dev/canvas-recorder.ts:146](../dev/canvas-recorder.ts#L146)).
  So every page that uses the library has those console commands.
- `SW_URL` is `"./delay-files-sw.js"`, relative to the page, so the worker has to be served next to the HTML.

**Missing:** the worker itself, canvas-recorder's [public/delay-files-sw.js](https://github.com/TradeIdeasPhilip/canvas-recorder/blob/master/public/delay-files-sw.js).
A service worker has to be served from the app's own origin, and a library can't put a file in the consumer's `public/` folder.
That's why [library-split.md](from-previous-project/library-split.md#things-in-the-code-that-will-have-to-change) left it out of version 1.

(Calling `philDebug.loadServiceWorker()` in a project without the file fails:  Vite answers the unknown path with `index.html`, and the browser refuses to register a worker that isn't JavaScript.)

## The service worker

About 40 lines.
A `Map` from exact URL to delay in milliseconds; a `fetch` handler that waits that long, then fetches the file normally.
Anything not in the map passes straight through.

| File | Delay | Bevan's subset | Contains |
| --- | --- | --- | --- |
| `https://fonts.gstatic.com/s/bevan/v26/4iCj6KZ0a9NXjG8dWCvZtUSI.woff2` | 3000 ms | `latin` | U+0000–00FF and a few others: everything in "Witaj, świecie!" except the `ś` |
| `https://fonts.gstatic.com/s/bevan/v26/4iCj6KZ0a9NXjG8TWCvZtUSIL4U.woff2` | 5000 ms | `latin-ext` | U+0100–02BA and others, including `ś` (U+015B) |

Both are Bevan, normal style, weight 400.
I checked them against Google's CSS on 2026-10-15, and they still match.

A commented-out line delays an image from store.dftba.com: the π plushie in canvas-recorder's `src/showcase.ts`, from an earlier test of images.

**The URLs will go stale.** They include Bevan's version (`v26`).
When Google updates the font, the URLs change, and the delay silently stops happening:  no error, just fast fonts.
To check, fetch the CSS with a browser's user agent (Google sends different CSS to different browsers) and compare:

```bash
curl -s -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36" \
  "https://fonts.googleapis.com/css2?family=Bevan:ital@0;1&display=swap"
```

## The slides

Copy two slides from affine-transforms (which was canvas-recorder's `some5`):
[src/affine-transforms.ts](https://github.com/TradeIdeasPhilip/affine-transforms/blob/f73595cecfc7399f278eddd699a7befa880ad78a/src/affine-transforms.ts#L356-L414), `// MARK: Spacer` and `// MARK: Slide 1`, plus [src/slide1.json](https://github.com/TradeIdeasPhilip/affine-transforms/blob/f73595cecfc7399f278eddd699a7befa880ad78a/src/slide1.json).
That's the newest copy; canvas-recorder's `src/some5/` has an older one.

- **Spacer** (10 s):  a title and a sentence that drifts across the screen.
  Its text says why it's there: _"I don't want the next screen to appear in the preview. I want the cache to be clean until I hit 'record.'"_
  The page opens on the Spacer, so nothing asks for Bevan until you play or record into Slide 1.
- **Slide 1** (10 s, `DEFAULT_SLIDE_DURATION_MS`, which affine-transforms defines locally):  "Hello world" in 5 languages, each a Traditional Text with its own animated transform.
  It's `buildComponents(slide1)`, loaded into the slide's replaceable components.

### The fonts on Slide 1

| Text | Font | Where it comes from |
| --- | --- | --- |
| Hello World! | Modak | macOS (a downloadable system font) |
| שָׁלוֹם עוֹלָם | Frank Ruhl Libre | Google Fonts |
| 你好世界 | American Typewriter, weight 800 | macOS |
| Witaj, świecie! | Bevan | Google Fonts, **delayed** |
| हैलो वर्ल्ड | AppleMyungjo | macOS |

The Google Fonts come from `@import` lines in [dev/style.css](../dev/style.css), which the player's CSS imports.
A web font only downloads the first time something draws with it, so loading the page doesn't fetch Bevan.

Three of the five are Mac system fonts, so recording this slide on anything but a Mac fails with "Font family … was not found."
That's the check in `getFramePromises()` doing its job.

## How waiting works

`TraditionalTextComponent.getFramePromises()` ([src/slide-components/traditional-text.ts:289-349](../src/slide-components/traditional-text.ts#L289-L349)):

- calls `document.fonts.load(font, text)`.
  Passing the text, not the default single space, matters:  it loads every file whose characters the text uses, so the `ś` file is included.
- Then, if the family has an `@font-face` rule, `document.fonts.check(font, text)` must pass, or recording stops with an error.
- If it doesn't, the family must be an installed font (`queryLocalFonts()`), or recording stops with an error.

**Only recording calls `getFramePromises()`.**  Live playback draws whatever the browser has right now.
That's the difference this test shows.

## Steps

1. Set up the [test project](test-project.md), if it doesn't exist yet.
2. Copy `delay-files-sw.js` verbatim into `test-project/public/`.
   Fix its comment's pointer: "See dev/delay-files.ts" → "See canvas-recorder-lib's dev/delay-files.ts".
3. Copy `slide1.json` into `test-project/src/`.
4. Write `test-project/src/slow-fonts.ts`:  an `InSeriesComponent` with the Spacer and Slide 1, then `canvasRecorder.start(slowFonts, { name: "slow-fonts" })`.
   The imports become `canvas-recorder-lib/src/…` paths, as in affine-transforms.
5. Add `slow-fonts.html` to `vite.config.js`'s `rollupOptions.input`, and a "🐢 Slow Fonts" link to `index.html`.
6. Move the test instructions from the comment in `traditional-text.ts` into the page:  a short "how to run this test" in the HTML or the Spacer's text.

## How to test

From the comment in [traditional-text.ts:293-303](../src/slide-components/traditional-text.ts#L293-L303), with what to expect:

1. Open the page.  It starts on the Spacer.
2. `philDebug.loadServiceWorker()` in the console.
3. **Empty Cache and Hard Reload.**  This clears the HTTP cache, but a hard reload also bypasses the service worker, and `watchServiceWorkerReady()` warns that the page isn't controlled.
4. **Normal reload.**  Now the worker controls the page.  The console says `controllingThisPage: true`.
5. Then either:
   - **Play** from the Spacer into Slide 1.
     Expect "Witaj, świecie!" in a fallback font, then Bevan about 3 s after Slide 1 starts, except the `ś`, which follows at about 5 s.
     The other four lines are already right (or wrong for reasons unrelated to this test).
   - **Record.**
     Expect the recording to stall for about 5 s when it reaches Slide 1.
     Every saved frame shows the real Bevan, including the `ś`.

To run it again, reload:  once the page has a font, it never asks the network again.

**DevTools tips:**

- Application → Service Workers → **Update on reload** picks up edits to the worker without `loadServiceWorker()`.
- Don't check **Bypass for network** there.  It turns the delays off.
- `philDebug.unloadServiceWorker()` removes the worker.  On `localhost:5176` it only ever affects the test project's pages.

## Ideas (speculation, unverified)

- **The HTTP cache.**  A service worker sees requests before the browser's HTTP cache, so the delay should apply even when the file is cached, and step 3 may be unnecessary.
  The original instructions include it, and it's cheap, so keep it until we know.
- **Repeat without reloading.**  For the screen recording, it would be nice to replay the effect.
  A font the page already has can't be "unloaded", but the page could make a new `FontFace("Bevan", "url(…?run=2)")` each time, and the worker could match on the URL without the query.
- **A bigger effect.**  For the video, longer delays (3 s and 8 s?) and a bigger Polish line, or a slide with only that line.
- **Match patterns, not exact URLs.**  Something like `/fonts\.gstatic\.com\/s\/bevan\/v\d+\/4iCj6KZ0a9NXjG8T/` would survive a version bump, if Google keeps the file names.
  Or self-host Bevan in `public/`, so the URLs never change.  But then the test no longer goes to another server, like the real problem did.
- **Configure the delays from the page.**  A `postMessage` to the worker, or a query string on its URL (`delay-files-sw.js?…`), so each test page sets its own delays instead of editing a shared file.
- **Ship the worker in the library** (e.g. in the package's `files`, for consumers to copy).
  Not yet.  Its map is specific to this test.
- **More of the same.**  Slow images ([src/slow-image-sources.ts](../src/slow-image-sources.ts), and the commented-out line in the worker), and slow video clips.
- **On GitHub Pages.**  Service workers need https or `localhost`, and github.io is https, so the public copy should work too, scoped to `/canvas-recorder-lib/tests/`.
  Anyone could watch the effect.  Recording would fail without the Mac fonts.
