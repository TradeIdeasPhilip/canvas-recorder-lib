# Voice Recording

Record voiceovers right in the player, while the video plays, with as little fuss as possible.
Look around, record, look around, record again, and see every take on the timeline as you go.

**Status (2026-11-07):** The first version is built, in [dev/voice/](../dev/voice/) and the player, and tested headless with Chrome's fake mic.
Not tried yet with a real mic, a real chirp, or a real folder:  see [How to try it](#how-to-try-it).
The earlier plan, Sound Explorer first, is now under [Later](#later).
The recorder is a cut-down copy of riemann-surfaces-3d's Record mode ([below](#what-we-take-from-riemann)), chirp included.

## Why

From riemann's [record-mode.md](https://github.com/TradeIdeasPhilip/riemann-surfaces-3d/blob/9bbe2f919be045044607dd19b7f53120ea23b924/development-notes/record-mode.md#potential-reuse), "Potential Reuse":

> I've wanted to add *integrated* recordings into the video editor for a while.
> If we do it right, if we customize and perfect it for my needs, it will be better than any of the 3rd party tools I use now.
>
> In fact recording voiceovers might be the last major addition needed before the video editor could be considered "feature complete" and able to stand on its own.

Recording in another program and importing the file already works.
This is about ease of use:

> **This is huge.**  *In place editing!*
> This is a feature I wish I had in my existing tools.
> This doesn't replace all editing, but it lets me do a lot while I'm thinking about it and looking at it and without breaking my train of thought.

> *I always want the no fuss option.*

## The spec

### Two buttons, as in riemann

**🎙 Record mode** shows and hides the recording controls.
It's a button in the live controls, next to Mute.
- Showing the controls turns on the mic.  The browser asks for permission the first time.
- Hiding them (the button again, or × on the panel) stops any recording and turns the mic off.
- Showing the controls doesn't record anything.  It's for looking around as much as for recording:  play, seek, listen to your takes, record again.

**The panel** is riemann's, cut down:  the level meter, the mic's name, the voice processing checkboxes, the folder, ● Record, the time, and a status line.
It sits in the left column, under the play controls, not floating over the video.

**● Record** starts recording, and then starts the video:
1. If it has to, it asks for the folder, or for permission to use it again.  This click is the one the browser needs.
2. It mutes the player ([below](#muted-while-recording)).
3. It plays the start chirp, and starts recording ([below](#the-chirp)).
4. The recorder's `start()` returns a promise, which resolves a moment after the chirp.  Then the player checks Play.
   If the video was already playing, it just keeps playing, and the clip starts there.

When the promise resolves doesn't affect where the clip goes.  That's set by the clock ([below](#where-a-clip-starts-and-ends)).

**Stopping:**
- **Unchecking Play** (or ⌥Space) stops recording, closes the file, and pauses the video.
- **■ Stop**, which is ● Record while recording, does exactly the same:  it unchecks Play.
- **Checking Play never starts a recording.**  Only ● Record does.

### Seeking while recording

- **Every seek while recording ends one clip and starts the next** at the new place.  There's no chirp; the delay measured at ● Record still holds.
- **Nothing is ever erased**, by seeking backward or forward.
  A seek works as if you had paused, saved, and started a new recording.
  You see all the waveforms, and the transcripts when they're ready, and you decide what to delete, move or ignore.
- **Overlapping takes all play**, until you delete one.  The timeline puts overlapping sound clips in separate rows, so they're easy to spot.
- **One file per clip.**  A file being written can't be read until it's closed.
  (Chrome's writable streams write into a temporary `.crswap` copy, and `close()` moves it into place.)
  A closed file is just a `local:` file, and the timeline, the soundtrack and the transcriber already know what to do with those.
  So each clip's transcript can start as soon as you seek or pause, and no file is ever reopened.

### Where a clip starts and ends

- **Every mic sample comes with its frame number on the audio clock,** the same clock the video plays by.
  The clip starts with the sample that goes with the video's first frame, and ends with the one that goes with its last, corrected for the mic's delay.
  It doesn't start early or end late, as a screen recording's sound often does.
  A screen recorder starts and stops whenever it gets around to it, and can't tell which sample goes with which frame.
- **The file holds a little more at each end,** hidden by the clip's trim and length:
  - At the start, the chirp.
  - At the end, ½ s more than the clip.  If Pause cut off your last word, drag the clip's right edge to get it back.

### The chirp

- **At ● Record, riemann's rising chirp plays** (0.2 s), then the video starts.
- **The recorder finds the chirp in the recording,** and measures the round trip.
  Minus the output delay, that's how long the mic and the OS take to deliver a sound.  It was 72 ms on a MacBook Air (riemann's record-mode.md).
- **The clip starts after the chirp**, so it's never heard in the video.
- **No chirp at the end,** and none on a seek.
- **Didn't hear it?**  With headphones, or the speakers off, the recorder uses the last delay it measured, remembered in localStorage, or 72 ms if it never measured one.  The status line says so.
- **Quieter than riemann's:**  15 to 20 dB, from riemann's [feedback](https://github.com/TradeIdeasPhilip/riemann-surfaces-3d/blob/9bbe2f919be045044607dd19b7f53120ea23b924/development-notes/feedback-2026-10-22.md#record-mode).

### Muted while recording

- **From ● Record until the recording stops, nothing in the soundtrack plays.**  No headset needed, and the soundtrack never gets into the mic.
  Only while recording, not the whole time the panel shows, so you can listen to your takes in between.
- **Mute** is disabled, and keeps its checked or unchecked state for afterward.
- **Speed** is 1× and disabled, the same way.  A voice recorded at 2× wouldn't line up with anything.
- **At end:  Pause / Repeat** is disabled, the same way.  Neither applies ([below](#talking-after-the-end)).
- **Record and Save Video** and **Record Just Sound** are disabled.
- **The chirp isn't muted.**  It goes straight to the speakers, past the player's mute.
- Hearing something while recording, with headphones:  [later](#later).

### Talking after the end

- **Reaching the end doesn't stop the recording.**  The end of the play limits, that is:  the section, or the whole video.  It's the same code either way.
  The picture freezes on the last frame, the play position stays at the end, and the clip keeps going.
- **The clip runs past the end.**  The soundtrack already ignores anything after the end of the video, so the saved video is unchanged.
  If the video gets longer later, the voice is already there.
- **The panel says how far past the end you are,** e.g. "+3.2 s past the end".  That's the only thing on the screen that moves.
- **A seek ends the clip, as always,** and playback is normal again from the new place.  There's no way to seek into the part past the end.
- **● Record at the end starts from the beginning of the section,** as Play does now.

### Files and the folder

- **The first time, ● Record asks for a folder, not a file name.**
  The folder's handle is remembered in IndexedDB, as riemann's [`folder.ts`](https://github.com/TradeIdeasPhilip/riemann-surfaces-3d/blob/9bbe2f919be045044607dd19b7f53120ea23b924/src/recording/folder.ts) does it.
  In a new session the browser asks for permission again, on the next click on ● Record.
- **Each file is named after the video and the moment it started:**
  `7-pointed-star-shorts 2026-11-07 14-05-33.250.wav`
  - The video's name is `canvasRecorder.start()`'s `name`, the one the properties files and IndexedDB use.
  - Sortable, and unique.  Two clips can start in the same second (⌥B while recording), so the time has milliseconds.
  - No colons:  Windows doesn't allow them in file names, and the Finder shows them as slashes.  Hyphens, as riemann's takes have.
- **32-bit float, mono, 48 kHz,** written as the clip goes.  The same as riemann's takes, and what the soundtrack decodes everything to.
- **Each file goes on the `local:` list** ([`addLocalFile()`](../src/local-files.ts#L169)) as soon as it's closed.
  Its clip's source is `local:7-pointed-star-shorts 2026-11-07 14-05-33.250.wav`.
- **The folder is remembered per origin,** like everything in IndexedDB, so each port asks once.

### Where the clips go

**Into the Visual Editor's root:**  the component in the Edit menu ([`currentRoot()`](../dev/canvas-recorder.ts#L1620)), usually the slide or chapter you're working on.
- If the slides are reordered, the clips go with their slide.
- A clip can always be moved later, with its card's Owner menu.
- The root is taken when the clip starts, in case it changes while you're recording.

**Every Showable can hold sound clips.**  `soundClips` undefined just means none yet.
There's no good reason for a component to refuse sound.
(One oddity, already true today:  a Showable used twice in the tree plays its clips both times.)
What changes:

- **Anything that adds a clip creates the list first:**  `owner.soundClips ??= []`.  The recorder, and the Sound Clips section's Add and Paste.
- **The Sound Clips section shows on every component,** with Add and Paste when it's empty.
  Today it only shows when the list exists ([dev/canvas-recorder.ts:6065](../dev/canvas-recorder.ts#L6065)).
  If that turns out to be too cluttered, show it only on the root, or behind a "+ Sound clip" button.
- **The Owner menus** still list only components that have clips (`soundOwners()`), so they stay short.
- **Loading:**  `applyJsonEntry()` only fills in a list that already exists ([src/snapshot.ts:317](../src/snapshot.ts#L317)).  Make it create one, as `applyFixedComponents()` already does ([:211](../src/snapshot.ts#L211)).
- **Undo:**  a history state from before the first clip has no list for that component.
  Applying it leaves the component's new list alone, so undoing the first recording wouldn't remove it.
  Fix:  when applying, a missing list means an empty one, for any component that has a list now.
- **Saving:**  `omitTreeDefaults()` and `omitComponentDefaults()` treat an empty list the same as none ([:425](../src/snapshot.ts#L425), [:482](../src/snapshot.ts#L482)).
- **Not a breaking change.**  Old saves load exactly as before.

### Seeing it

- **A finished clip is an ordinary sound clip.**  Its waveform shows at once, and its transcript a few seconds later if 🗣 Transcripts is on.
- **The clip being recorded** is a red block on the timeline, with its waveform growing as you talk.
- **The level meter** is riemann's, with marks for the voice target and the chirp's last level.
  Averaged over about 300 ms, from riemann's feedback.
- **A live transcript:**  [later](#later).  The finished clip's transcript tells you where to back up to, a few seconds after each pause or seek.

## What we take from riemann

Record mode is in riemann's [src/recording/](https://github.com/TradeIdeasPhilip/riemann-surfaces-3d/tree/9bbe2f919be045044607dd19b7f53120ea23b924/src/recording), 1445 lines, as of [9bbe2f9](https://github.com/TradeIdeasPhilip/riemann-surfaces-3d/commit/9bbe2f919be045044607dd19b7f53120ea23b924) (2026-10-23).  That's still the newest change to that folder on 2026-11-07.
It records your voice, what you do, and what the app is doing, all on the audio clock.
The design and the measurements are in its [record-mode.md](https://github.com/TradeIdeasPhilip/riemann-surfaces-3d/blob/9bbe2f919be045044607dd19b7f53120ea23b924/development-notes/record-mode.md).

| File | Lines | What it does | Here |
| --- | ---: | --- | --- |
| `record-panel.ts` | 475 | The floating panel:  level meter, voice processing checkboxes, Record, Stop, and Marker. | [voice-panel.ts](../dev/voice/voice-panel.ts), cut down |
| `voice-recorder.ts` | 580 | The engine:  the mic, an AudioWorklet that copies the samples, the WAV and log files, and the calibration sounds. | [voice-recorder.ts](../dev/voice/voice-recorder.ts), cut down |
| `calibration-sounds.ts` | 143 | The Start, Stop, and Marker sounds, and the code that finds them in a recording. | [chirp.ts](../dev/voice/chirp.ts):  the Start sound only, 17 dB quieter |
| `folder.ts` | 77 | Remembers which folder the takes go in. | [folder.ts](../dev/voice/folder.ts), with its own IndexedDB name |
| `analyze-take.ts` | 160 | A Node script.  Checks a take's timing, and lines its log up with a transcript. | No |
| `transcribe.ts` | 10 | Wraps this library's `makeTranscript()`, for scripts. | No |

**What gets cut:**
- **The log:**  `sample()`, `describe()`, the `.jsonl` file, and the listeners that log your keys and clicks.
- **The Stop and Marker sounds,** and the Marker button.
- **Its own AudioContext.**  The recorder uses the player's, so the mic's samples and the video share one clock.
- **Takes become clips:**  one file from ● Record or a seek to the next seek or the stop, instead of one file from Record to Stop.
- **The panel's floating position.**  It goes in the left column.

**What's new:**  the samples are also kept in memory, in one AudioBuffer that grows by doubling, for the live waveform and so the soundtrack doesn't read the file back.

**What travels as is:**  the AudioWorklet is a string, loaded through a Blob URL, and the panel makes its own `<style>`.
So CLAUDE.md's `new URL("./worker.js", import.meta.url)` gotcha doesn't apply, and there's nothing for `scripts/copy-assets.mjs` to do.
The relative imports need `.ts` added, like every library file.

**One master copy?**  This is a fork, not a move:  riemann's has the log, which the player's won't.
Riemann keeps its own.  Add a line to riemann's `src/recording/README.md` pointing here, so a fix in one gets considered for the other.

## The first version

Everything in the spec.  Only the [Later](#later) list waits.

### How to try it

In 7-pointed-star (or any video):  `npm link ../canvas-recorder-lib` there, and `npm run watch` here.

1. **🎙 Record mode**, next to Speed.  Allow the mic.  The meter should move when you talk.
2. **● Record.**  The first time, pick a folder.  You should hear the chirp, then the video plays.
   The status line should say "Heard the chirp", with the round trip and the mic delay.  Riemann measured a 106 ms round trip and a 72 ms delay.
3. **Talk, seek (⌥B, a click on the timeline), talk, pause.**  Each stretch should become a sound clip on the Visual Editor's root, with its waveform, at the place you said it.
   Zoom the timeline in:  a short clip on a long video is narrower than a pixel.
   Play it back:  does your voice line up with the picture?
4. **Record past the end** of the section:  the picture freezes, and the panel counts "+… s past the end".
5. **Reload the page, and close and reopen the tab.**  The clips should still be there, and after 🔓, still play.
   This is also step 4's question below:  does 🔓 ask once, or once per clip?
6. **Reload in the middle of a clip,** and save a library file in the middle of a clip (Vite reloads the page).  See [Risks](#risks).

**Tested headless (2026-11-07),** with Chrome's fake mic and the browser's private folder (OPFS), on the showcase:
- The controls lock during the chirp, and unlock after Pause and after ■ Stop.
- Two clips, from ● Record and a seek:  the right places, trims (chirp + 72 ms, and gap + 72 ms) and lengths.
- Every file decodes, and matches what the soundtrack was given, sample for sample.
- Past the end:  the picture stays on the last frame, the panel counts, and the clip runs 1.7 s past the end.
- After a reload, the clips are still on the root, which had no `soundClips` in the TypeScript.
- Undo:  applying a state from before the first clip empties the list, in place.  An empty list isn't saved.
- Not tested:  finding the chirp.  The fake mic can't hear the speakers.

**A trap for automated tests:**  Chrome for Testing 1243 crashes (the whole browser) reading an OPFS file handle back from IndexedDB after a reload.
A real folder's files don't have this problem.  A test that reloads has to clear `canvas-recorder-local-files` first.

### Steps

Steps 1, 2, 3, 5 and 6 are done.  Step 4 needs a real folder, and step 7 is [How to try it](#how-to-try-it).

1. **Every Showable can hold sound clips** ([above](#where-the-clips-go)).
   Test it:  add a clip to a component that had no list, save, reload, undo.
2. **Two small soundtrack changes.**
   - The player's AudioContext at 48 kHz ([dev/canvas-recorder.ts:655](../dev/canvas-recorder.ts#L655)).  Today it uses the hardware's rate.
     Then the mic, the decoded files and the saved video's sound all share one rate.
   - **`Soundtrack.provide(url, buffer)`:**  hand the soundtrack a buffer that's already decoded.
     A new clip plays and shows its waveform without reading the file back.
3. **Copy riemann's four files** into `dev/voice/`, and cut them down ([above](#what-we-take-from-riemann)).
   - **Test the engine headless,** like sound-test.html.  Chrome's `--use-fake-device-for-media-stream --use-file-for-fake-audio-capture=<wav>` makes a WAV file the mic.
     The browser's private folder (`navigator.storage.getDirectory()`) stands in for the picked folder, with no dialog.
     Check that a clip's samples land where the clock says, and that the chirp is found.
     (Speculation:  the fake mic doesn't hear the speakers, so the chirp test may need the chirp mixed into the WAV.)
4. **Check the folder's permission early.**
   After a reload, does allowing the folder again unlock the files in it?
   If not, 🔓 asks once per file ([`requestLocalFileAccess()`](../src/local-files.ts#L296)), and 50 clips would be 50 clicks.
   If it does, 🔓 should ask for the folder first.
   (Speculation:  Chrome's grant on a folder covers the files in it, and "Allow on every visit" skips the question entirely.)
   **2026-11-07, in the showcase:**  it asked once for the folder, and no permission problems since, through refreshes.
   Other folders have sometimes asked a second time soon after, so keep watching.
5. **The player.**
   - The 🎙 Record mode button, and the panel's place in the left column.
   - ● Record and ■ Stop, and Play checked when `start()` resolves.
   - The disabled controls (Mute, Speed, At end, the two Record buttons), each keeping its value.
     ● Record is a click, so it can also leave the silent fallback mode ([dev/canvas-recorder.ts:694](../dev/canvas-recorder.ts#L694)).
   - Hooks in `startAudio()` and `stopAudio()` ([:730-772](../dev/canvas-recorder.ts#L730-L772)).
     Every play, pause and seek already goes through them, so they're exactly where clips start and end.
   - The hold at the end ([:863-880](../dev/canvas-recorder.ts#L863-L880)).
   - Adding each clip to the root, with `markDirty()` and `soundtrack.request()`.
6. **The live block on the timeline:**  a `lane: "sound"` block whose `waveform()` returns the growing buffer ([dev/timeline-display.ts:49](../dev/timeline-display.ts#L49)).
7. **Try it** in 7-pointed-star.  `npm link ../canvas-recorder-lib` is enough; it doesn't need a release first.

**Size:**  about 1,200 lines, as estimated, two thirds of them copied from riemann.

### Risks

- **A page that closes in the middle of a clip.**  The file only appears when it's closed.  Finished clips are safe.
  The player already cleans up on reload and close (`saveOnUnload()`), so close the file there, and add the clip before that last save to IndexedDB.
  Vite can reload the page at unexpected times, too.
  **Tried 2026-11-07:**  a reload in the middle of a clip saved the WAV file, but didn't add the clip to the timeline.  Adding it by hand works.
  Good enough for now:  only the clip in progress is at risk, and its sound isn't lost.
  Later:  add the clip in `finishVoiceOnUnload()`, before `saveOnUnload()` writes the backup (there's a TODO there), and try closing the tab and a Vite reload too.
- **Hidden isn't closing.**  Switching to another desktop, app or tab hides the page.  Until 2026-11-07 that ended the recording, behind the player's back:
  `saveOnUnload()` also runs on `visibilitychange`, and it finished the files.  Now only `beforeunload` and Vite's reload do.
  While hidden, the picture stops (no animation frames), but the sound and the clock keep going, so the clip does too.
  (Speculation:  if `close()` can't finish during unload, close the file and start a new one every few seconds instead.)
- **The `local:` list gets long.**  Every clip is on it.  Harmless, but the list of local files in the Video Clip and Sound Clip panels grows.
  Maybe hide the takes from those lists later.
- **🔓 once per file**, from step 4.

## Decisions

None open.  Settled 2026-11-07:

- **Two buttons:**  🎙 Record mode shows the controls and turns on the mic; ● Record records and plays.  Play alone never records.
- **Stopping a recording always pauses the video,** whether it's ■ Stop or unchecking Play.
- **The Sound Clips section shows on every component.**  Try it; trim it back if it's too cluttered.
- **Nothing is erased.**  Each seek adds a clip; you decide what to keep.
- **The chirp is in the first version,** at ● Record only.
- **The clips go into the Visual Editor's root,** and every Showable can hold sound clips.
- **The end of the play limits** works like the end of the video:  whatever's simplest in the code.  It's the same code.
- **Very short clips** are kept like any other.
- **Hearing the video while recording:**  muted while recording.  No headset needed.
- **Live mixing:**  done 2026-11-06 ([live-sound-mixing.md](live-sound-mixing.md)).  A new clip is one `soundtrack.request()`, and the rest keeps playing.

## Later

- **A live transcript.**
- **A transcript file Claude can read,** in `properties/`.  See "The transcripts" in [ai-in-the-editor.md](ai-in-the-editor.md#option-b--the-files-as-a-two-way-channel).
- **Hearing something while recording**, with headphones:  the video's soundtrack, or what you just recorded.
- **Clips that follow their scene,** instead of the Visual Editor's root:  the innermost component where the clip starts.
  Then the voice would move when an earlier scene in the same slide gets longer.  (Speculation.)
- **A hot key for ● Record.**
- **Riemann's other parts:**  the log of what you did, the Marker, `analyze-take.ts`.
- **Sound Explorer.**  The old Stage 1:  port it to the [tools folder](test-project.md) as it is, from canvas-recorder at [00058ed](https://github.com/TradeIdeasPhilip/canvas-recorder/tree/00058ed3fa7d3beec6bb21eebf6aa34094d355bf).
  - [sound-explorer.html](https://github.com/TradeIdeasPhilip/canvas-recorder/blob/00058ed3fa7d3beec6bb21eebf6aa34094d355bf/sound-explorer.html), [dev/sound-explorer.ts](https://github.com/TradeIdeasPhilip/canvas-recorder/blob/00058ed3fa7d3beec6bb21eebf6aa34094d355bf/dev/sound-explorer.ts) (1384 lines), [dev/sound-explorer.css](https://github.com/TradeIdeasPhilip/canvas-recorder/blob/00058ed3fa7d3beec6bb21eebf6aa34094d355bf/dev/sound-explorer.css), and [src/click-and-drag.ts](https://github.com/TradeIdeasPhilip/canvas-recorder/blob/00058ed3fa7d3beec6bb21eebf6aa34094d355bf/src/click-and-drag.ts) (261 lines), which only Sound Explorer used.
  - **`fetch(soundUrl)`** ([:559](https://github.com/TradeIdeasPhilip/canvas-recorder/blob/00058ed3fa7d3beec6bb21eebf6aa34094d355bf/dev/sound-explorer.ts#L559)) becomes `fetchMedia()`, so `?src=local:…` opens a local file.
  - **Its localStorage keys** are the files' URLs ([:1030](https://github.com/TradeIdeasPhilip/canvas-recorder/blob/00058ed3fa7d3beec6bb21eebf6aa34094d355bf/dev/sound-explorer.ts#L1030)), and its Open menu lists *every* key ([:160-175](https://github.com/TradeIdeasPhilip/canvas-recorder/blob/00058ed3fa7d3beec6bb21eebf6aa34094d355bf/dev/sound-explorer.ts#L160-L175)).
    In a folder with other pages, the player's keys would show up there.  Give its keys a prefix, like `sound-explorer|<url>`.
  - **`soundFileSuggestions`** ([:151-154](https://github.com/TradeIdeasPhilip/canvas-recorder/blob/00058ed3fa7d3beec6bb21eebf6aa34094d355bf/dev/sound-explorer.ts#L151-L154)) names two files from canvas-recorder's `public/`.  Suggest `listLocalFiles()` instead.
  - Clip lists saved at localhost:5173 stay with that origin.  📋 Copy All anything worth keeping first.
  - Leave a "moved" link on canvas-recorder's [sound-explorer.html](https://tradeideasphilip.github.io/canvas-recorder/sound-explorer.html).
