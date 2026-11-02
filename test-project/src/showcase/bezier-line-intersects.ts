import { makeLineFontRatio } from "canvas-recorder-lib/src/glib/line-font";
import { myRainbow } from "canvas-recorder-lib/src/glib/my-rainbow";
import { ParagraphLayout } from "canvas-recorder-lib/src/glib/paragraph-layout";
import { PathShape, Point } from "canvas-recorder-lib/src/glib/path-shape";
import {
  ease,
  easeIn,
  easeOut,
  interpolateNumbers,
  interpolatePoint,
  interpolatePoints,
  interpolateRects,
} from "canvas-recorder-lib/src/interpolate";
import { ScheduleInfo, Showable } from "canvas-recorder-lib/src/showable";
import { zipper } from "canvas-recorder-lib/src/zipper";
import { initializedArray, lerp, positiveModulo } from "phil-lib/misc";

import { titleFont } from "./shared.ts";

/** The "Bezier.lineIntersects()" slide. */
export function bezierLineIntersects(): Showable {
  const title = "Bezier.lineIntersects()";
  const titlePath = ParagraphLayout.singlePathShape({
    text: title,
    font: titleFont,
    alignment: "center",
    width: 16,
  }).canvasPath;
  const footerSizeRatio = 0.75;
  const footerPath = ParagraphLayout.singlePathShape({
    text: "“𝔻ouble-𝕊truck” or “𝔹lackboard 𝔹old”",
    font: titleFont.resize(titleFont.mHeight * footerSizeRatio),
    alignment: "center",
    width: 16,
  }).translate(0, 8).canvasPath;
  const chars = "ℂ𝔾𝕁𝕆ℚ𝕊𝕌";
  // const normalFontWeight = LineFontMetrics.defaultStrokeWidth(1);
  // const minBold = 0.5 * normalFontWeight;
  // const maxBold = 1.5 * normalFontWeight;
  // const boldestFont = makeLineFont(new LineFontMetrics(1, maxBold));
  // let height = NaN;
  // let width = 0;
  // [...chars].forEach((char) => {
  //   const paragraphLayout = new ParagraphLayout(boldestFont);
  //   paragraphLayout.addText(char);
  //   const alignment = paragraphLayout.align();
  //   height = alignment.height;
  //   width = Math.max(width, alignment.width);
  // });
  // const samplePathShape = PathBuilder.M(0, 0)
  //   .H(width)
  //   .V(height)
  //   .H(0)
  //   .V(0).pathShape;
  const samplePathShape: PathShape | undefined = undefined;
  const bigLocationSchedule: ScheduleInfo & { type: "point" } = {
    description: "big location",
    type: "point",
    schedule: [
      { time: 0, value: { x: 3.323921783625731, y: 0.8147843567251463 } },
    ],
  };
  const bigFontSizeSchedule: ScheduleInfo & { type: "number" } = {
    description: "big font size",
    type: "number",
    schedule: [
      {
        time: 0,
        value: 5,
      },
    ],
  };
  const smallLocationsSchedule: ScheduleInfo & { type: "rectangle" } = {
    description: "small locations",
    type: "rectangle",
    schedule: [
      {
        time: 0,
        value: {
          x: 8.458082485104274,
          y: 1.2240703961160762,
          width: 6.0620267502482585,
          height: 3.6159806700319987,
        },
      },
    ],
  };
  const smallFontSizeSchedule: ScheduleInfo & { type: "number" } = {
    description: "small font size",
    type: "number",
    schedule: [{ time: 0, value: 2 }],
  };
  const sampleColors: readonly string[] = myRainbow.filter(
    (value) => value != myRainbow.orange && value != myRainbow.cssBlue,
  );
  const positionSchedule: ScheduleInfo & { type: "number" } = {
    description: "Position",
    type: "number",
    schedule: [
      { time: 0.75, value: 0, easeAfter: ease },
      { time: 0.95, value: 1 },
    ],
  };
  const boldnessSchedule: ScheduleInfo & { type: "number" } = {
    description: "Boldness",
    type: "number",
    schedule: [
      { time: 0.05, value: 1, easeAfter: easeOut },
      { time: 0.25, value: 0.5, easeAfter: ease },
      { time: 0.45, value: 1.5, easeAfter: easeIn },
      { time: 0.65, value: 1 },
    ],
  };
  const scene: Showable = {
    description: title,
    duration: 45_000,
    schedules: [
      bigLocationSchedule,
      bigFontSizeSchedule,
      smallLocationsSchedule,
      smallFontSizeSchedule,
      positionSchedule,
      boldnessSchedule,
    ],
    show({ context, globalTime, timeInMs }) {
      // Title
      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = titleFont.strokeWidth;
      context.strokeStyle = myRainbow.cssBlue;
      context.stroke(titlePath);
      context.strokeStyle = myRainbow.orange;
      context.lineWidth *= footerSizeRatio;
      context.stroke(footerPath);
      const baseSampleInfos: readonly { location: Point; fontSize: number }[] =
        (() => {
          const bigLocation = interpolatePoints(
            timeInMs,
            bigLocationSchedule.schedule,
          );
          const bigFontSize = interpolateNumbers(
            timeInMs,
            bigFontSizeSchedule.schedule,
          );
          const result = [{ location: bigLocation, fontSize: bigFontSize }];
          const smallLocations = interpolateRects(
            timeInMs,
            smallLocationsSchedule.schedule,
          );
          const smallFontSize = interpolateNumbers(
            timeInMs,
            smallFontSizeSchedule.schedule,
          );
          const topRowXs = [
            smallLocations.x,
            smallLocations.x + smallLocations.width / 2,
            smallLocations.x + smallLocations.width,
          ];
          topRowXs.forEach((x) => {
            result.push({
              location: { x, y: smallLocations.y },
              fontSize: smallFontSize,
            });
          });
          const bottomRowXs = topRowXs.toReversed();
          bottomRowXs.forEach((x) => {
            result.push({
              location: { x, y: smallLocations.y + smallLocations.height },
              fontSize: smallFontSize,
            });
          });
          return result;
        })();
      const numberOfSamples = baseSampleInfos.length;
      function makeCurrentSamples(
        startIndexOffset: number,
        stageProgress: number,
      ): readonly { location: Point; fontSize: number }[] {
        const result = initializedArray(numberOfSamples, (resultIndex) => {
          const startIndex = positiveModulo(
            startIndexOffset + resultIndex,
            numberOfSamples,
          );
          const startInfo = baseSampleInfos[startIndex];
          const endIndex = (startIndex + 1) % numberOfSamples;
          const endInfo = baseSampleInfos[endIndex];
          const resultSample = {
            location: interpolatePoint(
              stageProgress,
              startInfo.location,
              endInfo.location,
            ),
            fontSize: lerp(startInfo.fontSize, endInfo.fontSize, stageProgress),
          };
          return resultSample;
        });
        return result;
      }
      const globalProgress = (timeInMs / this.duration) * numberOfSamples;
      const startIndexOffset = Math.floor(globalProgress);
      const stageProgress = globalProgress - startIndexOffset;
      const positionProgress = interpolateNumbers(
        stageProgress,
        positionSchedule.schedule,
      );
      const boldnessFactor = interpolateNumbers(
        stageProgress,
        boldnessSchedule.schedule,
      );
      const font = makeLineFontRatio(1, boldnessFactor);
      const currentSamples = makeCurrentSamples(
        startIndexOffset,
        positionProgress,
      );
      zipper([currentSamples, sampleColors, chars]).forEach(
        ([currentSample, sampleColor, char], index) => {
          context.strokeStyle = sampleColor;
          // if (samplePathShape) {
          //   const finalPathShape = samplePathShape.makeItFit(
          //     currentRectangle,
          //     "srcRect fits completely into destRect",
          //   );
          //   context.lineJoin = "miter";
          //   context.stroke(finalPathShape.canvasPath);
          // }
          context.lineWidth = font.strokeWidth;
          context.lineJoin = "round";
          const width = 16;
          const path = ParagraphLayout.singlePathShape({
            font,
            text: char,
            alignment: "center",
            width,
          }).translate(-width / 2, 0).canvasPath;
          const originalMatrix = context.getTransform();
          context.translate(currentSample.location.x, currentSample.location.y);
          context.scale(currentSample.fontSize, currentSample.fontSize);
          context.stroke(path);
          context.strokeStyle =
            /*sampleColors[(index+3)%numberOfSamples]*/ "#00000080";
          context.lineWidth /= 6;
          context.stroke(path);
          context.setTransform(originalMatrix);
        },
      );
    },
  };
  return scene;
}
