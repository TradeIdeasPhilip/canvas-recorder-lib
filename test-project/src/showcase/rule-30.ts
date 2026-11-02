import { myRainbow } from "canvas-recorder-lib/src/glib/my-rainbow";
import { Showable, ShowOptions } from "canvas-recorder-lib/src/showable";
import { philDebug } from "canvas-recorder-lib/src/utility";
import { positiveModulo } from "phil-lib/misc";

import { NumberScheduleInfo } from "canvas-recorder-lib/src/schedule-helper";
import { ComponentWithLiveDuration } from "canvas-recorder-lib/src/slide-components/live-duration";
import { TextComponent } from "canvas-recorder-lib/src/slide-components/simple-text";

/** The "Rule 30" slide. */
export function rule30(): Showable {
  // As seen at https://youtu.be/4H6LJvdmnYM
  /**
   * Most cells in rule 30 depend on the cell immediately above them, and its two neighbors.
   * Some cells are hard coded as a base case.
   * This implementation includes a cache of previously computed values for efficiency.
   *
   * https://en.wikipedia.org/wiki/Rule_30
   */
  class Rule30 {
    private constructor() {
      throw new Error("wtf");
    }
    // This was easy but slow.
    // I got the frame drawing time down from about 38ms to 11ms.
    // That was limiting us to 23 fps.  Now I get 60 fps with lots of room to spare.
    // static readonly #cached = new ArrayMap<
    //   { row: number; column: number },
    //   boolean
    // >((a, b) => a.column == b.column && a.row == b.row);
    static #cache = new Array<Map<number, boolean>>();
    static #getFromCache(row: number, column: number) {
      return this.#cache[row]?.get(column);
    }
    static #addToCache(row: number, column: number, value: boolean) {
      while (row >= this.#cache.length) {
        this.#cache.push(new Map<number, boolean>());
      }
      this.#cache[row].set(column, value);
    }
    /**
     *
     * @param row 0 for the top row, which is one cell wide.
     * 1 for the second row, which is 3 cells wide.
     * @param column 0 for the center.
     * Negative for left and positive for right.
     * @returns `true` for the foreground color and `false` for the background.
     * Everything on the far left or right and everything above row 0 is the background color.
     */
    static valueAt(row: number, column: number): boolean {
      // Start with a lot of background and one foreground cell at (0, 0).
      if (row < 0) {
        // Above the top
        return false;
      }
      if (column > row) {
        // To the right of the action.
        return false;
      }
      if (column == row) {
        // The right side.
        // All we really needed was the top point, but we might as well do this.
        return true;
      }
      if (-column > row) {
        // To the left of the action
        return false;
      }
      // Check the cache
      //const key = { row, column };
      //const cachedResult = this.#cached.get(key);
      const cachedResult = this.#getFromCache(row, column);
      if (cachedResult !== undefined) {
        return cachedResult;
      }
      // Compute the value based on the previous row.
      const previousRow = row - 1;
      const left = this.valueAt(previousRow, column - 1);
      const center = this.valueAt(previousRow, column);
      const right = this.valueAt(previousRow, column + 1);
      const result = left != (center || right);
      // this.#cached.set(key, result);
      this.#addToCache(row, column, result);
      return result;
    }
    /**
     * Display the first n rows of the result to the console.
     * @param rows How many rows to dump.
     */
    static dump(rows: number) {
      let output = "";
      for (let row = 0; row < rows; row++) {
        if (row) {
          output += "\n";
        }
        for (let column = -rows; column <= rows; column++) {
          output += this.valueAt(row, column) ? "X" : " ";
        }
      }
      console.log(output);
    }
  }
  philDebug.Rule30 = Rule30;
  class Rule30Slide extends ComponentWithLiveDuration {
    /**
     * How to scale the cells.
     * This is how many we expect to see across the entire width of the screen.
     *
     * Cells are squares.
     * This affects the height and the width of the square.
     *
     * This can be a fraction so you can smoothly animate a change.
     */
    columnCountSchedule = new NumberScheduleInfo("Column Count", 23);
    /**
     * Which index to display at the top of the visual.
     * 0 means the top of the triangle is at the top of the visible area.
     * 2 means the top two rows are scrolled out of the visible area and the third row is the highest visible row.
     * -2 means to draw 2 blank rows above the top of the triangle.
     *
     * Fractions are acceptable and expected.
     * This can scroll smoothly.
     */
    topRowSchedule = new NumberScheduleInfo("Top Row", [
      {
        time: 0,
        value: 10,
      },
      {
        time: 30000,
        value: 160,
      },
    ]);
    /**
     * If a cell is `true` but its neighbor to the left is `false`, use this number as an index into {@link myRainbow}.
     * If more cells are `true` to the right, increment the color index by one each one.
     *
     * Isolated cells will all have the base color described by this value.
     * This will be the most common color on the screen.
     * Longer horizontal segments will display a rainbow starting with this color on the left.
     *
     * Colors will repeat.
     * Requesting a value off the end of the array will wrap around and start back at the beginning.
     * Negative values also work, -1 meaning to start with the last color in `myRainbow`.
     *
     * Index values will be rounded to the nearest integer.
     */
    initialColorIndexSchedule = new NumberScheduleInfo(
      "Initial Color Index",
      5,
    );
    constructor() {
      super("Rule30", 30_000);
      this.schedules.push(
        this.columnCountSchedule,
        this.topRowSchedule,
        this.initialColorIndexSchedule,
      );
      const title = new TextComponent({
        color: myRainbow.orange,
        rect: {
          x: 0.2606572481572476,
          y: 0.3077395577395574,
          width: 6,
          height: 4,
        },
        text: "Rule 30",
        size: 0.7,
        boldness: 1.4,
      });
      this.addFixed({ child: title });
    }
    /**
     * Show the requested cells.
     */
    showMainContent(options: ShowOptions): void {
      const { context, timeInMs } = options;
      /**
       * This describes the part of the screen available for drawing.
       *
       * Originally I was going to reserve space at the top of the screen for the title, like I do in most slides.
       * But I eventually decided to fill the entire screen.
       */
      const top = 0;
      const bottom = 9;
      const width = 16;
      const columnCount = this.columnCountSchedule.at(timeInMs);
      if (columnCount < 1) {
        // Negative numbers make no sense.
        // 0 might cause an infinite loop!
        // Something tiny might cause a loop to run for a very long time.
        // 1 will fill the entire screen with a single cell.
        return;
      }
      const initialColorIndex = positiveModulo(
        Math.round(this.initialColorIndexSchedule.at(timeInMs)),
        myRainbow.length,
      );
      const topRow = this.topRowSchedule.at(timeInMs);
      /**
       * The width and height of each cell is `size` userspace units.
       */
      const size = width / columnCount;
      /**
       * Half the side length.
       *
       * I was originally drawing circles.
       * And x and y still refer to the center.
       * This is the distance from the center to the top, left, bottom or right.
       */
      const radius = size / 2;
      /**
       * Draw this many columns on the left, then the center column, then this many columns on the right.
       * This value might not be an integer.
       */
      const columnsOnEachSide = (columnCount - 1) / 2;
      /*
       * The highest column number that we want to display.
       *
       * Round up.
       * If a cell is even partially visible on the screen, draw it.
       */
      const rightColumn = Math.ceil(columnsOnEachSide);
      /*
       * The lowest column number that we want to display.
       */
      const leftColumn = -rightColumn;
      /**
       * Where to draw the *top* of the highest row that is at least partially visible.
       * This might be off the top of the screen if we are scrolling.
       */
      const initialY = -positiveModulo(topRow, 1) * size + top;
      for (
        let row = Math.floor(topRow), y = initialY + size / 2;
        y - radius < bottom;
        y += size, row++
      ) {
        let colorIndex = initialColorIndex;
        let column = leftColumn;
        while (Rule30.valueAt(row, column)) {
          // We need to know how many cells were true in a row.
          // If the far left item is false, we are good.
          // But if the far left item is true, we don't know what color to use.
          // So we go further left until we find the first false.
          // Then our count will be right by the time we get back to the first item that's actually visible.
          column--;
        }
        for (; column <= rightColumn; column++) {
          if (Rule30.valueAt(row, column)) {
            // Draw the cell.
            context.fillStyle = myRainbow[colorIndex % myRainbow.length];
            colorIndex++;
            const x = column * size + width / 2;
            context.fillRect(x - radius, y - radius, size, size);
          } else {
            // Do not draw this cell.
            // Reset the color index.
            // The next time we draw a cell will be the start of a new chain.
            colorIndex = initialColorIndex;
          }
        }
      }
    }
    override show(options: ShowOptions): void {
      // Draw the cells.
      this.showMainContent(options);
      // Draw the title and any other children.
      super.show(options);
    }
  }
  return new Rule30Slide();
}
