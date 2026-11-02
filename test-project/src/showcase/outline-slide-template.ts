import { Font } from "canvas-recorder-lib/src/glib/letters-base";
import { makeLineFont } from "canvas-recorder-lib/src/glib/line-font";
import { myRainbow } from "canvas-recorder-lib/src/glib/my-rainbow";
import { ParagraphLayout } from "canvas-recorder-lib/src/glib/paragraph-layout";
import { PathShapeSplitter } from "canvas-recorder-lib/src/glib/path-shape-splitter";
import {
  interpolateNumbers,
  Keyframe,
} from "canvas-recorder-lib/src/interpolate";
import {
  MakeShowableInParallel,
  Showable,
} from "canvas-recorder-lib/src/showable";

import { DEFAULT_POST_ROLL_MS, titleFont } from "./shared.ts";

/** The "Outline Slide Template" slide. */
export function outlineSlideTemplate(): Showable {
  const scene = new MakeShowableInParallel("Outline Slide Template");

  const LEFT_MARGIN = 0.5;
  const RIGHT_MARGIN = 0.4;
  const BULLET_GAP = 0.18; // extra vertical gap between consecutive bullets

  /**
   * Formatting for each outline level.
   * Level 0 is the top-level bullet, level 2 is the most indented.
   * `indent` is added to LEFT_MARGIN.
   * `bullet` is prepended to the text; use characters known to exist in the line font.
   */
  const outlineFormatByLevel: readonly {
    readonly font: Font;
    readonly indent: number;
    readonly bullet: string;
  }[] = [
    { font: makeLineFont(0.44), indent: 0.0, bullet: "• " },
    { font: makeLineFont(0.33), indent: 0.9, bullet: "- " },
    { font: makeLineFont(0.25), indent: 1.8, bullet: "* " },
  ];

  const bulletContent: readonly {
    level: number;
    text: string;
    timeAfterMs?: number;
  }[] = [
    { level: 0, text: "Canvas Recorder Features" },
    {
      level: 1,
      text: "Strokable vector fonts: line, Futura L, cursive",
      timeAfterMs: 500,
    },
    { level: 1, text: "Keyframe-based animation schedules" },
    {
      level: 2,
      text: "Per-segment easing: ease, easeIn, easeOut, easeAndBack",
    },
    {
      level: 2,
      text: "Custom keyframes with per-segment easing",
      timeAfterMs: 5000,
    },
    { level: 0, text: "Development Tools" },
    { level: 1, text: "Live preview with play/pause and chapter navigation" },
    { level: 1, text: "Schedule editor with drag handles" },
    { level: 2, text: "Editable per-object keyframe data" },
  ];

  let startTime = 500;
  const handwritingSchedule: Keyframe<number>[] = [];
  bulletContent.forEach((content, index) => {
    handwritingSchedule.push({ time: startTime, value: index });
    const drawDuration = 750;
    startTime += drawDuration;
    handwritingSchedule.push({ time: startTime, value: index + 1 });
    const pauseAfter = content.timeAfterMs ?? 1000;
    startTime += pauseAfter;
  });

  // Title — align(16, "center") places the text centered on the 16-wide canvas.
  // No translation needed: font.top = -1.25*mHeight so the first baseline lands at
  // +1.25*mHeight, putting letter tops at +0.25*mHeight (just inside the canvas edge).
  const titleLaidOut = (() => {
    const layout = new ParagraphLayout(titleFont);
    layout.addText(scene.description);
    return layout.align(16, "center");
  })();
  const titlePath = titleLaidOut.singlePathShape().canvasPath;

  // Pre-compute bullet paths — static slide, no per-frame recalculation needed.
  // y tracks the top edge of each bullet block; y += laidOut.height advances past it.
  let y = titleLaidOut.height + 0.2;
  const bulletPaths: { splitter: PathShapeSplitter; level: number }[] = [];
  for (const { level, text } of bulletContent) {
    const fmt = outlineFormatByLevel[level];
    const x = LEFT_MARGIN + fmt.indent;
    const availableWidth = 16 - x - RIGHT_MARGIN;
    const layout = new ParagraphLayout(fmt.font);
    layout.addText(fmt.bullet + text);
    const laidOut = layout.align(availableWidth, "left");
    bulletPaths.push({
      splitter: PathShapeSplitter.create(
        laidOut.singlePathShape().translate(x, y),
      ),
      level,
    });
    y += laidOut.height + BULLET_GAP;
  }

  const levelColors = ["white", "#cccccc", "#aaaaaa"] as const;

  const showable: Showable = {
    description: "Outline slide",
    duration: handwritingSchedule.at(-1)!.time + DEFAULT_POST_ROLL_MS,
    show({ context, timeInMs }) {
      context.lineCap = "round";
      context.lineJoin = "round";

      context.lineWidth = titleFont.strokeWidth;
      context.strokeStyle = myRainbow.violet;
      context.stroke(titlePath);

      const totalProgress = interpolateNumbers(timeInMs, handwritingSchedule);
      //      for (const { path, level } of bulletPaths) {
      bulletPaths.forEach(({ splitter, level }, index) => {
        const localProgress = totalProgress - index;
        if (localProgress <= 0) {
          // This is more than an optimization.
          // If you call Splitter.trim() and request a zero length segment you will get a single point.
          // In this context, every line would be a point, instead of completely blank, before we started to display it.
          return;
        }
        const fmt = outlineFormatByLevel[level];
        context.lineWidth = fmt.font.strokeWidth;
        context.strokeStyle = levelColors[level];
        const pathShape = splitter.trim(0, localProgress * splitter.length);
        context.stroke(pathShape.canvasPath);
      });
    },
  };

  scene.add(showable);
  return scene.build();
}
