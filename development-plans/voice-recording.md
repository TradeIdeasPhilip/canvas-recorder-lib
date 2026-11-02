# Voice Recording

Bring riemann-surfaces-3d's Record mode here, so the video editor can record its own voiceovers.
First into Sound Explorer, in the [tools folder](test-project.md); later into the library and the editor.

**Status (2026-10-27):** Planning.  No code here yet.
Record mode is still being tested in riemann-surfaces-3d.  Copy it when that's done.

## Why

From riemann's [record-mode.md](https://github.com/TradeIdeasPhilip/riemann-surfaces-3d/blob/9bbe2f919be045044607dd19b7f53120ea23b924/development-notes/record-mode.md#potential-reuse), "Potential Reuse":

> I've wanted to add *integrated* recordings into the video editor for a while.
> If we do it right, if we customize and perfect it for my needs, it will be better than any of the 3rd party tools I use now.
>
> In fact recording voiceovers might be the last major addition needed before the video editor could be considered "feature complete" and able to stand on its own.

**Why Sound Explorer first.**  It's much smaller than the editor, and its sound editing is mature, while the editor's is still being built.
Trying the recorder there doesn't touch the library or its npm package.

**Why not in canvas-recorder, where Sound Explorer lives today.**

- canvas-recorder doesn't use the library.  Its `src/` and `dev/` are older copies.
  The recorder's `transcribe.ts` already imports this library's transcriber.
- canvas-recorder has no `local:` files ([src/local-files.ts](../src/local-files.ts)).  Here, a take could become `local:take ….wav` and go straight into the editor.
- Anything built there would have to be ported again.

## What Record mode is

