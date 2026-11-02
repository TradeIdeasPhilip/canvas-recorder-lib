import { Showable } from "canvas-recorder-lib";
import { blackBackground } from "canvas-recorder-lib/src/utility";
import { InParallelComponent } from "canvas-recorder-lib/src/slide-components/in-parallel";
import { InSeriesComponent } from "canvas-recorder-lib/src/slide-components/in-series";
import { simpleAnimatedColors } from "./animated-colors.ts";
import { bezierLineIntersects } from "./bezier-line-intersects.ts";
import { calligraphyEffect } from "./calligraphy.ts";
import { colorPairReadability } from "./color-pair-readability.ts";
import { crossFade } from "./cross-fade.ts";
import { easingFunctions } from "./easing-functions.ts";
import { flowersWithNPetals } from "./flowers.ts";
import { fontSamples } from "./font-samples.ts";
import { formattingPiecesOfText } from "./formatting-text.ts";
import { fourierComponent } from "./fourier-component.ts";
import {
  fourierMorph,
  fourierMorphViaCircle,
  fourierMorphViaHalfway,
  fourierMorphViaMean,
} from "./fourier-morph.ts";
import { functionGraphing } from "./function-graphing.ts";
import { heartCurve } from "./heart-curve.ts";
import { imageSlide } from "./image.ts";
import { latticeProperty } from "./lattice.ts";
import { lissajousArrow } from "./lissajous-arrow.ts";
import { lissajousSpirals } from "./lissajous-spirals.ts";
import { morphingText } from "./morphing-text.ts";
import { multiTextAlignment } from "./multi-text-alignment.ts";
import { multiTextAutoSize } from "./multi-text-auto-size.ts";
import { multiTextFitABox } from "./multi-text-fit-a-box.ts";
import { multiTextFrame } from "./multi-text-frame.ts";
import { multiTextHeightMode } from "./multi-text-height-mode.ts";
import { multiTextMayGrow } from "./multi-text-may-grow.ts";
import { multiTextPleaseCheck } from "./multi-text-please-check.ts";
import { multiTextRotation } from "./multi-text-rotation.ts";
import { multiTextWidthMode } from "./multi-text-width-mode.ts";
import { offsetPath } from "./offset-path.ts";
import { outlineSlideTemplate } from "./outline-slide-template.ts";
import { dotsAndDashes } from "./path-splitter.ts";
import { phiContinuedFraction } from "./phi-continued-fraction.ts";
import { piContinuedFraction } from "./pi-continued-fraction.ts";
import { rainbowColorSpacing } from "./rainbow-color-spacing.ts";
import { ridiculouslySimpleFourier } from "./ridiculously-simple-fourier.ts";
import { roundingCorners } from "./rounding-corners.ts";
import { rule30 } from "./rule-30.ts";
import { simpleTextAndLayout } from "./simple-text-and-layout.ts";
import { strokableFontList } from "./strokable-font-list.ts";

/**
 * The showcase:  every slide, in order.
 *
 * Each slide is in its own file in this folder, and each file exports one function that builds
 * that slide.  This file decides which slides are shown, and in what order, all in one place.
 * To add a slide, add a file, then add its function to {@link showcaseSlides}.
 *
 * Some of my examples constantly change as I try new things.
 * These are examples that will stick around, so I can easily see how I did something in the past.
 * @module
 */

/**
 * Each slide's maker, in the order they play.
 *
 * Not read-only:  a main program can push more slides before calling {@link makeShowcase}.
 *
 * Not on the list:  `freakyDotPatterns()` in freaky-dots.ts.  It's not ready.
 */
export const showcaseSlides: (() => Showable)[] = [
  simpleTextAndLayout,
  ridiculouslySimpleFourier,
  heartCurve,
  lissajousSpirals,
  lissajousArrow,
  offsetPath,
  flowersWithNPetals,
  strokableFontList,
  fontSamples,
  formattingPiecesOfText,
  simpleAnimatedColors,
  calligraphyEffect,
  fourierComponent,
  fourierMorph,
  fourierMorphViaHalfway,
  fourierMorphViaMean,
  fourierMorphViaCircle,
  functionGraphing,
  morphingText,
  dotsAndDashes,
  phiContinuedFraction,
  piContinuedFraction,
  easingFunctions,
  outlineSlideTemplate,
  imageSlide,
  bezierLineIntersects,
  crossFade,
  roundingCorners,
  rainbowColorSpacing,
  colorPairReadability,
  rule30,
  latticeProperty,
  multiTextFrame,
  multiTextWidthMode,
  multiTextHeightMode,
  multiTextAlignment,
  multiTextMayGrow,
  multiTextFitABox,
  multiTextAutoSize,
  multiTextRotation,
  multiTextPleaseCheck,
];

/** The whole showcase:  a black background, and the slides one after another. */
export function makeShowcase(): Showable {
  const sceneList = new InSeriesComponent({ description: "Scene List" });
  for (const makeSlide of showcaseSlides) {
    sceneList.add(makeSlide());
  }
  const showcase = new InParallelComponent("Showcase");
  showcase.add(blackBackground);
  showcase.add(sceneList);
  return showcase;
}
