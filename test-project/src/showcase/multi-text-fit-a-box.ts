import { Showable } from "canvas-recorder-lib/src/showable";

import {
  bottomNote,
  demo,
  panel,
  slide,
  Stack,
  title,
} from "./multi-text-manual.ts";

/** The "Multi Text: Fit a Box" slide. */
export function multiTextFitABox(): Showable {
  const stack = new Stack(1.05, { x: 0.5, width: 15 });
  stack.note(
    "Set BOTH modes to scale and you get the familiar “fit inside this rectangle, keep the aspect ratio” behavior — the same thing " +
      "panAndZoom() does with “meet”. The smaller of the two factors wins, since it is the only one that satisfies both constraints at once.",
  );
  const top = stack.y + 0.15;
  const BOX_HEIGHT = 2.4;
  const FRACTION = { top: 0, middle: 0.5, bottom: 1 } as const;
  return slide("Multi Text: Fit a Box", [
    title("Multi Text: Fit a Box"),
    stack.parts,
    ...(["top", "middle", "bottom"] as const).map((textBaseline, index) => {
      const x = 0.7 + index * 5.2;
      return panel({
        label: `Baseline: ${textBaseline}`,
        labelX: x,
        labelWidth: 4.6,
        top,
        // Position moves with the anchor, which is what holds the FRAME
        // still while the text slides around inside it.  Note that the
        // orange dot moves too:  the dot is a property of the text, not of
        // the frame.
        make: (frameTop) =>
          demo({
            text: "Fit me",
            x,
            y: frameTop + FRACTION[textBaseline] * BOX_HEIGHT,
            width: 4.6,
            height: BOX_HEIGHT,
            size: 0.5,
            anchorX: "left",
            textBaseline,
            widthMode: "scale",
            heightMode: "scale",
          }),
      });
    }),
    bottomNote(
      "The text is wide and short compared to its frame, so the WIDTH binds and all the slack is vertical. Baseline decides where that slack goes — " +
        "and notice the dot moves with it, because the dot belongs to the text, not to the frame. " +
        "This is the mode galaga.ts hand-rolled: a letterbox strip is just a very tall, very narrow frame.",
      { color: "#6f6f6f", size: 0.25 },
    ),
  ]);
}