As of [9bbe2f9](https://github.com/TradeIdeasPhilip/riemann-surfaces-3d/commit/9bbe2f919be045044607dd19b7f53120ea23b924) (2026-10-23), which is still the newest change to its folder on 2026-10-27.

It records your voice, what you do, and what the app is doing, all on the audio clock.
The design and the measured numbers are in riemann's [record-mode.md](https://github.com/TradeIdeasPhilip/riemann-surfaces-3d/blob/9bbe2f919be045044607dd19b7f53120ea23b924/development-notes/record-mode.md).
How to use it is in its [README](https://github.com/TradeIdeasPhilip/riemann-surfaces-3d/blob/9bbe2f919be045044607dd19b7f53120ea23b924/src/recording/README.md).

Everything is in [src/recording/](https://github.com/TradeIdeasPhilip/riemann-surfaces-3d/tree/9bbe2f919be045044607dd19b7f53120ea23b924/src/recording), 1445 lines:

| File | Lines | What it does |
| --- | ---: | --- |
| `record-panel.ts` | 475 | The floating panel:  level meter, voice processing checkboxes, Record, Stop, and Marker. |
| `voice-recorder.ts` | 580 | The engine:  the mic, an AudioWorklet that copies the samples, the WAV and log files, and the calibration sounds.  No user interface. |
| `calibration-sounds.ts` | 143 | The Start, Stop, and Marker sounds, and the code that finds them in a recording.  Plain functions, so Node can use them too. |
| `folder.ts` | 77 | Remembers which folder the takes go in. |
| `analyze-take.ts` | 160 | A Node script.  Checks a take's timing, and writes a timeline that lines up with a transcript. |
| `transcribe.ts` | 10 | Wraps this library's `makeTranscript()`, for scripts. |

Each take is two files, written as the take goes:  `take <date> <time>.wav` (32-bit float, mono, 48 kHz) and `.jsonl` (the log).

**What the app supplies** ([riemann's src/main.ts:3296-3348](https://github.com/TradeIdeasPhilip/riemann-surfaces-3d/blob/9bbe2f919be045044607dd19b7f53120ea23b924/src/main.ts#L3296-L3348)):

```ts
const { openRecordPanel } = await import("./recording/record-panel");
recordPanel = await openRecordPanel({
  parent: getById("mainView"), // The panel floats in this element's bottom left corner.
  sample: recordingState, // The app's state, for the log, 20 times a second.
  describe: () => ({ app: "Riemann Walkabout", function: fn.id }), // The first line of each log.
  onClose: () => { … },
});
```

`sample()` and `describe()` are the only parts that know about the app.

## Copying it

**One master copy.**  When the folder is copied, the new place becomes the master.
Add a line to riemann's `src/recording/README.md` saying where it went, and stop editing riemann's copy.
Later riemann imports it from the library instead (see [Stage 2](#stage-2--into-the-library)).
Two copies being edited at once is the real risk.

**Copy whatever is newest in riemann**, not necessarily 9bbe2f9.
On 2026-10-27, four record mode items were still open in [feedback-2026-10-22.md](https://github.com/TradeIdeasPhilip/riemann-surfaces-3d/blob/9bbe2f919be045044607dd19b7f53120ea23b924/development-notes/feedback-2026-10-22.md#record-mode):

- noise suppression on by default
- a smoother level meter (meters usually average over about 300 ms)
- a calibration sound 15 to 20 dB quieter
- the voice peaking at full scale (turn the Mac's input volume down about 10 dB)

record-mode.md's "Not yet" list:  replay, cuts, finding the key clicks in the audio, and a "last good take" level for the voice marker.

**What travels without changes:**

- **The AudioWorklet** is a string in `voice-recorder.ts`, loaded through a Blob URL ([voice-recorder.ts:201-202](https://github.com/TradeIdeasPhilip/riemann-surfaces-3d/blob/9bbe2f919be045044607dd19b7f53120ea23b924/src/recording/voice-recorder.ts#L201-L202)).
  There's no separate worklet file, so CLAUDE.md's `new URL("./worker.js", import.meta.url)` gotcha doesn't apply.
- **The panel's styles** are a `<style>` element it makes itself ([record-panel.ts:208](https://github.com/TradeIdeasPhilip/riemann-surfaces-3d/blob/9bbe2f919be045044607dd19b7f53120ea23b924/src/recording/record-panel.ts#L208)).
  No CSS file, so nothing for `scripts/copy-assets.mjs` to do.

**What changes:**

- **Imports.**  The relative imports have no extension (`"./folder"`).  That's fine in a Vite app.
  In the library, add `.ts`, like every other library file (`rewriteRelativeImportExtensions`).
  `analyze-take.ts` already uses `.ts`, because Node runs it directly.
- **`transcribe.ts`** imports `canvas-recorder-lib/dev/transcripts`.  Unchanged in the tools folder.
  In the library, it becomes a relative import, or goes away:  it's 10 lines.
- **Saved settings belong to the origin, and every port is its own origin.**
  localStorage has `record-mode.processing` and `record-mode.sound-level`; IndexedDB has `record-mode` (store `folders`, key `takes`).
  So a new home asks for the takes folder again, and forgets the calibration sound's last level.
  On github.io every project shares one origin, so they share these settings too.

## Stage 1:  Sound Explorer, in the tools folder

The tools folder is [test-project.md](test-project.md)'s folder.  Its "canvas-recorder's other pages" lists Sound Explorer.

1. **Set up the tools folder**, if it doesn't exist yet.
2. **Port Sound Explorer as it is.**  From canvas-recorder at [00058ed](https://github.com/TradeIdeasPhilip/canvas-recorder/tree/00058ed3fa7d3beec6bb21eebf6aa34094d355bf):
   - [sound-explorer.html](https://github.com/TradeIdeasPhilip/canvas-recorder/blob/00058ed3fa7d3beec6bb21eebf6aa34094d355bf/sound-explorer.html), [dev/sound-explorer.ts](https://github.com/TradeIdeasPhilip/canvas-recorder/blob/00058ed3fa7d3beec6bb21eebf6aa34094d355bf/dev/sound-explorer.ts) (1384 lines) and [dev/sound-explorer.css](https://github.com/TradeIdeasPhilip/canvas-recorder/blob/00058ed3fa7d3beec6bb21eebf6aa34094d355bf/dev/sound-explorer.css).
   - [src/click-and-drag.ts](https://github.com/TradeIdeasPhilip/canvas-recorder/blob/00058ed3fa7d3beec6bb21eebf6aa34094d355bf/src/click-and-drag.ts) (261 lines).
     It never moved to the library, because only Sound Explorer used it.  It goes in the tools folder's `src/`.
   - Its other imports are already in the library:  `canvas-recorder-lib/src/glib/my-rainbow` and `canvas-recorder-lib/src/interpolate`, plus phil-lib.
3. **Small fixes while porting:**
   - **`fetch(soundUrl)`** ([sound-explorer.ts:559](https://github.com/TradeIdeasPhilip/canvas-recorder/blob/00058ed3fa7d3beec6bb21eebf6aa34094d355bf/dev/sound-explorer.ts#L559)) becomes `fetchMedia()`, so `?src=local:…` opens a local file.
   - **Its localStorage keys.**  Sound Explorer saves each file's clips with the file's URL as the key ([:1030](https://github.com/TradeIdeasPhilip/canvas-recorder/blob/00058ed3fa7d3beec6bb21eebf6aa34094d355bf/dev/sound-explorer.ts#L1030)).
     Its Open menu lists *every* localStorage key as a sound file ([:160-175](https://github.com/TradeIdeasPhilip/canvas-recorder/blob/00058ed3fa7d3beec6bb21eebf6aa34094d355bf/dev/sound-explorer.ts#L160-L175)).
     In a folder with other pages, the recorder's settings and the player's keys (`canvas-recorder-size|…`) would show up in that menu.
     Give its keys a prefix, like `sound-explorer|<url>`.
   - **`soundFileSuggestions`** ([:151-154](https://github.com/TradeIdeasPhilip/canvas-recorder/blob/00058ed3fa7d3beec6bb21eebf6aa34094d355bf/dev/sound-explorer.ts#L151-L154)) names two Sierpinski files from canvas-recorder's `public/`.
     Suggest the local files instead (`listLocalFiles()`).
   - **Old saved clips stay behind.**  Clip lists saved at localhost:5173 stay with that origin.  📋 Copy All anything worth keeping before switching.
4. **Copy `src/recording/` into the tools folder's `src/recording/`**, and add a 🎙 button to Sound Explorer.
   - `describe()`:  `{ app: "Sound Explorer" }`.
   - `sample()`:  maybe nothing at first.
     Later, what the explorer is showing (the file, the zoom, the selection), if that turns out to be useful.
5. **After ■ Stop, open the take.**  The recorder knows the folder and the file name.
   `folder.getFileHandle(name)`, then `addLocalFile()` ([src/local-files.ts:169](../src/local-files.ts#L169)), gives `local:take ….wav`.  Open Sound Explorer on that.
   (Speculation:  not tried.)
6. **Make a real voiceover with it.**  Record, mark the clips in Sound Explorer, 📋 Copy All, then 📋 Paste into the editor's Sound Clips ([dev/sound-clips.ts:110](../dev/sound-clips.ts#L110)).
   - **The editor has to know the file too.**  Local files are remembered per origin.
     On localhost, the tools page (5176) and a video (e.g. affine-transforms, 5175) are different origins, so the video has to pick the take file again.
     On github.io, simple-video-editor and the tools pages share one origin, so the `local:` URL just works.
   - **Transcripts work on local files.**  The transcriber reads through `fetchMedia()` ([dev/transcripts.ts:225](../dev/transcripts.ts#L225)).
     A take doesn't have to be served by a dev server, which is how riemann does it today.
7. **Leave a "moved" link** on canvas-recorder's [sound-explorer.html](https://tradeideasphilip.github.io/canvas-recorder/sound-explorer.html).

## Stage 2:  into the library

After stage 1 has made a few real voiceovers.

- **`src/recording/`.**  The engine (`voice-recorder.ts`, `calibration-sounds.ts`, `folder.ts`) and the panel.
  Consumers import it by path, like `canvas-recorder-lib/src/recording/record-panel`, the way riemann's `transcribe.ts` imports the transcriber today.
  Then riemann drops its copy, and the tools folder imports it too.
  (Speculation:  not in `lib/index.ts`.  It's a tool, not something every video needs.)
- **`analyze-take.ts`** is a Node script.  It could go in the library's `scripts/`, or become a `bin` so every project can run it with `npx`.  (Speculation.)
- **A 🎙 button in the player.**  `sample()` would log the player's state:  the playhead, playing or paused, the selected component.
  Then a voiceover recorded while the video plays lines up with the video's time, and a take could land on the timeline as a sound clip in the right place.  (Speculation.)
- **Then Sound Explorer retires**, or stays as the lightweight page.

## Questions

- **The name.**  In the player, "Record" already means saving the video:  "Record and Save Video" and "Record Just Sound" ([dev/player-body.ts:203-205](../dev/player-body.ts#L203-L205)).
  "Record mode" in the editor would be ambiguous.  🎙 Voice?  Voiceover?
- **Recording while the video plays.**  The speakers would play the existing soundtrack into the mic.
  Echo cancellation is off by default, on purpose (record-mode.md, "Regarding Headphones").
  For a voiceover over a soundtrack:  mute the player while recording, wear headphones, or turn on echo cancellation for that take?
  Echo cancellation would also erase the calibration chirps.
- **Live mixing.**  [live-sound-mixing.md](live-sound-mixing.md) changes how the player plays sound clips.
  The recorder doesn't need it, but a new take showing up as a clip would be nicer without rebuilding the whole soundtrack.
