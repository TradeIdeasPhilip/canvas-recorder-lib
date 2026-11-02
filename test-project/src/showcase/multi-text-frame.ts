import { Showable } from "canvas-recorder-lib/src/showable";

import {
  bottomNote,
  demo,
  SHORT,
  slide,
  Stack,
  title,
  withFrame,
} from "./multi-text-manual.ts";

/** The "Multi Text: The Frame" slide. */
export function multiTextFrame(): Showable {
  const stack = new Stack(1.05, { x: 0.5, width: 15 });
  stack.note(
    "Every Multi Text is anchored to one point — the orange dot, which is the Position schedule. " +
      "Anchor X and Baseline choose which part of the text lands on that dot; here it is the center of the top edge. " +
      "Width and Height describe a frame (dashed). They never move the text. They only say how much room it is allowed.",
  );
  stack.note(
    "What that frame MEANS is decided by two scalars, Width Mode and Height Mode. Those are the next two slides.",
  );
  return slide("Multi Text: The Frame", [
    title("Multi Text: The Frame"),
    stack.parts,
    withFrame(
      demo({ text: SHORT, x: 8, y: stack.y + 0.7, width: 7, size: 0.45 }),
    ),
    bottomNote(
      "Width Mode: wrap   ·   Height Mode: unbounded   ·   both are the defaults, and this is exactly how Multi Text has always behaved.",
      { color: "#6f6f6f" },
    ),
  ]);
}
