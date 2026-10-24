/**
 * A very simple video editor:  video clips from your own computer, plus standard text and
 * callouts.  Nothing here is custom.  It's the library's player, with an empty project to fill in.
 *
 * Made for someone who never sees the TypeScript.  Everything is in the Visual Editor:
 * the video size, the files, and every component.  Work is saved in this browser.
 *
 * See development-plans/simple-video-editor.md.
 */

import {
  canvasRecorder,
  DurationAgnosticComponent,
  InSeriesComponent,
  RectangleComponent,
  TraditionalTextComponent,
  VideoClipComponent,
} from "canvas-recorder-lib";

// MARK: Size

// Matches an M1 MacBook Air's screen recordings.  YouTube resizes and pillarboxes it.
// These are only the defaults:  the user can change all four, and the player remembers their choice.
canvasRecorder.size = { pixelWidth: 2880, pixelHeight: 1800, width: 16, height: 10 };

// MARK: The starting project

/** The whole drawing area, in units. */
const FULL_SCREEN = { x: 0, y: 0, width: 16, height: 10 };

const root = new DurationAgnosticComponent("Simple Video Editor");

const background = new RectangleComponent({
  description: "Background",
  color: "black",
  rect: FULL_SCREEN,
});

/** One after another.  Add more clips here. */
const clips = new InSeriesComponent({ description: "Clips" });
clips.replaceableComponents!.push(
  new VideoClipComponent({
    description: "Clip 1",
    duration: 10_000,
    destinationRect: FULL_SCREEN,
  }),
);

/** On screen until the user deletes it. */
const instructions = new TraditionalTextComponent({
  description: "Instructions",
  text: "Select Clip 1, then 📂 Open file…",
  position: { x: 8, y: 5 },
  fillColor: "white",
  fontSize: 0.6,
  textAlign: "center",
  textBaseline: "middle",
});

root.replaceableComponents!.push(background, clips, instructions);

// Don't await this.  See canvasRecorder.start().
canvasRecorder.start(root, { name: "simple-video-editor" });
