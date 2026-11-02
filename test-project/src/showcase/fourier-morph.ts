import { ParagraphLayout } from "canvas-recorder-lib/src/glib/paragraph-layout";
import { myRainbow } from "canvas-recorder-lib/src/glib/my-rainbow";
import { LCommand, PathShape } from "canvas-recorder-lib/src/glib/path-shape";
import { ease } from "canvas-recorder-lib/src/interpolate";
import {
  Complex,
  createFourierAnimation,
  FourierTerm,
  makePolygon,
  numberOfFourierSamples,
  samplesFromPath,
  samplesToFourier,
  termsToParametricFunction,
} from "canvas-recorder-lib/src/peano-fourier/fourier-shared";
import {
  MakeShowableInParallel,
  Showable,
} from "canvas-recorder-lib/src/showable";
import {
  FourierSource,
  orderTerms,
} from "canvas-recorder-lib/src/slide-components/fourier";
import {
  initializedArray,
  makeBoundedLinear,
  makeLinear,
  sum,
} from "phil-lib/misc";
import {
  DEFAULT_POST_ROLL_MS,
  DEFAULT_PRE_ROLL_MS,
  titleFont,
} from "./shared.ts";

/**
 * Fourier Morph:  turn one shape into another with the Fourier "dance".
 *
 * Take two closed curves, **before** and **after**, and the difference between them, after − before.
 * Decompose the difference into a Fourier series.
 * Then draw before + the difference's partial sum, adding the terms a group at a time,
 * with the same sweep the Fourier component uses to grow a curve.
 * With no terms it's exactly before.  With all of them, it's exactly after.
 *
 * An experiment.  The interesting knob is which terms go in which group.
 * @module
 */

// MARK: The math

/**
 * Before and after, sampled at the same `t` values:  `t = i / sampleCount`.
 *
 * Paths go through samplesFromPath(), which always samples each corner, so a polyline through
 * the samples is exactly the original polygon.
 *
 * A parametric function is sampled at `i / sampleCount`, not `i / (sampleCount - 1)` like
 * samplesFromParametric():  for a closed curve, the last sample would repeat the first.
 */
function samplesOf(source: FourierSource, sampleCount: number): Complex[] {
  if ("path" in source) {
    const samples = samplesFromPath(source.path, sampleCount);
    if (samples.length !== sampleCount) {
      throw new Error(
        `samplesFromPath() returned ${samples.length} samples, not ${sampleCount}.`,
      );
    }
    return samples;
  }
  const f =
    "parametric" in source
      ? source.parametric
      : termsToParametricFunction(source.terms, source.terms.length);
  return initializedArray(sampleCount, (i) => {
    const { x, y } = f(i / sampleCount);
    return [x, y];
  });
}

/**
 * Copied from fourier-shared.ts, where it's private.
 * 0 before x1, 1 after x2, and eased in between.
 */
function makeEasing(x1: number, x2: number) {
  if (x1 >= x2) {
    throw new Error("wtf");
  }
  const inputMap = makeLinear(x1, 0, x2, 1);
  return (t: number) => {
    if (t <= x1) {
      return 0;
    } else if (t >= x2) {
      return 1;
    }
    return ease(inputMap(t));
  };
}

export type FourierMorphOptions = {
  /** Where to start.  Step 0 is exactly this. */
  readonly before: FourierSource;
  /** Where to end.  The last step is exactly this. */
  readonly after: FourierSource;
  /**
   * Which of the difference's terms each step adds, by size:  0 is the largest.
   * The default is three steps:  the largest term, then everything but the three largest, then
   * the second and third largest.  The middle group holds all the small terms, so it's the one
   * that fixes the corners.
   */
  readonly termGroups?: (termCount: number) => number[][];
};

/** The default for {@link FourierMorphOptions.termGroups}. */
export function defaultMorphGroups(termCount: number): number[][] {
  return [
    [0],
    initializedArray(Math.max(0, termCount - 3), (i) => i + 3),
    [1, 2],
  ];
}

