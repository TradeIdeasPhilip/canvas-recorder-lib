import { myRainbow } from "canvas-recorder-lib/src/glib/my-rainbow";
import { ParagraphLayout } from "canvas-recorder-lib/src/glib/paragraph-layout";
import { LCommand, PathShape } from "canvas-recorder-lib/src/glib/path-shape";
import { makePolygon } from "canvas-recorder-lib/src/peano-fourier/fourier-shared";
import {
  MakeShowableInParallel,
  Showable,
} from "canvas-recorder-lib/src/showable";
import { strokeColors } from "canvas-recorder-lib/src/stroke-colors";
import { FULL_CIRCLE, lerp, makeLinear } from "phil-lib/misc";

import { titleFont } from "./shared.ts";

/** The "Simple Animated Colors" slide. */
export function simpleAnimatedColors(): Showable {
  const scene = new MakeShowableInParallel("Simple Animated Colors");
  {
    const titlePath = ParagraphLayout.singlePathShape({
      text: scene.description,
      font: titleFont,
      alignment: "center",
      width: 16,
    });
    const starPath = makePolygon(5, 1).makeItFit(
      { x: 0.5, y: 1.5, width: 3, height: 3 },
      "srcRect fits completely into destRect",
    );
    /**
     * Source:  https://commons.wikimedia.org/wiki/File:Silhouette_of_the_Statue_of_Liberty_in_New_York.svg
     */
    const statueOfLiberty =
      "M251.494,156.465l-17.211-0.931l13.955-1.396l0.464-4.185l-18.608-2.327l20.936-1.396     l3.256-1.86l-15.817-17.213l19.54,12.095l8.372-0.929l2.325-21.865l3.723,20.934l9.305,1.396l13.955-9.768l-10.699,13.488     l3.721,3.258l21.4-5.583l-19.54,9.77l0.932,2.325l25.585,2.791l-26.05,3.723l-0.932,8.372c0,0,2.792,10.235,2.792,13.955     c0,3.723-4.651,6.514-2.792,8.375c1.86,1.862,6.979,13.493,6.979,13.493s4.187,5.581,5.582,5.581     c1.396,0,8.839,9.305,10.699,17.211c1.86,7.91,3.256,14.886,6.048,17.213c2.789,2.327,7.442,4.654,7.907,6.512     c0.467,1.862,6.979,0,6.979,0l3.256-7.906l2.792,0.465v-4.188l25.12,15.817l-2.327,2.792l0.932,3.721l-6.048,8.374     c0,0,4.188,0.465,3.257,4.652c-0.93,4.187-4.652,9.303-4.652,9.303l-4.651,6.047c0,0-7.443,6.514-9.304,4.187     c-1.862-2.327-0.931,33.493-11.63,33.028s-6.047-1.394-6.047,1.862s6.976,62.336,5.115,64.663     c-1.859,2.325-5.582,4.185-5.582,4.185l1.862,11.63l-3.259,2.791c0,0,2.792,30.237,1.396,33.028     c-1.396,2.792-4.652-0.929-4.652,3.256c0,4.187-3.256,42.798,10.234,53.033c4.652,1.862,3.723,16.284,3.723,16.284     s7.443,0.464,6.048,3.721c-1.396,3.256-7.443,27.909,0.465,29.308c7.907,1.394,16.746,7.907,16.746,7.907l-0.929,14.887     l-0.932,6.514l-8.839,9.304l1.86,63.265l2.327,1.862l-3.256,1.396l3.256,39.076l4.651,13.025l6.979,7.908l1.396,10.701     l-5.118,5.58c0,0,5.118,8.839,0.932,15.817c-2.327,5.581,3.72,5.116,3.72,5.116l4.654,4.654v29.306h24.654l14.886,5.583     l0.465,26.516l59.547,1.396l18.608,7.907l0.929,33.495l-17.211,3.256H30.525v-43.728h85.598v-31.168h43.263l1.859-37.682     l8.839-2.325c0,0-4.651-8.374-3.258-12.097c1.398-3.721,0.932-8.839-0.465-10.699c-1.394-1.86-0.929-12.562-0.929-12.562     l4.651-2.789l9.771-18.608l2.324-39.076c0,0-5.116-0.467-1.396-6.047c3.723-5.583,2.327-61.872,2.327-61.872l-8.374-10.234     l-0.467-6.979l-1.858-17.213l10.232-0.93v2.327l1.862-3.258l5.116,0.467l2.327-11.166l-0.467-21.398c0,0,1.397-4.653,3.258-4.653     s3.256-14.42,3.256-14.42l7.908-0.467c0,0-3.256-1.859,0.464-5.583c3.723-3.72,6.515-3.72,6.515-3.72s10.699-16.747,6.979-26.052     c-3.723-9.304,0.929-13.491,0.929-13.491s-3.721-29.772,1.396-44.659c-0.464-4.651-3.256-8.372-3.256-8.372     s6.515-6.514,5.119-13.957c-1.398-7.445-0.932-15.815-0.932-17.211c0-1.398-2.791-12.562-0.932-18.609     c1.863-6.047-5.116-4.187-5.116-8.838c0-4.652,1.396-10.235,3.257-16.282c1.859-6.049,2.324-20.002,2.324-20.002     s-9.768,0.929-10.234-1.863c-0.465-2.792,4.189-26.516,12.562-34.891c4.651-6.976-1.396-15.351-4.188-19.538     c-2.789-4.188-5.116-6.979-2.789-13.026c2.325-6.047,3.254-14.886-0.467-15.351c-3.723-0.464-8.372-9.768-8.372-9.768     s-7.443-9.77-6.979-20.469c0.465-10.701,12.095-25.587,12.095-25.587s-6.512-22.793-6.048-42.796     c0.465-20.004-0.464-7.445-0.464-7.445s-5.583-7.441-3.723-11.164s1.86-7.443,1.86-7.443s-5.116-3.256-5.116-7.443     c0-4.187-1.396-10.234,0-11.63c1.396-1.396,3.72-6.048,3.72-6.048l-6.512-7.443c0,0-2.791-6.047-0.931-8.839     s9.77-2.792,9.77-2.792l-0.931-8.839c0,0-7.443,0.932-5.581-5.118c1.86-6.047,8.839-12.095,8.372-15.351     c-0.465-3.256,6.979,5.583,6.979,5.583l6.512-2.792l0.465,3.723c0,0-0.465,14.419-4.185,14.419c-3.723,0-1.396,6.512-1.396,6.512     l10.699,1.398l1.396,12.095l-9.768,2.327l-1.862,12.095c0,0,6.515,8.374,6.515,15.351c0,6.976-1.863,17.677,0.464,25.587     c2.327,7.907,8.839,29.772,6.512,38.145c-2.326,8.374,6.513,2.324,7.443,10.699c0.932,8.375,3.723,17.678,6.048,15.351     C246.842,176.003,254.285,162.977,251.494,156.465z";
    const statueOfLibertyPath = PathShape.fromRawString(
      statueOfLiberty,
    ).makeItFit(
      { x: 11.5, width: 4, y: 1.5, height: 7 },
      "srcRect fits completely into destRect",
    );

    const sineWaveBase = PathShape.parametric((progress) => {
      const x = lerp(-FULL_CIRCLE, FULL_CIRCLE, progress);
      // Negative sign because math graphs say +y is up and computer graphics say +y is down.
      const y = -Math.sin(x);
      return { x, y };
    }, 21).makeItFit(
      { x: 4, y: 1.5, height: 3, width: 8 },
      "srcRect fits completely into destRect",
    );

    const endsAndCorners: {
      pathShape: PathShape;
      colors: string[];
      lineCap: CanvasLineCap;
      lineJoin: CanvasLineJoin;
    }[] = [];
    {
      const height = 2;
      const halfWidth = height / Math.sqrt(3);
      const width = 2 * halfWidth;
      const left = 0.75;
      const right = 12.25;
      const top = 5.25;
      const bottom = 8.25;
      const pointingDown = new PathShape([
        new LCommand(0, top, halfWidth, top + height),
        new LCommand(halfWidth, top + height, width, top),
      ]);
      const pointingUp = new PathShape([
        new LCommand(0, bottom, halfWidth, bottom - height),
        new LCommand(halfWidth, bottom - height, width, bottom),
      ]);
      const getXOffset = makeLinear(0, left, 5, right - width);
      for (let i = 0; i < 6; i++) {
        const bottomRow = i % 2 == 0;
        const pathShape = (bottomRow ? pointingUp : pointingDown).translate(
          getXOffset(i),
          0,
        );
        const firstColor = bottomRow ? myRainbow.red : myRainbow.cssBlue;
        const lineCap: CanvasLineCap = bottomRow ? "square" : "round";
        const joinType = Math.floor(i / 2);
        let secondColor: string;
        let lineJoin: CanvasLineJoin;
        switch (joinType) {
          case 0: {
            secondColor = myRainbow.yellow;
            lineJoin = "round";
            break;
          }
          case 1: {
            secondColor = myRainbow.cyan;
            lineJoin = "bevel";
            break;
          }
          case 2: {
            secondColor = myRainbow.green;
            lineJoin = "miter";
            break;
          }
          default: {
            throw new Error("wtf");
          }
        }
        endsAndCorners.push({
          pathShape,
          colors: [firstColor, secondColor],
          lineCap,
          lineJoin,
        });
      }
    }

    const showable: Showable = {
      description: scene.description,
      duration: 16_000,
      show({ context, timeInMs }) {
        const progress = timeInMs / this.duration;
        context.lineCap = "round";
        context.lineJoin = "round";
        context.lineWidth = 0.07;
        strokeColors({
          context,
          pathShape: titlePath,
          repeatCount: 3,
          relativeOffset: -progress * 3,
        });
        context.lineCap = "butt";
        strokeColors({
          context,
          pathShape: sineWaveBase,
          colors: ["rgb(0, 128, 255)", "rgb(0, 64, 255)", "rgb(0, 0, 255)"],
          sectionLength: 0.125,
          relativeOffset: -progress * 10,
        });
        context.strokeStyle = "pink";
        context.setLineDash([0.125]);
        ((context.lineDashOffset = (-progress * 10) / 3),
          context.stroke(sineWaveBase.translate(0, 1).canvasPath));
        context.setLineDash([]);
        context.lineCap = "round";
        context.lineJoin = "miter";
        strokeColors({
          context,
          pathShape: starPath,
          repeatCount: 2,
          relativeOffset: progress * 2,
        });
        context.lineWidth = 0.03;
        strokeColors({
          context,
          pathShape: statueOfLibertyPath,
          colors: ["#01413e", "#297d6f", "#8fd7c4", "#d7ffff"],
          sectionLength: 0.05,
          offset: progress * 3,
        });
        context.lineWidth = 0.4;
        endsAndCorners.forEach(
          ({ pathShape, colors, lineCap, lineJoin }, index, array) => {
            context.lineCap = lineCap;
            context.lineJoin = lineJoin;
            strokeColors({
              context,
              pathShape,
              colors,
              repeatCount: 5,
              relativeOffset: progress * -10 + index / array.length / 2,
            });
          },
        );
      },
    };
    scene.add(showable);
  }
  return scene.build();
}
