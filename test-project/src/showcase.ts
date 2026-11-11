/**
 * The showcase:  slides that show what the library can do, one topic per slide.
 * Looking for code or ideas to copy?  Start in showcase/.  showcase/scene-list.ts lists the slides in order.
 *
 * Each slide is its own file, so a new feature gets a new file there, and one line in scene-list.ts.
 */

import { canvasRecorder } from "canvas-recorder-lib";
import { editorPanelForFourier } from "./showcase/editor-panel.ts";
import { makeShowcase } from "./showcase/scene-list.ts";

// The slides are drawn for the default 16 × 9 units, and don't adapt to other sizes.
canvasRecorder.lockSize();

// Every Fourier, on any slide, gets a list of its terms in the Visual Editor.
// See the "Editor Panels" slide.
canvasRecorder.addEditorPanel(editorPanelForFourier);

// Don't await this.  See canvasRecorder.start().
canvasRecorder.start(makeShowcase(), { name: "showcase" });
