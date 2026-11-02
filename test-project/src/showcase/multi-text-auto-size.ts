import { Keyframe } from "canvas-recorder-lib/src/interpolate";
import { Showable } from "canvas-recorder-lib/src/showable";

import {
  MultiTextComponent,
  TextFormatComponent,
  TextSpanComponent,
} from "canvas-recorder-lib/src/slide-components/multi-text";
import { bottomNote, panel, slide, Stack, title } from "./multi-text-manual.ts";

/** The "Multi Text: Auto Size" slide. */
export function multiTextAutoSize(): Showable {
  // Content that grows over time, so the auto sizer has a moving target.
  const GROWING = [
    "Auto",
    "Auto sizing",
    "Auto sizing that runs",
    "Auto sizing that runs on every",
    "Auto sizing that runs on every single frame",
    "Auto sizing that runs on every single frame makes text breathe",
  ];
  const contentKeyframes: Keyframe<string>[] = GROWING.map((value, index) => ({
    time: index * 1_500,
    value,
  }));
  /**
   * What the live version settles on once the text reaches its longest.
   * Measured, not guessed:  run the component live at its worst case and
   * read Frozen Size back out of the editor.
   */
  const FROZEN_SIZE = 0.6857;
  function growingText(options: {
    x: number;
    y: number;
    autoSize: "live" | "frozen";
    frozenSize?: number;
  }): MultiTextComponent {
    const component = new MultiTextComponent({
      position: { x: options.x, y: options.y },
      width: 6.4,
      height: 2.2,
      heightMode: "scale",
      anchorX: "left",
      autoSize: options.autoSize,
      frozenSize: options.frozenSize,
    });
    component.addFixed({
      child: new TextFormatComponent({ name: "", color: "white", size: 0.5 }),
    });
    component.addFixed({
      child: new TextSpanComponent({ content: contentKeyframes, style: "" }),
    });
    return component;
  }
  const stack = new Stack(1.05, { x: 0.5, width: 15 });
  stack.note(
    "Freezing is not only about speed. If the CONTENT animates, a live size animates with it, and the text visibly breathes as words appear. " +
      "Both of these are Height Mode: scale, in the same frame, with the same growing text. Let it run.",
  );
  const top = stack.y + 0.2;
  return slide("Multi Text: Auto Size", [
    title("Multi Text: Auto Size"),
    stack.parts,
    panel({
      label: "Auto Size: live — resized on every frame",
      labelX: 0.7,
      labelWidth: 6.8,
      top,
      make: (y) => growingText({ x: 0.7, y, autoSize: "live" }),
    }),
    panel({
      label: "Auto Size: frozen — one size, chosen once",
      labelX: 8.5,
      labelWidth: 6.8,
      top,
      make: (y) =>
        growingText({ x: 8.5, y, autoSize: "frozen", frozenSize: FROZEN_SIZE }),
    }),
    bottomNote(
      "The frozen one is sized for the LONGEST line, so it starts a little small and is exactly right at the end. That is the trade: " +
        "a size that holds still, against a size that is always optimal.\n\n" +
        "Frozen Size is an ordinary number in the editor. Set it to 0 to bake it again from whatever is on screen at that moment. " +
        "That is what makes auto sizing a design-time tool — use it to find the size, then keep the number.",
      { color: "#6f6f6f", size: 0.25 },
    ),
  ]);
}
