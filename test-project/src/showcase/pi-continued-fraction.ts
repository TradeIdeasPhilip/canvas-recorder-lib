import { makeLineFont } from "canvas-recorder-lib/src/glib/line-font";
import { myRainbow } from "canvas-recorder-lib/src/glib/my-rainbow";
import { ParagraphLayout } from "canvas-recorder-lib/src/glib/paragraph-layout";
import { LCommand, PathShape } from "canvas-recorder-lib/src/glib/path-shape";
import {
  ease,
  interpolateNumbers,
  Keyframe,
} from "canvas-recorder-lib/src/interpolate";
import {
  fixCorners,
  matchShapes,
} from "canvas-recorder-lib/src/morph-animation";
import {
  MakeShowableInParallel,
  Showable,
} from "canvas-recorder-lib/src/showable";

import { titleFont } from "./shared.ts";

/** The "π as a Continued Fraction" slide. */
export function piContinuedFraction(): Showable {
  const scene = new MakeShowableInParallel("π as a Continued Fraction");
  {
    const path = ParagraphLayout.singlePathShape({
      text: scene.description,
      font: titleFont,
      alignment: "center",
      width: 16,
    }).canvasPath;
    scene.add({
      description: scene.description,
      duration: 0,
      show({ context }) {
        context.lineCap = "round";
        context.lineJoin = "round";
        context.lineWidth = 0.07;
        context.strokeStyle = "yellow";
        context.stroke(path);
      },
    });
  }
  {
    // Staircase layout for: π = 3 + 1/(7 + 1/(15 + 1/(1 + 1/292)))
    //
    // Each row contains the integer label "[n] +" and the numerator "1"
    // for the next level, side by side.  A fraction bar is drawn below each
    // row, starting where that row's label ends, spanning to the right edge.
    //
    // Row 0 is special: only the numerator "1" appears (no integer label).
    // "π = 3 +" sits to the LEFT of the overall structure, vertically
    // centered at bar-0 height.

    const mathFont = makeLineFont(0.4);
    const lh = 1.75 * 0.4; // line height = 0.7
    const barGap = 0.12; // space above and below each bar
    const sw = mathFont.strokeWidth; // 0.04

    // ── Y positions (computed top-down) ────────────────────────────────────
    const numTop0 = 1.95;
    const bar0y = numTop0 + lh + barGap; // 2.77
    const row1y = bar0y + barGap; // 2.89  ("7 + …")
    const bar1y = row1y + lh + barGap; // 3.71
    const row2y = bar1y + barGap; // 3.83  ("15 + …")
    const bar2y = row2y + lh + barGap; // 4.65
    const row3y = bar2y + barGap; // 4.77  ("1 + …")
    const bar3y = row3y + lh + barGap; // 5.59
    const row4y = bar3y + barGap; // 5.71
    const bar4y = row4y + lh + barGap; // 6.53  (hypothetical next bar)

    // ── X positions ────────────────────────────────────────────────────────
    // Each bar starts just after its integer label; the next label starts
    // at the same x so it appears directly below the bar's left edge.
    const RIGHT = 15.3;
    const x0 = 0.5; // "π = 3 +"
    const bx0 = 2.6; // bar 0 left  (after "π = 3 +")
    const bx1 = 3.5; // bar 1 left  (after "7 +")
    const bx2 = 4.7; // bar 2 left  (after "15 +")
    const bx3 = 5.6; // bar 3 left  (after "1 +")

    // ── Pre-computed paths ──────────────────────────────────────────────────
    // "π = 3 +" — centered vertically at bar 0
    const piLabelPath = ParagraphLayout.singlePathShape({
      text: "π = 3 +",
      font: mathFont,
      alignment: "left",
      width: bx0 - x0,
    }).translate(x0, bar0y - lh / 2).canvasPath;

    // Helper: "1" numerator centered over [barLeft, RIGHT] at given top-y
    // num1Shape returns a PathShape so num3 can be combined into the morph target
    const num1Shape = (barLeft: number, topY: number): PathShape =>
      ParagraphLayout.singlePathShape({
        text: "1",
        font: mathFont,
        alignment: "center",
        width: RIGHT - barLeft,
      }).translate(barLeft, topY);

    const num0Path = num1Shape(bx0, numTop0).canvasPath;
    const num1aPath = num1Shape(bx1, row1y).canvasPath;
    const num2Path = num1Shape(bx2, row2y).canvasPath;
    const num3Shape = num1Shape(bx3, row3y); // PathShape — part of morph target

    // Integer labels — each is centered vertically AT its own bar (same
    // relationship as "π = 3 +" is centered at bar0y).  The "1" numerators
    // above each bar stay at row_y; the labels shift down by lh/2 + barGap
    // so the bar passes through their vertical midpoint.
    const label7Path = ParagraphLayout.singlePathShape({
      text: "7 +",
      font: mathFont,
      alignment: "left",
      width: bx1 - bx0,
    }).translate(bx0, bar1y - lh / 2).canvasPath;

    const label15Path = ParagraphLayout.singlePathShape({
      text: "15 +",
      font: mathFont,
      alignment: "left",
      width: bx2 - bx1,
    }).translate(bx1, bar2y - lh / 2).canvasPath;

    const label1Path = ParagraphLayout.singlePathShape({
      text: "1 +",
      font: mathFont,
      alignment: "left",
      width: bx3 - bx2,
    }).translate(bx2, bar3y - lh / 2).canvasPath;

    // ── Morph: "..." → "1" + bar3 line + "292 + ..." ───────────────────────
    // Initial state ends one level short with "..." as the last item.
    // The animation expands it into the real next staircase level.
    const TOTAL_DURATION = 3.65572 * 1000;
    const MORPH_START_MS = 900;
    const MORPH_MS = TOTAL_DURATION - 2 * MORPH_START_MS;

    const morphSchedule: Keyframe<number>[] = [
      { time: MORPH_START_MS, value: 0, easeAfter: ease },
      { time: MORPH_START_MS + MORPH_MS, value: 1 },
    ];

    const dotsShape = ParagraphLayout.singlePathShape({
      text: "...",
      font: mathFont,
      alignment: "left",
      width: RIGHT - bx3,
    }).translate(bx3, bar3y - lh / 2); // same line as "1 +" → reads as "1 + ..."

    const label292Shape = ParagraphLayout.singlePathShape({
      text: "292 + ...",
      font: mathFont,
      alignment: "left",
      width: RIGHT - bx3,
    }).translate(bx3, bar4y - lh / 2);

    const bar3Shape = new PathShape([new LCommand(bx3, bar3y, RIGHT, bar3y)]);

    // Combine "1" numerator + bar3 line + "292 + ..." into one morph target
    const finalShape = new PathShape([
      ...num3Shape.commands,
      ...bar3Shape.commands,
      ...label292Shape.commands,
    ]);

    const morpher = matchShapes(fixCorners(dotsShape), fixCorners(finalShape));

    scene.add({
      description: "continued fraction",
      duration: TOTAL_DURATION,
      show({ context, timeInMs }) {
        context.lineCap = "round";
        context.lineJoin = "round";
        context.lineWidth = sw;
        context.strokeStyle = myRainbow.cyan;

        // Static text
        context.stroke(piLabelPath);
        context.stroke(num0Path);
        context.stroke(label7Path);
        context.stroke(num1aPath);
        context.stroke(label15Path);
        context.stroke(num2Path);
        context.stroke(label1Path);

        // Morphing element: "..." → "1" + bar3 + "292 + ..."
        const progress = interpolateNumbers(timeInMs, morphSchedule);
        context.stroke(morpher(progress).canvasPath);

        // Fraction bars (bar3 is part of the morph, so only bars 0–2 here)
        context.lineCap = "butt";
        context.lineWidth = sw;
        for (const [bx, by] of [
          [bx0, bar0y],
          [bx1, bar1y],
          [bx2, bar2y],
        ] as [number, number][]) {
          context.beginPath();
          context.moveTo(bx, by);
          context.lineTo(RIGHT, by);
          context.stroke();
        }
      },
    });
  }
  return scene.build();
}
