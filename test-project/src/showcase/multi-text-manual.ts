import { makeLineFont } from "canvas-recorder-lib/src/glib/line-font";
import { myRainbow } from "canvas-recorder-lib/src/glib/my-rainbow";
import { ParagraphLayout } from "canvas-recorder-lib/src/glib/paragraph-layout";
import { Showable } from "canvas-recorder-lib/src/showable";
import { FULL_CIRCLE } from "phil-lib/misc";

import { ComponentWithFixedDuration } from "canvas-recorder-lib/src/slide-components/fixed-duration";
import {
  HEIGHT_MODES,
  MultiTextComponent,
  ROTATIONS,
  TextFormatComponent,
  WIDTH_MODES,
} from "canvas-recorder-lib/src/slide-components/multi-text";
import { DEFAULT_SLIDE_DURATION_MS, titleFont } from "./shared.ts";

/**
 * What the Multi Text manual's slides share.  Those slides are the multi-text-*.ts files.
 *
 * The slides are a user manual for the Multi Text component's frame and auto sizing properties.
 * Everything they describe is a real property you can find in the Visual Editor, so you can
 * open any of these slides, poke at the numbers, and watch what changes.
 * @module
 */

/**
 * Static explanatory text, stroked directly.  Deliberately *not* a Multi
 * Text component:  these slides are about looking at Multi Text components,
 * so the prose around them should be visibly something else.
 *
 * Returns the measured height as well, which is the whole point — see
 * {@link Stack}.
 */
export function makeNote(options: {
  text: string;
  x: number;
  y: number;
  width?: number;
  size?: number;
  color?: string;
  alignment?: "left" | "center" | "right" | "justify";
}): { showable: Showable; height: number } {
  const {
    text,
    x,
    y,
    width = 15,
    size = 0.28,
    color = "#9a9a9a",
    alignment = "left",
  } = options;
  const font = makeLineFont(size);
  const layout = new ParagraphLayout(font);
  layout.addText(text, font);
  const laidOut = layout.align(width, alignment);
  const path = laidOut.singlePathShape().translate(x, y).canvasPath;
  return {
    height: laidOut.height,
    showable: {
      description: "note",
      duration: 0,
      show({ context }) {
        context.lineCap = "round";
        context.lineJoin = "round";
        context.lineWidth = font.strokeWidth;
        context.strokeStyle = color;
        context.stroke(path);
      },
    },
  };
}

/**
 * Vertical flow for the explanatory text.
 *
 * Each note is placed below the one before it using its **measured** height.
 * Guessing those heights by hand is exactly how the first draft of these
 * slides ended up printing paragraphs on top of each other, so nothing here
 * hard codes a line count.
 */
export class Stack {
  #y: number;
  readonly parts = new Array<Showable>();
  constructor(
    top: number,
    private readonly defaults: { x: number; width: number },
  ) {
    this.#y = top;
  }
  /** The first free y coordinate below everything added so far. */
  get y(): number {
    return this.#y;
  }
  skip(amount: number): this {
    this.#y += amount;
    return this;
  }
  note(
    text: string,
    options: {
      x?: number;
      width?: number;
      size?: number;
      color?: string;
      alignment?: "left" | "center" | "right" | "justify";
      gap?: number;
    } = {},
  ): this {
    const { showable, height } = makeNote({
      text,
      x: options.x ?? this.defaults.x,
      y: this.#y,
      width: options.width ?? this.defaults.width,
      size: options.size,
      color: options.color,
      alignment: options.alignment,
    });
    this.parts.push(showable);
    this.#y += height + (options.gap ?? 0.3);
    return this;
  }
}

/**
 * A note positioned so its *bottom* lands at `bottom`, which is how these
 * slides keep their closing remarks on the slide no matter how long the
 * words get.
 */
export function bottomNote(
  text: string,
  options: {
    x?: number;
    width?: number;
    size?: number;
    color?: string;
    bottom?: number;
  } = {},
): Showable {
  const shared = {
    text,
    x: options.x ?? 0.5,
    width: options.width ?? 15,
    size: options.size ?? 0.27,
    color: options.color,
  };
  const { height } = makeNote({ ...shared, y: 0 });
  return makeNote({ ...shared, y: (options.bottom ?? 8.75) - height }).showable;
}

/** The slide title, in the style the rest of the showcase uses. */
export function title(text: string): Showable {
  const path = ParagraphLayout.singlePathShape({
    text,
    font: titleFont,
    alignment: "center",
    width: 16,
  }).canvasPath;
  return {
    description: text,
    duration: 0,
    show({ context }) {
      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = titleFont.strokeWidth;
      context.strokeStyle = myRainbow.myBlue;
      context.stroke(path);
    },
  };
}

/**
 * Draws the frame and the Position dot belonging to a real Multi Text
 * component, by asking that component where its text actually went.
 * Nothing is copied, so this picture cannot drift away from the settings it
 * is illustrating.
 *
 * A dimension whose Mode is `unbounded` has no frame in that direction, so
 * instead of inventing one, the dashed edges are drawn just past the text.
 *
 * Drawn in the text's own directions, then turned by Rotation about Position,
 * exactly the way the text itself is.
 */
