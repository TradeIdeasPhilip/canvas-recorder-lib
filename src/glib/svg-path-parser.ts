/**
 * Reads the `d` attribute of an SVG `<path>`:  `"M1,2 L3,4"`.
 *
 * Pure functions, with no dependencies on `PathShape`, so it can be tested on its own.
 * {@link PathShape.fromRawString} turns the result into a `PathShape`.
 *
 * It reads all of the grammar in the SVG specification, section 9.3:
 * * Every command, upper case (absolute) and lower case (relative):  `M L H V C S Q T A Z`.
 * * More sets of arguments than the command needs repeat the command.  After an `M`, they're `L`s.
 * * Any white space, and one optional comma, between arguments.  None at all before a sign or a second decimal point.
 * * Numbers like `.5`, `1.`, `+3`, `1e-3`.
 * * The two arc flags are one character each, with no separator needed:  `a1 1 0 0150 20`.
 *
 * What comes out is simpler than what went in.  Everything is absolute, and there are only five kinds:
 * `M`, `L`, `Q`, `C` and `Z`.
 * `H` and `V` are lines, `S` and `T` have their control points filled in, and arcs are cubics.
 * @module
 */

import { arcToCubics } from "./svg-arc.ts";

/** One step of a path.  Always absolute.  Each starts where the previous one ended. */
export type SvgPathSegment =
  | { readonly type: "M"; readonly x: number; readonly y: number }
  | { readonly type: "L"; readonly x: number; readonly y: number }
  | {
      readonly type: "Q";
      readonly x1: number;
      readonly y1: number;
      readonly x: number;
      readonly y: number;
    }
  | {
      readonly type: "C";
      readonly x1: number;
      readonly y1: number;
      readonly x2: number;
      readonly y2: number;
      readonly x: number;
      readonly y: number;
    }
  /** Go back to the last `M`.  The caller draws the line, if there's a gap to close. */
  | { readonly type: "Z" };

/** The string isn't a valid path.  `position` is the index of the first character that didn't make sense. */
export class SvgPathSyntaxError extends Error {
  constructor(
    message: string,
    readonly position: number,
  ) {
    super(message);
  }
}

/** How many numbers each command takes.  `Z` takes none. */
const ARGUMENT_COUNT: Record<string, number> = {
  M: 2,
  L: 2,
  H: 1,
  V: 1,
  C: 6,
  S: 4,
  Q: 4,
  T: 2,
  A: 7,
  Z: 0,
};

/** The two flags of an arc, among its seven arguments.  Each is a single character, 0 or 1. */
const isArcFlag = (command: string, index: number) =>
  command === "A" && (index === 3 || index === 4);

/** An optional sign, then digits and a decimal point:  `1`, `1.`, `1.5`, `.5`.  Then an optional exponent. */
const NUMBER = /[-+]?(?:[0-9]+\.?[0-9]*|\.[0-9]+)(?:[eE][-+]?[0-9]+)?/y;
const WHITE_SPACE = /[ \t\n\r\f]*/y;
const COMMA = /,/y;

/**
 * Where a character could begin another number.
 * After a complete set of arguments, this means the command repeats.
 */
const STARTS_A_NUMBER = /[-+.0-9]/;

/**
 * Keeps track of where we are in the string.
 * Every method either succeeds and moves forward, or throws and leaves the position alone.
 */
class Reader {
  position = 0;
  constructor(readonly d: string) {}

  fail(message: string): never {
    throw new SvgPathSyntaxError(message, this.position);
  }

  skipWhiteSpace() {
    WHITE_SPACE.lastIndex = this.position;
    WHITE_SPACE.exec(this.d);
    this.position = WHITE_SPACE.lastIndex;
  }

  /** White space, then at most one comma, then more white space. */
  skipSeparator() {
    this.skipWhiteSpace();
    COMMA.lastIndex = this.position;
    if (COMMA.test(this.d)) {
      this.position = COMMA.lastIndex;
      this.skipWhiteSpace();
    }
  }

  atEnd() {
    return this.position >= this.d.length;
  }

  /** The next character, or "" at the end. */
  peek() {
    return this.d[this.position] ?? "";
  }

  number(): number {
    NUMBER.lastIndex = this.position;
    const found = NUMBER.exec(this.d);
    if (!found) {
      this.fail("Expected a number.");
    }
    this.position = NUMBER.lastIndex;
    return Number(found[0]);
  }

  /** Arc flags are exactly one character, so `"11"` is two flags. */
  flag(): number {
    const c = this.peek();
    if (c !== "0" && c !== "1") {
      this.fail("Expected an arc flag, 0 or 1.");
    }
    this.position++;
    return Number(c);
  }
}

/**
 * Read a path string.
 * @param d What you'd put in the `d` attribute of an SVG `<path>`.  An empty string is an empty path.
 * @returns The path as a list of absolute segments.
 * @throws {@link SvgPathSyntaxError} if the string isn't valid.
 * Unlike a browser, which draws everything before the first mistake, this doesn't try to draw a part of it.
 */
