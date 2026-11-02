import { Showable } from "canvas-recorder-lib/src/showable";

import {
  MultiTextComponent,
  TextFormatComponent,
} from "canvas-recorder-lib/src/slide-components/multi-text";
import {
  demo,
  SHORT,
  slide,
  Stack,
  title,
  withFrame,
} from "./multi-text-manual.ts";

//
// These are here to be looked at rather than to explain anything.  Keep them
// as a regression check, or delete the slide once it has served its purpose.
// Item 1 is the one that would catch a Multi Text change quietly altering
// every video that already exists.
/** The "Multi Text: Please Check" slide. */
export function multiTextPleaseCheck(): Showable {
  const LEFT = 0.5;
  const RIGHT = 8.4;
  const COLUMN = 7.1;
  const CHECK = { size: 0.25, color: "#c8c8c8", gap: 0.2 } as const;

  // Each column flows its own notes, and reserves room for the demo that
  // follows each one.  The reserved amounts are the only hand-measured
  // numbers on the slide; everything else stacks itself.
  const left = new Stack(1.0, { x: LEFT, width: COLUMN });
  left.note(
    "1. REGRESSION. Nothing set but Position and the words. Must look the way it always did: wrapped at Width 7.5, centered on the dot, nothing scaled.",
    CHECK,
  );
  const regressionY = left.y;
  left.skip(0.9);
  left.note(
    "2. STROKE WEIGHT. One word, scaled three ways. The pen scales with the letters, so the small one should look thin — not like a heavy font shrunk down.",
    CHECK,
  );
  const weightY = left.y;
  left.skip(1.35);
  left.note(
    "4. EMPTY TEXT. A Multi Text holding no words, set to scale both ways. Draws nothing, divides by nothing.",
    CHECK,
  );
  const emptyY = left.y;

  const right = new Stack(1.0, { x: RIGHT, width: COLUMN });
  right.note(
    "3. PER-SPAN SIZES. shrink font multiplies every format’s Font Size, so a big word stays bigger than a small one. All one size here would mean the multiplier is in the wrong place.",
    CHECK,
  );
  const perSpanY = right.y;
  right.skip(1.6);
  right.note(
    "5. JUSTIFY + UNBOUNDED does nothing whatsoever. Justify only stretches lines that were WRAPPED, and unbounded never wraps — a line you broke yourself with “\\n” is exempt by design. So this is identical to left, character for character. Worth disabling in the GUI rather than explaining.",
    CHECK,
  );
  const justifyY = right.y;

  const perSpan = new MultiTextComponent({
    position: { x: RIGHT, y: perSpanY },
    width: COLUMN,
    height: 1.4,
    anchorX: "left",
    heightMode: "shrink font",
  });
  perSpan.addFixed({
    child: new TextFormatComponent({
      name: "big",
      color: "#ff9a3c",
      size: 0.7,
    }),
  });
  perSpan.addFixed({
    child: new TextFormatComponent({
      name: "small",
      color: "#7fd1ff",
      size: 0.25,
    }),
  });
  perSpan.addText1(
    "⸨big⸩BIG ⸨small⸩and small, still in proportion after the whole paragraph was shrunk to fit its frame.",
  );

  return slide("Multi Text: Please Check", [
    title("Multi Text: Please Check"),
    left.parts,
    right.parts,
    withFrame(demo({ text: SHORT, x: 4.1, y: regressionY, size: 0.3 })),
    ...[2.0, 1.0, 0.45].map((width, index) =>
      withFrame(
        demo({
          text: "Weight",
          x: LEFT + index * 2.4,
          y: weightY,
          width,
          size: 0.5,
          anchorX: "left",
          widthMode: "scale",
        }),
      ),
    ),
    withFrame(
      demo({
        text: "",
        x: LEFT + 1,
        y: emptyY + 0.1,
        width: 3,
        height: 0.55,
        widthMode: "scale",
        heightMode: "scale",
      }),
    ),
    withFrame(perSpan),
    withFrame(
      demo({
        text: "Justify with\nno width at all",
        x: RIGHT,
        y: justifyY,
        size: 0.3,
        anchorX: "left",
        alignment: "justify",
        widthMode: "unbounded",
      }),
    ),
  ]);
}