/**
 * The animation from `before` to `after`.
 * @returns What createFourierAnimation() returns:  `duration`, and `getInfo(timeInMs)` for the
 * path at that time.  Also the difference's terms and the groups, for a report.
 */
export function createFourierMorph(options: FourierMorphOptions) {
  // Both sources say how many samples they want.  Use the bigger, for both, so they line up.
  const sampleCount = Math.max(
    ...[options.before, options.after].map((source) =>
      "sampleCount" in source
        ? (source.sampleCount ?? numberOfFourierSamples)
        : numberOfFourierSamples,
    ),
  );
  const before = samplesOf(options.before, sampleCount);
  const after = samplesOf(options.after, sampleCount);
  const difference = before.map(
    ([x, y], i): Complex => [after[i][0] - x, after[i][1] - y],
  );
  /** Sorted by size, largest first. */
  const terms = samplesToFourier(difference);
  const groups = (options.termGroups ?? defaultMorphGroups)(terms.length);
  const ordered = orderTerms(terms, groups);

  /**
   * The curve at each keyframe:  before, plus the first `keyframes[k]` ordered terms, at every
   * sample's `t`.  Computed once, so a frame only has to blend two of these.
   */
  const states = (() => {
    const x = Float64Array.from(before, ([x]) => x);
    const y = Float64Array.from(before, ([, y]) => y);
    const result: { x: Float64Array; y: Float64Array }[] = [];
    let added = 0;
    for (const keyframe of ordered.keyframes) {
      for (; added < keyframe; added++) {
        const { frequency, amplitude, phase } = ordered.terms[added];
        for (let i = 0; i < sampleCount; i++) {
          const angle = (2 * Math.PI * frequency * i) / sampleCount + phase;
          x[i] += amplitude * Math.cos(angle);
          y[i] += amplitude * Math.sin(angle);
        }
      }
      result.push({ x: x.slice(), y: y.slice() });
    }
    return result;
  })();

  /** A polyline through every sample, open at t = 0 and t = 1, like PathShape.parametric(). */
  function polyline(point: (i: number, t: number) => { x: number; y: number }) {
    const commands: LCommand[] = [];
    let previous = point(0, 0);
    for (let j = 1; j <= sampleCount; j++) {
      const next = point(j % sampleCount, j / sampleCount);
      commands.push(new LCommand(previous.x, previous.y, next.x, next.y));
      previous = next;
    }
    return new PathShape(commands);
  }

  /**
   * One function per transition, from progress (0 to 1) to the path.
   * The sweep is getAnimationRules()'s common case:  a soft boundary moves from t = 0 to
   * t = 1.  Behind it the new terms are in, ahead of it they're not.
   */
  const rules = initializedArray(
    ordered.keyframes.length - 1,
    (index): ((progress: number) => PathShape) => {
      const from = states[index];
      const to = states[index + 1];
      const staticPath = (state: typeof from) =>
        polyline((i) => ({ x: state.x[i], y: state.y[i] }));
      const start = ordered.keyframes[index];
      const end = ordered.keyframes[index + 1];
      if (start === end) {
        const path = staticPath(from);
        return () => path;
      }
      // orderTerms() puts frequency 0 last in a group, so this is 0 only if the whole group is.
      const firstInterestingFrequency =
        Math.abs(ordered.terms[start].frequency) || 1;
      /** The width of the soft boundary, in t. */
      const r = 0.2 / firstInterestingFrequency;
      const tToCenter = makeBoundedLinear(0, -r, 1, 1 + r);
      const fromPath = staticPath(from);
      const toPath = staticPath(to);
      return (progress: number): PathShape => {
        if (progress <= 0) return fromPath;
        if (progress >= 1) return toPath;
        const centerOfChange = tToCenter(progress);
        const getFraction = makeEasing(centerOfChange - r, centerOfChange + r);
        return polyline((i, t) => {
          const fraction = 1 - getFraction(t);
          return {
            x: from.x[i] + fraction * (to.x[i] - from.x[i]),
            y: from.y[i] + fraction * (to.y[i] - from.y[i]),
          };
        });
      };
    },
  );
  return { ...createFourierAnimation(rules), terms, groups, ordered };
}

