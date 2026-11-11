I raised "One editor, many videos" to the Simple Video Editor's first priority. I also added a "Toward a real product" section to [simple-video-editor.md](development-plans/simple-video-editor.md) with your screen-recording case and the gaps. Here's the whole list.

**First: a bug that loses work.** _Added 2026-11-11. Fixed the same day, not released yet._ 7-pointed-star's `development-plans/library-issues.md`, item 30.
- A reload during startup, before the saved tree is in, backs up the TypeScript defaults as the newest entry. The next startup applies that backup, and everything made in the Visual Editor disappears, with no warning.
- Confirmed in the code: `saveOnUnload()` runs from `vite:beforeFullReload`, `beforeunload` and `visibilitychange`, and nothing stops it while `_loadSource` is still undefined.
- The fix: `saveOnUnload()` does nothing until the restore is done, and the last session's backup stays in sessionStorage until `initFromDB()` has saved it, so a reload in that window can't lose it either. `saveState()` was already safe: since 0.7.3 it saves the place still waiting to be restored. A bug fix, so a patch release.
- The hard part of recovering was noticing: nothing said anything was wrong. git diff and the autosaves showed what happened. Loading just one chapter is a feature, for splicing together pieces of different versions.

**For 1.0: the breaking changes ([release-1.0.md](development-plans/release-1.0.md)). All small.**
1. Remove the old builders. Convert the 20 showcase slides that use `MakeShowableInParallel`.
2. Remove `formatVersion` from the save file.
3. Say what's public. One README sentence, plus moving what projects need (like `makeTranscript()`) out of `dev/`.
4. Changes that have been waiting:
   - Rename `InParallelComponent` → `ComponentBase`. This touches affine-transforms and the showcase.
   - The `samplesFromParametric()` fix, your 7-pointed-star issue 10. It changes how parametric Fourier slides look, so check your stars shorts after upgrading.
   - **New today:** moving the video size into the save file, which the Simple Video Editor's projects need. It breaks old saves only if we skip copying the remembered size over the first time an old save loads, so it can come either before or after 1.0.

**Groundwork for saving.** Projects and the two-window sync both rework the same saving code. Doing this part once, with tests, guards against losing work:
- Read and write the history in one transaction.
- Reuse one IndexedDB connection instead of opening a new one each time.
- Synced files re-read their saved record before each write.
- Give the `sessionStorage` keys each video's own name.
- Automated tests of save files. [automated-tests.md](development-plans/automated-tests.md) says to start there.

**Features:**
- **Simple Video Editor projects:** New, Open, Save As, the file name always showing, and a separate history and size for each video. Raised today.
- **One slide per window** ([multi-window-sync.md](development-plans/multi-window-sync.md)). Raised yesterday.
- **Putting the GUI back after a Vite reload**, including fixing the bug where the restore runs before the saved tree loads.

**What's keeping the Simple Video Editor from being a real product**, besides projects:
- Hide the programmer-only controls.
- A help page.
- A shorter Insert list.
- Long screen recordings: a file too big to read for its sound, and memory over a long session. Neither has been tried on a long recording yet.
- My guesses at what people coming from other editors expect:
  - cut out a range in one step, instead of two splits and a delete
  - Space to play (today it's Option-Space)
  - Cmd+Z undoes the last edit (today it opens the Load history)
  - saying up front that it needs desktop Chrome

**Recommended order:** release item 30's fix, then finish the 1.0 items and release 1.0.0, then the saving groundwork with its tests, then projects, then the two-window sync. 1.0 is a few small sessions, and after it, nothing in the rest is breaking.

I also fixed two stale lines in release-1.0.md. The release steps now point to the README checklist (`npm version major`), and the order notes that the sound work already shipped in 0.7.0.