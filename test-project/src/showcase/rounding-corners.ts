import { myRainbow } from "canvas-recorder-lib/src/glib/my-rainbow";
import { ParagraphLayout } from "canvas-recorder-lib/src/glib/paragraph-layout";
import {
  Command,
  LCommand,
  PathShape,
  Point,
  QCommand,
} from "canvas-recorder-lib/src/glib/path-shape";
import { panAndZoom } from "canvas-recorder-lib/src/glib/transforms";
import { ease } from "canvas-recorder-lib/src/interpolate";
import { Showable } from "canvas-recorder-lib/src/showable";
import { FULL_CIRCLE, ReadOnlyRect } from "phil-lib/misc";

import { makeCornerRounder } from "canvas-recorder-lib/src/corner-rounder";
import {
  NumberScheduleInfo,
  RectangleScheduleInfo,
} from "canvas-recorder-lib/src/schedule-helper";
import { titleFont } from "./shared.ts";

/** The "Rounding Corners" slide. */
export function roundingCorners(): Showable {
  const description = "Rounding Corners";
  const duration = 10_000;
  const pathShape = ParagraphLayout.singlePathShape({
    text: description,
    font: titleFont,
    alignment: "center",
    width: 16,
  });
  const boundingBox = pathShape.getBBox();
  const path = pathShape.canvasPath;
  const areaSchedule = new RectangleScheduleInfo("Area", [
    { time: 0, value: { x: 2, y: 2, height: 3, width: 3 } },
  ]);
  const roundnessSchedule = new NumberScheduleInfo("Roundness", [
    { time: 1_000, value: 0, easeAfter: ease },
    { time: 5_000, value: 1 },
    { time: 6_000, value: 1, easeAfter: ease },
    { time: 10_000, value: 0 },
  ]);
  const baseTriangle = new PathShape([
    new LCommand(0, 0, 1, Math.sqrt(3)),
    new LCommand(1, Math.sqrt(3), -1, Math.sqrt(3)),
    new LCommand(-1, Math.sqrt(3), 0, 0),
  ]);
  const baseTriangleBoundingBox: ReadOnlyRect = {
    x: -1,
    y: 0,
    width: 2,
    height: Math.sqrt(3),
  };
  /**
   * What proportion of each line to remove from each end.
   * 0 means to do nothing, leave the straight part alone.
   * 0.5, the max possible, means to remove the entire straight part.
   * 1/3 means to cut off the first 1/3, leave the middle 1/3, and remove the last 1/3.
   */
  const MAX_ROUNDNESS = 0.45;
  /**
   * This returns the base triangle altered to have round corners.
   * This adds a single quadratic segment to replace each corner.
   * The quadratic starts with 0 size, preserving the original corner.
   * As `progress` continues the round part gets bigger in a smooth way.
   *
   * I use this a lot because it is simple and it usually does what I want.
   *
   * This will *immediately* remove the kink in the curve.
   * The bulk of the process is very smooth.
   * But if you set lineJoin to "miter",
   * you'll see a clear corner at progress == 0,
   * and the corner will immediately disappear as soon as progress > 0.
   */
  function cornerRounder(progress: number) {
    const straightParts = baseTriangle.commands.map((command) => {
      const splitter = command.makeSplitter();
      const start = splitter.length * MAX_ROUNDNESS * progress;
      const end = splitter.length - start;
      return splitter.split(start, end);
    });
    const commands = new Array<Command>();
    baseTriangle.commands.forEach((originalAfter, index) => {
      const straightAfter = straightParts[index];
      const straightBefore = straightParts.at(index - 1)!;
      const newCurve = QCommand.controlPoints(
        straightBefore.x,
        straightBefore.y,
        originalAfter.x0,
        originalAfter.y0,
        straightAfter.x0,
        straightAfter.y0,
      );
      commands.push(newCurve, straightAfter);
    });
    return new PathShape(commands);
  }
  /**
   * This is the algorithm used in the Sierpiński video.
   * The angle flattens **gradually**.
   */
  const altCornerRounder = makeCornerRounder(baseTriangle, MAX_ROUNDNESS);
  function drawControlPoints(
    context: CanvasRenderingContext2D,
    qCommand: QCommand,
    color: string,
  ) {
    context.lineWidth = titleFont.strokeWidth / 2;
    context.strokeStyle = color;
    const radius = titleFont.strokeWidth * 3;
    const points = [
      { x: qCommand.x0, y: qCommand.y0 },
      { x: qCommand.x1, y: qCommand.y1 },
      { x: qCommand.x, y: qCommand.y },
    ];
    points.forEach(function drawOneCircle({ x, y }) {
      context.beginPath();
      context.arc(x, y, radius, 0, FULL_CIRCLE);
      context.closePath();
      context.stroke();
    });
    function drawLine(from: Point, to: Point) {
      const distance = Math.hypot(to.x - from.x, to.y - from.y);
      if (distance > 2 * radius) {
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        context.beginPath();
        context.moveTo(
          from.x + Math.cos(angle) * radius,
          from.y + Math.sin(angle) * radius,
        );
        context.lineTo(
          to.x - Math.cos(angle) * radius,
          to.y - Math.sin(angle) * radius,
        );
        context.stroke();
      }
    }
    drawLine(points[0], points[1]);
    drawLine(points[1], points[2]);
  }
  const scene: Showable = {
    description,
    duration,
    schedules: [areaSchedule, roundnessSchedule],
    show({ context, timeInMs }) {
      const gradient = context.createLinearGradient(
        boundingBox.x.min,
        boundingBox.y.min,
        boundingBox.x.min,
        boundingBox.y.max,
      );
      gradient.addColorStop(0, myRainbow.orange);
      gradient.addColorStop(1, myRainbow.red);
      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = titleFont.strokeWidth;
      context.strokeStyle = gradient;
      context.stroke(path);
      /**
       * Where to draw the two triangles.
       */
      const transforms = (() => {
        /**
         * Where to draw the green, instantly unkinked, triangle.
         */
        const area = areaSchedule.at(timeInMs);
        /**
         * Where to draw the green, instantly unkinked, triangle.
         */
        const transform = panAndZoom(
          baseTriangleBoundingBox,
          area,
          "srcRect fits completely into destRect",
        );
        /**
         * Where to draw the cyan, gradually unkinked, triangle.
         *
         * This is the mirror image of the other triangle.
         * If one is on the left side, the other will be on the right.
         */
        const altArea: ReadOnlyRect = {
          ...area,
          x: 16 - (area.x + area.width),
        };
        /**
         * Where to draw the cyan, gradually unkinked, triangle.
         *
         * This is the mirror image of the other triangle.
         * If one is on the left side, the other will be on the right.
         */
        const altTransform = panAndZoom(
          baseTriangleBoundingBox,
          altArea,
          "srcRect fits completely into destRect",
        );
        return [transform, altTransform] as const;
      })();
      const roundnessProgress = Math.max(
        0,
        Math.min(1, roundnessSchedule.at(timeInMs)),
      );
      context.lineWidth = titleFont.strokeWidth * 2;
      context.strokeStyle = myRainbow.cssBlue;
      const trianglePathShape = cornerRounder(roundnessProgress).transform(
        transforms[0],
      );
      context.stroke(trianglePathShape.canvasPath);
      context.strokeStyle = myRainbow.violet;
      context.lineJoin = "miter";
      const altTrianglePathShape = altCornerRounder(
        roundnessProgress,
      ).transform(transforms[1]);
      context.stroke(altTrianglePathShape.canvasPath);
      drawControlPoints(
        context,
        trianglePathShape.commands[0] as QCommand,
        myRainbow.cyan,
      );
      drawControlPoints(
        context,
        altTrianglePathShape.commands[0] as QCommand,
        myRainbow.magenta,
      );
      drawControlPoints(
        context,
        altTrianglePathShape.commands.at(-1) as QCommand,
        myRainbow.magenta,
      );
    },
  };
  return scene;
}
