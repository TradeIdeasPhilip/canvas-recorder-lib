import {
  computeGridTransform,
  drawGrid,
} from "canvas-recorder-lib/src/glib/grid";
import { makeLineFont } from "canvas-recorder-lib/src/glib/line-font";
import { ParagraphLayout } from "canvas-recorder-lib/src/glib/paragraph-layout";
import {
  ParametricFunction,
  ParametricToPath,
} from "canvas-recorder-lib/src/glib/path-shape";
import { PathShapeSplitter } from "canvas-recorder-lib/src/glib/path-shape-splitter";
import { ease } from "canvas-recorder-lib/src/interpolate";
import {
  MakeShowableInParallel,
  Showable,
} from "canvas-recorder-lib/src/showable";

import { CURVE_LINE_WIDTH, GRAPH_RECT, threeB1B } from "./lissajous-shared.ts";

// ── Scene: tracing (draw then erase) — Heart Curve ♡ ────────────────────
// Formula: x = 16·sin³θ,  y = 13·cosθ − 5·cos2θ − 2·cos3θ − cos4θ
// https://tradeideasphilip.github.io/random-svg-tests/parametric-path.html
/** The "Heart Curve" slide. */
export function heartCurve(): Showable {
  const DURATION = 6_000;

  // The formula title is long, so use a smaller font (adjust SCALE to taste).
  const HEART_TITLE_FONT_SCALE = 0.6; // fraction of the normal titleFont (0.7)
  const heartTitleFont = makeLineFont(0.7 * HEART_TITLE_FONT_SCALE);
  const scene = new MakeShowableInParallel(
    "16∙sin³(θ),   13∙cos(θ) - 5∙cos(2∙θ) - 2∙cos(3∙θ) - cos(4∙θ)",
  );
  const titlePath = ParagraphLayout.singlePathShape({
    text: scene.description,
    font: heartTitleFont,
    alignment: "center",
    width: 16,
  }).canvasPath;

  // Heart Curve ♡ parametric equations (math-convention y, not negated).
  // The canvasMatrix below flips y so it appears right-side up on screen.
  const heartF: ParametricFunction = (t) => {
    const angle = t * 2 * Math.PI;
    return {
      x: 16 * Math.sin(angle) ** 3,
      y:
        13 * Math.cos(angle) -
        5 * Math.cos(2 * angle) -
        2 * Math.cos(3 * angle) -
        Math.cos(4 * angle),
    };
  };
  const heartPathMath = (() => {
    const p2p = new ParametricToPath(heartF);
    p2p.go();
    return p2p.pathShape;
  })();

  // Natural bounds: x ∈ [−16, 16], y ∈ [−17, 13].  Square view with margin.
  const HEART_VIEW_RECT = { x: -18, y: -19, width: 36, height: 36 };
  const heartXf = computeGridTransform(GRAPH_RECT, HEART_VIEW_RECT)!;
  const heartScale = heartXf.toCanvasX(1) - heartXf.toCanvasX(0);
  const heartMatrix = new DOMMatrix([
    heartScale,
    0,
    0,
    -heartScale,
    heartXf.toCanvasX(0),
    heartXf.toCanvasY(0),
  ]);
  const heartCanvasShape = heartPathMath.transform(heartMatrix);

  scene.add({
    description: "tracing",
    duration: DURATION,
    show({ context, timeInMs }) {
      // Grid + title (smaller font + strokeWidth to match).
      drawGrid(context, { destRect: GRAPH_RECT, viewRect: HEART_VIEW_RECT });
      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = heartTitleFont.strokeWidth;
      context.strokeStyle = threeB1B.GREEN;
      context.stroke(titlePath);

      // Tracing animation: draw in, then erase from start.
      const p = timeInMs / DURATION;
      const fromP = p < 0.5 ? 0 : ease((p - 0.5) * 2);
      const toP = p < 0.5 ? ease(p * 2) : 1;
      if (toP > fromP) {
        const trimmed = PathShapeSplitter.trimProgress(
          heartCanvasShape,
          fromP,
          toP,
        );
        context.lineWidth = CURVE_LINE_WIDTH;
        context.strokeStyle = threeB1B.GREEN;
        context.setLineDash([]);
        context.stroke(trimmed.canvasPath);
      }
    },
  });
  return scene.build();
}
