import { PathShapeSplitter } from "canvas-recorder-lib/src/glib/path-shape-splitter";
import {
  MakeShowableInParallel,
  Showable,
} from "canvas-recorder-lib/src/showable";

import {
  canvasCurvePath,
  canvasCurveShape,
  CURVE_LINE_WIDTH,
  drawBackground,
  makeTitle,
  splitter,
  threeB1B,
} from "./lissajous-shared.ts";

// ── Scene: arrow tracing the path ────────────────────────────────────────
// Canvas analog of CSS offset-path.  PathShapeSplitter replaces motion-path,
// positionAndAngleAt() gives exact position + tangent in one lookup.
// Related: https://tradeideasphilip.github.io/random-svg-tests/parametric-path.html
/** The "Lissajous Curves — arrow" slide. */
export function lissajousArrow(): Showable {
  const DURATION = 9_500;
  const scene = new MakeShowableInParallel("Lissajous Curves — arrow");
  const titlePath = makeTitle(scene.description);
  scene.add({
    description: "arrow",
    duration: DURATION,
    show({ context, timeInMs }) {
      drawBackground(context, titlePath, threeB1B.RED);
      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = CURVE_LINE_WIDTH;

      // Ghost of the full curve at low opacity.
      context.save();
      context.globalAlpha = 0.25;
      context.strokeStyle = threeB1B.RED;
      context.setLineDash([]);
      context.stroke(canvasCurvePath);
      context.restore();

      // Growing trace from t=0 to current parameter.
      const progress = timeInMs / DURATION;
      const tracedShape = PathShapeSplitter.trimProgress(
        canvasCurveShape,
        0,
        progress,
      );
      context.strokeStyle = threeB1B.RED;
      context.setLineDash([]);
      context.stroke(tracedShape.canvasPath);

      // Arrowhead at current position, rotated to follow the tangent.
      const { x, y, angle } = splitter.positionAndAngleAt(
        progress * splitter.length,
      );
      const arrowSize = 0.28;
      context.save();
      context.translate(x, y);
      context.rotate(angle);
      context.beginPath();
      context.moveTo(arrowSize, 0);
      context.lineTo(-arrowSize * 0.55, arrowSize * 0.38);
      context.lineTo(-arrowSize * 0.55, -arrowSize * 0.38);
      context.closePath();
      context.fillStyle = threeB1B.RED;
      context.fill();
      context.restore();
    },
  });
  return scene.build();
}
