import { makeLineFont } from "canvas-recorder-lib/src/glib/line-font";
import { ParagraphLayout } from "canvas-recorder-lib/src/glib/paragraph-layout";
import {
  applyTransform,
  panAndZoom,
} from "canvas-recorder-lib/src/glib/transforms";
import { easeAndBack } from "canvas-recorder-lib/src/interpolate";
import {
  MakeShowableInParallel,
  Showable,
} from "canvas-recorder-lib/src/showable";
import { ReadOnlyRect } from "phil-lib/misc";

import { margin, titleFont } from "./shared.ts";

/** The "Simple Text & Layout" slide. */
export function simpleTextAndLayout(): Showable {
  const scene = new MakeShowableInParallel("Simple Text & Layout");
  {
    const pathShape = ParagraphLayout.singlePathShape({
      text: scene.description,
      font: titleFont,
      alignment: "center",
      width: 16,
    });
    const path = pathShape.canvasPath;
    const showable: Showable = {
      description: scene.description,
      duration: 0,
      show({ context }) {
        {
          context.lineCap = "round";
          context.lineJoin = "round";
          context.lineWidth = 0.07;
          context.strokeStyle = "yellow";
          context.stroke(path);
        }
      },
    };
    scene.add(showable);
  }

  {
    const font = makeLineFont(0.25);
    const period = 50_000;
    const top = 1.5;
    const dynamicText =
      "Dynamic Text:  " +
      "ParagraphLayout lets you request a specific width for your text.  " +
      "The default is unlimited, and you can ask what the resulting width is.\n\n" +
      "These fonts are strokable paths, just like the graph of a function or the outline of a shape, so you can use the same tools and tricks to manipulate them.";
    const fixedText =
      "Make it Fit:  " +
      "PathShape.makeItFit() uses panAndZoom() to fit into a given rectangle.  " +
      "This is inspired by SVG's viewBox.  " +
      "It keeps the aspect ratio while resizing.";
    const fixedPathShape = ParagraphLayout.singlePathShape({
      font,
      text: fixedText,
      alignment: "justify",
      width: 8 - 2 * margin,
    });
    const completelyFixedText =
      "Or use panAndZoom() directly, then apply the resulting transformation matrix to the canvas or an SVG element.  " +
      "This will change everything, including the line width.  " +
      "This is especially useful for transforming an entire scene.";
    const completelyFixedPathShape = ParagraphLayout.singlePathShape({
      font,
      text: completelyFixedText,
      alignment: "justify",
      width: 8 - 2 * margin,
    });
    const completelyFixedPath = completelyFixedPathShape.canvasPath;
    const showable: Showable = {
      description: "Make it fit",
      duration: period,
      show({ context, timeInMs }) {
        const progress = easeAndBack(timeInMs / this.duration);
        const centerLine = 4 + 8 * progress;
        const dynamicPathShape = ParagraphLayout.singlePathShape({
          font,
          text: dynamicText,
          alignment: "justify",
          width: centerLine - 2 * margin,
        }).translate(margin, top);
        const dynamicPath = dynamicPathShape.canvasPath;
        context.lineCap = "round";
        context.lineJoin = "round";
        context.lineWidth = font.strokeWidth;
        context.strokeStyle = "lime";
        context.stroke(dynamicPath);

        const rightSide: ReadOnlyRect = {
          x: centerLine + margin,
          y: top,
          width: 16 - centerLine - 2 * margin,
          height: 9 - top - margin,
        };
        const fixedPath = fixedPathShape.makeItFit(
          rightSide,
          "srcRect fits completely into destRect",
          0.5,
          0,
        ).canvasPath;
        context.strokeStyle = "orange";
        context.stroke(fixedPath);

        const originalTransform = context.getTransform();
        applyTransform(
          context,
          panAndZoom(
            completelyFixedPathShape.getBBoxRect(),
            rightSide,
            "srcRect fits completely into destRect",
            0.5,
            1,
          ),
        );
        context.strokeStyle = "red";
        context.stroke(completelyFixedPath);
        context.setTransform(originalTransform);
      },
    };
    scene.add(showable);
  }
  return scene.build();
}
