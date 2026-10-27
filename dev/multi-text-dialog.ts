import { Showable } from "../src/showable.ts";
import {
  MultiTextComponent,
  TextFormatComponent,
  TextSpanComponent,
} from "../src/slide-components/multi-text.ts";
import { FormatEditor } from "./format-editor.ts";

/** What the dialog needs from the Visual Editor.  It never reaches into canvas-recorder.ts directly. */
export type MultiTextDialogHooks = {
  /**
   * Save any unsaved changes now, so the History dialog has this text as it was before the
   * dialog changed it.
   */
  readonly saveNow: () => Promise<void>;
  /** The spans or the formats just changed.  Mark the video as changed. */
  readonly changed: () => void;
  /** A copy of `component`, the way Copy and Paste make one, or undefined if it can't be copied. */
  readonly copyComponent: (component: Showable) => Showable | undefined;
  /** The dialog closed.  Rebuild the editors it covered. */
  readonly closed: () => void;
};

/** Someone animated this span, by hand or in TypeScript.  Editing its text flattens it. */
function isAnimated(span: TextSpanComponent): boolean {
  return span.schedules.some(
    ({ schedule }) =>
      schedule.length > 1 || schedule.some(({ time }) => time !== 0),
  );
}

/**
 * ✎ Edit Text…:  a Multi Text's text, typed as one piece of text, with a menu in front of each
 * part naming its Text Format.  See development-plans/multi-text-editor.md.
 *
 * The dialog covers the right column, like the font picker, so the canvas stays in view, and
 * the canvas follows every keystroke.  The editor's value is a format string, the one
 * `addText1()` reads, and every change goes to {@link MultiTextComponent.setSpans}, which
 * reuses the Text Span children in order.
 *
 * Only the editable spans are here.  Text from `addText1()` belongs to the program, and Text
 * Spans added in TypeScript can't be removed, so the dialog just mentions them.
 */
