# AI in the Editor

Small, conversational changes to a running video ("move that further left", "center the small one", "now do the same to the top one"), from Claude in VS Code, and maybe later from a chat panel inside the editor.

**Status (2026-11-06):** Brainstorm.  No code yet.

## The use case

From 7-pointed-star's shorts (`properties/7-pointed-star-shorts.txt`):  two Star Circuits, Top and Bottom, built in the Visual Editor.
First they were placed; then Bottom got more animations at the start; next, Top should get matching ones.

What that needs:

- **A long stream of short requests.**  A big spec can be handed over any way at all.  Many small ones need almost no friction for each one.
- **Context.**  "That" means the selected component.  "Here" means the playhead.  "Further" means compared with how it looks now.  "It" refers to a topic from the previous interaction.
- **Eyes.**  "Center the small one" needs to know where the drawing actually is, which isn't always a property (a Multi Text's extent, a Fourier's shape).
- **Changes that land where the user's work is.**  Today, code from Claude has to be folded into GUI work by hand, and GUI work into code through the diff file.
  A change made *in the running editor* is just more user state:  autosaved, in the history, undoable, and in the diff file like any other edit.

## What exists today

- **Claude can read the state.**  The synced files in `properties/`:  `<name>.json` (what differs from the TypeScript), `<name>-ts-defaults.json`, `<name>.txt` (the diff, readable, with code).
  The diff covers replaceable children properly since 0.6.0.
