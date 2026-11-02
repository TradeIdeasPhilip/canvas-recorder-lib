import {
  computeGridTransform,
  drawGrid,
} from "canvas-recorder-lib/src/glib/grid";
import { ParagraphLayout } from "canvas-recorder-lib/src/glib/paragraph-layout";
import {
  ParametricFunction,
  ParametricToPath,
} from "canvas-recorder-lib/src/glib/path-shape";
import { PathShapeSplitter } from "canvas-recorder-lib/src/glib/path-shape-splitter";

import { titleFont } from "./shared.ts";

/**
 * What the parametric curve slides share:  ridiculously-simple-fourier.ts, heart-curve.ts,
 * lissajous-spirals.ts, lissajous-arrow.ts and offset-path.ts.
 * They started as one group in the old showcase.ts.
 *
 * Related project: https://tradeideasphilip.github.io/random-svg-tests/parametric-path.html
 * (https://github.com/TradeIdeasPhilip/random-svg-tests)
 * @module
 */

/**
 * 3blue1brown / Manim color palette.
 * Source: https://github.com/3b1b/manim/blob/master/manimlib/utils/color_utils.py
 *
 * These colors are designed for math animations on a dark background,
 * as seen in 3blue1brown's YouTube channel and his Summer of Math Exposition (SoME) contest.
 */
export const threeB1B = {
  BLUE_E: "#1C758A",
  BLUE_D: "#29ABCA",
  BLUE: "#58C4DD",
  BLUE_B: "#9CDCEB",
  TEAL_E: "#49A88F",
  TEAL: "#5CD0B3",
  GREEN_E: "#699C52",
  GREEN: "#83C167",
  YELLOW_E: "#E8C11C",
  YELLOW: "#FFFF00",
  GOLD: "#C78D46",
  RED_E: "#CF5044",
  RED: "#FC6255",
  MAROON: "#C55F73",
  PURPLE: "#9A72AC",
  WHITE: "#FFFFFF",
  GREY: "#888888",
};

/**
 * Lissajous curve (3:2 frequency ratio) — the default example from
 * https://tradeideasphilip.github.io/random-svg-tests/parametric-path.html
 *
 * Parametric equations:
 *   x(t) = sin(3·2πt + π/2) = cos(6πt)
 *   y(t) = sin(4πt)
 * for t ∈ [0, 1] (one full period).
 */
export const lissajousF: ParametricFunction = (t) => {
  const angle = t * 2 * Math.PI;
  return {
    x: Math.sin(3 * angle + Math.PI / 2),
    y: Math.sin(2 * angle),
  };
};

// Build a high-quality path in math coordinates (x, y ∈ [−1, 1]).
// ParametricToPath adaptively subdivides until the bezier approximation is tight.
export const lissajousPathMath = (() => {
  const p2p = new ParametricToPath(lissajousF);
  p2p.go();
  return p2p.pathShape;
})();

// Graph area on the 16×9 canvas.
export const GRAPH_RECT = { x: 1.5, y: 1.1, width: 13, height: 7.3 };
// Math-space view: a square window around the unit square, with a small margin.
export const VIEW_RECT = { x: -1.25, y: -1.25, width: 2.5, height: 2.5 };

// Coordinate transform shared between drawGrid() and PathShape.transform().
// computeGridTransform() uses a y-flipped system (math y increases upward;
// canvas y increases downward), so the DOMMatrix must negate scaleY.
export const { toCanvasX, toCanvasY } = computeGridTransform(
  GRAPH_RECT,
  VIEW_RECT,
)!;
export const mathScale = toCanvasX(1) - toCanvasX(0); // canvas units per math unit
// DOMMatrix([a, b, c, d, e, f]) → x' = a·x + c·y + e, y' = b·x + d·y + f
export const canvasMatrix = new DOMMatrix([
  mathScale,
  0,
  0,
  -mathScale, // negative: flip y so math "up" maps to canvas "up"
  toCanvasX(0),
  toCanvasY(0),
]);

// Lissajous path in canvas coordinates (used for drawing and for splitter).
export const canvasCurveShape = lissajousPathMath.transform(canvasMatrix);
export const canvasCurvePath = canvasCurveShape.canvasPath;
export const splitter = PathShapeSplitter.create(canvasCurveShape);

export const CURVE_LINE_WIDTH = 0.05;

// Reusable: title + grid for all four scenes.
export function drawBackground(
  context: CanvasRenderingContext2D,
  titlePath: Path2D,
  titleColor: string,
) {
  drawGrid(context, { destRect: GRAPH_RECT, viewRect: VIEW_RECT });
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = titleFont.strokeWidth;
  context.strokeStyle = titleColor;
  context.stroke(titlePath);
}

export function makeTitle(text: string) {
  return ParagraphLayout.singlePathShape({
    text,
    font: titleFont,
    alignment: "center",
    width: 16,
  }).canvasPath;
}