export function svgPathSegments(d: string): SvgPathSegment[] {
  const reader = new Reader(d);
  const result: SvgPathSegment[] = [];

  // The current point, and where the current subpath started, which `Z` returns to.
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  // `S` and `T` reflect the previous curve's last control point, but only if the previous command was a
  // matching kind of curve.  Anything else, including an arc, leaves the control point at the current point.
  let previousCubicControl: { x: number; y: number } | undefined;
  let previousQuadraticControl: { x: number; y: number } | undefined;

  reader.skipWhiteSpace();
  while (!reader.atEnd()) {
    const letter = reader.peek();
    const command = letter.toUpperCase();
    if (result.length === 0 && command !== "M") {
      reader.fail("Must start with an M command.");
    }
    if (!(command in ARGUMENT_COUNT)) {
      reader.fail(`Expected a command, not "${letter}".`);
    }
    const relative = letter !== command;
    reader.position++;
    reader.skipWhiteSpace();

    if (command === "Z") {
      result.push({ type: "Z" });
      x = startX;
      y = startY;
      previousCubicControl = previousQuadraticControl = undefined;
      reader.skipSeparator();
      continue;
    }

    // Arguments can repeat without repeating the letter.
    let current = command;
    do {
      const count = ARGUMENT_COUNT[current];
      const args: number[] = [];
      for (let i = 0; i < count; i++) {
        if (i > 0) {
          reader.skipSeparator();
        }
        args.push(isArcFlag(current, i) ? reader.flag() : reader.number());
      }
      reader.skipSeparator();

      // Relative commands measure from where this set of arguments starts, not where the command letter was.
      const dx = relative ? x : 0;
      const dy = relative ? y : 0;
      let nextCubicControl: typeof previousCubicControl;
      let nextQuadraticControl: typeof previousQuadraticControl;
      switch (current) {
        case "M": {
          x = startX = args[0] + dx;
          y = startY = args[1] + dy;
          result.push({ type: "M", x, y });
          // Any more pairs are lines.  Written the same way, absolute or relative.
          current = "L";
          break;
        }
        case "L": {
          x = args[0] + dx;
          y = args[1] + dy;
          result.push({ type: "L", x, y });
          break;
        }
        case "H": {
          x = args[0] + dx;
          result.push({ type: "L", x, y });
          break;
        }
        case "V": {
          y = args[0] + dy;
          result.push({ type: "L", x, y });
          break;
        }
        case "C": {
          const x1 = args[0] + dx;
          const y1 = args[1] + dy;
          const x2 = args[2] + dx;
          const y2 = args[3] + dy;
          x = args[4] + dx;
          y = args[5] + dy;
          result.push({ type: "C", x1, y1, x2, y2, x, y });
          nextCubicControl = { x: x2, y: y2 };
          break;
        }
        case "S": {
          // The first control point is the last one reflected through the current point.
          const x1 = previousCubicControl ? 2 * x - previousCubicControl.x : x;
          const y1 = previousCubicControl ? 2 * y - previousCubicControl.y : y;
          const x2 = args[0] + dx;
          const y2 = args[1] + dy;
          x = args[2] + dx;
          y = args[3] + dy;
          result.push({ type: "C", x1, y1, x2, y2, x, y });
          nextCubicControl = { x: x2, y: y2 };
          break;
        }
        case "Q": {
          const x1 = args[0] + dx;
          const y1 = args[1] + dy;
          x = args[2] + dx;
          y = args[3] + dy;
          result.push({ type: "Q", x1, y1, x, y });
          nextQuadraticControl = { x: x1, y: y1 };
          break;
        }
        case "T": {
          const x1 = previousQuadraticControl
            ? 2 * x - previousQuadraticControl.x
            : x;
          const y1 = previousQuadraticControl
            ? 2 * y - previousQuadraticControl.y
            : y;
          x = args[0] + dx;
          y = args[1] + dy;
          result.push({ type: "Q", x1, y1, x, y });
          nextQuadraticControl = { x: x1, y: y1 };
          break;
        }
        case "A": {
          const [rx, ry, rotation, largeArc, sweep] = args;
          const endX = args[5] + dx;
          const endY = args[6] + dy;
          if (rx === 0 || ry === 0) {
            // The specification says a degenerate ellipse is a line, so a rounded corner of radius 0 works.
            if (endX !== x || endY !== y) {
              result.push({ type: "L", x: endX, y: endY });
            }
          } else {
            for (const curve of arcToCubics(
              x,
              y,
              rx,
              ry,
              rotation,
              largeArc !== 0,
              sweep !== 0,
              endX,
              endY,
            )) {
              result.push({ type: "C", ...curve });
            }
          }
          x = endX;
          y = endY;
          break;
        }
      }
      previousCubicControl = nextCubicControl;
      previousQuadraticControl = nextQuadraticControl;
    } while (!reader.atEnd() && STARTS_A_NUMBER.test(reader.peek()));
  }
  return result;
}
