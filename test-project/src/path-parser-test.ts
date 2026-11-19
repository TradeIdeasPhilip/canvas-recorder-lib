/**
 * Checks `PathShape.fromRawString()`, which reads the `d` attribute of an SVG path.
 *
 * The reference is the browser:  `new Path2D(d)` reads every SVG command, arcs included.
 * Each case draws the browser's version and ours, and fails if the two strokes disagree.
 * "Disagree" means:  some of one stroke is nowhere near the other.
 * The test draws each path twice with each reader, once thin and once wide, then checks that
 * every thin pixel of one reader is covered by the wide stroke of the other.
 * That forgives a pixel of rounding, such as an arc made of cubic curves, and nothing bigger.
 *
 * Some cases are strings that should be rejected.
 * A browser draws what it can, up to the first mistake, so there's nothing to compare.
 * Ours throws a `PathShapeError`, because a person who typed the string should hear about it.
 *
 * The cases are in `CASES`, below.  To add one, add a line.
 *
 * Results go in the page, and in `window.pathParserTestResults` for Playwright.
 * @module
 */

import {
  PathShape,
  PathShapeError,
} from "canvas-recorder-lib/src/glib/path-shape";

/** Every path is drawn in a square of this many units. */
const SIZE = 100;
/** Pixels per unit. */
const SCALE = 2;
const THIN = 1;
const WIDE = 5;

type Case = {
  readonly name: string;
  readonly d: string;
  /** The reader should reject this string, with a message and a place. */
  readonly rejected?: true;
  /** Extra checks of the shape, for what a picture can't show.  Return a problem, or nothing. */
  readonly check?: (shape: PathShape) => string | undefined;
  /**
   * What to give the browser instead of `d`.
   * Chrome rejects "10." (a dot with no digits after it), which the SVG grammar allows.
   * Ours reads it, so the browser is given the same path spelled "10.0".
   */
  readonly reference?: string;
};

/** The reader should accept this, and draw what the browser draws. */
const ok = (name: string, d: string, check?: Case["check"]): Case => ({
  name,
  d,
  check,
});
const bad = (name: string, d: string): Case => ({ name, d, rejected: true });

/** The last command ends here, exactly.  Arcs are the case that might not. */
const endsAt =
  (x: number, y: number): Case["check"] =>
  (shape) => {
    const last = shape.commands.at(-1);
    return last && last.x === x && last.y === y
      ? undefined
      : `ends at ${last?.x}, ${last?.y}, not ${x}, ${y}`;
  };
const commandCount =
  (count: number): Case["check"] =>
  (shape) =>
    shape.commands.length === count
      ? undefined
      : `${shape.commands.length} commands, not ${count}`;

