import {
  computeGridTransform,
  drawGrid,
} from "canvas-recorder-lib/src/glib/grid";
import { makeLineFont } from "canvas-recorder-lib/src/glib/line-font";
import { ParagraphLayout } from "canvas-recorder-lib/src/glib/paragraph-layout";
import {
  ParametricFunction,
  PathShape,
} from "canvas-recorder-lib/src/glib/path-shape";
import {
  interpolateNumbers,
  Keyframe,
} from "canvas-recorder-lib/src/interpolate";
import {
  MakeShowableInParallel,
  Showable,
} from "canvas-recorder-lib/src/showable";

import { CURVE_LINE_WIDTH, GRAPH_RECT, threeB1B } from "./lissajous-shared.ts";

// ── Scene: Ridiculously Simple Fourier Decomposition ("A Better Square") ──
// Formula: "A Better Square" from parametric-path.html.
// https://tradeideasphilip.github.io/random-svg-tests/parametric-path.html
/** The "Ridiculously Simple Fourier Decomposition" slide. */
export function ridiculouslySimpleFourier(): Showable {
  // Fourier coefficients for a square, computed via complex Fourier series.
  // Source: "Square with Easing" example at complex-fourier-series.html.
  // The first entry is a near-zero "seed" circle (amplitude 1/1000 of the real
  // first term) so the animation starts from a dot rather than a jump.
  // Most of these are pretty small and worth ignoring.
  const CIRCLES = [
    {
      frequency: 1,
      amplitude: 0.0006002108774487057,
      phase: -2.356194490192345,
    },
    {
      frequency: 1,
      amplitude: 0.6002108774487057,
      phase: -2.356194490192345,
    },
    {
      frequency: -3,
      amplitude: 0.12004217545570839,
      phase: -2.356194490192345,
    },
    {
      frequency: 5,
      amplitude: 0.017148882159337513,
      phase: 0.7853981633974483,
    },
    {
      frequency: -7,
      amplitude: 0.0057162939963831035,
      phase: -2.356194490192344,
    },
    {
      frequency: 9,
      amplitude: 0.0025983153910070288,
      phase: 0.7853981633974468,
    },
    {
      frequency: -11,
      amplitude: 0.0013990928373741655,
      phase: -2.356194490192343,
    },
    {
      frequency: 13,
      amplitude: 0.0008394556343162563,
      phase: 0.7853981633974426,
    },
    {
      frequency: -15,
      amplitude: 0.000543177105018045,
      phase: -2.3561944901923386,
    },
    {
      frequency: 17,
      amplitude: 0.00037164742117819677,
      phase: 0.7853981633974505,
    },
    {
      frequency: -19,
      amplitude: 0.0002654623706666915,
      phase: -2.3561944901923475,
    },
  ] as const;

  const preRollMs = 500;
  const postRollMs = 500;

  const SEGMENTS = 125;
  const SWEEP_MS = 21577.15;
  const circleCountSchedule: Keyframe<number>[] = [
    { time: preRollMs, value: 1 },
    { time: preRollMs + SWEEP_MS / 3, value: 4 },
    { time: preRollMs + SWEEP_MS, value: 1 },
  ];

  // Fixed VIEW_RECT from the final animation state (input0 = 0.5, ~5½ circles).
  // The converging square has corners ≈ ±0.85; add margin.
  const SQUARE_VIEW_RECT = { x: -0.95, y: -0.95, width: 1.9, height: 1.9 };
  const squareXf = computeGridTransform(GRAPH_RECT, SQUARE_VIEW_RECT)!;
  const squareScale = squareXf.toCanvasX(1) - squareXf.toCanvasX(0);
  const squareMatrix = new DOMMatrix([
    squareScale,
    0,
    0,
    -squareScale,
    squareXf.toCanvasX(0),
    squareXf.toCanvasY(0),
  ]);

  const scene = new MakeShowableInParallel(
    "Ridiculously Simple Fourier Decomposition",
  );
  const squareTitleFont = makeLineFont(0.7 * 0.7); // 70% of normal; title is long
  const titlePath = ParagraphLayout.singlePathShape({
    text: scene.description,
    font: squareTitleFont,
    alignment: "center",
    width: 16,
  }).canvasPath;

  scene.add({
    description: "curve",
    duration: circleCountSchedule.at(-1)!.time + postRollMs,
    show({ context, timeInMs }) {
      drawGrid(context, { destRect: GRAPH_RECT, viewRect: SQUARE_VIEW_RECT });
      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = squareTitleFont.strokeWidth;
      context.strokeStyle = threeB1B.BLUE;
      context.stroke(titlePath);

      const numberOfCircles = interpolateNumbers(timeInMs, circleCountSchedule);
      const circlesToConsider = Math.ceil(numberOfCircles);
      const attenuation = numberOfCircles - Math.floor(numberOfCircles);

      const squareF: ParametricFunction = (t) => {
        let x = 0,
          y = 0;
        for (let k = 0; k < circlesToConsider; k++) {
          const { frequency, amplitude, phase } = CIRCLES[k];
          const angle = 2 * Math.PI * frequency * t + phase;
          const factor =
            k === circlesToConsider - 1 && attenuation > 0 ? attenuation : 1;
          x += factor * amplitude * Math.cos(angle);
          y += factor * amplitude * Math.sin(angle);
        }
        return { x, y };
      };

      const squarePath = PathShape.parametric(squareF, SEGMENTS).transform(
        squareMatrix,
      ).canvasPath;

      context.lineWidth = CURVE_LINE_WIDTH;
      context.strokeStyle = threeB1B.BLUE;
      context.setLineDash([]);
      context.stroke(squarePath);
    },
  });
  return scene.build();
}
