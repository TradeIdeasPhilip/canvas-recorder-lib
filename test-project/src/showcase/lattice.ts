import { makeLineFont } from "canvas-recorder-lib/src/glib/line-font";
import { myRainbow } from "canvas-recorder-lib/src/glib/my-rainbow";
import { ParagraphLayout } from "canvas-recorder-lib/src/glib/paragraph-layout";
import { Showable, ShowOptions } from "canvas-recorder-lib/src/showable";
import { ReadOnlyRect } from "phil-lib/misc";

import { LatticeScheduleInfo } from "canvas-recorder-lib/src/schedule-helper";
import { ComponentWithLiveDuration } from "canvas-recorder-lib/src/slide-components/live-duration";
import { DEFAULT_SLIDE_DURATION_MS, titleFont } from "./shared.ts";

/** The "Lattice Property" slide. */
export function latticeProperty(): Showable {
  const description = "Lattice Property";
  const pathShape = ParagraphLayout.singlePathShape({
    text: description,
    font: titleFont,
    alignment: "center",
    width: 16,
  });
  const boundingBox = pathShape.getBBox();
  const path = pathShape.canvasPath;
  /**
   * The font used for the number inside each cell.
   *
   * The size here barely matters.  Each number is immediately scaled to fit
   * its own cell, so this only sets the stroke-width-to-height ratio.
   */
  const cellFont = makeLineFont(1);
  /**
   * How much of each cell to leave empty around its number, as a fraction of
   * the smaller side of the cell.
   */
  const CELL_MARGIN_RATIO = 0.15;

  class LatticeSlide extends ComponentWithLiveDuration {
    readonly latticeSchedule = new LatticeScheduleInfo("Lattice", {
      x: 1,
      y: 2,
      width: 14,
      height: 6.5,
      cellWidth: 2.2,
      cellHeight: 1.5,
    });
    constructor() {
      super(description, DEFAULT_SLIDE_DURATION_MS);
      this.schedules.push(this.latticeSchedule);
    }
    showMainContent({ context, timeInMs }: ShowOptions): void {
      const lattice = this.latticeSchedule.latticeAt(timeInMs);
      lattice.cells().forEach(({ rect, row, column }) => {
        const index = row * lattice.columnCount + column;
        context.fillStyle = myRainbow[index % myRainbow.length];
        context.fillRect(rect.x, rect.y, rect.width, rect.height);

        const margin = Math.min(rect.width, rect.height) * CELL_MARGIN_RATIO;
        const inner: ReadOnlyRect = {
          x: rect.x + margin,
          y: rect.y + margin,
          width: rect.width - 2 * margin,
          height: rect.height - 2 * margin,
        };
        if (inner.width <= 0 || inner.height <= 0) {
          // The cell is all margin.  Nothing legible would fit.
          return;
        }
        const unscaled = ParagraphLayout.singlePathShape({
          text: index.toString(),
          font: cellFont,
          alignment: "center",
        });
        const natural = unscaled.getBBoxRect();
        if (natural.width <= 0 || natural.height <= 0) return;
        // makeItFit() keeps the aspect ratio, so this is the factor it used.
        // The stroke has to be scaled by hand to match, or the digits in a
        // small cell come out looking too heavy.
        const scale = Math.min(
          inner.width / natural.width,
          inner.height / natural.height,
        );
        const numberPath = unscaled.makeItFit(
          inner,
          "srcRect fits completely into destRect",
        );
        context.lineCap = "round";
        context.lineJoin = "round";
        context.strokeStyle = "black";
        context.lineWidth = cellFont.strokeWidth * scale;
        context.stroke(numberPath.canvasPath);
      });
    }
    override show(options: ShowOptions): void {
      this.showMainContent(options);
      const { context } = options;
      const gradient = context.createLinearGradient(
        boundingBox.x.min,
        boundingBox.y.min - boundingBox.y.size * 3,
        boundingBox.x.max,
        boundingBox.y.max + boundingBox.y.size * 3,
      );
      gradient.addColorStop(0, "cyan");
      gradient.addColorStop(1 / 3, myRainbow.myBlue);
      gradient.addColorStop(2 / 3, myRainbow.cssBlue);
      gradient.addColorStop(1, myRainbow.violet);
      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = titleFont.strokeWidth;
      context.strokeStyle = gradient;
      context.stroke(path);
      super.show(options);
    }
  }
  return new LatticeSlide();
}
