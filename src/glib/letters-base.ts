import { assertClass, assertFinite, pickAny } from "phil-lib/misc";
import { PathShape } from "./path-shape.ts";

// Node needs the "type", and Vite and browsers accept it.
import futuraLBase from "./Futura L.json" with { type: "json" };
import cursiveBase from "./Cursive.json" with { type: "json" };

/**
 * This is an older idea.
 * New code mostly focuses on the Font object, which now includes a lot of this information.
 */
export type FontMetrics = {
  /**
   * The height of a capital M.  1em in css.
   *
   * `mHeight` is often but not necessarily the requested font size.
   */
  readonly mHeight: number;
  /**
   * Put this much space between adjacent characters.
   */
  readonly defaultKerning: number;
  /**
   * The font reserves the space between `top` and `bottom` for itself.
   */
  readonly top: number;
  /**
   * The font reserves the space between `top` and `bottom` for itself.
   */
  readonly bottom: number;
  /**
   * The y coordinate for the top of most capital letters.
   */
  readonly capitalTop: number;
  /**
   * The expected stroke width.
   */
  readonly strokeWidth: number;
  /**
   * The recommended width for a normal space.
   */
  readonly spaceWidth: number;
  // baseLine is now frozen at 0!!!!!
};

/**
 * Everything about a font, all at once:  its size, width, slant and stroke.
 * For {@link Font.cursive}, {@link Font.futuraL} and `makeLineFont()`.
 * Only `size` is required.
 *
 * Give `boldness` or `strokeWidth`, not both.
 */
export type FontOptions = {
  /** The height of a capital M, the font's `mHeight`.  Width doesn't change it. */
  readonly size: number;
  /**
   * How wide the letters are, compared to normal.  1, the default, is
   * normal.  2 is twice as wide, 0.5 half as wide.  Must be positive.
   * The height stays `size`.  See {@link Font.stretch}.
   */
  readonly width?: number;
  /**
   * The slant in degrees, like {@link Font.oblique}.  0, the default, is
   * upright.  It's the angle you see, whatever the width:  the letters are
   * stretched first, then slanted.
   */
  readonly obliqueness?: number;
} & (
  | {
      /**
       * The stroke width, compared to the font's own recommendation
       * ({@link Font.strokeWidth}).  1, the default, is normal; 2 is twice
       * as thick.  Each font recommends its own:  the line font a tenth of
       * its size, the Hershey fonts about half that.
       *
       * The recommendation follows the geometric mean of the font's height
       * and width, `size × √width`.  So 1 is a little bolder in a wide font
       * and a little lighter in a narrow one.  See {@link Font.stretch}.
       */
      readonly boldness?: number;
      readonly strokeWidth?: never;
    }
  | {
      /** The stroke width, in the same units as `size`. */
      readonly strokeWidth: number;
      readonly boldness?: never;
    }
);

export type DescriptionOfLetter = {
  readonly shape: PathShape;
  readonly advance: number;
};

/**
 * This describes a strokable font in my own format.
 *
 * Almost all modern fonts are drawn by filling a path.
 * I'm interested in fonts that are drawn by stroking them.
 * Those allow for to all sorts of special effects, including:
 * https://tradeideasphilip.github.io/random-svg-tests/letters.html
 */