export async function openMultiTextDialog(
  text: MultiTextComponent,
  hooks: MultiTextDialogHooks,
): Promise<void> {
  // Revert, and the History dialog, can then bring back exactly what's here now, animation and all.
  await hooks.saveNow();

  const originalChildren = text.replaceableComponents!.get();
  const copyKeyframes = <T>(keyframes: readonly T[]) =>
    keyframes.map((keyframe) => ({ ...keyframe }));
  const originalSpans = text.editableSpans().map((span) => ({
    span,
    content: copyKeyframes(span.contentSchedule.schedule),
    style: copyKeyframes(span.styleSchedule.schedule),
  }));
  const initialValue = text.getSpans();

  // MARK: Layout

  // Cover the right column so the canvas stays fully visible.  See openFontPickerDialog().
  const rect = document.getElementById("right-col")?.getBoundingClientRect();
  const dialog = document.createElement("dialog");
  dialog.style.cssText = rect
    ? [
        `position:fixed`,
        `margin:0`,
        `padding:0`,
        `left:${rect.left}px`,
        `top:${rect.top}px`,
        `width:${rect.width}px`,
        `height:${rect.height}px`,
        `max-width:none`,
        `max-height:none`,
        `border:none`,
        `border-left:2px solid #999`,
        `display:flex`,
        `flex-direction:column`,
        `box-shadow:-4px 0 16px rgba(0,0,0,0.2)`,
        `z-index:9999`,
        `overflow:hidden`,
      ].join(";")
    : "width:min(60em,90vw);height:80vh;display:flex;flex-direction:column;padding:0;border:1px solid #999;overflow:hidden;z-index:9999";

  const top = document.createElement("div");
  top.style.cssText =
    "padding:0.5em 0.8em;background:#f4f4f4;border-bottom:1px solid #ccc;flex-shrink:0";
  const heading = document.createElement("h3");
  heading.style.margin = "0 0 0.2em 0";
  heading.textContent = `✎ Edit Text:  ${text.userEditableDescription ?? text.description}`;
  const hint = document.createElement("div");
  hint.style.cssText = "font-size:0.85em;color:#555";
  hint.textContent =
    "Each menu sets the format of the text after it, up to the next menu.  " +
    "+ Format adds a menu at the cursor.  New… at the bottom of a menu makes a new format, " +
    "starting as a copy of that one.  Copy and paste use ⸨format⸩text, like addText1() in TypeScript.";
  const toolbar = document.createElement("div");
  toolbar.style.marginTop = "0.4em";
  const insertFormatBtn = document.createElement("button");
  insertFormatBtn.type = "button";
  insertFormatBtn.textContent = "+ Format";
  insertFormatBtn.title =
    "Add a format menu at the cursor.  It starts as the format already in effect there, " +
    "so nothing changes until you pick another.";
  toolbar.append(insertFormatBtn);
  const notes = document.createElement("div");
  notes.style.cssText = "font-size:0.85em;color:#a06000;margin-top:0.3em";
  top.append(heading, hint, toolbar, notes);

  const middle = document.createElement("div");
  middle.style.cssText = "flex:1;overflow-y:auto;padding:0.8em";
  const errorLine = document.createElement("div");
  errorLine.style.cssText = "color:#d70015;font-size:0.85em;margin-top:0.3em";

  const bottom = document.createElement("div");
  bottom.style.cssText =
    "display:flex;gap:0.5em;align-items:center;padding:0.5em 0.8em;background:#f4f4f4;border-top:1px solid #ccc;flex-shrink:0";
  const status = document.createElement("div");
  status.style.cssText = "flex:1;font-size:0.85em;color:#555";
  status.textContent =
    "The canvas follows as you type, when the playhead is inside this text's time.";
  const revertBtn = document.createElement("button");
  revertBtn.type = "button";
  revertBtn.textContent = "Revert";
  revertBtn.title = "Put the text and the formats back the way they were when this opened.";
  revertBtn.disabled = true;
  const doneBtn = document.createElement("button");
  doneBtn.type = "button";
  doneBtn.textContent = "Done";
  doneBtn.title = "Close.  Every change has already been made.";
  bottom.append(status, revertBtn, doneBtn);

  dialog.append(top, middle, bottom);

  // MARK: Notes

  const note = (message: string) => {
    const div = document.createElement("div");
    div.textContent = message;
    notes.append(div);
  };
  if (text.hasProgramText) {
    note(
      "This Multi Text also has text written by the program (addText1()), " +
        "which always comes after this text.  It can't be edited here.",
    );
  }
  if (
    text.children.some(
      ({ replaceable, child }) => !replaceable && child instanceof TextSpanComponent,
    )
  ) {
    note("This Multi Text also has Text Spans built in TypeScript.  They can't be edited here.");
  }
  for (const { span } of originalSpans) {
    if (isAnimated(span)) {
      note(
        `“${span.get(0).content}” is animated.  Editing it gives it one value, the one shown here.  ` +
          "The History dialog can still bring the animation back.",
      );
    }
  }
  if (text.formatNamesInScope().length === 0) {
    note("This text has no Text Formats yet.  Pick New… in a menu to make one.");
  }

  // MARK: Behavior

  /** True while Revert puts the editor back, so that change isn't applied a second time. */
  let reverting = false;

  const editor = new FormatEditor(initialValue, text.formatNamesInScope(), {
    onNewFormat: newFormat,
  });
  editor.element.style.minHeight = "12rem";
  middle.append(editor.element, errorLine);

  editor.onChange = (value) => {
    if (reverting) return;
    try {
      text.setSpans(value);
    } catch (reason) {
      // The editor always starts with a format, so this shouldn't happen.
      errorLine.textContent = String(reason);
      return;
    }
    errorLine.textContent = "";
    revertBtn.disabled = false;
    hooks.changed();
  };

  /** New… in a menu.  Resolves to the format's name, or undefined if the user cancelled. */
  async function newFormat(currentName: string): Promise<string | undefined> {
    const name = await askFormatName(text.formatNamesInScope());
    if (name === undefined) return undefined;
    // A name that's already there just picks that format.
    if (!text.formatNamesInScope().includes(name)) {
      // A copy, so nothing changes on screen until the new format is edited.  A brand new
      // format would draw at its own defaults:  a different size and color.
      const source = text.formatInScope(currentName);
      const copy = source && hooks.copyComponent(source);
      const format =
        copy instanceof TextFormatComponent ? copy : new TextFormatComponent();
      format.nameScalar.value = name;
      // So the component list shows the name.  Spans find a format by its Name, not this.
      (format as Showable).userEditableDescription = name;
      const children = text.replaceableComponents!.get();
      const lastFormat = children.findLastIndex(
        (child) => child instanceof TextFormatComponent,
      );
      children.splice(lastFormat + 1, 0, format);
      text.replaceableComponents!.replace(children);
      revertBtn.disabled = false;
      hooks.changed();
    }
    editor.knownNames = text.formatNamesInScope();
    return name;
  }

  // Keep the focus, and so the cursor, in the editor.
  insertFormatBtn.addEventListener("mousedown", (event) => event.preventDefault());
  insertFormatBtn.addEventListener("click", () => editor.insertFormat());

  revertBtn.addEventListener("click", () => {
    for (const { span, content, style } of originalSpans) {
      span.contentSchedule.set(copyKeyframes(content));
      span.styleSchedule.set(copyKeyframes(style));
    }
    // Brings back deleted spans, and removes new spans and new formats.
    text.replaceableComponents!.replace(originalChildren);
    reverting = true;
    try {
      editor.value = initialValue;
    } finally {
      reverting = false;
    }
    editor.knownNames = text.formatNamesInScope();
    errorLine.textContent = "";
    revertBtn.disabled = true;
    hooks.changed();
  });

  doneBtn.addEventListener("click", () => dialog.close());

  // Cmd+Z / Ctrl+Z anywhere in here is the editor's undo, not the History dialog.
  // In the editor itself, the editor has already handled it.
  dialog.addEventListener("keydown", (event) => {
    if (event.defaultPrevented) return;
    if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key === "z" && !event.shiftKey) {
      event.preventDefault();
      editor.undo();
    } else if ((key === "z" && event.shiftKey) || key === "y") {
      event.preventDefault();
      editor.redo();
    }
  });

  // Escape, as well as Done.  Every change is already made, so closing is always safe.
  dialog.addEventListener("close", () => {
    editor.destroy();
    dialog.remove();
    hooks.closed();
  });

  document.body.append(dialog);
  dialog.showModal();
  // Start typing at the end.
  editor.element.focus();
  document.getSelection()?.selectAllChildren(editor.element);
  document.getSelection()?.collapseToEnd();
}

