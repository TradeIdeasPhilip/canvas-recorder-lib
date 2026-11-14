import { makeLineFont } from "canvas-recorder-lib/src/glib/line-font";
import { Font } from "canvas-recorder-lib/src/glib/letters-base";
import { ParagraphLayout } from "canvas-recorder-lib/src/glib/paragraph-layout";
import { Keyframe } from "canvas-recorder-lib/src/interpolate";
import { Showable, ShowOptions } from "canvas-recorder-lib/src/showable";

import {
  MultiTextComponent,
  TextFormatComponent,
} from "canvas-recorder-lib/src/slide-components/multi-text";
import { TextComponent } from "canvas-recorder-lib/src/slide-components/simple-text";
import {
  bottomNote,
  makeNote,
  slide,
  Stack,
  title,
  withFrame,
} from "./multi-text-manual.ts";

/**
 * Font Width:  letters wider or narrower, the same height.  A Text Format property, next to
 * Font Size, Boldness and Obliqueness.  The Text component has it too.
 *
 * Three slides.  Each guide line is drawn from where the text really went, by asking the
 * component, so poking at the numbers in the Visual Editor moves the guides too.
 * @module
 */

// MARK: Helpers

/** Short enough to fit its frame at Font Width 2. */
const ANIMATED_TEXT =
  "As Font Width grows, fewer words fit on a line, and the words rewrap. " +
  "Each line keeps its height.";

type FormatOptions = Omit<
  NonNullable<ConstructorParameters<typeof TextFormatComponent>[0]>,
  "name"
>;
type MultiTextOptions = NonNullable<
  ConstructorParameters<typeof MultiTextComponent>[0]
>;

/** One Multi Text, one Text Format per part. */
export function multiText(
  parts: readonly { readonly text: string; readonly format: FormatOptions }[],
  options: MultiTextOptions,
): { text: MultiTextComponent; formats: TextFormatComponent[] } {
  const text = new MultiTextComponent(options);
  const formats = parts.map(({ format }, index) => {
    const result = new TextFormatComponent({
      color: "white",
      ...format,
      name: `${index}`,
    });
    text.addFixed({ child: result });
    return result;
  });
  parts.forEach((part, index) => text.addText(`${index}`, part.text));
  return { text, formats };
}

/** The first line's baseline, and where the text starts and ends, on the canvas. */
function firstLine(text: MultiTextComponent, options: ShowOptions) {
  const { laidOut, offset, scale } = text.layoutAt(options);
  const first = laidOut.getAllLetters().next();
  const baseline = offset.y + scale * (first.done ? 0 : first.value.baseline);
  return {
    baseline,
    left: offset.x,
    right: offset.x + scale * laidOut.width,
    scale,
  };
}

const GUIDE_COLOR = "#4a6ea8";

/** Dashed lines at the capital top and the baseline of the first line. */
export function heightGuides(
  text: MultiTextComponent,
  format: TextFormatComponent,
  overhang = 0.3,
): Showable {
  return {
    description: "height guides",
    duration: 0,
    show(options) {
      const { context, timeInMs } = options;
      const { baseline, left, right, scale } = firstLine(text, options);
      const capitalTop = baseline - scale * format.sizeSchedule.at(timeInMs);
      context.setLineDash([0.07, 0.07]);
      context.lineWidth = 0.02;
      context.strokeStyle = GUIDE_COLOR;
      context.beginPath();
      for (const y of [capitalTop, baseline]) {
        context.moveTo(left - overhang, y);
        context.lineTo(right + overhang, y);
      }
      context.stroke();
      context.setLineDash([]);
    },
  };
}

/**
 * A line just left of the text, leaning at `degrees`, from the baseline to the capital top.
 * A vertical stroke of the first letter should be parallel to it.
 */
function slantGuide(
  baseline: number,
  left: number,
  capitalHeight: number,
  degrees: number,
): (context: CanvasRenderingContext2D) => void {
  const x = left - 0.25;
  const lean = capitalHeight * Math.tan((degrees * Math.PI) / 180);
  return (context) => {
    context.lineWidth = 0.025;
    context.strokeStyle = "#e08a3c";
    context.beginPath();
    context.moveTo(x, baseline);
    context.lineTo(x + lean, baseline - capitalHeight);
    context.stroke();
  };
}

/** {@link slantGuide} for a Multi Text, at the angle its format says. */
function slantGuideFor(
  text: MultiTextComponent,
  format: TextFormatComponent,
): Showable {
  return {
    description: "slant guide",
    duration: 0,
    show(options) {
      const { timeInMs } = options;
      const { baseline, left, scale } = firstLine(text, options);
      slantGuide(
        baseline,
        left,
        scale * format.sizeSchedule.at(timeInMs),
        format.obliquenessSchedule.at(timeInMs),
      )(options.context);
    },
  };
}

/** A small gray caption. */
export function caption(
  text: string,
  x: number,
  y: number,
  width = 4,
): Showable {
  return makeNote({ text, x, y, width, size: 0.24, color: "#c8c8c8" }).showable;
}

// MARK: Font Width

