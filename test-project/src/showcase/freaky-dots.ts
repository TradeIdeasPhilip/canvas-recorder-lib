import { ParagraphLayout } from "canvas-recorder-lib/src/glib/paragraph-layout";
import { Point } from "canvas-recorder-lib/src/glib/path-shape";
import {
  interpolatePoints,
  Keyframe,
} from "canvas-recorder-lib/src/interpolate";
import { Showable } from "canvas-recorder-lib/src/showable";
import { Random } from "canvas-recorder-lib/src/utility";
import { FULL_CIRCLE } from "phil-lib/misc";

import { DEFAULT_SLIDE_DURATION_MS, titleFont } from "./shared.ts";

// ── Pixel Perfect Freaky Dot Patterns ────────────────────────────────────────
// NOT READY FOR PRIME TIME
// Multiple Issues.  Doesn't look right.  Takes way too much CPU.
//
// Three Path2D layers of randomly-placed ellipses, built once at load time.
// Two layers oscillate with tiny sine-wave rotations around a user-editable
// center point.  Inspired by the SVG "dalmatian filter" experiments but
// vector-accurate and free of GPU-memory blowup.
// https://youtu.be/iOYEg6xP9jg?si=eAqzZdsbjsJE6q13
// https://youtu.be/cGEIfy_wQ2Y?si=BQQpKzpysi--zz73
/** The "Pixel Perfect Freaky Dot Patterns" slide. */
export function freakyDotPatterns(): Showable {
  // ── Dot geometry (built once) ──
  const rng = Random.create("[42,17,99,7]");
  const DOT_COUNT = 1200; // per layer
  const MARGIN = 0.5; // extend beyond canvas edges to hide gaps during rotation

  function buildLayer(): Path2D {
    const path = new Path2D();
    for (let i = 0; i < DOT_COUNT; i++) {
      const cx = rng() * (16 + 2 * MARGIN) - MARGIN;
      const cy = rng() * (9 + 2 * MARGIN) - MARGIN;
      const rx = 0.04 + rng() * 0.07; // 0.04 – 0.11
      const ry = 0.04 + rng() * 0.07;
      const rot = rng() * Math.PI;
      path.ellipse(cx, cy, rx, ry, rot, 0, FULL_CIRCLE);
    }
    return path;
  }

  const fixedLayer = buildLayer();
  const rotLayer1 = buildLayer();
  const rotLayer2 = buildLayer();

  // ── Oscillator parameters (matching the original SVG version) ──
  // extreme1 and extreme2 are in degrees; converted to radians here.
  function makeOscillator(
    extreme1Deg: number,
    extreme2Deg: number,
    periodMs: number,
  ) {
    const center = ((extreme1Deg + extreme2Deg) / 2) * (Math.PI / 180);
    const amplitude =
      (extreme1Deg - (extreme1Deg + extreme2Deg) / 2) * (Math.PI / 180);
    return (globalTime: number) =>
      Math.sin((globalTime / periodMs) * FULL_CIRCLE) * amplitude + center;
  }
  const osc1 = makeOscillator(0.5, 1.5, 15_000); // +0.5° ↔ +1.5°
  const osc2 = makeOscillator(-0.5, -1.5, 13_081); // -0.5° ↔ -1.5°

  // ── Schedule: rotation center (user-editable) ──
  const rotCenterSchedule: Keyframe<Point>[] = [
    { time: 0, value: { x: 8, y: 4.5 } }, // canvas center by default
  ];

  const titlePath = ParagraphLayout.singlePathShape({
    text: "Pixel Perfect Freaky Dot Patterns",
    font: titleFont,
    alignment: "center",
    width: 16,
  }).canvasPath;

  const freakyDots: Showable = {
    description: "Pixel Perfect Freaky Dot Patterns",
    duration: DEFAULT_SLIDE_DURATION_MS,
    schedules: [
      {
        description: "Rotation Center",
        type: "point",
        schedule: rotCenterSchedule,
      },
    ],
    show({ context, globalTime, timeInMs }) {
      // Background
      context.fillStyle = "black";
      context.fillRect(0, 0, 16, 9);

      // Title
      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = titleFont.strokeWidth;
      context.strokeStyle = "white";
      context.stroke(titlePath);

      const center = interpolatePoints(timeInMs, rotCenterSchedule);

      // Helper: apply a rotation around `center`, fill a layer, restore.
      function fillRotated(layer: Path2D, angle: number, style: string) {
        context.save();
        context.translate(center.x, center.y);
        context.rotate(angle);
        context.translate(-center.x, -center.y);
        context.fillStyle = style;
        context.fill(layer);
        context.restore();
      }

      // Fixed layer (no rotation)
      context.fillStyle = "rgba(255,255,255,0.45)";
      context.fill(fixedLayer);

      // Oscillating layers
      fillRotated(rotLayer1, osc1(globalTime), "rgba(255,255,255,0.30)");
      fillRotated(rotLayer2, osc2(globalTime), "rgba(255,255,255,0.20)");
    },
  };
  return freakyDots;
}
