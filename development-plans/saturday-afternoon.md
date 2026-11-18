# Simple Tasks for a Saturday Afternoon

Small jobs, each one commit, none urgent.
One bigger job is listed at the end, so it isn't lost: "Easing functions with parameters" needs time to brainstorm and maybe prototype.

**Status (2026-11-13):** Not started.

## Dialogs: revert the way ✎ Edit Text… does

A dialog whose changes show live should revert the way ✎ Edit Text… does ([dev/multi-text-dialog.ts](../dev/multi-text-dialog.ts)). CLAUDE.md's "Dialogs with live changes" says what that is. In short: every change is made right away; **Revert** puts back what was there when the dialog opened and leaves it open; **Done** and Escape close it.

### The Load dialog

`historyDialog` in [dev/player-body.ts](../dev/player-body.ts), and its code in [dev/canvas-recorder.ts](../dev/canvas-recorder.ts) (search for `historyCancelBtn`).

- **Today:**
  - Selecting an entry previews it on the canvas.
  - **Keep** makes it current and closes.
  - **Revert** puts back the state from before the dialog opened, then closes.
  - **Switch & Abandon** and **Switch & Save** are always hidden. Their handlers just close the dialog, "kept for safety".
- **Change to:**
  - Selecting an entry applies it, as now.
  - **Revert** puts back the state from before, selects that entry in the list, and leaves the dialog open. It's disabled until something changes.
  - **Done** closes. Escape does the same.
  - Remove the two hidden buttons.
- **Check first:** Escape today closes the dialog without running either Keep or Revert. If an entry was being previewed, it looks like the preview stays on the canvas without being kept. Whatever Escape does, it should match Done.

### Find the others

Look through every dialog in `dev/` (search for `showModal`). For each one that changes the video while it's open, make it revert the way Edit Text does.

Candidates seen on 2026-11-13, not checked yet:

- **The font picker,** `openFontPickerDialog()` in [dev/font-widgets.ts](../dev/font-widgets.ts). Clicking a row changes the font right away. To revert, you click the original font, which is pinned as the first row; there's no button.
- **Dialogs with a preview:** the color picker ([dev/color-picker.ts](../dev/color-picker.ts)), the Handwriting timing dialog ([dev/handwriting-panel.ts](../dev/handwriting-panel.ts)) and the split dialogs ([dev/split-dialog.ts](../dev/split-dialog.ts)). Each has Cancel, and its preview may be inside the dialog only. If nothing changes until OK, it's fine as it is.

## "Style Name", not "Name" and "Style"

A Text Format's properties start with two called "Name": the component's own, which every component has, and the Text Format's name, which Text Spans use to pick it. A Text Span's matching property is called "Style". Call them both **Style Name**.

- **Where:** `nameScalar = new StringScalarInfo("Name", "")` on `TextFormatComponent`, and `styleSchedule = new StringScheduleInfo("Style", "")` on `TextSpanComponent`, both in [src/slide-components/multi-text.ts](../src/slide-components/multi-text.ts).
  The property types are in [src/schedule-helper.ts](../src/schedule-helper.ts).
- **The save key:** the name you see is also the key in the save file. `keyOf()` in [src/snapshot.ts](../src/snapshot.ts) pairs saved properties by type and description.
- **The fix (the user's, 2026-11-13):** an optional constructor parameter for the saved name. By default it's the same as the visible name, so nothing else changes. These two properties would show "Style Name" and keep saving as "Name" and "Style". No changes to any saved data.
- **Release:** not breaking, so a patch.
- **When:** before 1.0 (the user, 2026-11-13). It looks odd to anyone new. Listed in [release-1.0.md](release-1.0.md), item 4.

## Smarter default names

A component with no name shows its type, so a scene ends up with four things called "Video Clip" and two called "Padding" (7-pointed-star's Scratch 8).
**Reasonably soon, please (the user, 2026-11-15).** "It's an annoyance. It's probably not that hard."

- **The idea (the user's):** each component can have an optional method that makes a name. A text would use its first few words.
  The editor shows the user's name if there is one, then the made name, then the type.
- **How often does the editor look?** It doesn't. Read on 2026-11-15: a name is read only when something is rebuilt.
  - The component tree: `updateComponentEditor()` in [dev/canvas-recorder.ts](../dev/canvas-recorder.ts).
  - The timeline's blocks: `_buildTimelineBlocks()`, which copies each name once.
  - The chapter list: `dump()`.
  - The Name box rebuilds all three on every keystroke (`syncName()` in `buildNameSection()`).
- **So a made name needs a refresh when a property changes,** not on every frame.
  - `markDirty()` is called after every edit. It could set a flag, and the next frame re-reads the names once.
  - Or a timeline block's label could be read when it's drawn, as a sound clip's already is (`get label()` in `soundClipBlock()`).
  - Either way the method runs after an edit, so it should be quick, but it doesn't have to be free.
- **A name given in code wins.** 7-pointed-star names its new slides "Scratch 2", "Scratch 3" and so on, and the user never changes them: "I love the idea that this is a scratch pad and I have a new box of crayons."
  So a made name only stands in for the type's name ("Video Clip", "Text"). The component knows whether its description was passed in, so its method can decide.
- **One function for the name.** Seventeen places write `userEditableDescription ?? description`, in five files under `dev/`. Replace them with one `displayName()` first.
- **Only for showing.** `description` and the user's name are also used to match things up (fixed components, and the TypeScript diff). A made name must never be saved or matched.
- **What each would say (my guesses):**
  - Simple Text and Traditional Text: the first few words. The text is a schedule, so use its first keyframe, not the playhead, or the name would change while playing.
  - Multi Text: the first few words of its spans. A Text Span: its content. A Text Format: its Style Name.
  - Video Clip and Image: the file's name, without `local:` and the extension. For a piece of a split clip, add its range.
  - Padding: its child's name. The timeline already does this.
  - Sound clips already do it: notes, or else the first six words.
- **The Name box's placeholder** shows the made name.
- **Release:** an optional method, so a patch or a minor. Half a day (a guess).

## Easing functions with parameters

Moved to its own file on 2026-11-15, with a proposal: [easing-functions.md](easing-functions.md).
**Re-examine it next time there's room for something short and worthwhile** (the user, 2026-11-15). It isn't a one-commit job like the others here.
