import { makeLineFont } from "canvas-recorder-lib/src/glib/line-font";
import { myRainbow } from "canvas-recorder-lib/src/glib/my-rainbow";
import { ParagraphLayout } from "canvas-recorder-lib/src/glib/paragraph-layout";
import { PathShape } from "canvas-recorder-lib/src/glib/path-shape";
import { Keyframe } from "canvas-recorder-lib/src/interpolate";
import { Showable } from "canvas-recorder-lib/src/showable";

import { ComponentWithFixedDuration } from "canvas-recorder-lib/src/slide-components/fixed-duration";
import { FourierComponent } from "canvas-recorder-lib/src/slide-components/fourier";
import { manWalkingString } from "./walking-man.ts";

//
// fourier-intro.ts's three walking men, with less, some and more detail,
// rebuilt from three Fourier components.  Each one starts where the one
// before it stops.  Every number here is editable in the Visual Editor.

// Register sources at the top level, before constructing any component that
// should offer them.
FourierComponent.sources.set("Walking Man", {
  path: PathShape.fromRawString(manWalkingString).transform(
    new DOMMatrix("scale(0.025)"),
  ),
});
/** The "Fourier Component" slide. */
export function fourierComponent(): Showable {
  const scene = new ComponentWithFixedDuration("Fourier Component", 19_000);
  /**
   * fourier-intro.ts's timing:  4 seconds per step with half a second between.
   * It starts at step 1, not 0, because the first group is there from the
   * start rather than growing out of a dot.
   */
  const step: Keyframe<number>[] = [
    { time: 0, value: 1 },
    { time: 4_000, value: 2 },
    { time: 4_500, value: 2 },
    { time: 8_500, value: 3 },
    { time: 9_000, value: 3 },
    { time: 13_000, value: 4 },
    { time: 13_500, value: 4 },
    { time: 17_500, value: 5 },
  ];
  const labelFont = makeLineFont(0.45);
  const columns = [
    {
      description: "Less detail",
      // fourier-intro.ts's keyframes:  [2, 3, 6, 9, 12].  Its term 0 was the
      // center, which samplesToFourier() leaves out now, so these are one less.
      termGroups: "0, 1, 2-4, 5-7, 8-10",
      color: "red",
      lineWidth: 0.06,
      x: 0.3,
    },
    {
      description: "Some detail",
      // [12, 25, 31, 43, 50], less one
      termGroups: "0-10, 11-23, 24-29, 30-41, 42-48",
      color: "white",
      lineWidth: 0.04,
      x: 5.5,
    },
    {
      description: "More detail",
      // [50, 75, 100, 150, 1000], less one
      termGroups: "0-48, 49-73, 74-98, 99-148, 149-998",
      color: myRainbow.myBlue,
      lineWidth: 0.02,
      x: 10.7,
    },
  ];
  for (const { description, termGroups, color, lineWidth, x } of columns) {
    const label = ParagraphLayout.singlePathShape({
      text: description,
      font: labelFont,
      alignment: "center",
      width: 5,
    }).translate(x, 0.3).canvasPath;
    scene.addFixed({
      child: {
        description: `${description} label`,
        duration: 0,
        show({ context }) {
          context.lineCap = "round";
          context.lineJoin = "round";
          context.lineWidth = labelFont.strokeWidth;
          context.strokeStyle = color;
          context.stroke(label);
        },
      },
    });
    scene.addFixed({
      child: new FourierComponent({
        description,
        source: "Walking Man",
        termGroups,
        step,
        destRect: { x, y: 1.3, width: 5, height: 7.4 },
        strokeColor: color,
        lineWidth,
        minDuration: 0,
      }),
    });
  }
  return scene;
}
