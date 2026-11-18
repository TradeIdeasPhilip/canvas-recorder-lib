# Priorities

The whole list. The recommended order is at the end. Each plan is in [development-plans/](development-plans/).

**Last updated 2026-11-15.**

**Done:** item 30, the bug that lost work, shipped in 0.7.4. `samplesToFourier()` leaving out the center shipped in 0.8.0.

**Next: rename `InParallelComponent` → `ComponentBase`.** _Raised 2026-11-12: get the breaking changes out of the way._ Details in [release-1.0.md](development-plans/release-1.0.md), item 4. It touches affine-transforms and the showcase.

**Look at soon** (the user, 2026-11-15). Each is small:

- **Red ✕ marks in 7-pointed-star's video №8,** more than expected, with phone video in it. Reasonably high priority to look, and probably a small fix.
  A likely cause, found by reading and not checked: three of that scene's four clips are never told to get ready, because they're inside containers that don't pass the notice on. [get-ready-everywhere.md](development-plans/get-ready-everywhere.md#the-real-case-7-pointed-stars-scratch-8).
- **Smarter default names:** a component with no name makes one, such as a text's first few words, so a scene doesn't have four things called "Video Clip". Reasonably soon. About half a day. [saturday-afternoon.md](development-plans/saturday-afternoon.md#smarter-default-names).
- **A first Path component, version 1:** stroke one path, typed or pasted in the usual formats, or picked by name, fitted into a rectangle, with color, width, corner style and end style. A small task, sooner rather than later. About half a day. [path-component.md](development-plans/path-component.md).
- **Path component, version 1.1:** our first attempt at the `strokeColors()` effect in a component. A small task, right after version 1. About half a day. [path-component.md](development-plans/path-component.md#version-11).

**For 1.0** ([release-1.0.md](development-plans/release-1.0.md)). The breaking changes are all small. Item 5 is the large one.

1. Remove the old builders. Convert the 20 showcase slides that use `MakeShowableInParallel`.
2. Remove `formatVersion` from the save file.
3. Say what's public. One README sentence, plus moving what projects need (like `makeTranscript()`) out of `dev/`.
4. Changes that have been waiting:
   - Rename `InParallelComponent` → `ComponentBase`, first (above).
   - Moving the video size into the save file, which the Simple Video Editor's projects need. It breaks old saves only if we skip copying the remembered size over the first time an old save loads, so it can come either before or after 1.0.
   - (The `samplesFromParametric()` fix shipped as a patch on 2026-11-09: a bug fix isn't breaking.)
   - Not breaking, but wanted before 1.0, so a stranger doesn't see the oddities:
     - "Style Name" for a Text Format's name and a Text Span's style, saved under the old names ([saturday-afternoon.md](development-plans/saturday-afternoon.md)).
     - Rename a saved backup in the Load dialog, and never auto-delete a named one. About half a day ([load-history.md](development-plans/load-history.md#first-step-name-a-backup-before-10)).
     - A graphical transform editor for the Slide: drag to move, scale, rotate and skew, one step at a time, with a Matrix collapse only on request. The first version is about a week ([transform-editor.md](development-plans/transform-editor.md)). Not breaking, if each step is its own component. First, document how a component reports its transform to the editor (the user, 2026-11-15).
5. **Place things in time without wrapper components.** Not breaking, and not small. **An absolute requirement for 1.0 (the user, 2026-11-15):** drop a video clip, or a text, anywhere in its scene, with no Padding or In Series to set up first. It needs a discussion and a plan before any code. About 3–5 days after that. [placing-in-time.md](development-plans/placing-in-time.md).
   Three more plans are about time on the timeline, and should be designed with it: [timeline-durations.md](development-plans/timeline-durations.md), [stretch-vs-extend.md](development-plans/stretch-vs-extend.md) and [bridges.md](development-plans/bridges.md).

**Groundwork for saving.** Projects and the two-window sync both rework the same saving code. Doing this part once, with tests, guards against losing work:

- Read and write the history in one transaction.
- Reuse one IndexedDB connection instead of opening a new one each time.
- Synced files re-read their saved record before each write.
- Give the `sessionStorage` keys each video's own name.
- Automated tests of save files. [automated-tests.md](development-plans/automated-tests.md) says to start there.

**Features:**

- **Clipping in the Slide component:** a rectangle first, not general clipping and masking. Reasonably high priority, raised 2026-11-14, for zooming into a spot on a star circuit in 7-pointed-star without taking over the screen. [clipping.md](development-plans/clipping.md).
- **Simple Video Editor projects:** New, Open, Save As, the file name always showing, and a separate history and size for each video. Raised 2026-11-09, as that editor's first priority ([simple-video-editor.md](development-plans/simple-video-editor.md)).
- **One slide per window** ([multi-window-sync.md](development-plans/multi-window-sync.md)). Raised 2026-11-08.
- **Putting the GUI back after a Vite reload**, including fixing the bug where the restore runs before the saved tree loads.
- **Stretch vs extend:** when a component's length changes, do its keyframes move with it? And milliseconds or % for each schedule. Brainstorming, raised 2026-11-15. The user: "a huge issue". [stretch-vs-extend.md](development-plans/stretch-vs-extend.md).
- **Bridges:** animate from one thing to another, like the pieces that slide from row to row in the Peano arithmetic video. Brainstorming, raised 2026-11-15, with a review of that video's code. The Peano video and a successor are the testbed. Not right away. [bridges.md](development-plans/bridges.md).
- **Multi Text morph:** replace one piece of a Multi Text with another, with the layout making room (a piece at Font Width 0 is a hole) and a traveler moving between the holes. Not urgent, not before 1.0, but don't lose it. It's for rewriting one line in place. The Peano video turned out not to need it (bridges.md). [multi-text-morph.md](development-plans/multi-text-morph.md). About 3–5 days, starting with a 2–3 hour prototype.
- **A TeX component:** paste TeX, get typeset math drawn as filled paths. After 1.0, self-contained. Worth having for still equations alone, even with no morphing (the user, 2026-11-15). A real use case: the matrices in the unfinished SoME5 video, which took about 525 lines by hand. That case has live numbers, and may be better served by a small formula layout of our own. [tex-component.md](development-plans/tex-component.md). About 3–5 days, starting with a spike.
- **A simple SVG Path component, with an editor:** after the first Path component above. Show one path from an Inkscape file (a picker for finding it, saved into the project), then small in-place edits: drag the curve, drag a node, add and delete a node. Not a replacement for Inkscape. Priority not given yet. [svg-path-component.md](development-plans/svg-path-component.md). About 3–4 days to show a path from a file, and 3–5 more for the editor. The path parser is the risk: it doesn't read arcs yet.

**When there's room for something short and worthwhile:** re-examine easing functions with parameters. At least three new ones are wanted: exponential, quadratic Bézier and cubic Bézier. It needs a brainstorm and maybe a prototype. Raised 2026-11-15. There's now a proposal to react to: [easing-functions.md](development-plans/easing-functions.md). About 2–3 days.

**A video about the library:** "canvas-recorder-lib in 100 seconds". A first script exists, and the user wants to do it right. No date. [video-100-seconds.md](development-plans/video-100-seconds.md).

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

**Recommended order:**

1. The small ones under "Look at soon", whenever there's an hour. None is breaking.
2. The `ComponentBase` rename, then the other breaking changes for 1.0. A few small sessions.
3. Placing things in time: agree on the design, then build it. It's the one large piece before 1.0.
4. Release 1.0.0. After it, nothing in the rest is breaking.
5. The saving groundwork with its tests, then projects, then the two-window sync.