/**
 * Ask for a new format's name.
 * @param existing The names already in use.  Picking one of these is allowed:  it uses that format.
 * @returns The name, or undefined if the user cancelled.
 */
function askFormatName(existing: readonly string[]): Promise<string | undefined> {
  const dialog = document.createElement("dialog");
  dialog.style.cssText = "min-width:26em;max-width:36em;padding:1em";

  const heading = document.createElement("h3");
  heading.style.margin = "0 0 0.2em 0";
  heading.textContent = "New Format";
  const hint = document.createElement("div");
  hint.style.cssText = "font-size:0.85em;color:#555;margin-bottom:0.8em";
  hint.textContent =
    "It starts as a copy of the format it replaces, so nothing changes on the canvas yet.  " +
    "After Done, select it in the component list to change how it looks.";

  const label = document.createElement("label");
  label.append("Name ");
  const input = document.createElement("input");
  input.type = "text";
  input.style.width = "16em";
  label.append(input);

  const message = document.createElement("div");
  message.style.cssText = "font-size:0.85em;min-height:1.3em;margin:0.3em 0 0.8em 0";

  const buttons = document.createElement("div");
  buttons.style.cssText = "display:flex;gap:0.5em;justify-content:flex-end";
  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.textContent = "Cancel";
  const okBtn = document.createElement("button");
  okBtn.type = "button";
  okBtn.textContent = "OK";
  buttons.append(cancelBtn, okBtn);

  dialog.append(heading, hint, label, message, buttons);

  function validate(): void {
    const name = input.value;
    const illegal = /[⸨⸩]/.test(name);
    okBtn.disabled = illegal;
    message.style.color = illegal ? "#d70015" : "#555";
    message.textContent = illegal
      ? "A format's name can't contain ⸨ or ⸩."
      : existing.includes(name)
        ? "There's already a format with this name.  OK uses it."
        : "";
  }
  input.addEventListener("input", validate);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !okBtn.disabled) {
      event.preventDefault();
      okBtn.click();
    }
  });

  let result: string | undefined;
  okBtn.addEventListener("click", () => {
    result = input.value;
    dialog.close();
  });
  cancelBtn.addEventListener("click", () => dialog.close());
  validate();

  return new Promise((resolve) => {
    dialog.addEventListener("close", () => {
      dialog.remove();
      resolve(result);
    });
    document.body.append(dialog);
    dialog.showModal();
    input.focus();
  });
}
