import { Showable } from "canvas-recorder-lib/src/showable";

import {
  bottomNote,
  demo,
  makeNote,
  slide,
  Stack,
  title,
  withFrame,
} from "./multi-text-manual.ts";

/** The "Multi Text: Alignment is not Anchor" slide. */
export function multiTextAlignment(): Showable {
  const stack = new Stack(1.05, { x: 0.5, width: 15 });
  stack.note(
    "Alignment used to do two unrelated jobs. It now does exactly one: how ragged the lines are INSIDE the paragraph. " +
      "WHERE the paragraph sits is Anchor X and Baseline. Watch the orange dots — each column shares a single x.",
  );
  const top = stack.y + 0.1;
  return slide("Multi Text: Alignment is not Anchor", [
    title("Multi Text: Alignment is not Anchor"),
    stack.parts,
    makeNote({
      text: "Anchor X moves the text. (Alignment: left in all three.)",
      x: 0.5,
      y: top,
      width: 7,
      size: 0.26,
      color: "#c8c8c8",
    }).showable,
    ...(["left", "center", "right"] as const).map((anchorX, index) =>
      withFrame(
        demo({
          text: `Anchor X: ${anchorX}`,
          x: 4,
          y: top + 0.75 + index * 0.85,
          width: 3.4,
          size: 0.28,
          alignment: "left",
          anchorX,
        }),
      ),
    ),
    makeNote({
      text: "Alignment does not. (Anchor X: center in all three.)",
      x: 8.5,
      y: top,
      width: 7,
      size: 0.26,
      color: "#c8c8c8",
    }).showable,
    // A forced line break keeps every one of these exactly two lines tall, so
    // the only thing that varies is the raggedness.
    ...(["left", "center", "right"] as const).map((alignment, index) =>
      withFrame(
        demo({
          text: `Alignment: ${alignment}\nragged edge demo`,
          x: 12,
          y: top + 0.75 + index * 1.25,
          width: 3.6,
          size: 0.26,
          alignment,
          anchorX: "center",
        }),
      ),
    ),
    bottomNote(
      "Splitting these is what finally lets you ask for left-ragged lines in a box centered on a point. You could always fake that by " +
        "subtracting half the width from Position yourself, but it broke the moment the width animated. " +
        "Old videos are unaffected: Anchor X defaults to center, which is what Alignment’s default used to do.",
      { color: "#6f6f6f", size: 0.25 },
    ),
  ]);
}
