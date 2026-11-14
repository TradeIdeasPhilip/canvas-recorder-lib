I raised "One editor, many videos" to the Simple Video Editor's first priority. I also added a "Toward a real product" section to [simple-video-editor.md](development-plans/simple-video-editor.md) with your screen-recording case and the gaps. Here's the whole list.

**Done:** item 30, the bug that lost work, shipped in 0.7.4. `samplesToFourier()` leaving out the center shipped in 0.8.0.

**Next: rename `InParallelComponent` → `ComponentBase`.** _Raised 2026-11-12: get the breaking changes out of the way._ Details in [release-1.0.md](development-plans/release-1.0.md), item 4. It touches affine-transforms and the showcase.

**For 1.0: the breaking changes ([release-1.0.md](development-plans/release-1.0.md)). All small.**
1. Remove the old builders. Convert the 20 showcase slides that use `MakeShowableInParallel`.
2. Remove `formatVersion` from the save file.
3. Say what's public. One README sentence, plus moving what projects need (like `makeTranscript()`) out of `dev/`.
4. Changes that have been waiting:
   - Rename `InParallelComponent` → `ComponentBase`, first (above).
   - Moving the video size into the save file, which the Simple Video Editor's projects need. It breaks old saves only if we skip copying the remembered size over the first time an old save loads, so it can come either before or after 1.0.
   - (The `samplesFromParametric()` fix shipped as a patch on 2026-11-09: a bug fix isn't breaking.)

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

**Recommended order:** the `ComponentBase` rename, then the other 1.0 items and release 1.0.0, then the saving groundwork with its tests, then projects, then the two-window sync. 1.0 is a few small sessions, and after it, nothing in the rest is breaking.

I also fixed two stale lines in release-1.0.md. The release steps now point to the README checklist (`npm version major`), and the order notes that the sound work already shipped in 0.7.0.