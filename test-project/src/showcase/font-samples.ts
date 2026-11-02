import { Font } from "canvas-recorder-lib/src/glib/letters-base";
import {
  LineFontMetrics,
  makeLineFont,
} from "canvas-recorder-lib/src/glib/line-font";
import { myRainbow } from "canvas-recorder-lib/src/glib/my-rainbow";
import { ParagraphLayout } from "canvas-recorder-lib/src/glib/paragraph-layout";
import {
  interpolateNumbers,
  Keyframe,
} from "canvas-recorder-lib/src/interpolate";
import {
  MakeShowableInParallel,
  Showable,
} from "canvas-recorder-lib/src/showable";

import { margin, titleFont } from "./shared.ts";

/** The "Font Samples" slide. */
export function fontSamples(): Showable {
  const scene = new MakeShowableInParallel("Font Samples");

  const FONT_SIZE = 0.35;
  const PAN_START_MS = 500;
  const PAN_END_MS = 15_500;
  const SCENE_DURATION = PAN_END_MS + 500;
  const BOLD_FACTOR = 2;

  const FUTURA_COLOR = "rgb(128, 0, 255)";
  const CURSIVE_COLOR = "rgb(0, 0, 255)";
  const LINE_COLOR = myRainbow.myBlue;

  const futuraBase = Font.futuraL(FONT_SIZE);
  const futuraOblique = futuraBase.oblique();
  const cursiveBase = Font.cursive(FONT_SIZE);
  const cursiveOblique = cursiveBase.oblique();
  const lineBase = makeLineFont(FONT_SIZE);
  const lineOblique = lineBase.oblique();
  const lineBold = makeLineFont(
    new LineFontMetrics(FONT_SIZE, lineBase.strokeWidth * BOLD_FACTOR),
  );

  const rowDefs = [
    {
      font: futuraBase,
      label: "Futura L",
      color: FUTURA_COLOR,
      strokeWidth: futuraBase.strokeWidth,
      groupStart: false,
    },
    {
      font: futuraOblique,
      label: "italic",
      color: FUTURA_COLOR,
      strokeWidth: futuraBase.strokeWidth,
      groupStart: false,
    },
    {
      font: futuraBase,
      label: "bold",
      color: FUTURA_COLOR,
      strokeWidth: futuraBase.strokeWidth * BOLD_FACTOR,
      groupStart: false,
    },
    {
      font: cursiveBase,
      label: "Cursive",
      color: CURSIVE_COLOR,
      strokeWidth: cursiveBase.strokeWidth,
      groupStart: true,
    },
    {
      font: cursiveOblique,
      label: "italic",
      color: CURSIVE_COLOR,
      strokeWidth: cursiveBase.strokeWidth,
      groupStart: false,
    },
    {
      font: cursiveBase,
      label: "bold",
      color: CURSIVE_COLOR,
      strokeWidth: cursiveBase.strokeWidth * BOLD_FACTOR,
      groupStart: false,
    },
    {
      font: lineBase,
      label: "Line Font",
      color: LINE_COLOR,
      strokeWidth: lineBase.strokeWidth,
      groupStart: true,
    },
    {
      font: lineOblique,
      label: "italic",
      color: LINE_COLOR,
      strokeWidth: lineBase.strokeWidth,
      groupStart: false,
    },
    {
      font: lineBold,
      label: "bold",
      color: LINE_COLOR,
      strokeWidth: lineBold.strokeWidth,
      groupStart: false,
    },
  ];

  const titlePath = ParagraphLayout.singlePathShape({
    text: scene.description,
    font: titleFont,
    alignment: "center",
    width: 16,
  }).canvasPath;

  const LINE_GAP = 0.075;
  const GROUP_GAP = 0.5;

  let nextTop = titleFont.bottom + 0.6;
  const rowData: {
    path: Path2D;
    textWidth: number;
    color: string;
    strokeWidth: number;
  }[] = [];
  for (const def of rowDefs) {
    if (def.groupStart) {
      nextTop += GROUP_GAP;
    }
    const baseline = nextTop - def.font.top;
    const layout = new ParagraphLayout(def.font);
    layout.addText(def.label + " " + def.font.getAllLetters());
    const laidOut = layout.align(Infinity, "left");
    const path = laidOut.singlePathShape().translate(0, baseline).canvasPath;
    const textWidth = laidOut.width;
    nextTop = baseline + def.font.bottom + LINE_GAP;
    rowData.push({
      path,
      textWidth,
      color: def.color,
      strokeWidth: def.strokeWidth,
    });
  }

  const panSchedule: Keyframe<number>[] = [
    { time: PAN_START_MS, value: 0 },
    { time: PAN_END_MS, value: 1 },
  ];

  const showable: Showable = {
    description: scene.description,
    duration: SCENE_DURATION,
    show({ context, timeInMs }) {
      context.lineCap = "round";
      context.lineJoin = "round";

      context.lineWidth = titleFont.strokeWidth;
      context.strokeStyle = "white";
      context.stroke(titlePath);

      const panProgress = interpolateNumbers(timeInMs, panSchedule);

      context.save();
      context.beginPath();
      context.rect(0, 0, 16, 9);
      context.clip();

      for (const row of rowData) {
        const xOffset =
          margin + panProgress * (16 - 2 * margin - row.textWidth);
        context.lineWidth = row.strokeWidth;
        context.strokeStyle = row.color;
        context.save();
        context.translate(xOffset, 0);
        context.stroke(row.path);
        context.restore();
      }

      context.restore();
    },
  };

  scene.add(showable);
  return scene.build();
}
