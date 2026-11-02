import { makeLineFont } from "canvas-recorder-lib/src/glib/line-font";
import { myRainbow } from "canvas-recorder-lib/src/glib/my-rainbow";
import {
  ParagraphLayout,
  WordInPlace,
} from "canvas-recorder-lib/src/glib/paragraph-layout";
import { PathShape } from "canvas-recorder-lib/src/glib/path-shape";
import {
  ease,
  interpolateColor,
  interpolateNumbers,
  Keyframe,
} from "canvas-recorder-lib/src/interpolate";
import {
  fixCorners,
  matchShapes,
} from "canvas-recorder-lib/src/morph-animation";
import { Showable } from "canvas-recorder-lib/src/showable";
import { zipper } from "canvas-recorder-lib/src/zipper";
import { initializedArray } from "phil-lib/misc";

import { margin, titleFont } from "./shared.ts";

/** The "Morphing Text" slide. */
export function morphingText(): Showable {
  const title = ParagraphLayout.singlePathShape({
    font: titleFont,
    text: "Morphing Text",
    alignment: "center",
    width: 16,
  }).canvasPath;
  const font = makeLineFont(0.355);
  const leftLayout = new ParagraphLayout(font);
  // https://en.wikipedia.org/wiki/The_Lamb_(poem)
  const words1 = leftLayout.addText(`Little Lamb who made thee?
Dost thou know who made thee?
Gave thee life and bid thee feed
By the stream and o’er the mead;
Gave thee clothing of delight,
Softest clothing wooly bright;
Gave thee such a tender voice,
Making all the vales rejoice!`);
  const leftResult = leftLayout.align(undefined, "left");
  const rightLayout = new ParagraphLayout(font);
  // https://poets.org/poem/tyger
  const words2 = rightLayout.addText(`Tyger! Tyger! burning bright
In the forests of the night,
What immortal hand or eye
Could frame thy fearful symmetry?

In what distant deeps or skies
Burnt the fire of thine eyes?
On what wings dare he aspire?
What the hand, dare sieze the fire?`);
  //console.log(words1, words2);
  const rightResult = rightLayout.align(16 - margin, "right");
  const rightTextTop = 2;
  const rightTextLeft = 0;
  const leftTextTop =
    rightTextTop + (rightResult.height - leftResult.height) / 2;
  const leftTextLeft = margin;
  const leftPath = leftResult
    .singlePathShape()
    .translate(leftTextLeft, leftTextTop).canvasPath;
  const rightPath = rightResult
    .singlePathShape()
    .translate(rightTextLeft, rightTextTop).canvasPath;
  function makeWordList(
    layoutResult: typeof rightResult,
    left: number,
    top: number,
  ) {
    const map = new Map<WordInPlace, PathShape[]>();
    for (const letterInfo of layoutResult.getAllLetters(left, top)) {
      const word = letterInfo.word;
      let pathShapes = map.get(word);
      if (!pathShapes) {
        pathShapes = [];
        map.set(word, pathShapes);
      }
      pathShapes.push(letterInfo.translatedShape);
    }
    const result = Array.from(
      map.values(),
      (letterShapes) =>
        new PathShape(letterShapes.flatMap((pathShape) => pathShape.commands)),
    );
    return result;
  }
  const morphers = zipper([
    makeWordList(leftResult, leftTextLeft, leftTextTop),
    makeWordList(rightResult, rightTextLeft, rightTextTop),
  ])
    .map(([from, to]) => {
      return matchShapes(fixCorners(from), fixCorners(to));
    })
    .toArray();
  const fromColor = "#ffff80";
  const toColor = "red";
  const schedules = initializedArray(
    morphers.length,
    (index): readonly Keyframe<number>[] => {
      const startTime = index * 800 + 500;
      const endTime = startTime + 4000;
      return [
        { time: startTime, value: 0, easeAfter: ease },
        { time: endTime, value: 1 },
      ];
    },
  );
  const scene: Showable = {
    duration: schedules.at(-1)!.at(-1)!.time + 2000,
    description: "Morphing Text",
    show({ context, timeInMs }) {
      context.lineCap = "round";
      context.lineJoin = "round";

      context.strokeStyle = myRainbow.myBlue;
      context.lineWidth = titleFont.strokeWidth;
      context.stroke(title);

      context.strokeStyle = fromColor;
      context.lineWidth = font.strokeWidth;
      context.stroke(leftPath);
      //context.strokeStyle = toColor;
      //context.stroke(rightPath);

      zipper([morphers, schedules]).forEach(([makePath, schedule]) => {
        const progress = interpolateNumbers(timeInMs, schedule);
        if (progress <= 0) {
          return;
        }
        makePath(progress).setCanvasPath(context);
        if (progress < 1) {
          const lineWidth = context.lineWidth;
          context.lineWidth = lineWidth * 2.5;
          context.strokeStyle = "black";
          context.stroke();
          context.lineWidth = lineWidth;
        }
        context.strokeStyle = interpolateColor(progress, fromColor, toColor);
        context.stroke();
      });

      // Make the first word bounce back and forth.
      // This was an early prototype.
      // context.strokeStyle = "yellow";
      // const progress = easeAndBack((timeInMs / 5000) % 1);
      // context.stroke(morphers[0](progress).canvasPath);
    },
  };
  return scene;
}
