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
 * The main control object for this library.  Use the one instance, {@link canvasRecorder}.
 *
 * Set any properties you want to change, then call {@link start}.
 * The properties are frozen once `start()` is called.
 *
 * Any part of your video may read these properties.
 * Read them while drawing (e.g. in `show()`), not when a module first loads:
 * static imports run before the main program's own code, so a module's top level
 * would see the defaults even if the main program changes them.
 */
export class CanvasRecorder {
  #startRequest: StartRequest | undefined;

  #assertNotStarted(property: string) {
    if (this.#startRequest) {
      throw new Error(`canvasRecorder.${property} can't change after start().`);
    }
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
    this.#assertNotStarted("pixelWidth");
    this.#pixelWidth = value;
  }

  #pixelHeight = 2160;
  /** The height of the saved video file, in pixels.  The default is 2160 (4K).  See {@link pixelWidth}. */
  get pixelHeight() {
    return this.#pixelHeight;
  }
  set pixelHeight(value: number) {
    this.#assertNotStarted("pixelHeight");
    this.#pixelHeight = value;
  }

  #width = 16;
  /**
   * The width of the drawing area, in the units that `show()` draws in.  The default is 16.
   *
   * The player sets the canvas's transform so that the visible area is always
   * `width` units wide and {@link height} units tall, whatever the pixel size.
   *
   * Note:  So far only the player itself reads this.  A lot of the components still
   * assume 16 × 9.  The aspect ratio of `width` × `height` should match
   * {@link pixelWidth} × {@link pixelHeight}.
   */
  get width() {
    return this.#width;
  }
  set width(value: number) {
    this.#assertNotStarted("width");
    this.#width = value;
  }

  #height = 9;
  /** The height of the drawing area, in units.  The default is 9.  See {@link width}. */
  get height() {
    return this.#height;
  }
  set height(value: number) {
    this.#assertNotStarted("height");
    this.#height = value;
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
