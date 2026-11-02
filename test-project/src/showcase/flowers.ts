import {
  computeGridTransform,
  drawGrid,
} from "canvas-recorder-lib/src/glib/grid";
import { myRainbow } from "canvas-recorder-lib/src/glib/my-rainbow";
import { ParagraphLayout } from "canvas-recorder-lib/src/glib/paragraph-layout";
import {
  ParametricFunction,
  PathShape,
} from "canvas-recorder-lib/src/glib/path-shape";
import { easeIn } from "canvas-recorder-lib/src/interpolate";
import {
  MakeShowableInParallel,
  Showable,
} from "canvas-recorder-lib/src/showable";

import { titleFont } from "./shared.ts";

// ── Flowers with N Petals ─────────────────────────────────────────────────────
// "Rounded Pentagram ⛤, Heptagram, etc." from parametric-path.html:
//   https://tradeideasphilip.github.io/random-svg-tests/parametric-path.html
// support.input(0) = 0.17787 (fixed), support.input(1) sweeps 0 → 1 over the animation.
// Filled with the "nonzero" winding rule; no stroke.
/** The "Flowers with N Petals" slide. */
export function flowersWithNPetals(): Showable {
  const GRAPH_RECT = { x: 1.5, y: 1.1, width: 13, height: 7.3 };
  // Bounding box derived from the *final* animation state (input1 = 1, 10 trips).
  // The curve's maximum radius is r2 = 1.0, so a ±1.15 view with margin covers it.
  // This is fixed for the entire animation so the viewport never jumps.
  const VIEW_RECT = { x: -1.15, y: -1.15, width: 2.3, height: 2.3 };

  const { toCanvasX, toCanvasY } = computeGridTransform(GRAPH_RECT, VIEW_RECT)!;
  const mathScale = toCanvasX(1) - toCanvasX(0);
  const canvasMatrix = new DOMMatrix([
    mathScale,
    0,
    0,
    -mathScale,
    toCanvasX(0),
    toCanvasY(0),
  ]);

  const scene = new MakeShowableInParallel("Flowers with N Petals");
  const titlePath = ParagraphLayout.singlePathShape({
    text: scene.description,
    font: titleFont,
    alignment: "center",
    width: 16,
  }).canvasPath;

  // Fixed input — controls how "round" vs pointy the petals are.
  const INPUT_0 = 0.17787;
  const r1 = 0.5 * INPUT_0; // short radius of the reference ellipse
  const r2 = 1.0; // long radius

  const SEGMENTS = 153; // quality setting; default looked bad per author testing

  const SWEEP_MS = 7819.03 + 500;

  scene.add({
    description: "flower fill",
    duration: SWEEP_MS,
    show({ context, timeInMs }) {
      drawGrid(context, { destRect: GRAPH_RECT, viewRect: VIEW_RECT });

      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = titleFont.strokeWidth;
      context.strokeStyle = myRainbow.magenta;
      context.stroke(titlePath);

      /**
       * The project I took this example from,
       * https://tradeideasphilip.github.io/random-svg-tests/parametric-path.html,
       * has sliders so you can explore things interactively *without* writing code.
       * `progress` replaces the slider.
       */
      const progress = easeIn(timeInMs / this.duration);
      const numberOfTrips = progress * 10;

      const flowerF: ParametricFunction = (t) => {
        const phase = Math.PI * t;
        const angle = t * 2 * Math.PI * numberOfTrips;
        const xEllipse = r1 * Math.cos(angle);
        const yEllipse = r2 * Math.sin(angle);
        return {
          x: xEllipse * Math.cos(phase) - yEllipse * Math.sin(phase),
          y: xEllipse * Math.sin(phase) + yEllipse * Math.cos(phase),
        };
      };

      const flowerCanvasPath = PathShape.parametric(
        flowerF,
        SEGMENTS,
      ).transform(canvasMatrix).canvasPath;

      context.fillStyle = myRainbow.magenta;
      context.fill(flowerCanvasPath, "nonzero");
    },
  });

  return scene.build();
}