/** The "Multi Text: Font Width" slide.  The basics. */
export function multiTextFontWidth(): Showable {
  const LEFT = 0.6;
  const stack = new Stack(1.05, { x: LEFT, width: 14.8 });
  stack.note(
    "Font Width makes the letters wider or narrower, and keeps their height. " +
      "Every Text Format has it, next to Font Size, and so does the Text component. 1 is normal.",
    { size: 0.25 },
  );
  const parts: Showable[] = [];
  const LABEL_WIDTH = 1.4;
  const ROW = 0.62;
  const SIZE = 0.4;
  [0.5, 0.75, 1, 1.5, 2].forEach((fontWidth, index) => {
    const y = stack.y + index * ROW;
    parts.push(caption(`${fontWidth}`, LEFT, y + 0.15, LABEL_WIDTH));
    const { text } = multiText(
      [{ text: "Hamburgefonstiv 0123", format: { size: SIZE, fontWidth } }],
      {
        position: { x: LEFT + LABEL_WIDTH, y },
        widthMode: "unbounded",
        anchorX: "left",
      },
    );
    parts.push(text);
  });
  stack.skip(5 * ROW + 0.15);
  stack.note(
    "Mixed on one line, in one Multi Text. They share a baseline and a capital top (dashed).",
    { size: 0.25, gap: 0.1 },
  );
  // Each space belongs to the word before it, in that word's width.  So the spaces go
  // with the normal-width words, where they're easy to see.
  const mixed = multiText(
    [
      { text: "Narrow", format: { size: 0.6, fontWidth: 0.5 } },
      { text: " normal ", format: { size: 0.6 } },
      { text: "wide", format: { size: 0.6, fontWidth: 2 } },
      { text: " and ", format: { size: 0.6 } },
      { text: "back.", format: { size: 0.6, fontWidth: 0.75 } },
    ],
    {
      position: { x: LEFT + LABEL_WIDTH, y: stack.y + 0.05 },
      widthMode: "unbounded",
      anchorX: "left",
    },
  );
  return slide("Multi Text: Font Width", [
    title("Multi Text: Font Width"),
    stack.parts,
    parts,
    heightGuides(mixed.text, mixed.formats[1]),
    mixed.text,
    bottomNote(
      "Only the shapes stretch, not the pen. Boldness 1 grows with the square root of Font Width: " +
        "1.4 times as thick at 2, 0.7 times at 0.5. Real type families do that, and narrow letters don't fill in.",
      { color: "#6f6f6f", size: 0.25, x: LEFT, width: 14.8 },
    ),
  ]);
}

// MARK: And Obliqueness

/** The "Multi Text: Font Width and Obliqueness" slide.  Why the order matters. */
export function multiTextFontWidthAndObliqueness(): Showable {
  const LEFT = 0.6;
  const stack = new Stack(1.05, { x: LEFT, width: 14.8 });
  stack.note(
    "Obliqueness is the angle you see, at any Font Width: the letters are stretched first, then slanted. " +
      "Each orange line leans at the format's Obliqueness; the stems should be parallel to it.",
    { size: 0.25 },
  );
  const parts: Showable[] = [];
  const SIZE = 0.6;
  const COLUMN = 4.7;
  const ROW = 1.25;
  const top = stack.y + 0.15;
  [0.6, 1, 1.8].forEach((fontWidth, column) => {
    const x = LEFT + 0.4 + column * COLUMN;
    parts.push(caption(`Font Width ${fontWidth}`, x, top, COLUMN));
    [0, 20].forEach((obliqueness, row) => {
      const { text, formats } = multiText(
        [{ text: "Hill top", format: { size: SIZE, fontWidth, obliqueness } }],
        {
          position: { x, y: top + 0.45 + row * ROW },
          widthMode: "unbounded",
          anchorX: "left",
        },
      );
      parts.push(slantGuideFor(text, formats[0]), text);
    });
  });
  // MARK: In code
  const codeTop = top + 0.45 + 2 * ROW + 0.1;
  const base = makeLineFont(SIZE);
  const right = base.stretch(1.8).oblique(20);
  const wrong = base.oblique(20).stretch(1.8);
  const inCode = (font: Font, x: number, label: string): Showable[] => {
    const shape = ParagraphLayout.singlePathShape({
      text: "Hill top",
      font,
      width: Infinity,
    });
    // singlePathShape() puts the top of the line at y = 0.
    const baseline = codeTop + 0.6 - font.top;
    const path = shape.translate(x, codeTop + 0.6).canvasPath;
    const guide = slantGuide(baseline, x, SIZE, 20);
    return [
      caption(label, x - 0.25, codeTop, 7),
      {
        description: label,
        duration: 0,
        show({ context }) {
          guide(context);
          context.lineCap = "round";
          context.lineJoin = "round";
          context.lineWidth = font.strokeWidth;
          context.strokeStyle = "white";
          context.stroke(path);
        },
      },
    ];
  };
  return slide("Multi Text: Font Width and Obliqueness", [
    title("Font Width and Obliqueness"),
    stack.parts,
    parts,
    inCode(right, LEFT + 0.4, "In code, stretch then oblique: 20°"),
    inCode(wrong, LEFT + 0.4 + 7.4, "Oblique then stretch: about 33°"),
    bottomNote(
      "font.stretch(1.8).oblique(20) and font.oblique(20).stretch(1.8): stretching a slanted font stretches the slant too. " +
        "So stretch first, or let makeLineFont({ size, width, obliqueness }) do both, in that order.",
      { color: "#6f6f6f", size: 0.25, x: LEFT, width: 14.8 },
    ),
  ]);
}