// MARK: CASES
const CASES: readonly Case[] = [
  // Lines, and the ways to write them.
  ok("Absolute lines", "M10 10 L90 20 L50 90"),
  ok("Relative lines", "m10 10 l80 10 l-40 70"),
  ok("Commas and spaces", "M 10 , 10 L 90 ,20 L 50,90"),
  ok("Tabs and new lines", "M10\n10\tL90\n20\r\nL50 90"),
  ok("A comma before the next command", "M10 10 L90 20, L50 90"),
  ok("Nothing but signs between numbers", "M10 50L90-20L50 90l-40-40"),
  ok("Command letters touching numbers", "M10,10L90,20L50,90Z"),
  // Numbers.
  ok("A number that starts with a dot", "M.5 .5 L99.5.5 L50 90"),
  ok("1.5.5 is two numbers", "M10 80 L50.5.5 L90 80", (shape) => {
    const line = shape.commands[0];
    return line.x === 50.5 && line.y === 0.5
      ? undefined
      : `first line ends at ${line.x}, ${line.y}, not 50.5, 0.5`;
  }),
  {
    name: "A trailing dot",
    d: "M10. 10. L90. 90.",
    reference: "M10.0 10.0 L90.0 90.0",
    check: endsAt(90, 90),
  },
  ok("A plus sign", "M+10+10L+90+20"),
  ok("Exponents", "M1e1 1e1 L9E1 2.0e+1 L5e1 9e1"),
  ok("A negative exponent", "M10 10 L9e1 5e-1 L50 90"),
  // Repeating arguments without repeating the letter.
  ok("M repeated is L", "M10 10 20 20 30 10 40 20 50 10"),
  ok("m repeated is l", "m10 10 10 10 10 -10 10 10 10 -10"),
  ok("L repeated", "M10 10 L20 20 30 10 40 20 50 10"),
  ok("l repeated", "M10 10 l10 10 10 -10 10 10 10 -10"),
  // Horizontal and vertical.
  ok("H and V, then close", "M10 10 H90 V90 H10 Z"),
  ok("h and v, then close", "M10 10 h80 v80 h-80 z"),
  ok("H and V repeated", "M10 10 H50 90 V50 90"),
  ok("h and v repeated", "M10 10 h20 20 20 v20 20"),
  // Closing, and what comes after.
  ok("A closed triangle", "M10 90 L50 10 L90 90 Z"),
  ok("Two closed shapes", "M10 10 L40 10 L25 40 Z M60 60 L90 60 L75 90 z"),
  ok("A line after Z starts from the start", "M10 10 L90 10 L90 50 Z L50 90"),
  ok("A relative move after z", "M10 10 L40 10 L25 40 z m50 0 l30 0"),
  ok("Already closed", "M10 10 L90 10 L50 90 L10 10 Z"),
  // Moves.
  ok("Separate pieces", "M10 10 L40 10 M60 10 L90 10 M10 50 Q50 90 90 50"),
  ok("A relative move", "M10 10 l30 0 m20 0 l30 0"),
  ok("Only a move", "M50 50"),
  // Quadratic curves.
  ok("Q", "M10 90 Q50 -10 90 90"),
  ok("q", "m10 90 q40 -100 80 0"),
  ok("Q repeated", "M10 50 Q30 10 50 50 70 90 90 50"),
  ok("T smooths the curve", "M10 50 Q30 10 50 50 T90 50"),
  ok("t smooths the curve", "M10 50 Q30 10 50 50 t40 0 t-20 40"),
  ok("T after a line is a line", "M10 10 L50 50 T90 10"),
  ok("T repeated", "M10 50 Q20 10 30 50 T50 50 70 50 90 50"),
  // Cubic curves.
  ok("C", "M10 90 C10 10 90 10 90 90"),
  ok("c", "m10 90 c0 -80 80 -80 80 0"),
  ok("C repeated", "M10 50 C20 10 30 10 40 50 50 90 60 90 70 50"),
  ok("S smooths the curve", "M10 50 C20 10 40 10 50 50 S80 90 90 50"),
  ok("s smooths the curve", "M10 50 c10 -40 30 -40 40 0 s30 40 40 0"),
  ok("S after a line has no curve to reflect", "M10 50 L30 50 S60 10 90 50"),
  ok("S repeated", "M10 50 C20 10 30 10 40 50 S60 90 70 50 80 10 90 50"),
  // Arcs.
  ok("A half circle", "M10 50 A40 40 0 0 1 90 50", endsAt(90, 50)),
  ok("A half circle the other way", "M10 50 A40 40 0 0 0 90 50"),
  ok("A small arc", "M50 20 A30 30 0 0 1 20 50"),
  ok("A large arc", "M50 20 A30 30 0 1 1 20 50"),
  ok("A small arc, the other way", "M50 20 A30 30 0 0 0 20 50"),
  ok("A large arc, the other way", "M50 20 A30 30 0 1 0 20 50"),
  ok(
    "A circle made of two arcs",
    "M10 50 A40 40 0 0 1 90 50 A40 40 0 0 1 10 50 Z",
    commandCount(4),
  ),
  ok("An ellipse", "M10 50 A40 20 0 0 1 90 50"),
  ok("A tilted ellipse", "M20 70 A40 20 30 0 1 80 30"),
  ok("A tilted ellipse, large arc", "M20 70 A40 20 30 1 1 80 30"),
  ok("An ellipse turned a quarter turn", "M10 50 A40 20 90 0 1 70 80"),
  ok("A full turn of rotation is no rotation", "M10 50 A40 20 360 0 1 90 50"),
  ok("a", "m10 50 a40 40 0 0 1 80 0"),
  ok("Radii too small are made bigger", "M10 50 A10 10 0 0 1 90 50"),
  ok("Radii much too small", "M10 50 A1 1 0 0 1 90 50"),
  ok("One radius too small", "M10 50 A5 40 0 0 1 90 50"),
  ok("Negative radii", "M10 50 A-40 -40 0 0 1 90 50"),
  ok("A radius of 0 is a line", "M10 50 A0 10 0 0 1 90 50", endsAt(90, 50)),
  ok("The other radius of 0 is a line", "M10 50 A10 0 0 0 1 90 50"),
  ok(
    "An arc with both ends in the same place draws nothing",
    "M10 50 L30 50 A20 20 0 0 1 30 50 L50 20",
    commandCount(2),
  ),
  ok("The flags with no separators", "m10 50 a40 40 0 0180 0"),
  ok("The flags with no separators, 1 1", "m10 50 a40 40 0 1180 0.1"),
  ok("The flags with commas", "m10 50 a40,40,0,0,1,80,0"),
  ok(
    "Arcs repeated",
    "M10 50 a20 20 0 0 1 20 0 20 20 0 0 0 20 0 20 20 0 0 1 20 0",
  ),
  ok(
    "An arc, then S has no curve to reflect",
    "M10 50 A20 20 0 0 1 50 50 S80 90 90 50",
  ),
  ok(
    "An arc, then T has no curve to reflect",
    "M10 50 A20 20 0 0 1 50 50 T90 50",
  ),
  ok("A rounded corner", "M10 90 L10 40 A20 20 0 0 1 30 20 L90 20"),
  ok(
    "A spiral of arcs",
    "M50 50 a5 5 0 0 1 10 0 a10 10 0 0 1 -20 0 a15 15 0 0 1 30 0 a20 20 0 0 1 -40 0 a25 25 0 0 1 50 0",
  ),
  // The empty string is a legal path.
  ok("Nothing at all", "", commandCount(0)),
  ok("Only spaces", "   ", commandCount(0)),
  // Mistakes.
  bad("Doesn't start with M", "L10 10"),
  bad("A number is missing", "M10"),
  bad("A number is missing from an L", "M10 10 L50"),
  bad("A command with no numbers", "M10 10 L"),
  bad("An unknown command", "M10 10 X 5 5"),
  bad("Something that isn't a command", "M10 10 L20 20 !"),
  bad("An arc flag that isn't 0 or 1", "M10 10 A1 1 0 2 0 5 5"),
  bad("An arc flag that's a long number", "M10 10 A1 1 0 10 0 5 5"),
  bad("Two commas", "M10 10 L1,,2"),
  bad("An exponent with no digits", "M1e 5"),
  bad("An arc with too few arguments", "M10 10 A1 1 0 0 1 5"),
];

