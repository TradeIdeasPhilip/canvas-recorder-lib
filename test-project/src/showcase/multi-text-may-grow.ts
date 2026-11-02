import { Showable } from "canvas-recorder-lib/src/showable";

import {
  bottomNote,
  demo,
  panel,
  slide,
  Stack,
  title,
} from "./multi-text-manual.ts";

/** The "Multi Text: May Grow" slide. */
export function multiTextMayGrow(): Showable {
  const stack = new Stack(1.05, { x: 0.5, width: 15 });
  stack.note(
    "A constraint can mean two different things, and this scalar is where you say which. “shrink or grow” makes the frame a target: " +
      "short text is scaled UP to fill it. “shrink only” makes it a limit: short text is left alone. Same word, same frame, both modes on scale.",
  );
  const top = stack.y + 0.2;
  const makeHi =
    (x: number, mayGrow: "shrink or grow" | "shrink only") => (y: number) =>
      demo({
        text: "Hi",
        x,
        y,
        width: 5.5,
        height: 1.8,
        size: 0.35,
        anchorX: "left",
        widthMode: "scale",
        heightMode: "scale",
        mayGrow,
      });
  return slide("Multi Text: May Grow", [
    title("Multi Text: May Grow"),
    stack.parts,
    panel({
      label: "shrink or grow (the default)",
      labelX: 0.6,
      labelWidth: 6.9,
      top,
      make: makeHi(0.6, "shrink or grow"),
    }),
    panel({
      label: "shrink only",
      labelX: 8.6,
      labelWidth: 6.9,
      top,
      make: makeHi(8.6, "shrink only"),
    }),
    bottomNote(
      "Both of these also set Height Mode, and that is not decoration. Scaling is uniform, so hitting a width target multiplies the HEIGHT by the same factor. " +
        "A short word in a wide frame, with only the width constrained, grows absurdly tall — doing exactly what it was asked, right off the bottom of the slide.\n\n" +
        "Wrapping overrules this scalar entirely: when Width Mode wraps, growing would push the text back past the width it was just wrapped to, so scaling may only shrink.",
      { color: "#a88b4a", size: 0.25 },
    ),
  ]);
}
