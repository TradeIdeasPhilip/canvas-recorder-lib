import { makeLineFont } from "canvas-recorder-lib/src/glib/line-font";
import { myRainbow } from "canvas-recorder-lib/src/glib/my-rainbow";
import { ParagraphLayout } from "canvas-recorder-lib/src/glib/paragraph-layout";
import { PathShapeSplitter } from "canvas-recorder-lib/src/glib/path-shape-splitter";
import {
  ease,
  interpolateNumbers,
  Keyframe,
} from "canvas-recorder-lib/src/interpolate";
import {
  MakeShowableInParallel,
  Showable,
} from "canvas-recorder-lib/src/showable";

import { titleFont } from "./shared.ts";

/** The "Dots, Dashes, and the PathSplitter" slide. */
export function dotsAndDashes(): Showable {
  const scene = new MakeShowableInParallel(
    "Dots, Dashes, and the PathSplitter",
  );
  {
    const pathShape = ParagraphLayout.singlePathShape({
      text: scene.description,
      font: titleFont,
      alignment: "center",
      width: 16,
    });
    const path = pathShape.canvasPath;
    const showable: Showable = {
      description: scene.description,
      duration: 0,
      show({ context }) {
        {
          context.lineCap = "round";
          context.lineJoin = "round";
          context.lineWidth = 0.07;
          context.strokeStyle = "yellow";
          context.stroke(path);
        }
      },
    };
    scene.add(showable);
  }
  {
    // ── Fonts ─────────────────────────────────────────────────────────────
    const codeFont = makeLineFont(0.28);
    const loveFont = makeLineFont(0.9); // "title sized or larger" for LOVE ♡

    // ── Dot/dash patterns: 5 examples cycling through with transitions ─────
    const HOLD_MS = 3_000;
    const TRANS_MS = 1_000;
    const patterns: { draw: number; gap: number }[] = [
      { draw: 0, gap: 2 }, // "ideal" dotted line
      { draw: 0, gap: 3 }, // bigger gap
      { draw: 1, gap: 3 }, // rounded rectangles
      { draw: 1, gap: 1 }, // barely touching
      { draw: 1, gap: 0.5 }, // overlapping
    ];
    const drawFactorSchedule: Keyframe<number>[] = [];
    const gapFactorSchedule: Keyframe<number>[] = [];
    {
      let t = 0;
      patterns.forEach((p, i) => {
        if (i === 0) {
          drawFactorSchedule.push({ time: t, value: p.draw });
          gapFactorSchedule.push({ time: t, value: p.gap });
        }
        t += HOLD_MS;
        if (i < patterns.length - 1) {
          const next = patterns[i + 1];
          drawFactorSchedule.push({ time: t, value: p.draw, easeAfter: ease });
          gapFactorSchedule.push({ time: t, value: p.gap, easeAfter: ease });
          t += TRANS_MS;
          drawFactorSchedule.push({ time: t, value: next.draw });
          gapFactorSchedule.push({ time: t, value: next.gap });
        }
      });
    }
    /**
     * Audio length plus 500 ms padding on each side.
     */
    const TOTAL_DURATION = 28096.35 + 1000;

    // ── Handwriting schedule (loops for the full slide duration) ──────────
    const PAUSE_MS = 500; // brief pause before and after each write
    const ANIM_MS = 4_000; // time to write "LOVE ♡" once
    const LOOP_MS = PAUSE_MS + ANIM_MS + PAUSE_MS;
    const handwritingSchedule: Keyframe<number>[] = [];
    for (let t = 0; t < TOTAL_DURATION; t += LOOP_MS) {
      handwritingSchedule.push({
        time: t + PAUSE_MS,
        value: 0,
        easeAfter: ease,
      });
      handwritingSchedule.push({ time: t + PAUSE_MS + ANIM_MS, value: 1 });
      const cycleEnd = t + LOOP_MS;
      if (cycleEnd < TOTAL_DURATION) {
        // Hold at 1 until 1 ms before the next cycle, then jump to 0.
        handwritingSchedule.push({ time: cycleEnd - 1, value: 1 });
        handwritingSchedule.push({ time: cycleEnd, value: 0 });
      }
    }

    // ── Layout constants ──────────────────────────────────────────────────
    const TITLE_Y = 1.3; // approx bottom of title text
    const LEFT_X = 0.25;
    const DIVIDER_X = 7.25; // vertical center divider
    const RIGHT_X = 7.5;
    const LEFT_COL_W = 6.75; // left column content width
    const RIGHT_COL_W = 8.0; // right column content width (to canvas edge)
    const LEFT_DIV_Y = 5.0; // horizontal divider splitting the left demos
    // Left-side LOVE ♡ positions (translate top-of-text, i.e. y=0 of PathShape)
    const LOVE_Y_TOP = 2.95;
    const LOVE_Y_BOT = 6.75;
    // Right-side section positions
    const CODE_Y = TITLE_Y + 0.05;
    const ROUND_LABEL_Y = 2.85;
    const ROUND_DEMO_TOP = 3.4;
    const ROUND_DEMO_BOT = 4.75;
    const SQUARE_LABEL_Y = 4.9;
    const SQUARE_DEMO_TOP = 5.45;
    const SQUARE_DEMO_BOT = 6.8;
    const BUTT_LABEL_Y = 6.95;
    const BUTT_DEMO_TOP = 7.5;
    const BUTT_DEMO_BOT = 8.85;
    const BASE_LINE_WIDTH = 0.04;

    // ── Left-side text: "LOVE ♡" ───────────────────────────────────────────
    // PathShape (not Path2D) so we can pass it to PathShapeSplitter.create().
    const lovePath = ParagraphLayout.singlePathShape({
      text: "LOVE ♡",
      font: loveFont,
      alignment: "center",
      width: LEFT_COL_W,
    });
    const loveSplitter = PathShapeSplitter.create(lovePath);
    // The longest moveTo-separated segment — used as the setLineDash draw value.
    // setLineDash() restarts the dash phase at each moveTo(), so animating
    // lineDashOffset reveals/hides ALL strokes simultaneously (not left-to-right).
    // PathShapeSplitter measures the whole path continuously, giving true
    // left-to-right handwriting.  The side-by-side shows this difference.
    const longestSegmentLength = Math.max(
      ...lovePath.splitOnMove().map((seg) => seg.getLength()),
    );

    // ── Pre-computed static canvas paths ─────────────────────────────────
    const loveSetLineDashPath = lovePath.translate(
      LEFT_X,
      LOVE_Y_TOP,
    ).canvasPath;
    const leftHeaderTopPath = ParagraphLayout.singlePathShape({
      text: "Using setLineDash() & lineDashOffset:",
      font: codeFont,
      alignment: "left",
      width: LEFT_COL_W,
    }).translate(LEFT_X, TITLE_Y + 0.05).canvasPath;
    const leftHeaderBotPath = ParagraphLayout.singlePathShape({
      text: "Using PathShapeSplitter.trim():",
      font: codeFont,
      alignment: "left",
      width: LEFT_COL_W,
    }).translate(LEFT_X, LEFT_DIV_Y + 0.08).canvasPath;
    // trim(0, 0) draws a dot at the start rather than nothing.
    // In the Outline Slide Template, the guard `if (localProgress <= 0) return;`
    // prevents this initial dot.  Here we skip the guard to keep the code simple.
    const roundLabelPath = ParagraphLayout.singlePathShape({
      text: "lineCap: round \u2014 dash lengths exclude the cap radius",
      font: codeFont,
      alignment: "left",
      width: RIGHT_COL_W,
    }).translate(RIGHT_X, ROUND_LABEL_Y).canvasPath;
    const squareLabelPath = ParagraphLayout.singlePathShape({
      text: "lineCap: square \u2014 caps extend half a lineWidth past each end",
      font: codeFont,
      alignment: "left",
      width: RIGHT_COL_W,
    }).translate(RIGHT_X, SQUARE_LABEL_Y).canvasPath;
    const buttLabelPath = ParagraphLayout.singlePathShape({
      text: "lineCap: butt \u2014 no cap is added beyond each endpoint",
      font: codeFont,
      alignment: "left",
      width: RIGHT_COL_W,
    }).translate(RIGHT_X, BUTT_LABEL_Y).canvasPath;

    const showable: Showable = {
      description: "Dashes demo",
      duration: TOTAL_DURATION,
      schedules: [
        {
          description: "Draw Length Factor",
          type: "number",
          schedule: drawFactorSchedule,
        },
        {
          description: "Gap Length Factor",
          type: "number",
          schedule: gapFactorSchedule,
        },
      ],
      show({ context, timeInMs }) {
        const drawFactor = interpolateNumbers(timeInMs, drawFactorSchedule);
        const gapFactor = interpolateNumbers(timeInMs, gapFactorSchedule);
        const handwriting = interpolateNumbers(timeInMs, handwritingSchedule);

        context.lineCap = "round";
        context.lineJoin = "round";

        // ── Dividers ──────────────────────────────────────────────────────
        context.lineWidth = 0.02;
        context.strokeStyle = "rgba(255,255,255,0.2)";
        context.setLineDash([0.1, 0.1]);
        context.lineCap = "butt";
        context.beginPath();
        context.moveTo(DIVIDER_X, TITLE_Y);
        context.lineTo(DIVIDER_X, 9);
        context.stroke();
        context.beginPath();
        context.moveTo(LEFT_X, LEFT_DIV_Y);
        context.lineTo(DIVIDER_X - 0.1, LEFT_DIV_Y);
        context.stroke();
        context.setLineDash([]);
        context.lineCap = "round";

        // ── LEFT TOP: setLineDash + lineDashOffset ────────────────────────
        // lineDashOffset from longestSegmentLength → 0 (gap phase → draw phase).
        // Because setLineDash restarts at each moveTo(), all strokes reveal
        // simultaneously — the demo shows this limitation.
        //
        // Note:  setLineDash() restarts at each moveTo().
        const dashOffset = longestSegmentLength * (1 - handwriting);
        {
          context.lineWidth = codeFont.strokeWidth;
          context.strokeStyle = "rgba(255,255,255,0.5)";
          context.stroke(leftHeaderTopPath);

          // Live values
          const liveCodePath = ParagraphLayout.singlePathShape({
            text:
              `context.setLineDash([${longestSegmentLength.toFixed(2)}]);\n` +
              `context.lineDashOffset = ${dashOffset.toFixed(2)};`,
            font: codeFont,
            alignment: "left",
            width: RIGHT_COL_W,
          }).translate(LEFT_X, TITLE_Y + 0.55).canvasPath;
          context.strokeStyle = myRainbow.myBlue;
          context.stroke(liveCodePath);

          context.lineWidth = loveFont.strokeWidth;
          context.strokeStyle = "lime";
          context.setLineDash([longestSegmentLength]);
          context.lineDashOffset = dashOffset;
          context.stroke(loveSetLineDashPath);
          context.setLineDash([]);
        }

        // ── LEFT BOTTOM: PathShapeSplitter ────────────────────────────────
        {
          const trimLength = handwriting * loveSplitter.length;

          context.lineWidth = codeFont.strokeWidth;
          context.strokeStyle = "rgba(255,255,255,0.5)";
          context.stroke(leftHeaderBotPath);

          const liveCodePath = ParagraphLayout.singlePathShape({
            text:
              `splitter.trim(0, ${trimLength.toFixed(2)});\n` +
              `// splitter.length = ${loveSplitter.length.toFixed(2)}`,
            font: codeFont,
            alignment: "left",
            width: LEFT_COL_W,
          }).translate(LEFT_X, LEFT_DIV_Y + 0.58).canvasPath;
          context.strokeStyle = myRainbow.myBlue;
          context.stroke(liveCodePath);

          // trim() works on the untranslated lovePath — apply the same
          // translation via a canvas transform rather than PathShape.translate().
          const trimmed = loveSplitter.trim(0, trimLength);
          context.lineWidth = loveFont.strokeWidth;
          context.strokeStyle = "lime";
          context.save();
          context.translate(LEFT_X, LOVE_Y_BOT);
          context.stroke(trimmed.canvasPath);
          context.restore();
        }

        // ── RIGHT: lineCap comparison with animated dash pattern ──────────
        // The dash lengths do NOT include the size of the lineCap.
        // Setting drawLength=0 gives circles (round), squares (square), or
        // nothing (butt).  Three diagonal lines per section show the effect
        // at lineWidths of 1×, 3×, and 9× BASE_LINE_WIDTH.
        {
          // Live code display
          const liveCodePath = ParagraphLayout.singlePathShape({
            text:
              `const drawLength = lineWidth * ${drawFactor.toFixed(2)};\n` +
              `const gapLength = lineWidth * ${gapFactor.toFixed(2)};\n` +
              `context.setLineDash([drawLength, gapLength]);`,
            font: codeFont,
            alignment: "left",
            width: Infinity,
          }).translate(RIGHT_X, CODE_Y).canvasPath;
          context.lineWidth = codeFont.strokeWidth;
          context.strokeStyle = myRainbow.myBlue;
          context.stroke(liveCodePath);

          context.lineWidth = codeFont.strokeWidth;
          context.strokeStyle = "rgba(255,255,255,0.5)";
          context.stroke(roundLabelPath);
          context.stroke(squareLabelPath);
          context.stroke(buttLabelPath);

          // Helper: draw three diagonal lines in a demo box.
          // Line 1 (1× width): (left, bot) → (center, top)
          // Line 2 (3× width): (left+w/4, bot) → (center+w/4, top)
          // Line 3 (9× width): (center, bot) → (right, top)
          const drawDiagonals = (demoTop: number, demoBot: number) => {
            const left = RIGHT_X;
            const right = RIGHT_X + RIGHT_COL_W;
            const center = (left + right) / 2;
            const w = right - left;
            for (const scale of [1, 3, 9]) {
              const lw = BASE_LINE_WIDTH * scale;
              context.lineWidth = lw;
              context.setLineDash([lw * drawFactor, lw * gapFactor]);
              context.beginPath();
              if (scale === 1) {
                context.moveTo(left, demoBot);
                context.lineTo(center, demoTop);
              } else if (scale === 3) {
                context.moveTo(left + w / 4, demoBot);
                context.lineTo(center + w / 4, demoTop);
              } else {
                context.moveTo(center, demoBot);
                context.lineTo(right, demoTop);
              }
              context.stroke();
            }
            context.setLineDash([]);
          };

          // Slowly move each dot or dash up and to the right.
          context.lineDashOffset = -timeInMs / 5000;

          context.strokeStyle = myRainbow.orange;
          context.lineCap = "round";
          drawDiagonals(ROUND_DEMO_TOP, ROUND_DEMO_BOT);

          context.strokeStyle = myRainbow.cyan;
          context.lineCap = "square";
          drawDiagonals(SQUARE_DEMO_TOP, SQUARE_DEMO_BOT);

          context.strokeStyle = myRainbow.green;
          context.lineCap = "butt";
          drawDiagonals(BUTT_DEMO_TOP, BUTT_DEMO_BOT);

          // Clean up:
          context.lineDashOffset = 0;
          context.setLineDash([]);
        }
      },
    };
    scene.add(showable);
  }
  return scene.build();
}