// MARK: Pixels

function makeCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE * SCALE;
  const context = canvas.getContext("2d", { willReadFrequently: true })!;
  context.scale(SCALE, SCALE);
  context.lineCap = context.lineJoin = "round";
  return { canvas, context };
}

/** Draw `path` with this line width, in black, on a clear canvas.  Returns the opacity of each pixel. */
function strokeAlpha(path: Path2D, lineWidth: number): Uint8ClampedArray {
  const { context } = makeCanvas();
  context.lineWidth = lineWidth;
  context.stroke(path);
  const data = context.getImageData(0, 0, SIZE * SCALE, SIZE * SCALE).data;
  const alpha = new Uint8ClampedArray(data.length / 4);
  for (let i = 0; i < alpha.length; i++) {
    alpha[i] = data[i * 4 + 3];
  }
  return alpha;
}

/** How many pixels of `inside`'s thin stroke are missing from `outside`'s wide stroke. */
function uncovered(thin: Uint8ClampedArray, wide: Uint8ClampedArray) {
  let count = 0;
  for (let i = 0; i < thin.length; i++) {
    if (thin[i] > 128 && wide[i] < 32) {
      count++;
    }
  }
  return count;
}

function visible(alpha: Uint8ClampedArray) {
  return alpha.reduce((sum, a) => sum + (a > 128 ? 1 : 0), 0);
}

