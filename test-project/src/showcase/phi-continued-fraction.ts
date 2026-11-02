import { makeLineFont } from "canvas-recorder-lib/src/glib/line-font";
import { myRainbow } from "canvas-recorder-lib/src/glib/my-rainbow";
import { ParagraphLayout } from "canvas-recorder-lib/src/glib/paragraph-layout";
import {
  MakeShowableInParallel,
  Showable,
} from "canvas-recorder-lib/src/showable";

import { titleFont } from "./shared.ts";

/** The "φ as a Continued Fraction" slide. */
export function phiContinuedFraction(): Showable {
  // φ = 1 + 1/(1 + 1/(1 + 1/(1 + ...)))  — all integers are 1.
  // Static and super simple.
  const scene = new MakeShowableInParallel("φ as a Continued Fraction");
  {
    const path = ParagraphLayout.singlePathShape({
      text: scene.description,
      font: titleFont,
      alignment: "center",
      width: 16,
    }).canvasPath;
    scene.add({
      description: scene.description,
      duration: 1000,
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
    // Staircase layout for: φ = 1 + 1/(1 + 1/(1 + 1/(1 + ...)))
    // Every integer in the continued fraction is 1, so all labels are "1 +".
    // Indentation per level is uniform and tighter than the π version.
    const mathFont = makeLineFont(0.4);
    const lh = 1.75 * 0.4;
    const barGap = 0.12;
    const sw = mathFont.strokeWidth;
    const numTop0 = 1.95;
    const bar0y = numTop0 + lh + barGap;
    const row1y = bar0y + barGap;
    const bar1y = row1y + lh + barGap;
    const row2y = bar1y + barGap;
    const bar2y = row2y + lh + barGap;
    const row3y = bar2y + barGap;
    const bar3y = row3y + lh + barGap;
    const row4y = bar3y + barGap;
    const bar4y = row4y + lh + barGap;
    const RIGHT = 15.3;
    const x0 = 0.5; // "φ = 1 +"
    const bx0 = 2.6; // bar 0 left  (after "φ = 1 +")
    const bx1 = 3.4; // bar 1 left  (after "1 +")
    const bx2 = 4.2; // bar 2 left  (after "1 +")
    const bx3 = 5.0; // bar 3 left  (after "1 +")
    const STEP = bx1 - bx0; // uniform indent per level
    const phiLabelPath = ParagraphLayout.singlePathShape({
      text: "φ = 1 +",
      font: mathFont,
      alignment: "left",
      width: bx0 - x0,
    }).translate(x0, bar0y - lh / 2).canvasPath;
    // "1" numerator centered over [barLeft, RIGHT]
    const numPath = (barLeft: number, topY: number): Path2D =>
      ParagraphLayout.singlePathShape({
        text: "1",
        font: mathFont,
        alignment: "center",
        width: RIGHT - barLeft,
      }).translate(barLeft, topY).canvasPath;
    const num0Path = numPath(bx0, numTop0);
    const num1Path = numPath(bx1, row1y);
    const num2Path = numPath(bx2, row2y);
    const num3Path = numPath(bx3, row3y);
    // "1 +" integer label centered vertically at its own bar
    const onePlusPath = (barLeft: number, barY: number): Path2D =>
      ParagraphLayout.singlePathShape({
        text: "1 +",
        font: mathFont,
        alignment: "left",
        width: STEP,
      }).translate(barLeft, barY - lh / 2).canvasPath;
    const label1Path = onePlusPath(bx0, bar1y);
    const label2Path = onePlusPath(bx1, bar2y);
    const label3Path = onePlusPath(bx2, bar3y);
    const labelEndPath = ParagraphLayout.singlePathShape({
      text: "1 + ...",
      font: mathFont,
      alignment: "left",
      width: RIGHT - bx3,
    }).translate(bx3, bar4y - lh / 2).canvasPath;
    scene.add({
      description: "continued fraction",
      duration: 1_500,
      show({ context }) {
        context.lineCap = "round";
        context.lineJoin = "round";
        context.lineWidth = sw;
        context.strokeStyle = myRainbow.cyan;
        context.stroke(phiLabelPath);
        context.stroke(num0Path);
        context.stroke(label1Path);
        context.stroke(num1Path);
        context.stroke(label2Path);
        context.stroke(num2Path);
        context.stroke(label3Path);
        context.stroke(num3Path);
        context.stroke(labelEndPath);
        context.lineCap = "butt";
        for (const [bx, by] of [
          [bx0, bar0y],
          [bx1, bar1y],
          [bx2, bar2y],
          [bx3, bar3y],
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
