import { makeLineFont } from "canvas-recorder-lib/src/glib/line-font";
import {
  addRainbowGradientStops,
  myRainbowEqualKeyframes,
  myRainbowInfo,
  myRainbowPerceptualKeyframes,
} from "canvas-recorder-lib/src/glib/my-rainbow";
import { ParagraphLayout } from "canvas-recorder-lib/src/glib/paragraph-layout";
import {
  discreteKeyframes,
  interpolateColors,
} from "canvas-recorder-lib/src/interpolate";
import { Showable } from "canvas-recorder-lib/src/showable";

import { DEFAULT_SLIDE_DURATION_MS } from "./shared.ts";

/** The "Rainbow Color Spacing" slide. */
export function rainbowColorSpacing(): Showable {
  const labelFont = makeLineFont(0.28);
  const nameFont = makeLineFont(0.65);

  // Discrete name keyframes so the current color name can be displayed.
  const equalNameKfs = myRainbowInfo.map((info, i) => ({
    time: i / 9,
    value: info.name,
  }));
  const perceptualNameKfs = myRainbowInfo.map((info, i) => ({
    time: myRainbowPerceptualKeyframes[i].time,
    value: info.name,
  }));

  const MARGIN_X = 0.4;
  const BAR_WIDTH = 15.2;
  const BAR_HEIGHT = 0.65;
  // Offsets within a 4.5-unit-tall row:
  const LABEL_Y = 0.4;
  const SQ_Y = 1.1;
  const SQ_SIZE = 1.05;
  const NAME_Y = 1.1;
  const BAR_Y = 2.15;
  const INDIC_TIP_ABOVE = 0.3; // how far the indicator stem extends above the bar

  function drawRow(
    ctx: CanvasRenderingContext2D,
    rowTop: number,
    label: string,
    progress: number,
    colorKfs: readonly { time: number; value: string }[],
    nameKfs: typeof equalNameKfs,
  ) {
    const currentColor = interpolateColors(progress, colorKfs);
    const colorName = discreteKeyframes(progress, nameKfs);

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Method label
    ctx.lineWidth = labelFont.strokeWidth;
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.stroke(
      ParagraphLayout.singlePathShape({
        font: labelFont,
        text: label,
        alignment: "left",
        width: BAR_WIDTH,
      }).translate(MARGIN_X, rowTop + LABEL_Y).canvasPath,
    );

    // Color square
    const sqX = MARGIN_X;
    const sqY = rowTop + SQ_Y;
    ctx.fillStyle = currentColor;
    ctx.fillRect(sqX, sqY, SQ_SIZE, SQ_SIZE);
    ctx.lineWidth = 0.035;
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.strokeRect(sqX, sqY, SQ_SIZE, SQ_SIZE);

    // Color name (in current color)
    ctx.lineWidth = nameFont.strokeWidth;
    ctx.strokeStyle = currentColor;
    ctx.stroke(
      ParagraphLayout.singlePathShape({
        font: nameFont,
        text: colorName,
        alignment: "left",
        width: 6,
      }).translate(MARGIN_X + SQ_SIZE + 0.3, rowTop + NAME_Y).canvasPath,
    );

    // Gradient bar
    const barX = MARGIN_X;
    const barY = rowTop + BAR_Y;
    const grad = ctx.createLinearGradient(barX, 0, barX + BAR_WIDTH, 0);
    addRainbowGradientStops(grad, colorKfs);
    ctx.fillStyle = grad;
    ctx.fillRect(barX, barY, BAR_WIDTH, BAR_HEIGHT);
    ctx.lineWidth = 0.025;
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.strokeRect(barX, barY, BAR_WIDTH, BAR_HEIGHT);

    // Indicator: stem + downward-pointing triangle above bar
    const indicX = barX + progress * BAR_WIDTH;
    ctx.lineWidth = 0.04;
    ctx.strokeStyle = "white";
    ctx.lineCap = "butt";
    ctx.beginPath();
    ctx.moveTo(indicX, barY - INDIC_TIP_ABOVE);
    ctx.lineTo(indicX, barY + BAR_HEIGHT);
    ctx.stroke();

    const triW = 0.13;
    const triH = 0.22;
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.moveTo(indicX, barY - INDIC_TIP_ABOVE + triH); // tip pointing down toward bar
    ctx.lineTo(indicX - triW, barY - INDIC_TIP_ABOVE);
    ctx.lineTo(indicX + triW, barY - INDIC_TIP_ABOVE);
    ctx.closePath();
    ctx.fill();
  }

  const rainbowSpacing: Showable = {
    description: "Rainbow Color Spacing",
    duration: DEFAULT_SLIDE_DURATION_MS,
    show({ context, timeInMs }) {
      const progress = timeInMs / DEFAULT_SLIDE_DURATION_MS;

      // Dividing line between rows
      context.lineWidth = 0.025;
      context.strokeStyle = "rgba(255,255,255,0.15)";
      context.beginPath();
      context.moveTo(0, 4.5);
      context.lineTo(16, 4.5);
      context.stroke();

      drawRow(
        context,
        0,
        "Equal Weights",
        progress,
        myRainbowEqualKeyframes,
        equalNameKfs,
      );
      drawRow(
        context,
        4.5,
        "Perceptual",
        progress,
        myRainbowPerceptualKeyframes,
        perceptualNameKfs,
      );
    },
  };
  return rainbowSpacing;
}
