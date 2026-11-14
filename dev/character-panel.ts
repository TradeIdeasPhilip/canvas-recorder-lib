import {
  allFontCharacters,
  fontCharacters,
  FontName,
  MissingCharacters,
} from "../src/glib/font-choices.ts";

/**
 * The Characters panel, for a Text Format or a Text:  every character any
 * font has, with the ones this font doesn't have grayed out.  Click one to
 * copy it.  And a warning when the text uses a character its font doesn't
 * have.
 *
 * The ✎ Edit Text dialog has one too, where a click types the character.
 * @module
 */

export type CharacterPanelHooks = {
  /** The font to gray the characters for:  the one at the playhead, or at the cursor. */
  fontName(): FontName;
  /**
   * What to warn about.  See `MultiTextComponent.missingCharacters()`.
   * Without this, {@link CharacterPanel.status} stays empty.
   */
  missing?(): readonly MissingCharacters[];
  /**
   * Clicking a character calls this, instead of copying it.  For a panel next to a
   * text field:  type the character at the cursor.  Clicking doesn't take the focus.
   */
  onPick?(char: string): void;
};

export type CharacterPanel = {
  /** The warnings.  Empty, and taking no room, when there's nothing to warn about. */
  readonly status: HTMLElement;
  /** The characters.  Goes after the properties:  it's tall, and it's for reference. */
  readonly palette: HTMLElement;
  /** Something may have changed:  the font, the text.  Redraw. */
  refresh(): void;
  /** The playhead or the cursor moved.  Cheap unless the font changed. */
  timeChanged(): void;
};

/** Unavailable characters, and the note that counts them. */
const GRAY = "#b0b0b0";

/** Whether the list is open.  It stays the way you left it, from one component to the next. */
let paletteOpen = true;

/** A character you can't see, like the no-break space, by its code point. */
function isInvisible(char: string): boolean {
  return /^[\p{C}\p{Z}]$/u.test(char);
}

function codePoint(char: string): string {
  return (
    "U+" + char.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")
  );
}

/** “π≈”, with anything invisible spelled out:  “π” and U+0009. */
export function showCharacters(characters: readonly string[]): string {
  const visible = characters.filter((char) => !isInvisible(char));
  const invisible = characters.filter(isInvisible).map(codePoint);
  return [...(visible.length ? [`“${visible.join("")}”`] : []), ...invisible]
    .join(" and ")
    .replace(/ and (?=.* and )/g, ", ");
}

/**
 * One warning line's text.
 * @param withFormat Name the Text Format.  For a Multi Text, which has several.
 */
export function describeMissing(
  { fontName, formatName, characters }: MissingCharacters,
  withFormat: boolean,
): string {
  const where =
    withFormat && formatName !== undefined
      ? ` (Text Format “${formatName}”)`
      : "";
  return `⚠ Not available in ${fontName}${where}, so not drawn:  ${showCharacters(characters)}`;
}

export function buildCharacterPanel(
  hooks: CharacterPanelHooks,
): CharacterPanel {
  const status = document.createElement("div");
  status.style.cssText = "font-size:0.9em;color:#a06000;line-height:1.4";

  const palette = document.createElement("fieldset");
  palette.style.cssText = "border-color:#6a7fae;margin-top:0.4em";
  const legend = document.createElement("legend");
  legend.textContent = "Characters";
  const details = document.createElement("details");
  details.open = paletteOpen;
  details.addEventListener("toggle", () => {
    paletteOpen = details.open;
  });
  const summary = document.createElement("summary");
  summary.style.cssText = "cursor:pointer;font-size:0.9em";
  const grid = document.createElement("div");
  grid.style.cssText =
    "display:flex;flex-wrap:wrap;gap:2px;margin-top:0.3em;user-select:text";
  const note = document.createElement("div");
  note.style.cssText = `font-size:0.85em;color:${GRAY};margin-top:0.3em`;
  const copied = document.createElement("div");
  copied.style.cssText = "font-size:0.85em;color:#555;min-height:1.2em";
  details.append(summary, grid, note);
  palette.append(legend, details);
  if (!hooks.onPick) {
    palette.append(copied);
  }

  // MARK: The grid

  const cells = allFontCharacters().map((char) => {
    const cell = document.createElement("button");
    cell.type = "button";
    const invisible = isInvisible(char);
    // U+FE0E asks for the plain text version of a character like ⚫, not a color emoji
    // that ignores the gray.  Only for showing it:  the copy is just `char`.
    cell.textContent = invisible
      ? codePoint(char).slice(2)
      : /\p{Extended_Pictographic}/u.test(char)
        ? char + "\uFE0E"
        : char;
    cell.style.cssText =
      "min-width:1.9em;height:1.9em;padding:0 0.15em;font-size:1.05em;" +
      "border:1px solid #ddd;border-radius:3px;background:white;cursor:pointer" +
      (invisible ? ";font-size:0.6em;min-width:3.2em;height:3.2em" : "");
    if (hooks.onPick) {
      // Leave the focus, and so the cursor, in the text.
      cell.addEventListener("mousedown", (event) => event.preventDefault());
    }
    cell.addEventListener("click", () => {
      if (hooks.onPick) {
        hooks.onPick(char);
        return;
      }
      navigator.clipboard.writeText(char).then(
        () => {
          copied.textContent = `Copied ${showCharacters([char])}.`;
        },
        (reason: unknown) => {
          copied.textContent = `Couldn't copy:  ${String(reason)}`;
        },
      );
    });
    return { char, cell };
  });
  grid.append(...cells.map(({ cell }) => cell));

  // MARK: Behavior

  let shownFont: FontName | undefined;

  function drawPalette(fontName: FontName): void {
    shownFont = fontName;
    const available = fontCharacters(fontName);
    let elsewhere = 0;
    for (const { char, cell } of cells) {
      const has = available.has(char);
      if (!has) elsewhere++;
      cell.style.color = has ? "black" : GRAY;
      cell.title =
        `${codePoint(char)}` +
        (char == " " ? ", no-break space:  joins two words" : "") +
        (has ? "" : `.  Not in ${fontName}.`) +
        (hooks.onPick ? "\nClick to type it." : "\nClick to copy.");
    }
    summary.textContent = hooks.onPick
      ? `${available.size} in ${fontName}, the font at the cursor.  Click one to type it.`
      : `${available.size} in ${fontName}.  Click one to copy it.`;
    note.textContent =
      elsewhere == 0
        ? ""
        : `${elsewhere} ${elsewhere == 1 ? "character" : "characters"} only available in other fonts`;
  }

  function refresh(): void {
    drawPalette(hooks.fontName());
    status.replaceChildren(
      ...(hooks.missing?.() ?? []).map((missing) => {
        const line = document.createElement("div");
        line.textContent = describeMissing(missing, false);
        return line;
      }),
    );
    status.style.marginBottom = status.childElementCount ? "0.4em" : "";
  }

  function timeChanged(): void {
    if (hooks.fontName() !== shownFont) {
      drawPalette(hooks.fontName());
    }
  }

  refresh();
  return { status, palette, refresh, timeChanged };
}
