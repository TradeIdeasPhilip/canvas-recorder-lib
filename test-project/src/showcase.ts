/**
 * The showcase:  slides that show what the library can do, one topic per slide.
 * Looking for code or ideas to copy?  Start in showcase/.  showcase/scene-list.ts lists the slides in order.
 *
 * Each slide is its own file, so a new feature gets a new file there, and one line in scene-list.ts.
 */

import { canvasRecorder } from "canvas-recorder-lib";
import { makeShowcase } from "./showcase/scene-list.ts";

// The slides are drawn for the default 16 × 9 units, and don't adapt to other sizes.
canvasRecorder.lockSize();

// Don't await this.  See canvasRecorder.start().
canvasRecorder.start(makeShowcase(), { name: "showcase" });
