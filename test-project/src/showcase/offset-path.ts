import {
  computeGridTransform,
  drawGrid,
} from "canvas-recorder-lib/src/glib/grid";
import {
  ParametricFunction,
  PathShape,
} from "canvas-recorder-lib/src/glib/path-shape";
import { PathShapeSplitter } from "canvas-recorder-lib/src/glib/path-shape-splitter";
import {
  MakeShowableInParallel,
  Showable,
} from "canvas-recorder-lib/src/showable";

import {
  CURVE_LINE_WIDTH,
  GRAPH_RECT,
  makeTitle,
  threeB1B,
} from "./lissajous-shared.ts";
import { DEFAULT_SLIDE_DURATION_MS, titleFont } from "./shared.ts";

// ── Scene: τ, π, and → following the path (CSS offset-path style) ────────
// Formula: "Fourier square wave", numberOfCircles = 5 (fixed integer).
// Because numberOfCircles is an exact integer, attenuation = 0 and the
// partial-last-term factor disappears, leaving a clean sum of 5 sine waves.
// Font, colors, and speeds copied from parametric-path.css.
// https://github.com/TradeIdeasPhilip/random-svg-tests/blob/73fe4fe4fbe9e5dfa5dc937e3ea27940f42465d2/src/parametric-path.css#L76-L94
/** The "offset-path CSS property" slide. */
export function offsetPath(): Showable {
  // The square wave is much wider than tall, so it needs its own view rect.
  // Note:  This is a very good aspect ratio.  It makes efficient use of the screen.
  const FOURIER_VIEW_RECT = { x: -2.8, y: -1.4, width: 5.6, height: 2.8 };
  const fourierXf = computeGridTransform(GRAPH_RECT, FOURIER_VIEW_RECT)!;
  const fourierScale = fourierXf.toCanvasX(1) - fourierXf.toCanvasX(0);
  const fourierMatrix = new DOMMatrix([
    fourierScale,
    0,
    0,
    -fourierScale,
    fourierXf.toCanvasX(0),
    fourierXf.toCanvasY(0),
  ]);

  // Fourier square wave, numberOfCircles = 5 (integer → no attenuation factor).
  const fourierF: ParametricFunction = (t) => {
    const baseAngle = 2 * Math.PI * 2.5 * t + Math.PI / 2; // 2.5 cycles
    let y = 0;
    for (let k = 0; k < 5; k++) {
      const n = 2 * k + 1; // odd harmonics: 1, 3, 5, 7, 9
      y += (4 / Math.PI / n) * Math.sin(n * baseAngle);
    }
    return { x: t * 5 - 2.5, y }; // x spans −2.5 to 2.5
  };
  const fourierPathMath = PathShape.glitchFreeParametric(fourierF, 150);
  const fourierCanvasShape = fourierPathMath.transform(fourierMatrix);
  const fourierCanvasPath = fourierCanvasShape.canvasPath;
  const fourierSplitter = PathShapeSplitter.create(fourierCanvasShape);

  const scene = new MakeShowableInParallel("offset-path CSS property");
  const titlePath = makeTitle(scene.description);

  // CSS: font-size: calc(var(--recommended-width) * 25px)
  // recommended-width = max(bBox.width, bBox.height) / 100 in path-coordinate units.
  const fourierBBox = fourierCanvasShape.getBBox();
  const recommendedWidth =
    Math.max(fourierBBox.x.size, fourierBBox.y.size) / 100;
  const labelFontSize = recommendedWidth * 25; // canvas units
  const LABEL_FONT = `${labelFontSize}px serif`;

  // CSS animation durations (ms per full loop) — unchanged from parametric-path.css.
  const TAU_PERIOD = 12_500;
  const PI_PERIOD = 25_000;
  /**
   * Half as fast as the example I took this from.
   * The arrow was rotating too fast originally.
   * It almost looked like flickering.
   */
  const ARROW_PERIOD = 20_967 * 2;

  // Draw background curve in a neutral color (CSS used stroke:black).
  scene.add({
    description: "curve",
    duration: 16875.04 + 500,
    show({ context }) {
      drawGrid(context, {
        destRect: GRAPH_RECT,
        viewRect: FOURIER_VIEW_RECT,
      });
      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = titleFont.strokeWidth;
      context.strokeStyle = threeB1B.GREY;
      context.stroke(titlePath);
      context.lineWidth = CURVE_LINE_WIDTH;
      context.strokeStyle = threeB1B.GREY;
      context.setLineDash([]);
      context.stroke(fourierCanvasPath);
    },
  });

  // Helper: place text at a path position.
  // upright=true → offset-rotate:0deg (τ, π); upright=false → rotates with tangent (→).
  function drawMarker(
    context: CanvasRenderingContext2D,
    globalTime: number,
    period: number,
    char: string,
    color: string,
    upright: boolean,
  ) {
    const progress = (globalTime / period) % 1;
    const { x, y, angle } = fourierSplitter.positionAndAngleAt(
      progress * fourierSplitter.length,
    );
    context.save();
    context.font = LABEL_FONT;
    context.fillStyle = color;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.translate(x, y);
    if (!upright) context.rotate(angle);
    context.fillText(char, 0, 0);
    context.restore();
  }

  scene.add({
    description: "markers",
    duration: DEFAULT_SLIDE_DURATION_MS,
    show({ context, globalTime }) {
      // τ — brown, offset-rotate:0deg, 12500ms/loop
      drawMarker(context, globalTime, TAU_PERIOD, "τ", "brown", true);
      // π — teal, offset-rotate:0deg, 25000ms/loop
      drawMarker(context, globalTime, PI_PERIOD, "π", "rgb(0,113,139)", true);
      // → — pink, default offset-rotate (follows tangent), 20967ms/loop
      drawMarker(context, globalTime, ARROW_PERIOD, "→", "#eb90ee", false);
    },
  });

  return scene.build();
}
