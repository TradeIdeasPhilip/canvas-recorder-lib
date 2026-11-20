import { canvasRecorder } from "../../lib/main-control.ts";
import { makeLineFont } from "../glib/line-font.ts";
import { ParagraphLayout } from "../glib/paragraph-layout.ts";

const errorFont = makeLineFont(1);

/**
 * Write text on the screen where it is big and easy to see, even without knowing what else is there.
 * @param context Where to draw.
 * @param text What to draw.
 * Can include " " and "\n" for optional and forced line breaks.
 */
export function showError(context: CanvasRenderingContext2D, text: string) {
  const font = errorFont;
  /** Space on the left and right. */
  const margin = 0.25;
  // Read the width every time:  it can change at any time.
  const width = Math.max(1, canvasRecorder.width - 2 * margin);
  const path = ParagraphLayout.singlePathShape({
    font,
    text,
    alignment: "center",
    width,
  })
    // Center on the canvas, not on the paragraph.
    .translate((canvasRecorder.width - width) / 2, 0).canvasPath;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = font.strokeWidth * 3;
  context.strokeStyle = "white";
  context.stroke(path);
  context.lineWidth = font.strokeWidth;
  context.strokeStyle = "red";
  context.stroke(path);
}
