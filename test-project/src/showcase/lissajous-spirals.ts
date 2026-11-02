import { computeGridTransform } from "canvas-recorder-lib/src/glib/grid";
import { PathShape } from "canvas-recorder-lib/src/glib/path-shape";
import {
  MakeShowableInParallel,
  Showable,
} from "canvas-recorder-lib/src/showable";

import {
  CURVE_LINE_WIDTH,
  drawBackground,
  GRAPH_RECT,
  makeTitle,
  threeB1B,
} from "./lissajous-shared.ts";

// ── Scene: #SoME5 Idea: Lissajous Spirals ───────────────────────────────
/** The "Lissajous Spirals" slide. */
export function lissajousSpirals(): Showable {
  // x(t) = t·cos(2πt),  y(t) = t·sin(freqRatio·2πt)
  // freqRatio = 1 + input0 * 4,  t ∈ [0, 1]
  // Fixed VIEW_RECT from the final state (input0 = 1) so the viewport never jumps.
  const LISSAJOUS_SPIRAL_VIEW_RECT = {
    x: -1.15,
    y: -1.15,
    width: 2.3,
    height: 2.3,
  };
  const SEGMENTS = 225;
  const SWEEP_MS = 7_000;

  const spiralXf = computeGridTransform(
    GRAPH_RECT,
    LISSAJOUS_SPIRAL_VIEW_RECT,
  )!;
  const spiralScale = spiralXf.toCanvasX(1) - spiralXf.toCanvasX(0);
  const spiralMatrix = new DOMMatrix([
    spiralScale,
    0,
    0,
    -spiralScale,
    spiralXf.toCanvasX(0),
    spiralXf.toCanvasY(0),
  ]);

  const scene = new MakeShowableInParallel("#SoME5 Idea:  Lissajous Spirals");
  const titlePath = makeTitle(scene.description);
  scene.add({
    description: "spiral",
    duration: SWEEP_MS,
    show({ context, timeInMs }) {
      drawBackground(context, titlePath, threeB1B.YELLOW_E);
      /**
       * The project I took this example from,
       * https://tradeideasphilip.github.io/random-svg-tests/parametric-path.html,
       * has sliders so you can explore things interactively *without* writing code.
       * `progress` replaces the slider.
       */
      const progress = timeInMs / this.duration;
      const freqRatio = 1 + progress * 4;
      const spiralF = (t: number) => ({
        x: t * Math.cos(2 * Math.PI * t),
        y: t * Math.sin(freqRatio * 2 * Math.PI * t),
      });
      const spiralPath = PathShape.parametric(spiralF, SEGMENTS).transform(
        spiralMatrix,
      ).canvasPath;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = CURVE_LINE_WIDTH;
      context.strokeStyle = threeB1B.YELLOW;
      context.setLineDash([]);
      context.stroke(spiralPath);
    },
  });
  return scene.build();
}
