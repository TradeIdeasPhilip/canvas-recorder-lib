import type { Showable } from "../src/showable.ts";
import { playerBodyHtml } from "../dev/player-body.ts";

/**
 * Options for {@link CanvasRecorder.start}.
 */
export type StartOptions = {
  /**
   * A short, stable name for this video, like "riemann-surfaces-3d".
   *
   * The Visual Editor uses this to keep each video's saved work separate:
   * IndexedDB, the save history, and the default file names all use it.
   * Browser storage is shared by every program on the same origin (e.g. every project
   * served from localhost:5173), so give each video its own name.
   *
   * Changing this later makes the editor forget its saved work for this video.
   * (The work is still in IndexedDB, under the old name.)
   */
  name: string;
};

/**
 * Everything the player needs, captured by {@link CanvasRecorder.start}.
 * @internal The player reads this when it starts.  Nothing else should need it.
 */
export type StartRequest = { readonly showable: Showable } & Readonly<StartOptions>;

/**
 * The four numbers that set the size of the video.  See {@link CanvasRecorder.size}.
 */
export type VideoSize = {
  /** The width of the saved video file, in pixels.  See {@link CanvasRecorder.pixelWidth}. */
  readonly pixelWidth: number;
  /** The height of the saved video file, in pixels.  See {@link CanvasRecorder.pixelHeight}. */
  readonly pixelHeight: number;
  /** The width of the drawing area, in units.  See {@link CanvasRecorder.width}. */
  readonly width: number;
  /** The height of the drawing area, in units.  See {@link CanvasRecorder.height}. */
  readonly height: number;
};

/**
 * The main control object for this library.  Use the one instance, {@link canvasRecorder}.
 *
 * Set any properties you want to change, then call {@link start}.
 *
 * Any part of your video may read these properties.
 * Read them while drawing (e.g. in `show()`), not when a module first loads:
 * static imports run before the main program's own code, so a module's top level
 * would see the defaults even if the main program changes them.
 *
 * **The size can change while the program runs.**
 * Unless the main program calls {@link lockSize}, the player shows the four size
 * properties in `<input>` fields, and the user can change them.
 * The player remembers the user's values for each video (see {@link StartOptions.name}).
 * Code can also set them at any time.  {@link fps} still can't change after `start()`.
 */
export class CanvasRecorder {
  #startRequest: StartRequest | undefined;

