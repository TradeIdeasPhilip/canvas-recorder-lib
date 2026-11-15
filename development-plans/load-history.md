# The Load History

Ideas for the history behind the Load dialog: entries a tool offers without applying them, names, and which window each entry came from.

**Status (2026-11-14):** Ideas. No code yet. **One piece is planned for before 1.0:** [renaming a saved backup](#first-step-name-a-backup-before-10).

Related: the lab, scripts and agent windows in [multi-window-sync.md](multi-window-sync.md#a-lab-window-11102026), its conflict stash (item 7), and [ai-in-the-editor.md](ai-in-the-editor.md)'s open question 3.

## Today

- Every save appends one entry to the video's history in IndexedDB: `{ timestamp, tree }`, `VideoDataEntry` in [dev/canvas-recorder.ts](../dev/canvas-recorder.ts).
  The newest 20 are kept (`MAX_HISTORY_ENTRIES`).
- The Load dialog lists them newest first, each as a date and time, along with TypeScript defaults and the JSON files opened before.
  Selecting one previews it; Keep makes it current. There's a Delete button.
- Startup restores the last entry in the array, `entries.at(-1)`, not the newest by timestamp.
- Every window on the same video shares this history.
- Entries live only in IndexedDB. A `.json` save file holds just the tree.
  So new fields on an entry aren't a breaking change: older entries just don't have them. This can come before or after 1.0.

## Offered entries

A tool puts a state into the history without applying it. It's there for anyone who wants it, whenever they want it.

- **Uses:**
  - A script computes something and offers it, instead of changing the video while you're in the middle of something.
  - An agent offers alternatives: "three versions of the timing; pick one in Load."
  - multi-window-sync.md's conflict stash (item 7) is the same thing: a state that's kept, but isn't current.
- **How:** an `offered` flag on the entry.
  - Startup restores the newest entry that isn't offered. `entries.at(-1)` would restore an offer, so that has to change.
    Item 7 worked around it by inserting the stash before the last element; a flag is clearer, and the entry keeps its real timestamp.
  - The dialog shows offers differently: a mark in front, a different color.
  - Keeping one works like any other Load. The offer stays in the list.

## Names

- **Labels for events the program knows about:**
  - "Opened ms pac man.json", "TypeScript defaults", "From the unload backup".
  - "Before opening …": `_flushDirtyToDb()` already saves an entry before Open, so a load can be undone.
  - A script run: the script's description.
  - An agent reply: its summary, e.g. "Claude: moved Bottom left". That answers ai-in-the-editor.md's open question 3.
- **Your own names:** a "Name this version" field in the Load dialog, like a checkpoint. "Before I changed the circuit timing."
- **A generated description for every entry** (speculation). Compare each entry with the one before it, and list what changed, by path: "Scratch 1 → Bottom: Reference Rect, Step".
  That answers "which one was before I broke it?" without previewing each one.
  The trees are about 15 KB in 7-pointed-star-shorts, so comparing 20 of them is cheap. The open part is wording a summary that's short and still useful.

## First step: name a backup (before 1.0)

Decided 2026-11-14. The rest of this file is still ideas.

**The use case:** keep a version you know is good, and find it again. The autosave writes an entry about 5 s after each burst of editing and keeps 20, so a good state is pushed out within the hour, and a list of 20 timestamps doesn't say which one was good.

**What it does:**

- The Load dialog lets you rename any saved backup, including the current one. "Before I changed the circuit timing."
- Auto-delete only applies to **unnamed** entries. The 20 counts only those. A named entry stays until you delete it.
- The name shows in the list, in place of or beside the date and time.
- Not renamable: "TypeScript defaults" and the file entries. They already have names.
- Entries from before this have no name and work as they do now. Not breaking.

**Where in the code** (all in [dev/canvas-recorder.ts](../dev/canvas-recorder.ts)):

- `VideoDataEntry` gets `label?: string`, as in "What an entry would hold" below.
- **Trimming:** `MAX_HISTORY_ENTRIES` is applied in three places (`writeMarkerIfNeeded()`, the unload-backup code, and `saveVideoState()`), each with `while (entries.length > MAX) entries.shift()`. Make one `trimHistory()` that drops the oldest **unnamed** entries and never a named one. Markers count as unnamed.
- **Duplicates:** `saveVideoState()` also drops older entries whose content equals the new save. A named entry must never be dropped that way, or going back to a named state and saving would delete the name.
- **The dialog:** `_rebuildDialogList()` shows the name, and gets a rename control. A rename writes straight to IndexedDB, like Delete does. It isn't part of the video's state, so Revert doesn't undo it.
- **The current entry:** opening the dialog already saves unsaved changes, so the current state is always an entry (`_loadSource` has its timestamp). Rename it like any other.

**Speculation:**

- The cap on named entries (see below). A few hundred would do.
- Rename with a button or a double-click and an inline text field, Enter to keep it and Escape to cancel. An empty name makes it unnamed again.
- Deleting a named entry might ask first.

**Risks:**

- This is the saving code, which has lost work before. Each of the three trim sites reads, changes and writes the whole history, and two windows can interleave. [priorities.md](../priorities.md)'s "Groundwork for saving" (one transaction) fixes that. Rename uses the same read-modify-write, so it's no worse than today.
- `trimHistory()` is a pure function of a list. It can be tested without a browser, and should be.

**Effort:** about half a day, in one commit.

| Piece                                                                                                                  | Effort    |
| ---------------------------------------------------------------------------------------------------------------------- | --------- |
| `label`, `trimHistory()` and the duplicate rule                                                                        | 1 hour    |
| The dialog: showing names, rename, delete                                                                              | 1–2 hours |
| Tests: a pure test of `trimHistory()`, then headless Chromium (name one, make 25 more saves, reload, it's still there) | 1–2 hours |

## Keeping named entries

20 entries go quickly: the autosave writes one 5 s after each burst of editing.
So an offer, or a version you named, would be pushed out within the hour.

- Named and offered entries don't count toward the 20. They stay until someone deletes them.
- Maybe a cap of its own, much larger, so a script run in a loop can't fill IndexedDB.

## Local or remote

Once two windows share a video ([multi-window-sync.md](multi-window-sync.md)), their saves interleave in the list. Marking them makes the list readable.

- Each entry records the window that saved it:
  - a random id for the tab, kept across reloads in `sessionStorage`. Startup calls `sessionStorage.clear()`, so `saveState()` has to write it again, like the playhead.
  - a short description of the window: its root ("Scratch 2") or its kind ("Lab").
- The dialog marks entries from other windows: a different color, and "from the window on Scratch 2".
- A window that receives another window's change doesn't save it again, so each entry has exactly one author.

## What an entry would hold

Speculation:

```ts
type VideoDataEntry = {
  timestamp: number;
  tree: SerializedFixedChild;
  /** From a person or a tool.  Named entries are kept past the newest 20. */
  label?: string;
  /** Put here without being applied.  Startup skips it. */
  offered?: boolean;
  /** The window that saved it. */
  window?: { id: string; description: string };
};
```

## Effort

| Piece                                                                   | Effort                             | Certainty           |
| ----------------------------------------------------------------------- | ---------------------------------- | ------------------- |
| The new fields, labels for known events, and showing them in the dialog | Small                              | High                |
| Offered entries, and startup skipping them                              | Small                              | High                |
| Your own names, and keeping named entries past 20                       | Small: about half a day, see above | High                |
| Marking other windows' entries                                          | Small, once sync exists            | High                |
| Generated descriptions                                                  | Small–Medium                       | Medium: the wording |

The first three need nothing else. They're useful today, and the scripts and the agent can use them as soon as they exist.
