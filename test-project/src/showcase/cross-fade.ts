import { myRainbow } from "canvas-recorder-lib/src/glib/my-rainbow";
import { ParagraphLayout } from "canvas-recorder-lib/src/glib/paragraph-layout";
import {
  ParametricFunction,
  PathShape,
  Point,
} from "canvas-recorder-lib/src/glib/path-shape";
import {
  ease,
  easeOut,
  interpolateNumbers,
  makePathShapeInterpolator,
} from "canvas-recorder-lib/src/interpolate";
import { makePolygon } from "canvas-recorder-lib/src/peano-fourier/fourier-shared";
import { ScheduleInfo, Showable } from "canvas-recorder-lib/src/showable";
import { FULL_CIRCLE } from "phil-lib/misc";

import {
  constantToParametric,
  createCrossFadeFunction,
  pathToParametric,
} from "canvas-recorder-lib/src/cross-fade";
import { titleFont } from "./shared.ts";

/** The "Cross-Fade" slide. */
export function crossFade(): Showable {
  /**
   * See https://tradeideasphilip.github.io/random-svg-tests/parametric-path.html for the source of this and other sample paths.
   * @param cuspCount A positive integer.
   * @param amplitude 0 makes a circle.
   * Positive numbers pull in to make spikes.
   * Negative numbers push out to make a cloud.
   * -1 to 1 is a good range.
   * @returns A parametric function that will trace out the requested path.
   */
  function makeCusps(cuspCount: number, amplitude: number): ParametricFunction {
    // The parametric stuff is aimed at smooth curves.
    // These cusps push the limits so set the number of segments to something reasonable high.
    function cusps(progress: number): Point {
      /**
       * Once around the circle.
       */
      const θ = progress * FULL_CIRCLE;
      const r =
        (2 - amplitude * Math.abs(Math.sin(progress * Math.PI * cuspCount))) /
        2;
      const x = r * Math.cos(θ);
      const y = r * Math.sin(θ);
      return { x, y };
    }
    return cusps;
  }
  /**
   * This was called "Rounded Pentagram ⛤, Heptagram, etc." at
   * https://tradeideasphilip.github.io/random-svg-tests/parametric-path.html
   *
   * I modified it some to make it look more like the star.
   * E.g. rotating it to be in the same alignment and starting in the same place.
   * @param numberOfPetals A positive integer.
   * 5 is a good starting place.
   * @param fatness 0 - 1 is a good range.
   * 0.5, the default is very reasonable.
   */
  function makeFlower(
    numberOfPetals: number,
    fatness = 0.5,
  ): ParametricFunction {
    /**
     * Short radius of the ellipse.
     */
    const r1 = 0.5 * fatness;
    /**
     * Long radius of the ellipse
     */
    const r2 = 1.0;
    const numberOfTrips = numberOfPetals / 2;
    function flower(progress: number): Point {
      /**
       * The reference ellipse will make one half complete rotation during the tracing process.
       */
      const phase = Math.PI * progress - FULL_CIRCLE / 4;
      /**
       * Basic ellipse centered at the origin
       */
      const angle = (progress + 0.5) * FULL_CIRCLE * numberOfTrips;
      // Rotate the ellipse by the phase angle
      const xEllipse = r1 * Math.cos(angle);
      const yEllipse = r2 * Math.sin(angle);
      const x = xEllipse * Math.cos(phase) - yEllipse * Math.sin(phase);
      const y = -(xEllipse * Math.sin(phase) + yEllipse * Math.cos(phase));
      return { x, y };
    }
    return flower;
  }
  const star5 = makePolygon(5, 1, "Star");
  const star5Parametric = pathToParametric(star5);
  const star5a = makePolygon(5, 1, "✨5a");
  const star5aParametric = pathToParametric(star5a);
  const star7 = makePolygon(7, 3, "Star ⭐️");
  const star7Parametric = pathToParametric(star7);
  const star7a = makePolygon(7, 3, "Star ⭐️a");
  const star7aParametric = pathToParametric(star7a);
  function sineWave(progress: number): Point {
    const x = -(progress - 0.5) * FULL_CIRCLE;
    // Remember to invert all of the y's.
    // Math scale says that up is positive.
    // Canvas scale says that down is positive.
    const y = -Math.sin(x);
    return { x: (x / FULL_CIRCLE) * 2, y };
  }
  function sineWave3(progress: number): Point {
    const x = -(progress - 0.5) * FULL_CIRCLE;
    // Remember to invert all of the y's.
    // Math scale says that up is positive.
    // Canvas scale says that down is positive.
    const y = -Math.sin(x * 3);
    return { x: (x / FULL_CIRCLE) * 2, y };
  }
  /**
   * Probably overkill.
   */
  const NUMBER_OF_SEGMENTS = 350;
  const leftCenter = { x: 4, y: 4 };
  const rightCenter = { x: 12, y: 4 };
  const scale = 2;
  const leftTransform = new DOMMatrixReadOnly()
    .translate(leftCenter.x, leftCenter.y)
    .scale(scale);
  const rightTransform = new DOMMatrixReadOnly()
    .translate(rightCenter.x, rightCenter.y)
    .scale(scale);
  const samples: {
    from: ParametricFunction;
    to: ParametricFunction;
    overlap: number;
    easing?: (progress: number) => number;
  }[] = [
    {
      from: constantToParametric({ x: 0, y: 0 }),
      to: star7aParametric,
      overlap: 0.1,
      easing: ease,
    },
    {
      from: star7aParametric,
      to: star7Parametric,
      overlap: 0.15,
      easing: ease,
    },
    { from: star7Parametric, to: star5Parametric, overlap: 0.15, easing: ease },
    {
      from: star5Parametric,
      to: star5aParametric,
      overlap: 0.15,
      easing: ease,
    },
    { from: star5aParametric, to: makeFlower(5), overlap: 0.15, easing: ease },
    { from: makeFlower(5), to: makeFlower(5, 0), overlap: 0.15, easing: ease },
    {
      from: makeFlower(5, 0),
      to: makeFlower(7, 0),
      overlap: 0.15,
      easing: ease,
    },
    {
      from: makeFlower(7, 0),
      to: makeFlower(9, 0),
      overlap: 0.15,
      easing: ease,
    },
    { from: makeFlower(9, 0), to: sineWave, overlap: 0.15, easing: ease },
    { from: sineWave, to: sineWave3, overlap: 0.05, easing: easeOut },
    { from: sineWave3, to: makeCusps(7, 0.5), overlap: 0.05, easing: ease },
    {
      from: makeCusps(7, 0.5),
      to: makeCusps(7, 1),
      overlap: 0.05,
      easing: ease,
    },
    { from: makeCusps(7, 1), to: makeCusps(8, 1), overlap: 0.02, easing: ease },
    { from: makeCusps(8, 1), to: makeCusps(9, 1), overlap: 0.02, easing: ease },
    {
      from: makeCusps(9, 1),
      to: constantToParametric({ x: 0, y: 0 }),
      overlap: 0.02,
      easing: ease,
    },
  ];
  /**
   * Shown on the left side of the screen.
   *
   * These do simple interpolation, like you would get from a css animation.
   * All of the pieces of the curve have to match.
   */
  const simplePathInterpolators = samples.map(({ from, to }) =>
    // Note:  PathShape.parametric() is very predictable and perfect for
    // makePathShapeInterpolator().  Sometimes I need
    // PathShape.glitchFreeParametric() for more complicated curves, but
    // that is not as predictable and won't work here.
    makePathShapeInterpolator(
      PathShape.parametric(from, NUMBER_OF_SEGMENTS).transform(leftTransform),
      PathShape.parametric(to, NUMBER_OF_SEGMENTS).transform(leftTransform),
    ),
  );
  const whichSampleSchedule: ScheduleInfo = {
    description: "Which Sample",
    type: "number",
    schedule: [],
  };
  /**
   * 1 minute 8 seconds, to match the voiceover.
   */
  const duration = 68_000;
  samples.forEach((_sample, index, array) => {
    const period = duration / array.length;
    const initialPause = period * 0.15;
    const finalPause = period * 0.15;
    whichSampleSchedule.schedule.push(
      { time: period * index + initialPause, value: index },
      { time: period * (index + 1) - finalPause, value: index + 1 },
    );
  });
  // Text
  const title = "Interpolating Between Paths";
  const titlePath = ParagraphLayout.singlePathShape({
    text: title,
    font: titleFont,
    alignment: "center",
    width: 16,
  }).canvasPath;
  const descriptionFont = titleFont.resize(titleFont.mHeight * 0.75);
  const leftDescriptionPath = ParagraphLayout.singlePathShape({
    text: "Synchronous",
    font: descriptionFont,
    alignment: "center",
    width: 8,
  }).translate(0, 6.5).canvasPath;
  const subDescriptionFont = titleFont.resize(titleFont.mHeight * 0.5);
  const leftSubDescriptionPath = ParagraphLayout.singlePathShape({
    text: "(CSS Style)",
    font: subDescriptionFont,
    alignment: "center",
    width: 8,
  }).translate(0, 7.5).canvasPath;
  const rightDescriptionPath = ParagraphLayout.singlePathShape({
    text: "Sliding",
    font: descriptionFont,
    alignment: "center",
    width: 8,
  }).translate(8, 6.5).canvasPath;
  const rightSubDescriptionPath = ParagraphLayout.singlePathShape({
    text: "(Cross-Fade)",
    font: subDescriptionFont,
    alignment: "center",
    width: 8,
  }).translate(8, 7.5).canvasPath;
  const scene: Showable = {
    description: title,
    duration,
    schedules: [whichSampleSchedule],
    show({ context, timeInMs }) {
      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = descriptionFont.strokeWidth;
      context.strokeStyle = myRainbow.green;
      context.stroke(leftDescriptionPath);
      context.strokeStyle = myRainbow.magenta;
      context.stroke(rightDescriptionPath);
      context.lineWidth = subDescriptionFont.strokeWidth;
      context.strokeStyle = myRainbow.myBlue;
      context.stroke(leftSubDescriptionPath);
      context.strokeStyle = myRainbow.yellow;
      context.stroke(rightSubDescriptionPath);
      context.lineWidth = titleFont.strokeWidth;
      context.strokeStyle = myRainbow.orange;
      context.stroke(titlePath);

      // Look up the actions and states for this time.
      const { sample, progress, sampleIndex } = (() => {
        const whichSample = interpolateNumbers(
          timeInMs,
          whichSampleSchedule.schedule,
        );
        const sampleIndex = Math.floor(whichSample);
        // The user might have picked something out of range.
        if (sampleIndex < 0) {
          const sampleIndex = 0;
          return { sample: samples[sampleIndex], progress: 0, sampleIndex };
        } else if (sampleIndex >= samples.length) {
          const sampleIndex = samples.length - 1;
          return { sample: samples[sampleIndex], progress: 1, sampleIndex };
        } else {
          const sample = samples[sampleIndex];
          const progress = whichSample - sampleIndex;
          return { sample, progress, sampleIndex };
        }
      })();

      // Draw the left side.
      context.strokeStyle = myRainbow.red;
      context.stroke(simplePathInterpolators[sampleIndex](progress).canvasPath);

      // Draw the right side.
      const movingFunction = createCrossFadeFunction(
        sample.from,
        sample.to,
        sample.overlap,
        progress,
        sample.easing,
      );
      const movingPathShape = PathShape.parametric(
        movingFunction,
        NUMBER_OF_SEGMENTS,
      ).transform(rightTransform);
      context.strokeStyle = myRainbow.cyan;
      context.stroke(movingPathShape.canvasPath);
    },
  };
  return scene;
}
