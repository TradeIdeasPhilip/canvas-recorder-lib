import { Showable } from "canvas-recorder-lib/src/showable";

import { ROTATIONS } from "canvas-recorder-lib/src/slide-components/multi-text";
import {
  bottomNote,
  demo,
  makeNote,
  slide,
  Stack,
  title,
  withFrame,
} from "./multi-text-manual.ts";

/** The "Multi Text: Rotation" slide. */
export function multiTextRotation(): Showable {
  // The letterbox strips beside a 16:10 video, as in galaga.ts.
  const STRIP = 0.8;
  const MARGIN = 0.08;
  const LEFT = 1.3;
  const stack = new Stack(1.05, { x: LEFT, width: 13.4 });
  stack.note(
    "Rotation turns the text and its frame a quarter turn at a time, about Position (the orange dot), which never moves. " +
      "Anchored center / middle, as these four are, each one turns in place.",
    { size: 0.25 },
  );
  stack.note(
    "Width and Height stay in the text’s OWN directions — Width runs along the lines — " +
      "so all four frames are Width 2.2 × Height 0.8, though two of them are tall on screen.",
    { size: 0.25 },
  );
  // One caption row and one demo row, so the four line up whatever the
  // captions say.
  const captionY = stack.y + 0.1;
  const COLUMN = 3.35;
  const OWN_WIDTH = 2.2;
  const demoTop = captionY + 0.7;
  const strip = (x: number, rotation: (typeof ROTATIONS)[number]) =>
    withFrame(
      demo({
        text: "Galaga",
        x: x + STRIP / 2,
        y: 4.5,
        width: 9 - 2 * MARGIN,
        height: STRIP - 2 * MARGIN,
        size: 0.5,
        widthMode: "scale",
        heightMode: "scale",
        mayGrow: "shrink or grow",
        anchorX: "center",
        textBaseline: "middle",
        rotation,
      }),
    );
  return slide("Multi Text: Rotation", [
    title("Multi Text: Rotation"),
    stack.parts,
    ...ROTATIONS.map((rotation, index) => {
      const x = LEFT + index * COLUMN;
      const caption = makeNote({
        text: rotation,
        x,
        y: captionY,
        width: COLUMN,
        size: 0.26,
        color: "#c8c8c8",
      });
      return [
        caption.showable,
        ...withFrame(
          demo({
            text: "Turn me",
            x: x + OWN_WIDTH / 2,
            // Room for the turned ones, which are OWN_WIDTH tall.
            y: demoTop + OWN_WIDTH / 2,
            width: OWN_WIDTH,
            height: 0.8,
            size: 0.5,
            widthMode: "scale",
            heightMode: "scale",
            anchorX: "center",
            textBaseline: "middle",
            rotation,
          }),
        ),
      ];
    }),
    strip(0, "90° counterclockwise"),
    strip(16 - STRIP, "90° clockwise"),
    bottomNote(
      "The strips at the far left and right are galaga.ts’s letterbox with no extra code: both modes scale, a frame the size of the strip, a quarter turn. " +
        "In the Visual Editor, the Text Frame panel does all this in screen terms.",
      { color: "#6f6f6f", size: 0.25, x: LEFT, width: 13.4 },
    ),
  ]);
}