  #assertNotStarted(property: string) {
    if (this.#startRequest) {
      throw new Error(`canvasRecorder.${property} can't change after start().`);
    }
  }

  // MARK: Size

  /**
   * Each size property must be a positive, finite number.
   * Pixel sizes are rounded to whole pixels.
   */
  #checkSize(property: keyof VideoSize, value: number, wholeNumber: boolean) {
    if (!(Number.isFinite(value) && value > 0)) {
      throw new RangeError(
        `canvasRecorder.${property} must be a positive number, not ${value}.`,
      );
    }
    const result = wholeNumber ? Math.round(value) : value;
    if (result <= 0) {
      throw new RangeError(`canvasRecorder.${property} must be at least 1.`);
    }
    return result;
  }

  readonly #sizeListeners = new Set<(size: VideoSize) => void>();

  #sizeChanged() {
    const size = this.size;
    for (const listener of this.#sizeListeners) {
      listener(size);
    }
  }

  /**
   * Call `listener` after any of the four size properties changes.
   * @returns A function that removes the listener.
   */
  onSizeChange(listener: (size: VideoSize) => void): () => void {
    this.#sizeListeners.add(listener);
    return () => this.#sizeListeners.delete(listener);
  }

  /**
   * All four size properties at once.
   *
   * Setting this changes all four, then calls the {@link onSizeChange} listeners once.
   * Setting one property at a time works too, but calls them after each one.
   */
  get size(): VideoSize {
    return {
      pixelWidth: this.#pixelWidth,
      pixelHeight: this.#pixelHeight,
      width: this.#width,
      height: this.#height,
    };
  }
  set size(value: VideoSize) {
    const pixelWidth = this.#checkSize("pixelWidth", value.pixelWidth, true);
    const pixelHeight = this.#checkSize("pixelHeight", value.pixelHeight, true);
    const width = this.#checkSize("width", value.width, false);
    const height = this.#checkSize("height", value.height, false);
    if (
      pixelWidth === this.#pixelWidth &&
      pixelHeight === this.#pixelHeight &&
      width === this.#width &&
      height === this.#height
    ) {
      return;
    }
    this.#pixelWidth = pixelWidth;
    this.#pixelHeight = pixelHeight;
    this.#width = width;
    this.#height = height;
    this.#sizeChanged();
  }

  #sizeLocked = false;
  /**
   * Keep the user from changing the size.
   *
   * Call this when the video is built for one specific size, like a hand-drawn
   * 16 × 9 layout.  The player still shows the four size properties, but read-only,
   * and it ignores any size the user saved earlier.
   *
   * The main program can still set the size properties.
   * Call this before {@link start}, so the player never applies a saved size.
   */
  lockSize(): void {
    this.#sizeLocked = true;
  }
  /** True after {@link lockSize}. */
  get sizeLocked(): boolean {
    return this.#sizeLocked;
  }

  #pixelWidth = 3840;
  /**
   * The width of the saved video file, in pixels.  The default is 3840 (4K).
   *
   * The on-screen preview uses whatever size fits the window.
   * Drawing code should not care; it works in {@link width} × {@link height} units.
   */
  get pixelWidth() {
    return this.#pixelWidth;
  }
  set pixelWidth(value: number) {
    this.size = { ...this.size, pixelWidth: value };
  }

  #pixelHeight = 2160;
  /** The height of the saved video file, in pixels.  The default is 2160 (4K).  See {@link pixelWidth}. */
  get pixelHeight() {
    return this.#pixelHeight;
  }
  set pixelHeight(value: number) {
    this.size = { ...this.size, pixelHeight: value };
  }

  #width = 16;
  /**
   * The width of the drawing area, in the units that `show()` draws in.  The default is 16.
   *
   * The player sets the canvas's transform so that the visible area is always
   * `width` units wide and {@link height} units tall, whatever the pixel size.
   *
   * The aspect ratio of `width` × `height` should match {@link pixelWidth} × {@link pixelHeight}.
   * If it doesn't, the picture is stretched to fit.
   *
   * Components that were written for 16 × 9 still assume it.
   * The ones the Visual Editor's buttons use (Fit canvas, the snap buttons) read this.
   */
  get width() {
    return this.#width;
  }
  set width(value: number) {
    this.size = { ...this.size, width: value };
  }

  #height = 9;
  /** The height of the drawing area, in units.  The default is 9.  See {@link width}. */
  get height() {
    return this.#height;
  }
  set height(value: number) {
    this.size = { ...this.size, height: value };
  }

  #fps = 60;
  /** Frames per second in the saved video file.  The default is 60. */
  get fps() {
    return this.#fps;
  }
  set fps(value: number) {
    this.#assertNotStarted("fps");
    this.#fps = value;
  }

  /**
   * The request passed to {@link start}, or `undefined` before that.
   * @internal For the player.
   */
  get startRequest() {
    return this.#startRequest;
  }

  /**
   * Replace the page with the player, and show `showable` in it.
   *
   * The main program's HTML can be empty, or say something like "Please wait…".
   * The `<head>` is left alone, so the main program still owns the title and the icon.
   *
   * Call this once.  Don't `await` it at the top level of your main module.
   * (A top-level `await` would make your module wait on the player while the player's
   * modules wait on yours, and the page would hang with no error message.)
   * @param showable The whole video.
   * @returns A promise that resolves when the player has finished starting up.
   */
  async start(showable: Showable, options: StartOptions): Promise<void> {
    if (this.#startRequest) {
      throw new Error("canvasRecorder.start() can only be called once.");
    }
    this.#startRequest = { showable, ...options };
    document.body.innerHTML = playerBodyHtml;
    // The player is one big module that starts running as soon as it loads.
    // Loading it here, on demand, means it runs after the request is in place.
    await import("../dev/canvas-recorder.ts");
  }
}

/** The main control object for this library.  See {@link CanvasRecorder}. */
export const canvasRecorder = new CanvasRecorder();
