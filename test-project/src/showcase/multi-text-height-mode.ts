import { Showable } from "canvas-recorder-lib/src/showable";

import { HEIGHT_MODES } from "canvas-recorder-lib/src/slide-components/multi-text";
import {
  bottomNote,
  demo,
  panel,
  PARAGRAPH,
  slide,
  Stack,
  title,
} from "./multi-text-manual.ts";

/** The "Multi Text: Height Mode" slide. */
export function multiTextHeightMode(): Showable {
  const stack = new Stack(1.05, { x: 0.5, width: 15 });
  stack.note(
    "Height is not the mirror image of Width. ParagraphLayout TAKES a width and RETURNS a height, so a width can be satisfied " +
      "before layout runs, while a height can only be checked afterwards. Same paragraph, same frame, three answers:",
  );
  const top = stack.y + 0.15;
  const columns = [0.6, 5.8, 11.0];
  const makeDemo =
    (x: number, heightMode: (typeof HEIGHT_MODES)[number]) => (y: number) =>
      demo({
        text: PARAGRAPH,
        x,
        y,
        width: 4.4,
        height: 1.4,
        size: 0.2,
        anchorX: "left",
        heightMode,
      });
  return slide("Multi Text: Height Mode", [
    title("Multi Text: Height Mode"),
    stack.parts,
    panel({
      label: "unbounded",
      labelX: columns[0],
      labelWidth: 4.4,
      top,
      make: makeDemo(columns[0], "unbounded"),
    }),
    panel({
      label: "scale",
      labelX: columns[1],
      labelWidth: 4.4,
      top,
      make: makeDemo(columns[1], "scale"),
    }),
    panel({
      label: "shrink font",
      labelX: columns[2],
      labelWidth: 4.4,
      top,
      make: makeDemo(columns[2], "shrink font"),
    }),
    bottomNote(
      "scale keeps the line breaks, so the block stays the same SHAPE and ends up far smaller than it needed to be, with slack left and right. " +
        "shrink font is the only one that fills the frame: a smaller font fits more words per line, so the paragraph gets wider and shorter. " +
        "Changing shape is the whole trick — and it is the expensive one, searching at about ten layouts per frame.",
      { color: "#6f6f6f", size: 0.25 },
    ),
  ]);
}