export class Font {
  constructor(
    /**
     * Everything between `top` and `bottom` is reserved for our text.
     * `top` is typically negative because the baseline is always 0.
     */
    readonly top: number,
    /**
     * Everything between `top` and `bottom` is reserved for our text.
     * This is relative to the baseline which is always 0.
     */
    readonly bottom: number,
    /**
     * How wide is the space character?
     *
     * The layout will typically use this information to set a minimum width,
     * rather than trying to draw the space like a normal letter.
     */
    readonly spaceWidth: number,
    /**
     * The recommended strokeWidth or lineWidth to use when stroking this font.
     * You can use any width you want.
     * (You don't even need to stroke the line at all; I've had good luck using css motion-path with these letters!)
     * But some fonts were built for a a specific size.
     * Look at the capital K.
     * Some fonts make the | and the < barely touch, which is only possible if you use a specific line width.
     */
    readonly strokeWidth: number,
    /**
     * The default amount of space to add after each letter.
     *
     * This can be adjusted but it should not be ignored.
     */
    readonly kerning: number,
    /**
     * The height of a capital letter M.
     * `1em` in css.
     *
     * When requesting a font in a particular size, the `mHeight` is that size.
     * Not always, but that's how I'm using it.
     */
    readonly mHeight: number,
    /**
     * A map from characters to DescriptionOfLetter objects.
     * More precisely, enough information to create our own initialized map.
     */
    letters: Iterable<readonly [string, DescriptionOfLetter]>,
  ) {
    this.#letters = new Map(letters);
  }
  getWord(word: string): DescriptionOfLetter[] {
    // This could add special things, like kerning or ligatures.
    // That's not far off.  I had to manually tweak some of the cursive letters based on what came before them!
    const result: DescriptionOfLetter[] = [];
    for (const char of word) {
      const descriptionOfLetter = this.getChar(char);
      if (descriptionOfLetter) {
        result.push(descriptionOfLetter);
      }
    }
    return result;
  }
  /**
   *
   * @returns A string containing all letters defined by this font.
   */
  getAllLetters(): string {
    return this.#letters.keys().toArray().join("");
  }
  #letters: Map<string, DescriptionOfLetter>;
  getChar(char: string): DescriptionOfLetter | undefined {
    return this.#letters.get(char);
  }
  static fromJSON(input: any): Font {
    if (typeof input === "string") {
      input = JSON.parse(input);
    }
    const top: number = input.top;
    const bottom: number = input.bottom;
    const spaceWidth: number = input.spaceWidth;
    const strokeWidth: number = input.strokeWidth;
    const kerning: number = input.kerning;
    const mHeight: number = input.mHeight;
    assertFinite(top, bottom, spaceWidth, strokeWidth, kerning, mHeight);
    const font = new this(
      top,
      bottom,
      spaceWidth,
      strokeWidth,
      kerning,
      mHeight,
      [],
    );
    const letters = assertClass(input.letters, Array<any>);
    letters.forEach((letter) => {
      const key: string = letter.key;
      const advance: number = letter.advance;
      const d: string = letter.d;
      assertFinite(advance);
      if (typeof key !== "string" || typeof d !== "string") {
        console.error("Expecting {key,advance,d}, found", letter);
        throw new Error("wtf");
      }
      const descriptionOfLetter: DescriptionOfLetter = {
        shape: PathShape.fromRawString(d),
        advance,
      };
      font.#letters.set(key, descriptionOfLetter);
    });
    return font;
  }
  /**
   * Create an oblique font from a normal font.
   *
   * Oblique is similar to italic.
   * Italics are hand drawn.
   * Oblique is when the computer just slants everything.
   * @param degreesRight The baseline stays in tact.
   * A line moving straight up from the baseline will be skewed by this much.
   * The default of 15 is a typical way to draw text.
   *
   * This says how much to *change* the font, not the final value.
   * font.oblique(5) != font.oblique(5).oblique(5).oblique(5).
   * This differs from resize() which takes the desired resulting value, where this takes the change as an input.
   *
   * Call {@link stretch} first, if you use both.  It would stretch the slant too.
   * @returns A new font.  Or the same font if you request a 0° change.
   */
  oblique(degreesRight = 15): Font {
    if (degreesRight == 0) {
      return this;
    }
    const result = new Font(
      this.top,
      this.bottom,
      this.spaceWidth,
      this.strokeWidth,
      this.kerning,
      this.mHeight,
      [],
    );
    const matrix = new DOMMatrixReadOnly().skewX(-degreesRight);
    this.#copyLettersTo(result, matrix, 1);
    return result;
  }
  resize(newSize: number): Font {
    const ratio = newSize / this.mHeight;
    if (ratio == 1) {
      return this;
    }
    const result = new Font(
      ratio * this.top,
      ratio * this.bottom,
      ratio * this.spaceWidth,
      ratio * this.strokeWidth,
      ratio * this.kerning,
      newSize,
      [],
    );
    const matrix = new DOMMatrix();
    matrix.scaleSelf(ratio);
    this.#copyLettersTo(result, matrix, ratio);
    return result;
  }
  /**
   * Make the letters wider or narrower, keeping their height.
   *
   * Only the shapes change, not the pen:  stroke them with one line width, and
   * the vertical lines are as thick as the horizontal ones.
   *
   * Everything horizontal scales with the letters:  each letter's advance, the
   * kerning and the space.  So a line of text is exactly `widthRatio` times as
   * long, and cursive letters still meet.  `top`, `bottom` and `mHeight` don't
   * change.
   *
   * The recommended {@link strokeWidth} changes by √`widthRatio`, the geometric
   * mean of the change in width and the change in height (none).  That's the
   * rule resize() follows, where both change by the same amount.  So a wide
   * font is a little bolder and a narrow one a little lighter, as in a real type
   * family, and narrow letters don't fill in.
   *
   * **Stretch first, then oblique.**  Stretching a slanted font stretches its
   * slant too:  `font.oblique(15).stretch(2)` leans about 28°, and
   * `font.stretch(2).oblique(15)` leans 15°.
   *
   * For the line font, `makeLineFont({ size, width })` does a little better
   * than `makeLineFont(size).stretch(width)`.  Some of its letters depend on the
   * stroke width, like the K, whose lines meet exactly, and it builds those
   * for the stretched size.
   * @param widthRatio 2 for twice as wide, 0.5 for half as wide.  Must be
   * positive.  Like oblique(), this is a change, not the final value:
   * `font.stretch(2).stretch(2)` is 4 times as wide as `font`.
   * @returns A new font.  Or the same font if `widthRatio` is 1.
   */
  stretch(widthRatio: number): Font {
    if (widthRatio == 1) {
      return this;
    }
    if (!(widthRatio > 0 && isFinite(widthRatio))) {
      throw new Error(`widthRatio must be positive, not ${widthRatio}.`);
    }
    const result = new Font(
      this.top,
      this.bottom,
      widthRatio * this.spaceWidth,
      Math.sqrt(widthRatio) * this.strokeWidth,
      widthRatio * this.kerning,
      this.mHeight,
      [],
    );
    const matrix = new DOMMatrixReadOnly().scale(widthRatio, 1);
    this.#copyLettersTo(result, matrix, widthRatio);
    return result;
  }
  /**
   * Copy every letter into a new font, transformed.  For resize(), oblique()
   * and stretch().
   *
   * Each shape is transformed the first time something asks for it, not all
   * at once.  The line font has hundreds of letters, and a text component
   * builds a new font every frame while its size, width or slant is animated,
   * but only draws a few of them.
   * @param advanceRatio Each letter's advance is multiplied by this.
   */
  #copyLettersTo(
    result: Font,
    matrix: DOMMatrixReadOnly,
    advanceRatio: number,
  ): void {
    this.#letters.forEach((originalLetter, key) => {
      let shape: PathShape | undefined;
      const newLetter: DescriptionOfLetter = {
        advance: advanceRatio * originalLetter.advance,
        get shape() {
          shape ??= originalLetter.shape.transform(matrix);
          return shape;
        },
      };
      result.#letters.set(key, newLetter);
    });
  }
  /**
   * The same font, recommending a different {@link strokeWidth}.
   * The letters are shared, not copied.
   */
  #withStrokeWidth(strokeWidth: number): Font {
    if (strokeWidth == this.strokeWidth) {
      return this;
    }
    return new Font(
      this.top,
      this.bottom,
      this.spaceWidth,
      strokeWidth,
      this.kerning,
      this.mHeight,
      this.#letters,
    );
  }
  /**
   * One of the Hershey fonts, from its JSON.  Parsed once, the first time it's
   * needed.  A font never changes, so everyone can share it.
   *
   * These fonts came from 7-bit ASCII, which put a curly quote where `'` and
   * `` ` `` are.  So `'` and `` ` `` draw as `’` and `‘`.  Without that, "don't"
   * would lose its apostrophe.
   */
  static #hershey(json: unknown): Font {
    const font = Font.fromJSON(json);
    for (const [ascii, curly] of [
      ["'", "’"],
      ["`", "‘"],
    ]) {
      const letter = font.#letters.get(curly);
      if (letter && !font.#letters.has(ascii)) {
        font.#letters.set(ascii, letter);
      }
    }
    return font;
  }
  static #cursiveBase: Font | undefined;
  static #futuraLBase: Font | undefined;
  /**
   * Size, width, slant and stroke, all at once, in the right order.
   * See {@link FontOptions}.
   */
  static #fromOptions(base: Font, options: FontOptions): Font {
    const { size, width = 1, obliqueness = 0 } = options;
    if (!(width > 0 && isFinite(width))) {
      throw new Error(`width must be positive, not ${width}.`);
    }
    const shaped = base.resize(size).stretch(width).oblique(obliqueness);
    return shaped.#withStrokeWidth(
      options.strokeWidth ?? shaped.strokeWidth * (options.boldness ?? 1),
    );
  }
  /**
   * A handwritten script, from the Hershey fonts.  Its letters join up.
   *
   * It has the 96 printable ASCII characters and nothing else.
   * @param size The height of a capital M.
   * @param degreesRight Slant it this much more.  See {@link oblique}.
   */
  static cursive(size: number, degreesRight?: number): Font;
  /**
   * A handwritten script, from the Hershey fonts, with its size, width,
   * slant and stroke set all at once.  See {@link FontOptions}.
   */
  static cursive(options: FontOptions): Font;
  static cursive(sizeOrOptions: number | FontOptions, degreesRight = 0): Font {
    const base = (Font.#cursiveBase ??= Font.#hershey(cursiveBase));
    return typeof sizeOrOptions === "number"
      ? base.resize(sizeOrOptions).oblique(degreesRight)
      : Font.#fromOptions(base, sizeOrOptions);
  }
  /**
   * A simple sans-serif, from the Hershey fonts.
   *
   * It has the 96 printable ASCII characters and nothing else.
   * @param size The height of a capital M.
   * @param degreesRight Slant it this much.  See {@link oblique}.
   */
  static futuraL(size: number, degreesRight?: number): Font;
  /**
   * A simple sans-serif, from the Hershey fonts, with its size, width, slant
   * and stroke set all at once.  See {@link FontOptions}.
   */
  static futuraL(options: FontOptions): Font;
  static futuraL(sizeOrOptions: number | FontOptions, degreesRight = 0): Font {
    const base = (Font.#futuraLBase ??= Font.#hershey(futuraLBase));
    return typeof sizeOrOptions === "number"
      ? base.resize(sizeOrOptions).oblique(degreesRight)
      : Font.#fromOptions(base, sizeOrOptions);
  }
}
