import { Showable } from "canvas-recorder-lib/src/showable";

import {
  bottomNote,
  demo,
  panel,
  SHORT,
  slide,
  Stack,
  title,
} from "./multi-text-manual.ts";

/** The "Multi Text: Width Mode" slide. */
export function multiTextWidthMode(): Showable {
  const stack = new Stack(1.05, { x: 0.5, width: 15 });
  stack.note(
    "Four answers to “the text is wider than the frame.” The first three use the same words and the same frame.",
  );
  const top = stack.y + 0.2;
  const ROW = 2.9;
  const columns = [0.8, 8.4];
  return slide("Multi Text: Width Mode", [
    title("Multi Text: Width Mode"),
    stack.parts,
    panel({
      label:
        "unbounded — Width is ignored. No wrapping, so only a “\\n” starts a new line.",
      labelX: columns[0],
      labelWidth: 6.9,
      top,
      make: (y) =>
        demo({
          text: SHORT,
          x: columns[0],
          y,
          width: 4.5,
          anchorX: "left",
          widthMode: "unbounded",
        }),
    }),
    panel({
      label: "wrap — the default. Width is a limit.",
      labelX: columns[1],
      labelWidth: 6.9,
      top,
      make: (y) =>
        demo({
          text: SHORT,
          x: columns[1],
          y,
          width: 4.5,
          anchorX: "left",
          widthMode: "wrap",
        }),
    }),
    panel({
      label:
        "scale — Width is a target. The finished block is scaled to hit it exactly.",
      labelX: columns[0],
      labelWidth: 6.9,
      top: top + ROW,
      make: (y) =>
        demo({
          text: SHORT,
          x: columns[0],
          y,
          width: 4.5,
          anchorX: "left",
          widthMode: "scale",
        }),
    }),
    panel({
      label:
        "wrap, then scale — wraps, and shrinks only if one word still won’t fit:",
      labelX: columns[1],
      labelWidth: 6.9,
      top: top + ROW,
      make: (y) =>
        demo({
          text: "Supercalifragilisticexpialidocious",
          x: columns[1],
          y,
          width: 4.5,
          anchorX: "left",
          widthMode: "wrap, then scale",
        }),
    }),
    bottomNote(
      "Read the bottom left carefully: “scale” does not wrap at all. It lays the text out unbounded, then shrinks that one long line until it is exactly Width wide. " +
        "Scaling never moves a line break — that is the difference between this and Height Mode’s “shrink font”.",
      { color: "#6f6f6f", size: 0.25 },
    ),
  ]);
}
