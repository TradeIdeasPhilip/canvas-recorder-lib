import { ReadOnlyRect } from "phil-lib/misc";
import {
  canvasHeightUnits,
  canvasWidthUnits,
} from "../src/slide-components/video-info.ts";

/**
 * One button that moves or stretches a rectangle to the canvas.
 *
 * The canvas is taken to be the whole drawing area (see canvasRecorder.width), which is true
 * unless it sits inside a transformed parent like a Slide.
 */
export type RectSnap = {
  readonly text: string;
  readonly title: string;
  readonly place: (rect: ReadOnlyRect) => ReadOnlyRect;
};

// MARK: The snaps

/** Snap the left edge, center or right edge to the canvas, keeping the size. */
export const ALIGN_HORIZONTALLY: readonly RectSnap[] = [
  {
    text: "⇤",
    title: "Move the left edge to the left of the canvas",
    place: (r) => ({ ...r, x: 0 }),
  },
  {
    text: "⇆",
    title: "Center horizontally on the canvas",
    place: (r) => ({ ...r, x: (canvasWidthUnits() - r.width) / 2 }),
  },
  {
    text: "⇥",
    title: "Move the right edge to the right of the canvas",
    place: (r) => ({ ...r, x: canvasWidthUnits() - r.width }),
  },
];

/** Snap the top edge, middle or bottom edge to the canvas, keeping the size. */
export const ALIGN_VERTICALLY: readonly RectSnap[] = [
  {
    text: "⤒",
    title: "Move the top edge to the top of the canvas",
    place: (r) => ({ ...r, y: 0 }),
  },
  {
    text: "⇵",
    title: "Center vertically on the canvas",
    place: (r) => ({ ...r, y: (canvasHeightUnits() - r.height) / 2 }),
  },
  {
    text: "⤓",
    title: "Move the bottom edge to the bottom of the canvas",
    place: (r) => ({ ...r, y: canvasHeightUnits() - r.height }),
  },
];

/** Make the rectangle span the canvas in one direction, leaving the other alone. */
export const STRETCH_TO_CANVAS: readonly RectSnap[] = [
  {
    text: "↔",
    title: "Stretch across the full width of the canvas",
    place: (r) => ({ ...r, x: 0, width: canvasWidthUnits() }),
  },
  {
    text: "↕",
    title: "Stretch across the full height of the canvas",
    place: (r) => ({ ...r, y: 0, height: canvasHeightUnits() }),
  },
];

// MARK: Helpers

/**
 * 16 − 14.4 is 1.5999999999999996 in floating point.  Round that away, so the
 * number fields and the synced JSON show 1.6.
 */
export function tidy(n: number): number {
  return Math.round(n * 1e9) / 1e9;
}

/** {@link tidy} applied to all four numbers. */
export function tidyRect({ x, y, width, height }: ReadOnlyRect): ReadOnlyRect {
  return { x: tidy(x), y: tidy(y), width: tidy(width), height: tidy(height) };
}

function sameRect(a: ReadOnlyRect, b: ReadOnlyRect): boolean {
  // Typed values like 0.8 rarely equal the computed ones exactly.
  const close = (m: number, n: number) => Math.abs(m - n) < 1e-6;
  return (
    close(a.x, b.x) &&
    close(a.y, b.y) &&
    close(a.width, b.width) &&
    close(a.height, b.height)
  );
}

// MARK: The row

export type SnapRow = {
  readonly element: HTMLElement;
  /** Re-read the target and enable only the buttons that would change it. */
  draw(): void;
};

/**
 * A row of {@link RectSnap} buttons, one group after another with a little
 * space between groups.  Each button is disabled when it would change nothing.
 *
 * @param target The rectangle the buttons act on right now, or a sentence
 * saying why there isn't one.  That sentence is added to every tooltip.
 * @param apply Store the new rectangle.  Already {@link tidyRect tidied}.
 */
export function buildSnapRow(
  groups: readonly (readonly RectSnap[])[],
  target: () => ReadOnlyRect | string,
  apply: (rect: ReadOnlyRect) => void,
): SnapRow {
  const element = document.createElement("div");
  const buttons = groups.flatMap((group, groupIndex) =>
    group.map((snap, index) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = snap.text;
      btn.style.marginRight = "0.3em";
      if (groupIndex > 0 && index === 0) btn.style.marginLeft = "0.8em";
      btn.addEventListener("click", () => {
        const rect = target();
        if (typeof rect === "string") return;
        apply(tidyRect(snap.place(rect)));
        draw();
      });
      element.append(btn);
      return { btn, snap };
    }),
  );

  function draw(): void {
    const rect = target();
    for (const { btn, snap } of buttons) {
      if (typeof rect === "string") {
        btn.disabled = true;
        btn.title = `${snap.title}.\n\n${rect}`;
      } else {
        btn.disabled = sameRect(snap.place(rect), rect);
        btn.title = snap.title;
      }
    }
  }

  draw();
  return { element, draw };
}