- **Claude can't write it.**  Editing `<name>.json` on disk only makes the sync stop with "⚠ changed on disk" ([dev/synced-file.ts:162-170](../dev/synced-file.ts#L162-L170)), which is the right default, but it's a dead end.
- **The console.**  `philDebug.VisualEditor` (the root, the selected component, the playhead), `philDebug.chapterList`, `philDebug.diffText()`.
  Read-only, in practice.  Changing a schedule from the console works, but nothing notices:
  no autosave (`markDirty()` isn't called), no history entry, and the editor's panels show the old value.
  Found while testing the diff fix:  a direct change never reached IndexedDB until the page unloaded.
- **Playwright,** one script per check, in a separate headless browser with its own empty IndexedDB.

## The foundation:  an editing API in the page

Every option below needs the same thing:  a small, documented way to read and change the video **from JavaScript, the way the GUI does.**
It also gives the author more to do at the console, which is a goal by itself.

Speculation, a sketch:

```js
const ed = philDebug.editor;
ed.selected;                         // the selected component, wrapped
ed.time;                             // the playhead, in the selected chapter's time
ed.find("Scratch 1 → Bottom");       // by the same path the diff file prints
c.properties();                      // names, types and current values:  what an AI needs to see
c.get("Reference Rect");             // keyframes
c.set("Reference Rect", keyframes);  // or one value
ed.add("Scratch 1", "Rectangle", { "Color": "red" }), ed.remove(c), ed.move(c, index);
ed.select(c); ed.seek(ms);
await ed.screenshot();               // the current frame as a PNG
ed.batch(() => { … });               // one history entry, one undo
```

- **Every change goes through the GUI's own path:**  refresh the panels, `markDirty()`, one history entry per batch.  So Cmd+Z undoes an AI's change like anyone else's.
- **Names, not objects.**  Paths like the diff file's (`Scratch 1 → Bottom → Reference Rect`), so text from the diff file, the tree or a conversation can be pasted straight in.
  Duplicate names get `#2`, as in the diff.
- **Generic.**  Built on `schedules`, `scalars` and the registry, so it works on every component, including a project's own, with no per-component code.
- **Measuring:**  a way to get what a component actually drew, at least a bounding box, would make "center it" possible without guessing.
  Open:  how.  Maybe draw the component alone onto a scratch canvas and find its pixels.

**Difficulty:**  one to two days for a useful first version.  The pieces exist in the Visual Editor's code; this gives them a public face.

## Option A:  Claude in your browser

Claude drives the Chrome you're looking at:  runs JavaScript in the page (the API above), reads the console, takes screenshots.
You see every change as it happens, and you can keep working with the mouse in between.

Ways to connect, from least to most setup:

- **Claude in Chrome**, the browser extension, connected to Claude Code.  It works in your real Chrome profile, so it sees your real IndexedDB and permissions.
  Check how it connects to the VS Code extension; in the terminal it's `claude --chrome` or `/chrome`.
- **Chrome with remote debugging** (`--remote-debugging-port=9222`), and Claude connects with Playwright's `connectOverCDP()`, or through Google's Chrome DevTools MCP server, or the Playwright MCP server.
  Catch:  current Chrome only allows remote debugging with a separate profile (`--user-data-dir`), and IndexedDB belongs to the profile.
  The editor's saved work in your normal profile wouldn't be there.  Fine if that debugging profile becomes the one for video work.
- **A browser Claude keeps open.**  A background Node process holding a Playwright browser, taking commands (JavaScript to run, "screenshot") from a little local HTTP server.
  About 50 lines.  The MCP servers above are this, already written.
  Same catch:  its own profile, so load state from `properties/`.

Answers to "can you keep a Playwright session open?":  yes, as a background process, and then each request is one quick call instead of a new script.
So far every check has been a new script, because each one was a one-off.

**Difficulty:**  setup, plus the editing API.  Without the API, Claude can still look and take screenshots, but changes would go around the editor (see "The console" above).

## Option B:  the files as a two-way channel

No browser control at all.  Claude edits the files in `properties/`; the page notices and loads them.

- **Load outside edits.**  When `<name>.json` changes on disk and the page has nothing unsaved since its last write, load it, as one history entry.
  If both changed, keep today's "⚠ changed on disk", with a new button:  load the file.
  Polling the file handle once a second is enough.  (`FileSystemObserver` would be better where the browser has it.)
- **Write the context.**  A small file next to the others:  the selected component's path, the chapter, the playhead, maybe the Debug Log's last lines.
  Then "that" and "here" mean something to Claude without asking.
- **A frame, on request.**  The page could write the current frame as a PNG to `properties/` whenever it pauses, so Claude can look.
- **The transcripts.**  `properties/<name>-transcript.txt`:  every sound clip in time order, with its words and their times in the video.
  Rewritten when a transcript finishes or a clip moves, like the other synced files.
  Then Claude can read a voiceover, find "where I say 'seven'", or line a slide up with a word.
  Today a transcript stays in IndexedDB, unless 💾 on the clip's card saves it to a file by hand.
- **One checkbox for all of them** (your idea, 2026-11-07).  Today Sync to file, Sync defaults and Sync diffs each ask for their own file.
  One "Sync to folder" that asks for `properties/` once, and writes all four files there, would be simpler.

Good for:  the conversation stays in VS Code, everything is a plain file that git can see, and nothing new to install.
Not as good:  about a second of delay, and Claude edits the omit-defaults JSON by hand, which is less pleasant than calling `c.set(…)`.
It doesn't need the editing API, but it's better with it.

**Difficulty:**  half a day to a day.  Most of it is the rule for when loading is safe.

## Option C:  a chat panel in the editor

The editor talks to Claude itself, through the Claude API.  This is the "AI button" every program has now, and it's what makes the editor usable by people who don't program:  simple-video-editor first.

- **Tools generated from the editing API:**  find, get, set, add, remove, select, seek, screenshot.
  Generic, so a new component, or a project's own, is covered without new tool definitions.
- **Context sent with each message:**  the selected component's properties, the chapter's tree, the playhead, and a screenshot of the frame.
- **Each reply's changes are one history entry,** so one Cmd+Z undoes it.
- **A fast model for the small requests** (Haiku), a bigger one when asked to think.
- **The transcript is saved** next to the other files (`properties/<name>-chat.md`), so the VS Code conversation can read what happened in the editor.
  And the changes land in the saved state, so they show up in the diff file, and from there in code, the usual way.
- **The API key:**  each user brings their own, kept in the browser.  The Claude API allows calls straight from a browser with a special header.
  That's fine on your own machine and on GitHub Pages, where it's your key in your browser.  It costs money per request.

**Difficulty:**  a few days for a first version that's genuinely useful.  The editing API is most of the work underneath; the panel, the tool loop and the screenshots are the rest.

## Option D:  Claude Code inside the editor

Like C, but the panel talks to a Claude Code agent on your machine, through a small plugin in the Vite dev server and the Claude Agent SDK.
It can use the page's editing API *and* edit the code and the files, with the project's CLAUDE.md.

- Closest to "one conversation":  Agent SDK sessions can be resumed, so a conversation started in the editor could be continued in VS Code with `claude --resume`, and back.
  Not both at once.
- Only under `npm run dev`.  Never in a published build.

**Difficulty:**  a few days, with more unknowns than C (sign-in, streaming to the page, permissions).  Worth it for your own work; not for other users.

## How the pieces fit

| | Who talks | Claude sees | Changes land in | Work |
| --- | --- | --- | --- | --- |
| Editing API | You, at the console | | The editor, undoable | 1–2 days |
| A | You, in VS Code | Screenshots, console, the page | The editor, undoable | Setup |
| B | You, in VS Code | The files | The editor, via the file | ½–1 day |
| C | Anyone, in the editor | Screenshots, the tree | The editor, undoable | A few days |
| D | You, in the editor or VS Code | Everything | The editor, the code, the files | A few days |

They share the foundation, and they don't exclude each other.

**Recommended order:**

1. **The editing API.**  Useful at the console on day one.
2. **A, with Claude in Chrome,** to try the conversational loop on the shorts.  Mostly setup, so it's the cheapest way to learn what the API is missing.
3. **B's context file,** if "that" and "here" keep needing explanations.
4. **C,** once the API has settled, for simple-video-editor and everyone else.
5. **D,** only if the gap between C and VS Code still hurts.

## Open questions

1. **Measuring:**  how much does "center it" need real bounds, and how to get them generically?
2. **Is a path by names good enough?**  Renaming breaks a path in the middle of a conversation.  Maybe the API also hands out short ids, good for one session.
3. **Should an AI's change be marked** in the history ("Claude:  moved Bottom left"), so it's easy to find and undo?  See [load-history.md](load-history.md):  names, and offered entries.
4. **The diff file and the editor disagree about where work belongs.**  With A, B and C, more of the work stays in saved state instead of code.  Is that fine, or should "promote to code" become a regular step?