// MARK: Run

type Result = { name: string; pass: boolean; details: string };
const results: Result[] = [];

function show(testCase: Case, ours: Path2D | undefined, result: Result) {
  const { canvas, context } = makeCanvas();
  context.lineWidth = WIDE;
  context.strokeStyle = "#f6b0c0";
  context.stroke(new Path2D(testCase.reference ?? testCase.d));
  if (ours) {
    context.lineWidth = THIN;
    context.strokeStyle = "#102040";
    context.stroke(ours);
  }
  const cell = document.createElement("div");
  cell.className = "case";
  const title = document.createElement("div");
  title.append(
    Object.assign(document.createElement("b"), { textContent: testCase.name }),
    " ",
    Object.assign(document.createElement("span"), {
      className: result.pass ? "pass" : "fail",
      textContent: result.pass ? "pass" : "FAIL",
    }),
  );
  const d = document.createElement("code");
  d.textContent = testCase.d === "" ? "(empty)" : testCase.d;
  const details = document.createElement("div");
  details.textContent = result.details;
  cell.append(title, canvas, d, details);
  document.getElementById("cases")!.append(cell);
}

function run(testCase: Case): Result {
  const { name, d } = testCase;
  let shape: PathShape;
  try {
    shape = PathShape.fromRawString(d);
  } catch (error) {
    if (testCase.rejected) {
      return error instanceof PathShapeError
        ? { name, pass: true, details: `rejected: ${error.message}` }
        : {
            name,
            pass: false,
            details: `threw ${String(error)}, not a PathShapeError`,
          };
    }
    return { name, pass: false, details: `threw: ${String(error)}` };
  }
  if (testCase.rejected) {
    return { name, pass: false, details: "should have been rejected" };
  }
  const problem = testCase.check?.(shape);
  if (problem) {
    return { name, pass: false, details: problem };
  }
  const reference = new Path2D(testCase.reference ?? d);
  const ours = shape.canvasPath;
  const referenceThin = strokeAlpha(reference, THIN);
  const referenceWide = strokeAlpha(reference, WIDE);
  const oursThin = strokeAlpha(ours, THIN);
  const oursWide = strokeAlpha(ours, WIDE);
  const extra = uncovered(oursThin, referenceWide);
  const missing = uncovered(referenceThin, oursWide);
  const pixels = visible(referenceThin);
  const details = `${pixels} pixels; ${extra} only in ours, ${missing} only in the browser's`;
  return { name, pass: extra === 0 && missing === 0, details };
}

for (const testCase of CASES) {
  const result = run(testCase);
  results.push(result);
  let ours: Path2D | undefined;
  try {
    ours = testCase.rejected
      ? undefined
      : PathShape.fromRawString(testCase.d).canvasPath;
  } catch {
    // Already reported.
  }
  show(testCase, ours, result);
}

const failed = results.filter((r) => !r.pass);
document.getElementById("summary")!.textContent =
  failed.length === 0
    ? `All ${results.length} cases pass.`
    : `${failed.length} of ${results.length} cases FAIL: ${failed.map((r) => r.name).join("; ")}`;
document.getElementById("summary")!.className = failed.length ? "fail" : "pass";
(window as any).pathParserTestResults = results;
(window as any).pathParserTestDone = true;
