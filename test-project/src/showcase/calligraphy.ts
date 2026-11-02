import { Font } from "canvas-recorder-lib/src/glib/letters-base";
import { myRainbow } from "canvas-recorder-lib/src/glib/my-rainbow";
import { ParagraphLayout } from "canvas-recorder-lib/src/glib/paragraph-layout";
import { PathShape } from "canvas-recorder-lib/src/glib/path-shape";
import { applyTransform } from "canvas-recorder-lib/src/glib/transforms";
import {
  ease,
  interpolateNumbers,
  Keyframe,
} from "canvas-recorder-lib/src/interpolate";
import { makePolygon } from "canvas-recorder-lib/src/peano-fourier/fourier-shared";
import {
  MakeShowableInParallel,
  Showable,
} from "canvas-recorder-lib/src/showable";
import { FULL_CIRCLE, lerp } from "phil-lib/misc";

import { titleFont } from "./shared.ts";
import { manWalkingString } from "./walking-man.ts";

/** The "Calligraphy Effect" slide. */
export function calligraphyEffect(): Showable {
  // Warning:  Something abut this effect doesn't work well under Safari.
  // Most things seem to work okay with Safari, just not this.
  // I use Chrome for most of my development and testing.
  const scene = new MakeShowableInParallel("Calligraphy Effect");

  const titleShape = ParagraphLayout.singlePathShape({
    text: scene.description,
    font: titleFont,
    alignment: "center",
    width: 16,
  });

  const starShape = makePolygon(5, 1).makeItFit(
    { x: 0.25, y: 1.3, width: 3.5, height: 2.5 },
    "srcRect fits completely into destRect",
  );

  const manWalkingShape = PathShape.fromRawString(manWalkingString)
    .transform(new DOMMatrix("scale(0.025)"))
    .makeItFit(
      { x: 0.25, y: 4.1, width: 3.5, height: 4.7 },
      "srcRect fits completely into destRect",
    );

  const sineShape = PathShape.parametric((progress) => {
    const x = lerp(-FULL_CIRCLE, FULL_CIRCLE, progress);
    return { x, y: -Math.sin(x) };
  }, 21).makeItFit(
    { x: 4.5, y: 1.3, width: 11, height: 2.5 },
    "srcRect fits completely into destRect",
  );

  const cursiveFont = Font.cursive(0.55);
  const cursiveShape = (() => {
    const layout = new ParagraphLayout(cursiveFont);
    layout.addText("The quick brown fox jumps over the lazy dog.");
    return layout.align(11, "center").singlePathShape().translate(4.5, 5.5);
  })();

  const DURATION = 12_000;
  // Eccentricity: 1 = circular pen, >1 = elliptical (calligraphic).
  const eccentricitySchedule: Keyframe<number>[] = [
    { time: 0, value: 1, easeAfter: ease },
    { time: 3_000, value: 3, easeAfter: ease },
    { time: 6_000, value: 1, easeAfter: ease },
    { time: 9_000, value: 3, easeAfter: ease },
    { time: DURATION, value: 1 },
  ];
  // Angle in degrees: the orientation of the ellipse's major axis.
  const angleSchedule: Keyframe<number>[] = [
    { time: 0, value: -45 },
    { time: DURATION, value: 45 },
  ];

  const showable: Showable = {
    description: scene.description,
    duration: DURATION,
    schedules: [
      {
        description: "Eccentricity",
        type: "number",
        schedule: eccentricitySchedule,
      },
      {
        description: "Angle (degrees)",
        type: "number",
        schedule: angleSchedule,
      },
    ],
    show({ context, timeInMs }) {
      context.lineCap = "round";
      context.lineJoin = "round";

      const eccentricity = interpolateNumbers(timeInMs, eccentricitySchedule);
      const angleDeg = interpolateNumbers(timeInMs, angleSchedule);

      // T is applied to the canvas, stretching the circular pen tip into an ellipse.
      // TInv is the inverse transform applied to each path, so T(TInv(path)) = original
      // path positions — the shapes look correct but are drawn with an elliptical pen.
      // rotateSelf/scaleSelf take degrees; angleDeg is stored in degrees.
      const T = new DOMMatrix()
        .rotateSelf(angleDeg)
        .scaleSelf(eccentricity, 1)
        .rotateSelf(-angleDeg);
      const TInv = new DOMMatrix()
        .rotateSelf(angleDeg)
        .scaleSelf(1 / eccentricity, 1)
        .rotateSelf(-angleDeg);

      /**
       * Stroke the shape, but use an elliptical pen instead of the default circular pen.
       *
       * This is an interesting effect in its own.
       * But it's really just a straw man, an example of how you can insert all sorts of special effects into the drawing pipeline.
       * @param shape
       * @param lineWidth
       * @param color
       */
      const drawCalligraphy = (
        shape: PathShape,
        lineWidth: number,
        color: string,
      ) => {
        context.lineWidth = lineWidth;
        context.strokeStyle = color;
        const preTransformed = shape.transform(TInv).canvasPath;
        context.save();
        applyTransform(context, T);
        context.stroke(preTransformed);
        context.restore();
      };

      drawCalligraphy(titleShape, titleFont.strokeWidth, "white");
      drawCalligraphy(starShape, 0.07, myRainbow.violet);
      drawCalligraphy(manWalkingShape, 0.04, "white");
      drawCalligraphy(sineShape, 0.07, myRainbow.myBlue);
      drawCalligraphy(cursiveShape, 0.04, "gold");
    },
  };

  scene.add(showable);
  return scene.build();
}
