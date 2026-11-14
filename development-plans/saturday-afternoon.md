# Simple Tasks for a Saturday Afternoon

Small jobs, each one commit, none urgent.

**Status (2026-11-13):** Not started.

## Dialogs:  revert the way ✎ Edit Text… does

A dialog whose changes show live should revert the way ✎ Edit Text… does ([dev/multi-text-dialog.ts](../dev/multi-text-dialog.ts)).  CLAUDE.md's "Dialogs with live changes" says what that is.  In short:  every change is made right away; **Revert** puts back what was there when the dialog opened and leaves it open; **Done** and Escape close it.

### The Load dialog

`historyDialog` in [dev/player-body.ts](../dev/player-body.ts), and its code in [dev/canvas-recorder.ts](../dev/canvas-recorder.ts) (search for `historyCancelBtn`).

- **Today:**
  - Selecting an entry previews it on the canvas.
  - **Keep** makes it current and closes.
  - **Revert** puts back the state from before the dialog opened, then closes.
  - **Switch & Abandon** and **Switch & Save** are always hidden.  Their handlers just close the dialog, "kept for safety".
- **Change to:**
  - Selecting an entry applies it, as now.
  - **Revert** puts back the state from before, selects that entry in the list, and leaves the dialog open.  It's disabled until something changes.
  - **Done** closes.  Escape does the same.
  - Remove the two hidden buttons.
- **Check first:**  Escape today closes the dialog without running either Keep or Revert.  If an entry was being previewed, it looks like the preview stays on the canvas without being kept.  Whatever Escape does, it should match Done.

### Find the others

Look through every dialog in `dev/` (search for `showModal`).  For each one that changes the video while it's open, make it revert the way Edit Text does.

Candidates seen on 2026-11-13, not checked yet:

- **The font picker,** `openFontPickerDialog()` in [dev/font-widgets.ts](../dev/font-widgets.ts).  Clicking a row changes the font right away.  To revert, you click the original font, which is pinned as the first row; there's no button.
- **Dialogs with a preview:**  the color picker ([dev/color-picker.ts](../dev/color-picker.ts)), the Handwriting timing dialog ([dev/handwriting-panel.ts](../dev/handwriting-panel.ts)) and the split dialogs ([dev/split-dialog.ts](../dev/split-dialog.ts)).  Each has Cancel, and its preview may be inside the dialog only.  If nothing changes until OK, it's fine as it is.

## "Style Name", not "Name" and "Style"

A Text Format's properties start with two called "Name":  the component's own, which every component has, and the Text Format's name, which Text Spans use to pick it.  A Text Span's matching property is called "Style".  Call them both **Style Name**.

- **Where:**  `nameScalar = new StringScalarInfo("Name", "")` on `TextFormatComponent`, and `styleSchedule = new StringScheduleInfo("Style", "")` on `TextSpanComponent`, both in [src/slide-components/multi-text.ts](../src/slide-components/multi-text.ts).
  The property types are in [src/schedule-helper.ts](../src/schedule-helper.ts).
- **This is more than a rename.**  The name you see is also the key in the save file:  `keyOf()` in [src/snapshot.ts](../src/snapshot.ts) pairs saved properties by type and description.  Renamed without help, every saved Text Format would load without its name, and every saved Text Span without its style.
- **So:**  restore has to read the old key when there isn't a new one.  One way (speculation):  an optional list of former descriptions on a property, which `keyOf()`'s callers try in turn.  Write a test that loads a save from before the rename.
- **Release:**  with the old keys still read, nothing breaks, so it's a patch.  Without that, it's a breaking change.
- **Also check:**  anything that looks a property up by its description, in the library and in the projects.  For example, search for `"Style"`.
