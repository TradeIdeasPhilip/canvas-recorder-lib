import { Font } from "canvas-recorder-lib/src/glib/letters-base";
import { makeLineFont } from "canvas-recorder-lib/src/glib/line-font";
import { myRainbow } from "canvas-recorder-lib/src/glib/my-rainbow";
import { ParagraphLayout } from "canvas-recorder-lib/src/glib/paragraph-layout";
import { PathShapeSplitter } from "canvas-recorder-lib/src/glib/path-shape-splitter";
import { interpolateNumbers } from "canvas-recorder-lib/src/interpolate";
import {
  MakeShowableInParallel,
  Showable,
} from "canvas-recorder-lib/src/showable";

import { titleFont } from "./shared.ts";

/** The "Formatting Pieces of Text" slide. */
export function formattingPiecesOfText(): Showable {
  const scene = new MakeShowableInParallel("Formatting Pieces of Text");
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
          context.strokeStyle = myRainbow.myBlue;
          context.stroke(path);
        }
      },
    };
    scene.add(showable);
  }
  {
    const baseFont = makeLineFont(0.5);
    const obliqueFont = baseFont.oblique();
    const cursiveFont = Font.cursive(0.5);
    const showable: Showable = {
      description: "action",
      duration: 20000,
      show({ context, timeInMs }) {
        const layout = new ParagraphLayout(baseFont);
        {
          const possible = "One, two, three.";
          const numberOfChars = Math.round(
            interpolateNumbers(timeInMs, [
              { time: this.duration / 8, value: 0 },
              { time: this.duration * 0.75, value: possible.length },
            ]),
          );

          layout.addText(possible.substring(0, numberOfChars));
          layout.addWord("| ", undefined, "cursor");
        }
        layout.addText("ParagraphLayout lets you format text: ");
        layout.addText("Bold", undefined, "bold");
        layout.addText(", ");
        layout.addText("oblique (italic)", obliqueFont, "oblique");
        layout.addText(", ");
        layout.addText("red", undefined, "red");
        layout.addText(", ");
        layout.addText("shaking", undefined, "shaking");
        layout.addText(", ");
        const rainbowWordInfo = layout.addText(
          "rainbow",
          undefined,
          "rainbow",
        )[0];
        layout.addText(", ");
        layout.addText("cursive, ", cursiveFont);
        layout.addText("BIG", titleFont);
        layout.addText(", ");
        layout.addText("redacted", undefined, "redacted");
        layout.addText(", ");
        layout.addText("handwriting", cursiveFont, "handwriting");
        layout.addText(", ");
        layout.addText("dashes", undefined, "dashes");
        layout.addText(", ");
        layout.addText("flashing", undefined, "flashing");
        layout.addText(", ");
        layout.addText("and more.");
        const layoutInfo = layout.align(15.5, "left", -0.1);
        context.lineCap = "round";
        context.lineJoin = "round";
        context.lineWidth = 0.04;
        context.strokeStyle = myRainbow.myBlue;
        const pathByTag = layoutInfo.pathShapeByTag();
        context.stroke(
          pathByTag.get(undefined)!.translate(0.25, 1.5).canvasPath,
        );
        if (timeInMs % 1000 > 500) {
          context.strokeStyle = "white";
          context.stroke(
            pathByTag.get("cursor")!.translate(0.25, 1.5).canvasPath,
          );
          context.strokeStyle = myRainbow.myBlue;
        }
        context.lineWidth = 0.08;
        context.stroke(pathByTag.get("bold")!.translate(0.25, 1.5).canvasPath);
        context.lineWidth = 0.04;
        context.stroke(
          pathByTag.get("oblique")!.translate(0.25, 1.5).canvasPath,
        );
        context.strokeStyle = "red";
        context.stroke(pathByTag.get("red")!.translate(0.25, 1.5).canvasPath);
        context.strokeStyle = myRainbow.myBlue;
        context.stroke(
          pathByTag
            .get("shaking")!
            .translate(0.25, 1.4 + Math.abs((timeInMs % 200) / 200 - 0.5) / 2)
            .canvasPath,
        );
        {
          const rainbowPathShape = pathByTag
            .get("rainbow")!
            .translate(0.25, 1.5);
          const rainbowBBox = rainbowPathShape.getBBox();
          const rainbow = context.createRadialGradient(
            rainbowBBox.x.mid,
            rainbowBBox.y.max,
            0,
            rainbowBBox.x.mid,
            rainbowBBox.y.max,
            (rainbowBBox.x.size / 2) * 1.1,
          );
          myRainbow
            .slice(0, 7)
            .reverse()
            .forEach((color, index, array) => {
              rainbow.addColorStop(index / (array.length - 1), color);
            });
          context.strokeStyle = rainbow;
          context.stroke(rainbowPathShape.canvasPath);
        }
        {
          //   const wordInfo=      layoutInfo.getAllLetters().find((wordInfo) => {wordInfo.word.wordInfo.tag=="redacted"})!;
          const bBox = pathByTag.get("redacted")!.getBBox();
          context.fillStyle = "blue";
          context.fillRect(
            bBox.x.min + 0.25,
            bBox.y.min + 1.5,
            bBox.x.size,
            bBox.y.size,
          );
        }
        context.strokeStyle = myRainbow.myBlue;
        {
          const basePath = pathByTag.get("handwriting")!.translate(0.25, 1.5);
          const progress = (timeInMs / this.duration) * 2;
          const pathShape = PathShapeSplitter.trimProgress(
            basePath,
            0,
            progress,
          );
          context.stroke(pathShape.canvasPath);
        }
        {
          const path = pathByTag.get("dashes")!.translate(0.25, 1.5).canvasPath;
          context.strokeStyle = "blue";
          context.stroke(path);
          context.strokeStyle = myRainbow.myBlue;
          context.setLineDash([0.1]);
          context.lineDashOffset = timeInMs / 5000;
          context.lineCap = "butt";
          context.stroke(path);
          context.lineCap = "round";
          context.setLineDash([]);
        }
        if (timeInMs % 1000 > 500) {
          context.stroke(
            pathByTag.get("flashing")!.translate(0.25, 1.5).canvasPath,
          );
        }
        {
          const fullPathShape = layoutInfo
            .singlePathShape()
            .translate(0.25, 5.4);
          context.stroke(fullPathShape.canvasPath);
        }
      },
    };
    scene.add(showable);
  }
  return scene.build();
}