/**
 * Print the difference's terms, and how much of the total amplitude each group has.
 * Ideally each step would move about the same amount.
 */
function reportTerms(
  title: string,
  terms: readonly FourierTerm[],
  groups: readonly (readonly number[])[],
) {
  const groupOf = new Map<number, number>();
  groups.forEach((group, index) =>
    group.forEach((term) => {
      if (!groupOf.has(term)) groupOf.set(term, index + 1);
    }),
  );
  const totalAmplitude = sum(terms.map((term) => term.amplitude));
  console.log(
    `${title}:  ${terms.length} terms, total amplitude (sum of the radii) ${totalAmplitude.toFixed(4)}`,
  );
  console.table(
    groups.map((group, index) => {
      const amplitude = sum(
        group
          .filter((term) => term < terms.length)
          .map((term) => terms[term].amplitude),
      );
      return {
        group: index + 1,
        terms: group.length,
        amplitude: Number(amplitude.toFixed(4)),
        "% of total": Number(((100 * amplitude) / totalAmplitude).toFixed(1)),
      };
    }),
  );
  console.groupCollapsed(`${title}:  every term, largest first`);
  console.table(
    terms.map((term, index) => ({
      term: index,
      group: groupOf.get(index),
      frequency: term.frequency,
      amplitude: Number(term.amplitude.toFixed(6)),
      phase: Number(term.phase.toFixed(4)),
      "% of total": Number(
        ((100 * term.amplitude) / totalAmplitude).toFixed(2),
      ),
    })),
  );
  console.groupEnd();
}

// MARK: The slide

/** Where both shapes go.  The animation can wander outside of it. */
const DEST_RECT = { x: 5, y: 1.5, width: 6, height: 6.5 };

/** A square, starting at the middle of the top and going clockwise. */
const square = PathShape.fromRawString(
  "M 0,-1 L 1,-1 L 1,1 L -1,1 L -1,-1 L 0,-1",
);

/**
 * A 5 pointed star, drawn as 5 overlapping lines, starting at the top point and going
 * clockwise.  makePolygon() starts on the right, so turn it.
 */
const pentagram = makePolygon(5, 1, "unused", 0).transform(
  new DOMMatrix().rotate(-90),
);

/** The "Fourier Morph" slide. */
export function fourierMorph(): Showable {
  // Swap these out to try other shapes.  Any FourierSource works:  a path, a parametric
  // function, or terms.  makeItFit() puts each one in the same place, the same size.
  const before: FourierSource = { path: square.makeItFit(DEST_RECT, "meet") };
  const after: FourierSource = { path: pentagram.makeItFit(DEST_RECT, "meet") };

  const morph = createFourierMorph({ before, after });
  reportTerms("Fourier Morph", morph.terms, morph.groups);

  const scene = new MakeShowableInParallel("Fourier Morph");
  const titlePath = ParagraphLayout.singlePathShape({
    text: "Fourier Morph",
    font: titleFont,
    alignment: "center",
    width: 16,
  }).canvasPath;
  scene.add({
    description: "morph",
    duration: DEFAULT_PRE_ROLL_MS + morph.duration + DEFAULT_POST_ROLL_MS,
    show({ context, timeInMs }) {
      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = titleFont.strokeWidth;
      context.strokeStyle = myRainbow.myBlue;
      context.stroke(titlePath);
      const { pathShape } = morph.getInfo(timeInMs - DEFAULT_PRE_ROLL_MS);
      context.lineWidth = 0.06;
      context.strokeStyle = myRainbow.yellow;
      context.stroke(pathShape.canvasPath);
    },
  });
  return scene.build();
}
