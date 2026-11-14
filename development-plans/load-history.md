# The Load History

Ideas for the history behind the Load dialog: entries a tool offers without applying them, names, and which window each entry came from.

**Status (2026-11-10):** Ideas. No code yet.

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

| Piece                                                                   | Effort                  | Certainty           |
| ----------------------------------------------------------------------- | ----------------------- | ------------------- |
| The new fields, labels for known events, and showing them in the dialog | Small                   | High                |
| Offered entries, and startup skipping them                              | Small                   | High                |
| Your own names, and keeping named entries past 20                       | Small                   | High                |
| Marking other windows' entries                                          | Small, once sync exists | High                |
| Generated descriptions                                                  | Small–Medium            | Medium: the wording |

The first three need nothing else. They're useful today, and the scripts and the agent can use them as soon as they exist.
