import { makeLineFontFromTotalHeight } from "canvas-recorder-lib/src/glib/line-font";
import { myRainbowInfo } from "canvas-recorder-lib/src/glib/my-rainbow";
import { ParagraphLayout } from "canvas-recorder-lib/src/glib/paragraph-layout";
import {
  ease,
  interpolateColors,
  Keyframe,
} from "canvas-recorder-lib/src/interpolate";
import { Showable } from "canvas-recorder-lib/src/showable";

import { compare, convertCSS } from "colorizr";

//
// See https://gilbarbara.github.io/colorizr/comparison/#compare
// or https://www.levelaccess.com/resources/must-have-wcag-2-1-checklist/
// for detailed information.
//
// Short version:
// * Higher contrast ratios are better.
// * AA compliance is good.
// * AAA compliance is better.
/** The "Color Pair Readability" slide. */
export function colorPairReadability(): Showable {
  const DURATION_MS = 12_000;

  // Background color schedule: black → white.
  const bgSchedule: Keyframe<string>[] = [
    { time: 0, value: "#000000", easeAfter: ease },
    { time: DURATION_MS, value: "#ffffff" },
  ];

  const HEADER_H = 1.0; // reserved at top for bg label + column headers
  const ROW_H = (9 - HEADER_H) / 9; // ≈ 0.889 — 9 rows share the remaining space
  const SWATCH_W = 2.2;
  const SWATCH_X = 0.3;
  const TEXT_X = SWATCH_X + SWATCH_W + 0.25;
  const METRICS_X = 7.5;

  const COLOR_FONT_TOTAL_LINE_HEIGHT = ROW_H * 0.78;
  const colorFont = makeLineFontFromTotalHeight(COLOR_FONT_TOTAL_LINE_HEIGHT);
  const metricsFont = makeLineFontFromTotalHeight(ROW_H * 0.55);
  const bgLabelFont = makeLineFontFromTotalHeight(HEADER_H * 0.38);

  // Column positions in the right panel.
  const COL_RATIO_X = METRICS_X;
  const COL_RATIO_W = 3.2;
  const COL_AA_X = METRICS_X + 3.6;
  const COL_AA_W = 1.3;
  const COL_AAA_X = METRICS_X + 5.1;
  const COL_AAA_W = 1.6;

  // Precompute path shapes for color names (stroked in their own color).
  const colorNamePaths = myRainbowInfo.map((info) =>
    ParagraphLayout.singlePathShape({
      font: colorFont,
      text: info.name,
      alignment: "left",
      width: METRICS_X - TEXT_X - 0.2,
    }),
  );

  // Static column header paths.
  const hdrRatioPath = ParagraphLayout.singlePathShape({
    font: metricsFont,
    text: "contrast",
    alignment: "left",
    width: COL_RATIO_W,
  });
  const hdrAAPath = ParagraphLayout.singlePathShape({
    font: metricsFont,
    text: "AA",
    alignment: "center",
    width: COL_AA_W,
  });
  const hdrAAAPath = ParagraphLayout.singlePathShape({
    font: metricsFont,
    text: "AAA",
    alignment: "center",
    width: COL_AAA_W,
  });

  // Chrome returns 'color(srgb r g b)' (components in 0–1) when reading back a
  // fillStyle set to color-mix(). convertCSS() doesn't handle that format, so
  // we detect it with a regex and convert manually. Everything else goes through
  // convertCSS() as a fallback.
  function canvasColorToHex(canvasColor: string): string {
    const m = canvasColor.match(
      /^color\(srgb\s+([\d.e+-]+)\s+([\d.e+-]+)\s+([\d.e+-]+)\)/,
    );
    if (m) {
      const r = Math.round(parseFloat(m[1]) * 255)
        .toString(16)
        .padStart(2, "0");
      const g = Math.round(parseFloat(m[2]) * 255)
        .toString(16)
        .padStart(2, "0");
      const b = Math.round(parseFloat(m[3]) * 255)
        .toString(16)
        .padStart(2, "0");
      return `#${r}${g}${b}`;
    }
    return convertCSS(canvasColor, "hex");
  }

  const colorPairReadability: Showable = {
    description: "Color Pair Readability",
    duration: DURATION_MS,
    show({ context, timeInMs }) {
      const bg = interpolateColors(timeInMs, bgSchedule);

      // Fill background panel behind swatches + text (left portion).
      context.fillStyle = bg;
      // Reading fillStyle back resolves color-mix() to a concrete browser color
      // string (may be color(srgb ...) in modern Chrome). convertCSS() normalizes
      // that to hex so colorizr's compare() can parse it.
      // WARNING: relies on browser canvas normalization — won't work in Node.js.
      const resolvedBg = canvasColorToHex(context.fillStyle as string);
      const bgLabel = resolvedBg;
      context.fillRect(0, 0, METRICS_X - 0.15, 9);

      // Right panel stays black for metrics readability.
      context.fillStyle = "#111111";
      context.fillRect(METRICS_X - 0.15, 0, 16 - (METRICS_X - 0.15), 9);

      // Thin divider.
      context.lineWidth = 0.03;
      context.strokeStyle = "rgba(128,128,128,0.5)";
      context.beginPath();
      context.moveTo(METRICS_X - 0.15, 0);
      context.lineTo(METRICS_X - 0.15, 9);
      context.stroke();

      // Background color label + column headers (right panel header area).
      context.save();
      context.lineWidth = bgLabelFont.strokeWidth;
      context.strokeStyle = "#cccccc";
      context.lineCap = "round";
      context.lineJoin = "round";
      context.stroke(
        ParagraphLayout.singlePathShape({
          font: bgLabelFont,
          text: `bg: ${bgLabel}`,
          alignment: "left",
          width: 16 - METRICS_X,
        }).translate(METRICS_X, HEADER_H * 0.2).canvasPath,
      );
      // Column headers — each in its own fixed-width cell.
      context.lineWidth = metricsFont.strokeWidth;
      const hdrY = HEADER_H * 0.62;
      context.stroke(hdrRatioPath.translate(COL_RATIO_X, hdrY).canvasPath);
      context.stroke(hdrAAPath.translate(COL_AA_X, hdrY).canvasPath);
      context.stroke(hdrAAAPath.translate(COL_AAA_X, hdrY).canvasPath);
      context.restore();

      // One row per color.
      for (let i = 0; i < myRainbowInfo.length; i++) {
        const info = myRainbowInfo[i];
        const rowTop = HEADER_H + i * ROW_H;
        const rowY = rowTop + (ROW_H - COLOR_FONT_TOTAL_LINE_HEIGHT) / 2;
        const centerY = rowTop + ROW_H / 2;

        // Color swatch rectangle.
        context.fillStyle = info.color;
        context.fillRect(
          SWATCH_X,
          rowTop + ROW_H * 0.06,
          SWATCH_W,
          ROW_H * 0.88,
        );

        // Color name, stroked in that color, on top of the background.
        context.save();
        context.lineWidth = colorFont.strokeWidth;
        context.strokeStyle = info.color;
        context.lineCap = "round";
        context.lineJoin = "round";
        context.stroke(colorNamePaths[i].translate(TEXT_X, rowY).canvasPath);
        context.restore();

        // Compute WCAG 2.x metrics (normalAA/AAA use the modern contrast ratio).
        const analysis = compare(info.color, resolvedBg);
        const metricsY = centerY - metricsFont.mHeight / 2;

        context.save();
        context.lineWidth = metricsFont.strokeWidth;
        context.strokeStyle = "#dddddd";
        context.lineCap = "round";
        context.lineJoin = "round";
        // Ratio cell: right-aligned so decimal points line up.
        context.stroke(
          ParagraphLayout.singlePathShape({
            font: metricsFont,
            text: `${analysis.contrast.toFixed(1)}:1`,
            alignment: "right",
            width: COL_RATIO_W,
          }).translate(COL_RATIO_X, metricsY).canvasPath,
        );
        // AA cell.
        context.stroke(
          ParagraphLayout.singlePathShape({
            font: metricsFont,
            text: analysis.normalAA ? "Y" : "N",
            alignment: "center",
            width: COL_AA_W,
          }).translate(COL_AA_X, metricsY).canvasPath,
        );
        // AAA cell.
        context.stroke(
          ParagraphLayout.singlePathShape({
            font: metricsFont,
            text: analysis.normalAAA ? "Y" : "N",
            alignment: "center",
            width: COL_AAA_W,
          }).translate(COL_AAA_X, metricsY).canvasPath,
        );
        context.restore();
      }
    },
  };
  return colorPairReadability;
}
