import { Font } from "canvas-recorder-lib/src/glib/letters-base";
import { makeLineFont } from "canvas-recorder-lib/src/glib/line-font";
import { ParagraphLayout } from "canvas-recorder-lib/src/glib/paragraph-layout";
import {
  interpolateNumbers,
  Keyframe,
} from "canvas-recorder-lib/src/interpolate";
import { Showable } from "canvas-recorder-lib/src/showable";

import { makeNote, slide, Stack, title } from "./multi-text-manual.ts";

/**
 * `Font.stretch()` on Futura L and Cursive, the two fonts from the Hershey collection.
 * The Text components only use the line font so far, so this slide draws in code.
 *
 * The line font's version is in multi-text-font-width.ts.
 * @module
 */

// MARK: Helpers

/** The type designer's test word:  straight, round and diagonal strokes, ascenders and a descender. */
const SAMPLE = "Hamburgefonstiv";
const SIZE = 0.38;
const LABEL_SIZE = 0.24;
const labelFont = makeLineFont(LABEL_SIZE);

/** Strokes a path made from a font, with round ends and joins. */
function drawText(
  context: CanvasRenderingContext2D,
  path: Path2D,
  strokeWidth: number,
  color: string,
): void {
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = strokeWidth;
  context.strokeStyle = color;
  context.stroke(path);
}

/** The path for `text`, with its baseline at `baseline`. */
function textPath(
  text: string,
  font: Font,
  x: number,
  baseline: number,
): Path2D {
  // singlePathShape() puts the top of the line at y = 0.
  return ParagraphLayout.singlePathShape({
    text,
    font,
    width: Infinity,
  }).translate(x, baseline + font.top).canvasPath;
}

/** {@link SAMPLE} in `font`. */
function sample(
  font: Font,
  x: number,
  baseline: number,
  color: string,
): Showable {
  const path = textPath(SAMPLE, font, x, baseline);
  return {
    description: SAMPLE,
    duration: 0,
    show({ context }) {
      drawText(context, path, font.strokeWidth, color);
    },
  };
}

/** A small gray label, its baseline at `baseline`. */
function label(
  text: string,
  x: number,
  baseline: number,
  options: { size?: number; color?: string } = {},
): Showable {
  const { size = LABEL_SIZE, color = "#c8c8c8" } = options;
  return makeNote({
    text,
    x,
    y: baseline + makeLineFont(size).top,
    width: 16,
    size,
    color,
  }).showable;
}

// MARK: The slide

/** The "Font Width: Futura L and Cursive" slide. */
export function fontStretch(): Showable {
  const LEFT = 0.6;
  const stack = new Stack(1.05, { x: LEFT, width: 14.8 });
  stack.note(
    "Font.stretch() works on any font. In code: Font.cursive(size).stretch(width).oblique(degrees). " +
      "Stretch first, so the slant is the angle you asked for.",
    { size: 0.25 },
  );
  const parts: Showable[] = [];
  const textX = LEFT + 4;
  const groups = [
    {
      header: `Futura L:  Font.futuraL(${SIZE})`,
      font: Font.futuraL(SIZE),
      color: "#c3a0ff",
      pitch: 0.6,
    },
    {
      header: `Cursive:  Font.cursive(${SIZE}).  The joins stretch with the letters.`,
      font: Font.cursive(SIZE),
      color: "#9cc2ff",
      pitch: 0.64,
    },
  ];
  const rows: { label: string; make(font: Font): Font }[] = [
    { label: ".stretch(0.6)", make: (font) => font.stretch(0.6) },
    { label: "normal", make: (font) => font },
    { label: ".stretch(1.6)", make: (font) => font.stretch(1.6) },
    {
      label: ".stretch(1.6).oblique(15)",
      make: (font) => font.stretch(1.6).oblique(15),
    },
  ];
  let y = stack.y;
  let lastBaseline = 0;
  groups.forEach((group, index) => {
    if (index > 0) {
      y += 0.2;
    }
    parts.push(label(group.header, LEFT, y - labelFont.top, { size: 0.27 }));
    let baseline = y + 0.3 - group.font.top;
    rows.forEach((row) => {
      parts.push(
        label(row.label, LEFT + 0.3, baseline),
        sample(row.make(group.font), textX, baseline, group.color),
      );
      baseline += group.pitch;
    });
    lastBaseline = baseline - group.pitch;
    y = lastBaseline + group.font.bottom;
  });

  // MARK: Animated
  const cursive = groups[1];
  const baseline = lastBaseline + cursive.pitch;
  const animated: Keyframe<number>[] = [
    { time: 500, value: 0.5 },
    { time: 4_500, value: 2 },
    { time: 9_000, value: 0.5 },
  ];
  parts.push({
    description: "animated stretch",
    duration: 0,
    show({ context, timeInMs }) {
      const widthRatio = interpolateNumbers(timeInMs, animated);
      const font = cursive.font.stretch(widthRatio);
      drawText(
        context,
        textPath(
          `.stretch(${widthRatio.toFixed(2)})`,
          labelFont,
          LEFT + 0.3,
          baseline,
        ),
        labelFont.strokeWidth,
        "#c8c8c8",
      );
      drawText(
        context,
        textPath(SAMPLE, font, textX, baseline),
        font.strokeWidth,
        cursive.color,
      );
    },
  });

  return slide("Font Width: Futura L and Cursive", [
    title("Font Width: Futura L and Cursive"),
    stack.parts,
    parts,
  ]);
}
