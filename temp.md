The Multi Text editor is in, but I haven't run the dialog itself in a browser, so that part is yours to try.

To open it, select a Multi Text and click **✎ Edit Text…** at the top of its Text Frame panel. The dialog covers the right column, and the canvas follows every keystroke while the playhead is inside the text's time.
- **The dialog:** each menu sets the format of the text after it. **+ Format** adds a menu at the cursor, and **New…** at the bottom of any menu makes a new format.
- **New formats:** a new format starts as a copy of the one it replaces, so nothing on screen changes until you edit it. It goes after the Multi Text's other formats, and the component list shows its name.
- **Revert** puts everything back exactly as it was, including animation, deleted spans and new formats. **Done** or Escape closes it.
- **Notes:** the dialog warns about animated spans, text added by `addText1()`, and spans built in TypeScript.
- **Undo:** Cmd+Z inside the dialog undoes your typing. It no longer opens the History dialog there.

I settled the plan's open questions as recommended:
- `#temporaryText` is now `#programText`.
- New library methods: `setSpans()`, `getSpans()`, `editableSpans()`, `formatNamesInScope()` and `formatInScope()`, plus a shared `parseFormatString()`.
- None of this is a breaking change.

**Where it differs from the plan:**
- It saves any unsaved changes when the dialog opens, rather than only before an edit that would destroy an animated span. The promise is the same: the History dialog has the version from before.
- The dialog is modal, like the font picker, so the play controls on the left don't work while it's open.

All of this is recorded in a new "First version" section of [multi-text-editor.md](development-plans/multi-text-editor.md).

**Checked:**
- The type check passes.
- I ran `setSpans()` and the format-scope helpers in Node with a throwaway script, and every check passed: spans are reused, animation survives unless that span's own text changes, other children keep their places, and `addText1()` text stays separate.

**Already compiled for you:** your watch compiled the code. It only copies CSS when it starts, so I copied the editor's new styles into `dist/` by hand, and the page should just reload.