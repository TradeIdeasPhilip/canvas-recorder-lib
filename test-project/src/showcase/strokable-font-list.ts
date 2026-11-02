import { FullFormatter, PathElement } from "canvas-recorder-lib/src/fancy-text";
import { Font } from "canvas-recorder-lib/src/glib/letters-base";
import {
  LineFontMetrics,
  makeLineFont,
} from "canvas-recorder-lib/src/glib/line-font";
import { myRainbow } from "canvas-recorder-lib/src/glib/my-rainbow";
import { ParagraphLayout } from "canvas-recorder-lib/src/glib/paragraph-layout";
import { easeAndBack } from "canvas-recorder-lib/src/interpolate";
import {
  MakeShowableInParallel,
  Showable,
  ShowOptions,
} from "canvas-recorder-lib/src/showable";

import { margin, titleFont } from "./shared.ts";

/** The "Strokable Font List" slide. */
export function strokableFontList(): Showable {
  const scene = new MakeShowableInParallel("Strokable Font List");
  {
    const titlePath = ParagraphLayout.singlePathShape({
      text: scene.description,
      font: titleFont,
      alignment: "center",
      width: 16,
    }).canvasPath;
    const futuraPath = ParagraphLayout.singlePathShape({
      text: "There are currently 3 fonts available.  This is Futura L at size 0.5.",
      font: Font.futuraL(0.5),
      alignment: "right",
      width: 16 - 2 * margin,
    }).translate(margin, 1.75).canvasPath;
    const drawCursive = (() => {
      const formatted = new FullFormatter(Font.cursive(0.5))
        .add("This is Cursive at size 0.5.  This works especially well with ")
        .add("the handwriting effect")
        .add(".")
        .align({
          alignment: "center",
          width: 16 - 2 * margin,
          left: margin,
          top: 4,
        });
      const fixedElements = formatted.pathElements;
      const handwritingElements = fixedElements.splice(1, 1);
      const handwriting = PathElement.handwriting(
        handwritingElements,
        2000,
        8000,
      );
      function drawCursive(options: ShowOptions) {
        fixedElements.forEach((element) => element.show(options));
        handwriting(options);
      }
      return drawCursive;
    })();
    // const cursivePath = ParagraphLayout.singlePathShape({
    //   text: "This is Cursive at size 0.5.  This works especially well with the handwriting effect.",
    //   font: Font.cursive(0.5),
    //   alignment: "center",
    //   width: 16 - 2 * margin,
    // }).translate(margin, 4).canvasPath;
    const showable: Showable = {
      description: "simple parts",
      duration: 0,
      show(options) {
        {
          const context = options.context;
          context.lineCap = "round";
          context.lineJoin = "round";
          context.lineWidth = 0.07;
          context.strokeStyle = "magenta";
          context.stroke(titlePath);
          context.lineWidth = 0.04;
          context.strokeStyle = "rgb(128, 0, 255)";
          context.stroke(futuraPath);
          context.strokeStyle = "rgb(0, 0, 255)";
          drawCursive(options);
        }
      },
    };
    scene.add(showable);
  }
  {
    const showable: Showable = {
      description: "Fonts part 1",
      duration: 15_000,
      show({ context, timeInMs }) {
        const progress = easeAndBack(timeInMs / this.duration);
        context.lineWidth = 0.04 + progress * 0.08;
        const path = ParagraphLayout.singlePathShape({
          text: "This is Line Font.  It has the most characters.  And it can adjust to different line thicknesses. ℕℤℚ",
          //text: "Don’t “Font.”  Mí ¿Cómo? ¡Azúcar! mamá él.  And it can Sierpiński; different: line thicknesses. ℕℤℚ",
          font: makeLineFont(new LineFontMetrics(0.5, context.lineWidth)),
          alignment: "left",
          width: 16 - 2 * margin,
        }).translate(margin, 6.25).canvasPath;
        context.strokeStyle = myRainbow.myBlue;
        context.stroke(path);
      },
    };
    scene.add(showable);
  }
  return scene.build();
}
