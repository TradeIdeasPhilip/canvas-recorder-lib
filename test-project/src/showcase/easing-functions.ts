import { makeLineFont } from "canvas-recorder-lib/src/glib/line-font";
import { myRainbow } from "canvas-recorder-lib/src/glib/my-rainbow";
import { ParagraphLayout } from "canvas-recorder-lib/src/glib/paragraph-layout";
import { Point } from "canvas-recorder-lib/src/glib/path-shape";
import {
  ease,
  easeAndBack,
  easeIn,
  easeOut,
  interpolateNumbers,
  interpolatePoints,
  Keyframe,
} from "canvas-recorder-lib/src/interpolate";
import {
  MakeShowableInParallel,
  Showable,
} from "canvas-recorder-lib/src/showable";

import { titleFont } from "./shared.ts";

/** The "Easing Functions" slide. */
export function easingFunctions(): Showable {
  const scene = new MakeShowableInParallel("Easing Functions");
  {
    const titlePath = ParagraphLayout.singlePathShape({
      text: scene.description,
      font: titleFont,
      alignment: "center",
      width: 16,
    }).canvasPath;
    const showable: Showable = {
      description: scene.description,
      duration: 0,
      show({ context }) {
        context.lineCap = "round";
        context.lineJoin = "round";
        context.lineWidth = 0.07;
        context.strokeStyle = myRainbow.violet;
        context.stroke(titlePath);
      },
    };
    scene.add(showable);
  }
  {
    const REPEAT_COUNT = 3;
    const HOLD_MS = 1_000;
    const RACE_MS = 10_000;
    const CYCLE_MS = HOLD_MS + RACE_MS + HOLD_MS;

    // 2-entry schedule: holds at 0 before t=HOLD_MS, linear to 1, holds at 1 after
    const rawProgressSchedule: Keyframe<number>[] = [
      { time: HOLD_MS, value: 0 },
      { time: HOLD_MS + RACE_MS, value: 1 },
    ];

    // interpolateNumbers() row uses its own schedule — overshoots and comes back
    const customSchedule: Keyframe<number>[] = [
      { time: HOLD_MS, value: 0 },
      { time: HOLD_MS + RACE_MS * 0.45, value: 1.35, easeAfter: easeOut },
      { time: HOLD_MS + RACE_MS * 0.7, value: 0.6, easeAfter: easeIn },
      { time: HOLD_MS + RACE_MS, value: 1 },
    ];

    type Row = {
      label: string;
      color: string;
      progress: (raw: number, cycleTime: number) => number;
    };

    const labelFont = makeLineFont(0.28);
    const numFont = makeLineFont(0.28);

    const TITLE_H = 1.0;
    const LANE_COUNT = 6;
    const LANE_H = (9 - TITLE_H) / LANE_COUNT;
    const CIRCLE_R = 0.32;
    const LEFT_MARGIN = 0.25;
    const MIN_TRACK_GAP = 1.0;

    // x is the editable track boundary; y is ignored
    const trackLeftSchedule: Keyframe<Point>[] = [
      { time: 0, value: { x: 4.075, y: 4.5 } },
    ];
    const trackRightSchedule: Keyframe<Point>[] = [
      { time: 0, value: { x: 14.6, y: 4.5 } },
    ];

    const colors = [
      myRainbow.yellow,
      myRainbow.orange,
      myRainbow.red,
      myRainbow.green,
      myRainbow.cyan,
      myRainbow.myBlue,
    ];

    const rows: Row[] = [
      {
        label: "linear",
        color: colors[0],
        progress: (raw) => raw,
      },
      {
        label: "easeIn(t)",
        color: colors[1],
        progress: (raw) => easeIn(raw),
      },
      {
        label: "ease(t)",
        color: colors[2],
        progress: (raw) => ease(raw),
      },
      {
        label: "easeOut(t)",
        color: colors[3],
        progress: (raw) => easeOut(raw),
      },
      {
        label: "easeAndBack(t)",
        color: colors[4],
        progress: (raw) => easeAndBack(raw),
      },
      {
        label: "interpolateNumbers()",
        color: colors[5],
        progress: (_raw, cycleTime) =>
          interpolateNumbers(cycleTime, customSchedule),
      },
    ];

    const showable: Showable = {
      description: "Easing race",
      duration: REPEAT_COUNT * CYCLE_MS,
      schedules: [
        {
          description: "Start Line",
          type: "point",
          schedule: trackLeftSchedule,
        },
        {
          description: "Finish Line",
          type: "point",
          schedule: trackRightSchedule,
        },
      ],
      show({ context, timeInMs }) {
        const cycleTime = timeInMs % CYCLE_MS;
        const raw = interpolateNumbers(cycleTime, rawProgressSchedule);

        // Read editable track boundaries; clamp so they can't cross
        const rawLeft = interpolatePoints(0, trackLeftSchedule).x;
        const rawRight = interpolatePoints(0, trackRightSchedule).x;
        const trackLeft = Math.min(rawLeft, rawRight - MIN_TRACK_GAP);
        const trackRight = Math.max(rawRight, rawLeft + MIN_TRACK_GAP);
        const trackW = trackRight - trackLeft;

        // Lane dividers
        context.strokeStyle = "rgba(255,255,255,0.08)";
        context.lineWidth = 0.02;
        for (let i = 0; i <= LANE_COUNT; i++) {
          const y = TITLE_H + i * LANE_H;
          context.beginPath();
          context.moveTo(0, y);
          context.lineTo(16, y);
          context.stroke();
        }

        // Start and finish lines
        context.strokeStyle = "rgba(255,255,255,0.25)";
        context.lineWidth = 0.03;
        context.setLineDash([0.1, 0.1]);
        context.beginPath();
        context.moveTo(trackLeft, TITLE_H);
        context.lineTo(trackLeft, 9);
        context.stroke();
        context.beginPath();
        context.moveTo(trackRight, TITLE_H);
        context.lineTo(trackRight, 9);
        context.stroke();
        context.setLineDash([]);

        context.lineCap = "round";
        context.lineJoin = "round";

        // Labels — recomputed each frame so they reflow with trackLeft
        context.lineWidth = labelFont.strokeWidth;
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const cy = TITLE_H + (i + 0.5) * LANE_H;
          const labelPath = ParagraphLayout.singlePathShape({
            text: row.label,
            font: labelFont,
            alignment: "right",
            width: trackLeft - LEFT_MARGIN - 0.1,
          }).translate(LEFT_MARGIN, cy - labelFont.mHeight / 2).canvasPath;
          context.strokeStyle = row.color;
          context.stroke(labelPath);
        }

        // Racers + live numbers
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const cy = TITLE_H + (i + 0.5) * LANE_H;
          const p = row.progress(raw, cycleTime);
          const cx = trackLeft + p * trackW;

          // Circle
          context.beginPath();
          context.arc(cx, cy, CIRCLE_R, 0, Math.PI * 2);
          context.fillStyle = row.color;
          context.fill();

          // Live number — left edge hugs the finish line
          const numText = p.toFixed(3);
          const numPath = ParagraphLayout.singlePathShape({
            text: numText,
            font: numFont,
            alignment: "left",
            width: 2,
          }).translate(trackRight + 0.08, cy - numFont.mHeight / 2).canvasPath;
          context.lineWidth = numFont.strokeWidth;
          context.strokeStyle = row.color;
          context.stroke(numPath);
        }
      },
    };
    scene.add(showable);
  }
  return scene.build();
}
