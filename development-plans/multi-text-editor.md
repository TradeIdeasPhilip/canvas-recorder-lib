# Multi Text Editor

The Multi Text component is very powerful, but sometimes hard to use.
I propose a simple tool in the Visual Editor for this component.
The user types text, more or less like any plain text editor,
and inserts HTML `<select>` elements to change the formats.

**Status (2026-10-27):** Built, first version.  See [First version](#first-version-2026-10-27) at the end.

## Background

### `addText1()`

This is based on [`MultiTextComponent.addText1()`](../src/slide-components/multi-text.ts#L290-L308), which already turns one string into a paragraph:

```ts
component.addText1("⸨format1⸩content1⸨format2⸩content2⸨format3⸩content3");
// is the same as
component.addText("format1", "content1").addText("format2", "content2").addText("format3", "content3");
```

- Each `⸨name⸩` names a Text Format.  The content after it, up to the next `⸨`, is one Text Span in that format.
- [`addText()`](../src/slide-components/multi-text.ts#L277-L289) adds one span; [`clearText()`](../src/slide-components/multi-text.ts#L309-L315) removes every span these made.
- There's no way to escape `⸨` or `⸩`, so content can't contain them.

The difference that matters here:  `addText()` makes *temporary* spans (`#temporaryText`).
They come after the child spans in the paragraph, but they aren't children:  the Visual Editor never sees them, and they're never saved.
This editor makes real Text Span children instead, so the Visual Editor can save, load and undo them like anything else.

### Why `addText()`'s spans are hidden

There's no comment saying why, but the history does.

- **When:**  canvas-recorder commit [1056234](https://github.com/TradeIdeasPhilip/canvas-recorder/commit/1056234) (2026-08-04, "Bug fix:  Slides 7, 8 and 9 had some issues.  The text at the top was not displaying correctly.").
  Before it, `addText()` pushed each span into `replaceableComponents`, and `clearText()` removed them from there.
  It made them `#temporaryText` instead.
- **Why:**  that commit's note in canvas-recorder's `development-plans/indexeddb-to-code.md`:
  > I was manipulating some of the text-related components that were _replaceable_ children.
  > The serializer recreated them and I never updated my code to point to the new replacement components and I never modified the new replacement components.

  So the code kept changing spans that were no longer in the tree.
- **What the text was:**  slides 7–9 (`ShowTwoTransforms` in some5.ts) built the text from the slide's own data, like `left.transformString`, with formats (`left`, `left colorful`…) that the Visual Editor could still change.
- **Still in use:**  affine-transforms' Slide 13 calls `this.textTop.clearText().addText1(…)` in `showHelper()`, on **every frame**, with text that includes live values like `${status.sample.svg}`.
  As children, those spans would change the tree on every frame:  dirty every frame, a constantly changing tree, and the serializer replacing them.
  canvas-recorder's showcase.ts ("Multi Text: Please Check") also uses `addText1()`, once, when it builds the slide.

In short:  the program owns the content, so it's hidden from the Visual Editor, while the formats stay editable.

Two more things the history shows:

- **The order is fixed:**  hidden spans always come *after* every child span.
  The 2026-08-04 version of one slide added two child spans in the middle of its `addText()` calls; they would have been drawn first, not in the middle.
  Mixing the two kinds only works when the hidden text is the end of the paragraph.
- **A name:**  "temporary" describes how it's used (rebuilt often), not what it is.  "Hidden" is closer.  What really sets it apart is that the *program* owns it, so I'd call it `#programText`, with a doc comment saying everything above.

**`"hidden" | "visible"` for `addText1()`?**  I'd make the visible kind a separate method instead, say `setSpans(value)`:  "make the replaceable Text Span children match this string".
The two kinds have opposite rules.  Hidden text may be rebuilt every frame; visible text should only be set once, as the TypeScript default, because every change is an edit.
A parameter makes it easy to pick the wrong one inside `show()`.
And `setSpans()` is exactly steps 1–3 below, so the editor and TypeScript would share it.

### The prototype

https://github.com/TradeIdeasPhilip/format-editor-prototype (also `../format-editor-prototype`) is the editor itself, working, with its value in exactly `addText1()`'s format.

- [`src/format-string.ts`](https://github.com/TradeIdeasPhilip/format-editor-prototype/blob/master/src/format-string.ts):  the pure model, no DOM.  `addText1Spans(value)` turns a value into `{ format, content }` pairs, the same split `addText1()` makes.
- [`src/format-editor.ts`](https://github.com/TradeIdeasPhilip/format-editor-prototype/blob/master/src/format-editor.ts):  `class FormatEditor`, a `contenteditable` wrapper.
  `new FormatEditor(value, knownNames)`, then `.element`, `.value`, `.knownNames` and an `onChange` callback.
- Already worked out there:  formats are atomic chips; unknown names are red; the value always starts with a format; copy and paste use the `⸨name⸩content` text, so it round-trips with VS Code; Enter inserts `\n`; it has its own undo and redo.

## Proposal

When a Multi Text is selected, the Text Frame panel ([dev/multi-text-panel.ts](../dev/multi-text-panel.ts)) gets an **✎ Edit Text…** button.
It opens a dialog with plenty of room for the editor.

The dialog covers the right column, everything right of the main vertical splitter, so the canvas stays completely visible while the user types.
The font picker and the color picker already do this:  see `openFontPickerDialog()` in [dev/font-widgets.ts](../dev/font-widgets.ts) ("Cover the right column so the canvas stays fully visible") and [dev/color-picker.ts](../dev/color-picker.ts).
They measure `#right-col` once, when they open; that's enough for a modal dialog.

The editor has no sense of a schedule.  So, on every change (`input`, per CLAUDE.md, so the canvas follows the typing):

1. Split the editor's value into `{ format, content }` pairs with `addText1Spans()`.
2. Make the Multi Text's Text Span children match:  one span per pair, in order.  Create and delete Text Span components as needed.
3. Give every span's Content and Style schedules a single keyframe at time 0 with that value, like we normally do for a schedule with just one item.

And the other way:  when the panel opens, build the editor's value from the Text Span children, in order, as `⸨style⸩content`.

### Before destroying anything interesting

A Text Span is *interesting* if any of its schedules has a keyframe at a time other than 0:  someone animated it, by hand or in TypeScript.
Step 3 flattens it, and step 2 may delete it.

If an edit is about to do that, and there are unsaved changes, save first, so the interesting version **will** be in the undo history.
We already save early in other places (on page exit, and before opening the Load dialog:  `_flushDirtyToDb()` in dev/canvas-recorder.ts), but this one starts in a panel.
The panels never reach into canvas-recorder.ts directly; they get hooks.  So this means a new hook, something like `saveNow(): Promise<void>`, that exposes what was internal.

### New formats

The last `<option>` in every format `<select>` is **New…**.
It opens a small dialog asking for the new name, with OK and Cancel.
OK creates a Text Format, applies it to that chip, and adds it to every `<select>`.

- **The name goes in the Text Format's Name scalar** (`nameScalar`).  That's what spans match (`getFormat()` in multi-text.ts), not the description.
  Set `userEditableDescription` to the same name, so the tree shows it.  `description` stays "Text Format", like any other.
- **Start as a copy of the chip's current format,** not a brand new one.
  A Text Format doesn't inherit anything:  a new one draws at its own defaults (size 1, boldness 1, its default color), so the text would suddenly change size and color.
  As a copy, nothing changes on screen until the user edits the new format.
- **Where it goes:**  a replaceable child of this Multi Text, after its other Text Formats.
- **Names:**  a name already in the list just selects that format.  A name can't contain `⸨` or `⸩`.  An empty name is legal:  affine-transforms' Slide 13 uses `⸨⸩` for its base format.
- **The prototype** needs a way to ask for this:  something like an `onNewFormat(): Promise<string | undefined>` callback on `FormatEditor`, called when New… is chosen.

## Details

My recommendations.  Small, but each one needs an answer.

- **Which spans the editor owns.**  Only the Multi Text's own Text Span children that the Visual Editor can replace.
  Hidden spans from `addText()` stay out of it.  So do spans built as fixed children in TypeScript.
  If a Multi Text has hidden text, the dialog says so:  "This Multi Text also has text written by the program, which always comes after this text."
  Showing that text would be pointless; it can change every frame.
- **Live, with Done and Revert.**  The canvas follows every keystroke.  **Done** closes the dialog.
  **Revert** puts the text back the way it was when the dialog opened, like the History dialog's Revert.
- **Keep the span objects.**  Reuse the existing spans in order:  change span *i* only if its pair changed, add at the end, remove from the end.
  Typing a letter then changes one span's content and nothing else.  The tree only rebuilds when the number of spans changes.
  It also means an animated span is only flattened if its own text is edited.
- **Other children stay put.**  Text Formats, a text effect and any other components keep their places.  New spans go right after the last span.
- **Which values to show.**  The spans' values at time 0.  If any span is animated, the panel warns that editing that span flattens it.
- **The known names.**  The formats this Multi Text can see:  its own Text Formats, plus its ancestors'.
  `extractTextFormatList()` only finds the ancestors' while drawing (through `ShowOptions`), so this needs a small helper that walks up the `parent` chain instead.
  The editor shows any other name in red, as it does now.
- **Undo.**  `contenteditable` isn't an `<input>` or a `<textarea>`, so today Cmd+Z inside the editor would open the History dialog.
  The keydown handler in dev/canvas-recorder.ts (`Cmd+Z / Ctrl+Z opens the history (undo) dialog…`) should skip `isContentEditable` targets too.
  Then Cmd+Z undoes typing inside the editor, and the History dialog undoes everything else, as with the other text fields.
- **Saving.**  `markDirty()` after each change, like any other edit, through a hook.
- **Copying the prototype.**  `format-string.ts` and `format-editor.ts` go into `dev/`.  Its `style.css` rules go into `dev/canvas-recorder.css`.
  `format-string.test.ts` has nowhere to run here (no test runner), so it stays in the prototype.

## Decisions (2026-10-24)

- **A button and a dialog,** not an always-visible panel.  See [Proposal](#proposal).
- **New formats come from New… in the `<select>`.**  See [New formats](#new-formats).

## Questions

- ~~Rename `#temporaryText`, and add `setSpans()`?~~  Yes, both.  See below.

## First version (2026-10-27)

**In the library** ([src/slide-components/multi-text.ts](../src/slide-components/multi-text.ts)):

- `parseFormatString()`:  the `⸨name⸩content` parser, now shared by `addText1()`, `setSpans()` and the editor.
  The prototype's copy (`addText1Spans()`) stayed behind.
- `#temporaryText` is now `#programText`, with a doc comment saying why it's hidden.  `hasProgramText` tells the dialog whether to mention it.
- `editableSpans()`, `getSpans()` and `setSpans(value)`, as described under [Details](#details):  spans reused in order, a schedule only changed if its value at time 0 differs, spans added after the last span and removed from the end.
- `formatNamesInScope()` and `formatInScope(name)`:  the formats a span can see, found by walking up the `parent` chain.

**In the Visual Editor:**

- [dev/format-string.ts](../dev/format-string.ts) and [dev/format-editor.ts](../dev/format-editor.ts), copied from the prototype.
  Added:  **New…** at the end of each menu (an `onNewFormat` option), and `destroy()`, which removes its `selectionchange` listener from the document.
  Its styles are at the end of [dev/canvas-recorder.css](../dev/canvas-recorder.css).
- [dev/multi-text-dialog.ts](../dev/multi-text-dialog.ts):  the dialog, opened by **✎ Edit Text…** at the top of the Text Frame panel.
  It has **+ Format** (the prototype's "insert a format at the cursor"), notes for program text, TypeScript spans and animated spans, **Revert** and **Done**.  Escape is Done.
- The Cmd+Z handler skips a `contenteditable`, and any key an editor already handled (`defaultPrevented`).  Inside the dialog, Cmd+Z is always the editor's undo.

**Where it differs from the plan:**

- **Saving first:**  the dialog saves any unsaved changes when it *opens*, not just before an edit that would flatten or delete an animated span.
  Simpler, and the promise is the same:  the History dialog has the text as it was before the dialog changed it.
- **Revert is exact:**  the dialog keeps copies of each span's keyframes and of the list of children, so Revert brings back animation, deleted spans, and removes new formats.
- **Modal:**  like the font picker, so the left column's play controls don't work while it's open.  The canvas follows the typing only while the playhead is inside the text's time; the dialog says so.

**Not done:**

- The prototype's tests (`format-string.test.ts`) stay in the prototype.  The library half was checked with a throwaway Node script.
- Spell check and drag and drop are still off in the editor, as in the prototype.
