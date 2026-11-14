import { Font, FontOptions } from "./letters-base.ts";
import { makeLineFont } from "./line-font.ts";

/**
 * The fonts the text components offer, by the names the Visual Editor shows.
 *
 * The Text Format and Text components have a Font property with these choices.
 * Line Font is the default.
 * @module
 */

/** Every font a text component can use, by the name the Visual Editor shows. */
export const FONT_NAMES = ["Line Font", "Futura L", "Cursive"] as const;

/** One of {@link FONT_NAMES}. */
export type FontName = (typeof FONT_NAMES)[number];

/**
 * Make a font by its name.
 *
 * An unknown name, say from an old save file, gets the Line Font.
 */
export function makeFontByName(name: FontName, options: FontOptions): Font {
  switch (name) {
    case "Futura L": {
      return Font.futuraL(options);
    }
    case "Cursive": {
      return Font.cursive(options);
    }
    default: {
      return makeLineFont(options);
    }
  }
}

const characterSets = new Map<FontName, ReadonlySet<string>>();

/**
 * Every character `name` can draw, except the space, which the layout handles
 * itself.
 */
export function fontCharacters(name: FontName): ReadonlySet<string> {
  return characterSets.getOrInsertComputed(name, () => {
    const result = new Set(makeFontByName(name, { size: 1 }).getAllLetters());
    result.delete(" ");
    return result;
  });
}

let allCharacters: readonly string[] | undefined;

/**
 * Every character any of {@link FONT_NAMES} can draw, in Unicode order.
 * Except the space, which the layout handles itself.
 */
export function allFontCharacters(): readonly string[] {
  allCharacters ??= [
    ...new Set(FONT_NAMES.flatMap((name) => [...fontCharacters(name)])),
  ].sort((a, b) => a.codePointAt(0)! - b.codePointAt(0)!);
  return allCharacters;
}

/**
 * The characters in `text` that `name` can't draw, each once, in the order they first
 * appear.  The layout skips them, so they don't appear on the canvas.
 *
 * The space and "\n" aren't letters, so they're never missing.
 */
export function missingCharacters(text: string, name: FontName): string[] {
  const available = fontCharacters(name);
  const result = new Set<string>();
  for (const char of text) {
    if (char != " " && char != "\n" && !available.has(char)) {
      result.add(char);
    }
  }
  return [...result];
}

/**
 * Characters some text needs and its font doesn't have.
 * See `MultiTextComponent.missingCharacters()`.
 */
export type MissingCharacters = {
  /** The Text Format's name, or undefined for a component with one font, like Text. */
  readonly formatName?: string;
  readonly fontName: FontName;
  /** Each once, in the order they first appear. */
  readonly characters: readonly string[];
};

/**
 * Check `text` against `font` at every moment either could change.
 *
 * Both are step functions:  each keyframe holds until the next.  So checking at each
 * keyframe's time covers the whole timeline.
 * @param keyframeTimes Every keyframe time of every schedule `pairsAt` reads.
 * @param pairsAt The text and its font, at one time.  Several, for several formats.
 * @returns One entry per font and format with missing characters.
 */
export function checkCharacters(
  keyframeTimes: Iterable<number>,
  pairsAt: (
    timeInMs: number,
  ) => Iterable<{ text: string; fontName: FontName; formatName?: string }>,
): MissingCharacters[] {
  const found = new Map<
    string,
    { fontName: FontName; formatName?: string; characters: Set<string> }
  >();
  for (const timeInMs of new Set(keyframeTimes)) {
    for (const { text, fontName, formatName } of pairsAt(timeInMs)) {
      const missing = missingCharacters(text, fontName);
      if (missing.length == 0) {
        continue;
      }
      const key = JSON.stringify([formatName, fontName]);
      const entry = found.getOrInsertComputed(key, () => ({
        fontName,
        formatName,
        characters: new Set<string>(),
      }));
      missing.forEach((char) => entry.characters.add(char));
    }
  }
  return [...found.values()].map(({ fontName, formatName, characters }) => ({
    fontName,
    formatName,
    characters: [...characters],
  }));
}
