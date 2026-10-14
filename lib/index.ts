/**
 * canvas-recorder-lib:  preview, edit, annotate and record HTML canvas animations.
 *
 * Start here:
 * ```ts
 * import { canvasRecorder } from "canvas-recorder-lib";
 * canvasRecorder.start(myShowable, { name: "my-video" });
 * ```
 *
 * This file exports the main control object and the most common building blocks.
 * Anything else is available by path, e.g.
 * `import { PathShape } from "canvas-recorder-lib/src/glib/path-shape";`
 *
 * @module
 */

// MARK: Main control
export * from "./main-control.ts";

// MARK: Core
export * from "../src/showable.ts";
export * from "../src/interpolate.ts";
export * from "../src/schedule-helper.ts";
export * from "../src/stroke-colors.ts";

// MARK: Components
// Everything the Visual Editor knows how to create, save and load.
// Register your own components in componentRegistry to get the same treatment.
export * from "../src/slide-components/registry.ts";
export * from "../src/slide-components/duration-agnostic.ts";
export * from "../src/slide-components/fixed-duration.ts";
export * from "../src/slide-components/live-duration.ts";
export * from "../src/slide-components/in-parallel.ts";
export * from "../src/slide-components/in-series.ts";
export * from "../src/slide-components/slide-component.ts";
export * from "../src/slide-components/rectangle.ts";
export * from "../src/slide-components/image.ts";
export * from "../src/slide-components/multi-text.ts";
export * from "../src/slide-components/traditional-text.ts";
export * from "../src/slide-components/handwriting-effect.ts";
export * from "../src/slide-components/video-clip.ts";
