import {
  computeGridTransform,
  drawGrid,
} from "canvas-recorder-lib/src/glib/grid";
import { myRainbow } from "canvas-recorder-lib/src/glib/my-rainbow";
import { ParagraphLayout } from "canvas-recorder-lib/src/glib/paragraph-layout";
import {
  MakeShowableInParallel,
  Showable,
} from "canvas-recorder-lib/src/showable";
import { FULL_CIRCLE, lerp } from "phil-lib/misc";

import { FunctionGraphComponent } from "canvas-recorder-lib/src/slide-components/function-graph";
import { titleFont } from "./shared.ts";

FunctionGraphComponent.functions.set("sin", Math.sin);
FunctionGraphComponent.functions.set("cos", Math.cos);
FunctionGraphComponent.functions.set("tan", Math.tan);
FunctionGraphComponent.functions.set("x²", (x) => x * x);
FunctionGraphComponent.functions.set("x³", (x) => x * x * x);

/** The "Function Graphing" slide. */
export function functionGraphing(): Showable {
  const scene = new MakeShowableInParallel("Function Graphing");

  // ── Change this one line to graph any ℝ→ℝ function. ─────────
  const f = (x: number) => Math.sin(x);
  // ─────────────────────────────────────────────────────────────

  const SAMPLE_COUNT = 300;
  const X_MIN = -FULL_CIRCLE; // -2π
  const X_MAX = FULL_CIRCLE; // +2π

  // Auto-range y by sampling f over [X_MIN, X_MAX].
  // This same bounding box drives both the grid and the coordinate mapping.
  const yValues: number[] = [];
  for (let i = 0; i <= SAMPLE_COUNT; i++) {
    yValues.push(f(lerp(X_MIN, X_MAX, i / SAMPLE_COUNT)));
  }
  const yDataMin = Math.min(...yValues);
  const yDataMax = Math.max(...yValues);
  const yPad = Math.max((yDataMax - yDataMin) * 0.1, 0.1);
  const Y_MIN = yDataMin - yPad;
  const Y_MAX = yDataMax + yPad;

  // Graph rect: left margin for y-labels, bottom margin for x-labels.
  const GRAPH_RECT = { x: 1.2, y: 1.5, width: 14.55, height: 7.0 };
  const viewRect = {
    x: X_MIN,
    y: Y_MIN,
    width: X_MAX - X_MIN,
    height: Y_MAX - Y_MIN,
  };

  const titlePath = ParagraphLayout.singlePathShape({
    text: scene.description,
    font: titleFont,
    alignment: "center",
    width: 16,
  }).canvasPath;

  const showable: Showable = {
    description: scene.description,
    duration: 9265.35 + 1_500,
    show({ context }) {
      context.lineCap = "round";
      context.lineJoin = "round";

      context.lineWidth = titleFont.strokeWidth;
      context.strokeStyle = "white";
      context.stroke(titlePath);

      drawGrid(context, { destRect: GRAPH_RECT, viewRect });

      // Use the same transform as drawGrid so the curve aligns with the grid.
      const { toCanvasX, toCanvasY, effectiveRect } = computeGridTransform(
        GRAPH_RECT,
        viewRect,
      )!;

      // Graph border — around the actual fitted area, not the full GRAPH_RECT.
      context.strokeStyle = "rgba(255,255,255,0.35)";
      context.lineWidth = 0.03;
      context.lineCap = "butt";
      context.setLineDash([]);
      context.strokeRect(
        effectiveRect.x,
        effectiveRect.y,
        effectiveRect.width,
        effectiveRect.height,
      );

      // Function curve — clipped to the fitted area.
      context.save();
      context.beginPath();
      context.rect(
        effectiveRect.x,
        effectiveRect.y,
        effectiveRect.width,
        effectiveRect.height,
      );
      context.clip();

      context.beginPath();
      for (let i = 0; i <= SAMPLE_COUNT; i++) {
        const mx = lerp(X_MIN, X_MAX, i / SAMPLE_COUNT);
        const cx = toCanvasX(mx);
        const cy = toCanvasY(f(mx));
        if (i === 0) context.moveTo(cx, cy);
        else context.lineTo(cx, cy);
      }
      context.strokeStyle = myRainbow.myBlue;
      context.lineWidth = 0.05;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.stroke();

      context.restore();
    },
  };

  scene.add(showable);
  return scene.build();
}