export function frameOverlay(text: MultiTextComponent): Showable {
  const ANCHOR_X = { left: 0, center: 0.5, right: 1 } as const;
  const ANCHOR_Y = { top: 0, middle: 0.5, bottom: 1 } as const;
  return {
    description: "frame overlay",
    duration: 0,
    show(options) {
      const { context, timeInMs } = options;
      const position = text.positionSchedule.at(timeInMs);
      const width = text.widthSchedule.at(timeInMs);
      const height = text.heightSchedule.at(timeInMs);
      const boundedWidth = text.widthModeScalar.value !== "unbounded";
      const boundedHeight = text.heightModeScalar.value !== "unbounded";
      const { laidOut, offset, scale } = text.layoutAt(options);
      const textWidth = laidOut.width * scale;
      const textHeight = laidOut.height * scale;
      const left =
        position.x - ANCHOR_X[text.anchorXSchedule.at(timeInMs)] * width;
      const top =
        position.y - ANCHOR_Y[text.textBaselineSchedule.at(timeInMs)] * height;
      // Where to stop the dashes in a direction that has no frame.
      const OVERHANG = 0.14;
      const x0 = boundedWidth ? left : offset.x - OVERHANG;
      const x1 = boundedWidth ? left + width : offset.x + textWidth + OVERHANG;
      const y0 = boundedHeight ? top : offset.y - OVERHANG;
      const y1 = boundedHeight
        ? top + height
        : offset.y + textHeight + OVERHANG;
      context.save();
      const quarterTurns = text.quarterTurns;
      if (quarterTurns) {
        context.translate(position.x, position.y);
        context.rotate((quarterTurns * Math.PI) / 2);
        context.translate(-position.x, -position.y);
      }
      context.setLineDash([0.07, 0.07]);
      context.lineWidth = 0.02;
      context.strokeStyle = "#4a6ea8";
      context.beginPath();
      if (boundedWidth) {
        context.moveTo(x0, y0);
        context.lineTo(x0, y1);
        context.moveTo(x1, y0);
        context.lineTo(x1, y1);
      }
      if (boundedHeight) {
        context.moveTo(x0, y0);
        context.lineTo(x1, y0);
        context.moveTo(x0, y1);
        context.lineTo(x1, y1);
      }
      context.stroke();
      context.setLineDash([]);
      // The Position dot.  This is the one point that never moves, whatever
      // auto sizing decides to do.
      context.fillStyle = "#e08a3c";
      context.beginPath();
      context.arc(position.x, position.y, 0.07, 0, FULL_CIRCLE);
      context.fill();
      context.restore();
    },
  };
}

/** Builds a Multi Text with a single format, for use in these demos. */
export function demo(options: {
  text: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  size?: number;
  color?: string;
  widthMode?: (typeof WIDTH_MODES)[number];
  heightMode?: (typeof HEIGHT_MODES)[number];
  mayGrow?: "shrink or grow" | "shrink only";
  alignment?: "left" | "center" | "right" | "justify";
  anchorX?: "left" | "center" | "right";
  textBaseline?: "top" | "middle" | "bottom";
  rotation?: (typeof ROTATIONS)[number];
}): MultiTextComponent {
  const { text, x, y, size = 0.3, color = "white", ...rest } = options;
  const component = new MultiTextComponent({ ...rest, position: { x, y } });
  component.addFixed({
    child: new TextFormatComponent({ name: "", color, size }),
  });
  component.addText("", text);
  return component;
}

/** A demo and the picture of its frame, as one unit. */
export function withFrame(text: MultiTextComponent): readonly Showable[] {
  return [frameOverlay(text), text];
}

/**
 * A captioned demo.  The caption is measured, so the demo always lands just
 * below it however long the caption is.
 */
export function panel(options: {
  label: string;
  labelX: number;
  labelWidth: number;
  top: number;
  make: (y: number) => MultiTextComponent;
}): readonly Showable[] {
  const caption = makeNote({
    text: options.label,
    x: options.labelX,
    y: options.top,
    width: options.labelWidth,
    size: 0.26,
    color: "#c8c8c8",
  });
  const text = options.make(options.top + caption.height + 0.28);
  return [caption.showable, ...withFrame(text)];
}

/** One slide of the manual, holding all of these parts for the whole slide. */
export function slide(
  description: string,
  parts: readonly (Showable | readonly Showable[])[],
): Showable {
  const result = new ComponentWithFixedDuration(
    description,
    DEFAULT_SLIDE_DURATION_MS,
  );
  parts.flat().forEach((child) => result.addFixed({ child }));
  return result;
}

export const SHORT = "Word wrap is one way to fit text.";
export const PARAGRAPH =
  "Shrinking the font moves the line breaks, so more words fit on each line, " +
  "and the paragraph comes out a different shape. That is the only way to " +
  "chase a width and a height at the same time.";