// MARK: In use

/**
 * Font Widths that make each label exactly `width` wide.  Measured with the same font the
 * Text Format will build, twice, because the line font's letters change a little with the
 * stroke width, which changes with Font Width.
 */
function fitWidths(
  labels: readonly string[],
  size: number,
  width: number,
): number[] {
  const measure = (label: string, fontWidth: number) => {
    const font = makeLineFont({ size, width: fontWidth });
    const layout = new ParagraphLayout(font);
    layout.addText(label, font);
    return layout.align(Infinity, "left").width;
  };
  return labels.map((label) => {
    let fontWidth = width / measure(label, 1);
    fontWidth *= width / measure(label, fontWidth);
    return fontWidth;
  });
}

/** The "Multi Text: Font Width in Use" slide. */
export function multiTextFontWidthInUse(): Showable {
  const LEFT = 0.6;
  const stack = new Stack(1.05, { x: LEFT, width: 14.8 });
  stack.note(
    "Labels in a column: the same height, and with Font Width, the same width too. " +
      "The right column's Font Widths are computed in code, then they're ordinary numbers you can edit.",
    { size: 0.25 },
  );
  const parts: Showable[] = [];
  const LABELS = ["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Sun"];
  const SIZE = 0.38;
  const COLUMN_WIDTH = 2.4;
  const ROW = 0.6;
  const top = stack.y + 0.15;
  const columns = [LEFT + 0.3, LEFT + 0.3 + COLUMN_WIDTH + 1];
  parts.push(caption("Font Width 1", columns[0], top, 3.5));
  parts.push(caption("Fitted", columns[1], top, 3.5));
  const fitted = fitWidths(LABELS, SIZE, COLUMN_WIDTH);
  LABELS.forEach((label, row) => {
    const y = top + 0.5 + row * ROW;
    columns.forEach((x, column) => {
      const fontWidth = column === 0 ? 1 : fitted[row];
      const { text } = multiText(
        [{ text: label, format: { size: SIZE, fontWidth } }],
        {
          position: { x, y },
          widthMode: "unbounded",
          anchorX: "left",
        },
      );
      parts.push(text);
    });
  });
  const columnBottom = top + 0.5 + LABELS.length * ROW;
  // The column's edges.
  parts.push({
    description: "column edges",
    duration: 0,
    show({ context }) {
      context.setLineDash([0.07, 0.07]);
      context.lineWidth = 0.02;
      context.strokeStyle = GUIDE_COLOR;
      context.beginPath();
      for (const x of columns.flatMap((left) => [left, left + COLUMN_WIDTH])) {
        context.moveTo(x, top + 0.4);
        context.lineTo(x, columnBottom);
      }
      context.stroke();
      context.setLineDash([]);
    },
  });

  // MARK: Animated
  const RIGHT = 8.6;
  const animated: Keyframe<number>[] = [
    { time: 500, value: 0.5 },
    { time: 4_500, value: 2 },
    { time: 9_000, value: 0.5 },
  ];
  parts.push(
    caption(
      "Font Width animated, 0.5 to 2 and back. The words rewrap; the lines keep their height.",
      RIGHT,
      top,
      6.8,
    ),
  );
  parts.push(
    ...withFrame(
      multiText(
        [{ text: ANIMATED_TEXT, format: { size: 0.27, fontWidth: animated } }],
        {
          position: { x: RIGHT, y: top + 0.95 },
          width: 6.8,
          height: 2.9,
          widthMode: "wrap",
          heightMode: "unbounded",
          alignment: "left",
          anchorX: "left",
        },
      ).text,
    ),
  );

  // MARK: Pushed hard
  const hardTop = columnBottom + 0.4;
  parts.push(
    caption(
      "Pushed hard: Font Width 0.15, 0.3, 3 and 5, in the Text component, which has the same property.",
      LEFT,
      hardTop,
      14.8,
    ),
  );
  [0.15, 0.3, 3, 5].forEach((fontWidth, index) => {
    const x = [LEFT + 0.3, LEFT + 1.1, LEFT + 2.3, LEFT + 6.8][index];
    parts.push(
      new TextComponent({
        text: "Wow",
        color: "white",
        size: 0.45,
        fontWidth,
        alignmentSchedule: "left",
        rect: { x, y: hardTop + 0.45, width: 8, height: 1 },
      }),
    );
  });
  return slide("Multi Text: Font Width in Use", [
    title("Multi Text: Font Width in Use"),
    stack.parts,
    parts,
  ]);
}
