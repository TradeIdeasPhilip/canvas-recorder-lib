import { ParagraphLayout } from "canvas-recorder-lib/src/glib/paragraph-layout";
import { myRainbow } from "canvas-recorder-lib/src/glib/my-rainbow";
import { LCommand, PathShape } from "canvas-recorder-lib/src/glib/path-shape";
import { ease } from "canvas-recorder-lib/src/interpolate";
import {
  Complex,
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
  DurationAgnosticComponent,
  Scalar,
  ShowOptions,
} from "canvas-recorder-lib";
import {
  FourierSource,
  orderTerms,
  parseTermGroups,
} from "canvas-recorder-lib/src/slide-components/fourier";
import { ParallelChildInfo } from "canvas-recorder-lib/src/slide-components/in-parallel";
import { Mutable } from "canvas-recorder-lib/src/utility";
import { initializedArray, makeBoundedLinear, makeLinear } from "phil-lib/misc";
import { sum } from "../utility.ts";
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
 * Optionally the morph goes through one or more shapes in between, e.g. a round one, so the
 * corners of before can go away before the corners of after arrive.  Each leg of the trip is
 * its own morph, with its own difference and its own terms.
 *
 * An experiment.  The interesting knobs are the shapes in between, and which terms go in which
 * group.
 * @module
 */

// MARK: Samples

/**
 * A closed curve, as points at `t = i / samples.length`.
 * Every shape in a morph has the same number of samples, so the points line up.
 */
type Samples = readonly Complex[];

/**
 * A shape, sampled at `t = i / sampleCount`.
 *
 * Paths go through samplesFromPath(), which always samples each corner, so a polyline through
 * the samples is exactly the original polygon.
 *
 * A parametric function is sampled at `i / sampleCount`, the same as samplesFromParametric(),
 * but without its power-of-2 check.
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

/** The sum of these terms at each sample's `t`, added to `base`, or to 0. */
function addTerms(
  terms: readonly FourierTerm[],
  sampleCount: number,
  base?: Samples,
): Complex[] {
  return initializedArray(sampleCount, (i): Complex => {
    let x = base ? base[i][0] : 0;
    let y = base ? base[i][1] : 0;
    for (const { frequency, amplitude, phase } of terms) {
      const angle = (2 * Math.PI * frequency * i) / sampleCount + phase;
      x += amplitude * Math.cos(angle);
      y += amplitude * Math.sin(angle);
    }
    return [x, y];
  });
}

/**
 * The largest terms, until they add up to at least `share` of the total amplitude.
 * `terms` must be largest first, the way samplesToFourier() returns them.
 */
function largestTerms(terms: readonly FourierTerm[], share: number) {
  const goal = share * sum(terms.map((term) => term.amplitude));
  const result: FourierTerm[] = [];
  let total = 0;
  for (const term of terms) {
    if (total >= goal) break;
    result.push(term);
    total += term.amplitude;
  }
  return result;
}

// MARK: Shapes in between

/**
 * Makes a shape for the morph to pass through, from the morph's before and after.
 * The result must have the same number of samples.
 */
export type MiddleShape = (before: Samples, after: Samples) => Complex[];

/**
 * Round off a shape:  decompose it, and keep only its largest terms.
 * Corners are made of the small terms, so they go away.
 * @param keepAmplitude Keep the largest terms, until they add up to at least this share of the
 * total amplitude.  0.85 throws away the bottom 15%.
 */
export function roundShape(samples: Samples, keepAmplitude = 0.85): Complex[] {
  const terms = samplesToFourier(samples);
  return addTerms(largestTerms(terms, keepAmplitude), samples.length);
}

/** A {@link MiddleShape}, rounded off with {@link roundShape}. */
export function rounded(
  middle: MiddleShape,
  keepAmplitude = 0.85,
): MiddleShape {
  return (before, after) => roundShape(middle(before, after), keepAmplitude);
}

/**
 * Before, plus the largest terms of the difference, up to `share` of its total amplitude.
 * Arguably half way between before and after, and it looks like the in between states of the
 * one step morph.  It still has before's corners, so round it off with {@link rounded}.
 */
export function halfwayByFourier(share = 0.5): MiddleShape {
  return (before, after) => {
    const difference = before.map(([x, y], i): Complex => [
      after[i][0] - x,
      after[i][1] - y,
    ]);
    const terms = largestTerms(samplesToFourier(difference), share);
    return addTerms(terms, before.length, before);
  };
}

/** The average of before and after, point by point. */
export const meanShape: MiddleShape = (before, after) =>
  before.map(([x, y], i): Complex => [
    (x + after[i][0]) / 2,
    (y + after[i][1]) / 2,
  ]);

/**
 * A circle, starting at the top and going clockwise, like the square and the pentagram.
 * Centered on the average of all the points, with their average distance from there as its
 * radius.
 */
export const circleShape: MiddleShape = (before, after) => {
  const all = [...before, ...after];
  const centerX = sum(all.map(([x]) => x)) / all.length;
  const centerY = sum(all.map(([, y]) => y)) / all.length;
  const radius =
    sum(all.map(([x, y]) => Math.hypot(x - centerX, y - centerY))) / all.length;
  return initializedArray(before.length, (i): Complex => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / before.length;
    return [
      centerX + radius * Math.cos(angle),
      centerY + radius * Math.sin(angle),
    ];
  });
};

/**
 * Decompose before and after, and for each frequency keep whichever term is bigger.
 * Nothing shrinks in the middle:  each of the big circles from both shapes is there, at full
 * size.  It has corners from both shapes, so round it off with {@link rounded}.
 */
export const maxAmplitudeShape: MiddleShape = (before, after) => {
  const strongest = new Map<number, FourierTerm>();
  for (const term of [
    ...samplesToFourier(before),
    ...samplesToFourier(after),
  ]) {
    const existing = strongest.get(term.frequency);
    if (!existing || term.amplitude > existing.amplitude) {
      strongest.set(term.frequency, term);
    }
  }
  return addTerms([...strongest.values()], before.length);
};

// MARK: Term groups

/**
 * Split the terms into groups with about the same total amplitude, so each step moves about
 * the same amount.  Greedy:  starting from the largest term, add each term to the group with
 * the smallest total so far.  A tie goes to the earlier group.
 */
export function balancedMorphGroups(
  terms: readonly FourierTerm[],
  groupCount = 2,
): number[][] {
  const groups = initializedArray(groupCount, (): number[] => []);
  const totals = new Array<number>(groupCount).fill(0);
  terms.forEach((term, index) => {
    const smallest = totals.indexOf(Math.min(...totals));
    groups[smallest].push(index);
    totals[smallest] += term.amplitude;
  });
  return groups;
}

/**
 * Small changes first and last, the biggest in the middle, like ease-in-out.
 *
 * `weights` is each step's share of the total amplitude, in order.
 * The step with the biggest weight gets whatever is left over.
 * The others are filled first, smallest weight first (a tie goes to the earlier step), each
 * from the smallest terms still unused, as close to its share as possible without going over.
 * The small terms are the ones we can always get close to perfect, so the middle can vary
 * without changing the basic shape.
 */
export function weightedMorphGroups(
  terms: readonly FourierTerm[],
  weights: readonly number[] = [0.05, 0.1, 0.7, 0.1, 0.05],
): number[][] {
  const totalAmplitude = sum(terms.map((term) => term.amplitude));
  const totalWeight = sum(weights);
  const middle = weights.indexOf(Math.max(...weights));
  /** Unused term numbers, smallest amplitude first. */
  const unused = terms.map((_, index) => index).reverse();
  const groups = weights.map((): number[] => []);
  const fillOrder = weights
    .map((weight, index) => ({ weight, index }))
    .filter(({ index }) => index !== middle)
    .sort((a, b) => a.weight - b.weight || a.index - b.index);
  for (const { weight, index } of fillOrder) {
    const goal = (totalAmplitude * weight) / totalWeight;
    let total = 0;
    // Smallest first, so once one doesn't fit, none of the rest will.
    while (unused.length > 0 && total + terms[unused[0]].amplitude <= goal) {
      const term = unused.shift()!;
      groups[index].push(term);
      total += terms[term].amplitude;
    }
  }
  groups[middle].push(...unused);
  // Largest first within each group.  getAnimationRules() times a step by its first term.
  groups.forEach((group) => group.sort((a, b) => a - b));
  return groups;
}

/**
 * The Fourier component's default Term Groups, `0, 1, 2, 3, 4, 5-9, 10-19, 20-39`, then all of
 * the rest in one last group, so the morph ends exactly at after.
 * The biggest changes first and the smallest last, like ease-out.
 */
export function fourierComponentGroups(
  terms: readonly FourierTerm[],
): number[][] {
  const groups = parseTermGroups("0, 1, 2, 3, 4, 5-9, 10-19, 20-39").groups.map(
    (group) => [...group],
  );
  groups.push(initializedArray(Math.max(0, terms.length - 40), (i) => i + 40));
  return groups;
}

/**
 * The first version's grouping, three steps:  the largest term, then everything but the three
 * largest, then the second and third largest.  The middle group holds all the small terms, so
 * it's the one that fixes the corners.
 */
export function threeStepMorphGroups(
  terms: readonly FourierTerm[],
): number[][] {
  return [
    [0],
    initializedArray(Math.max(0, terms.length - 3), (i) => i + 3),
    [1, 2],
  ];
}

// MARK: The morph

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

/** Which of the difference's terms each step adds, by size:  0 is the largest. */
export type TermGrouper = (terms: readonly FourierTerm[]) => number[][];

export type FourierMorphOptions = {
  /** Where to start.  Step 0 is exactly this. */
  readonly before: FourierSource;
  /** Where to end.  The last step is exactly this. */
  readonly after: FourierSource;
  /** Shapes to pass through on the way, in order.  The default is none. */
  readonly via?: readonly MiddleShape[];
  /**
   * How to group each leg's terms into steps.  Given the terms, largest first.
   * The default is {@link weightedMorphGroups}, with its default weights.
   */
  readonly termGroups?: TermGrouper;
};

/** A curve at every sample's `t`. */
type State = { readonly x: Float64Array; readonly y: Float64Array };

/** One step of a morph:  a sweep from one state to the next. */
type Step = {
  readonly from: State;
  readonly to: State;
  /**
   * The width of the sweep's soft boundary, in t.
   * Undefined when the step adds no terms, so nothing moves.
   */
  readonly r: number | undefined;
};

/** One leg of the trip:  one shape to the next, one decomposition. */
type Leg = {
  /** The difference's terms, largest first. */
  readonly terms: readonly FourierTerm[];
  readonly groups: readonly (readonly number[])[];
  readonly steps: readonly Step[];
  /** One function per step, from progress (0 to 1) to the path. */
  readonly rules: readonly ((progress: number) => PathShape)[];
};

/** A polyline through every sample, open at t = 0 and t = 1, like PathShape.parametric(). */
function polyline(
  sampleCount: number,
  point: (i: number, t: number) => { x: number; y: number },
) {
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
 * How much of a step's change is in at each `t`, at this point in the step.
 *
 * The sweep is getAnimationRules()'s common case:  a soft boundary moves from t = 0 to
 * t = 1.  Behind it the new terms are in (1), ahead of it they're not (0).
 */
function sweepAt(step: Step, progress: number): (t: number) => number {
  const r = step.r;
  if (r === undefined || progress <= 0) return () => 0;
  if (progress >= 1) return () => 1;
  const centerOfChange = makeBoundedLinear(0, -r, 1, 1 + r)(progress);
  const getFraction = makeEasing(centerOfChange - r, centerOfChange + r);
  return (t) => 1 - getFraction(t);
}

function createLeg(from: Samples, to: Samples, termGroups: TermGrouper): Leg {
  const sampleCount = from.length;
  const difference = from.map(([x, y], i): Complex => [
    to[i][0] - x,
    to[i][1] - y,
  ]);
  const terms = samplesToFourier(difference);
  const groups = termGroups(terms);
  const ordered = orderTerms(terms, groups);

  /**
   * The curve at each keyframe:  `from`, plus the first `keyframes[k]` ordered terms, at every
   * sample's `t`.  Computed once, so a frame only has to blend these.
   */
  const states = (() => {
    const x = Float64Array.from(from, ([x]) => x);
    const y = Float64Array.from(from, ([, y]) => y);
    const result: State[] = [];
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

  const steps = initializedArray(
    ordered.keyframes.length - 1,
    (index): Step => {
      const start = ordered.keyframes[index];
      const end = ordered.keyframes[index + 1];
      // orderTerms() puts frequency 0 last in a group, so this is 0 only if the whole group is.
      const firstInterestingFrequency =
        start === end ? 0 : Math.abs(ordered.terms[start].frequency) || 1;
      return {
        from: states[index],
        to: states[index + 1],
        r: start === end ? undefined : 0.2 / firstInterestingFrequency,
      };
    },
  );

  const rules = steps.map((step): ((progress: number) => PathShape) => {
    const { from, to } = step;
    const staticPath = (state: State) =>
      polyline(sampleCount, (i) => ({ x: state.x[i], y: state.y[i] }));
    const fromPath = staticPath(from);
    const toPath = step.r === undefined ? fromPath : staticPath(to);
    return (progress: number): PathShape => {
      if (progress <= 0 || step.r === undefined) return fromPath;
      if (progress >= 1) return toPath;
      const fractionAt = sweepAt(step, progress);
      return polyline(sampleCount, (i, t) => {
        const fraction = fractionAt(t);
        return {
          x: from.x[i] + fraction * (to.x[i] - from.x[i]),
          y: from.y[i] + fraction * (to.y[i] - from.y[i]),
        };
      });
    };
  });
  return { terms, groups, steps, rules };
}

/**
 * The morph from `before` to `after`, through any `via` shapes.
 * @returns Each leg's terms, groups and steps, and all of the steps in order.
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
  const shapes = [
    before,
    ...(options.via ?? []).map((middle) => middle(before, after)),
    after,
  ];
  const termGroups = options.termGroups ?? weightedMorphGroups;
  const legs = initializedArray(shapes.length - 1, (index) =>
    createLeg(shapes[index], shapes[index + 1], termGroups),
  );
  return {
    legs,
    rules: legs.flatMap((leg) => leg.rules),
    steps: legs.flatMap((leg) => leg.steps),
    sampleCount,
  };
}

/**
 * When each step plays.  Like createFourierAnimation() in fourier-shared.ts, but the times are
 * settings.
 * @param pauseMs Between steps.  0 for one continuous motion.
 */
function morphTimeline(
  rules: readonly ((progress: number) => PathShape)[],
  stepMs = 4000,
  pauseMs = 0,
) {
  const period = stepMs + pauseMs;
  const duration = rules.length * period - pauseMs;
  function pathAt(timeInMs: number): PathShape {
    if (timeInMs <= 0) return rules[0](0);
    if (timeInMs >= duration) return rules[rules.length - 1](1);
    const index = Math.floor(timeInMs / period);
    return rules[index](Math.min(1, (timeInMs - index * period) / stepMs));
  }
  return { duration, pathAt };
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

// MARK: The slides

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

/**
 * Every slide's before and after:  square to pentagram.
 * Swap the shapes out to try others.  Any FourierSource works:  a path, a parametric function,
 * or terms.  makeItFit() puts each one in the same place, the same size.
 */
function squareToPentagram(): Pick<FourierMorphOptions, "before" | "after"> {
  return {
    before: { path: square.makeItFit(DEST_RECT, "meet") },
    after: { path: pentagram.makeItFit(DEST_RECT, "meet") },
  };
}

/** Every leg's terms and groups, on the console. */
function reportMorph(
  title: string,
  morph: ReturnType<typeof createFourierMorph>,
) {
  morph.legs.forEach((leg, index) =>
    reportTerms(
      morph.legs.length === 1 ? title : `${title}, leg ${index + 1}`,
      leg.terms,
      leg.groups,
    ),
  );
}

function makeTitlePath(title: string) {
  return ParagraphLayout.singlePathShape({
    text: title,
    font: titleFont,
    alignment: "center",
    width: 16,
  }).canvasPath;
}

/** The title, and the morph as it is right now. */
function drawMorph(
  context: CanvasRenderingContext2D,
  titlePath: Path2D,
  pathShape: PathShape,
) {
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = titleFont.strokeWidth;
  context.strokeStyle = myRainbow.myBlue;
  context.stroke(titlePath);
  context.lineWidth = 0.06;
  context.strokeStyle = myRainbow.yellow;
  context.stroke(pathShape.canvasPath);
}

/** A slide showing one morph, square to pentagram, one step at a time. */
function morphSlide(
  title: string,
  options: Omit<FourierMorphOptions, "before" | "after">,
  pauseMs: number,
): Showable {
  const morph = createFourierMorph({ ...squareToPentagram(), ...options });
  reportMorph(title, morph);
  const timeline = morphTimeline(morph.rules, 4000, pauseMs);
  const titlePath = makeTitlePath(title);
  const scene = new MakeShowableInParallel(title);
  scene.add({
    description: "morph",
    duration: DEFAULT_PRE_ROLL_MS + timeline.duration + DEFAULT_POST_ROLL_MS,
    show({ context, timeInMs }) {
      drawMorph(
        context,
        titlePath,
        timeline.pathAt(timeInMs - DEFAULT_PRE_ROLL_MS),
      );
    },
  });
  return scene.build();
}

/**
 * The "Fourier Morph" slide:  one leg, five steps, small changes first and last.
 * Try other groupings, e.g. `termGroups: (terms) => weightedMorphGroups(terms, [0.1, 0.8, 0.1])`,
 * `termGroups: balancedMorphGroups`, or `termGroups: threeStepMorphGroups`.
 */
export function fourierMorph(): Showable {
  return morphSlide("Fourier Morph", {}, 500);
}

/**
 * The "Fourier Morph w/ ease-out" slide:  one leg, with the terms in the same groups the Fourier
 * component uses.  Biggest first, then the small ones in bigger and bigger groups.
 */
export function fourierMorphEaseOut(): Showable {
  return morphSlide(
    "Fourier Morph w/ ease-out",
    { termGroups: fourierComponentGroups },
    500,
  );
}

/**
 * Two legs through a round shape in between, two balanced steps each, with no pauses.
 * The middle shape is the only difference between these slides.
 */
const viaOptions = { termGroups: balancedMorphGroups } as const;

/**
 * The "Fourier Morph via Halfway" slide:  through the largest half of the difference,
 * rounded off.
 */
export function fourierMorphViaHalfway(): Showable {
  return morphSlide(
    "Fourier Morph via Halfway",
    { ...viaOptions, via: [rounded(halfwayByFourier(0.5))] },
    0,
  );
}

/** The "Fourier Morph via Mean" slide:  through the average of the two shapes, rounded off. */
export function fourierMorphViaMean(): Showable {
  return morphSlide(
    "Fourier Morph via Mean",
    { ...viaOptions, via: [rounded(meanShape)] },
    0,
  );
}

/** The "Fourier Morph via Circle" slide. */
export function fourierMorphViaCircle(): Showable {
  return morphSlide(
    "Fourier Morph via Circle",
    { ...viaOptions, via: [circleShape] },
    0,
  );
}

// MARK: Overlapping steps

/** How long one step's sweep takes. */
const STEP_MS = 4000;

/**
 * A morph whose steps can overlap in time, so parts of more than two steps show at once.
 *
 * Each step is a sweep that adds its change, a little at a time, along the curve.
 * The sweeps don't depend on each other, so each one adds its own share of its own change, and
 * any number of them can be running at once:  a cross fade applied to a cross fade.
 *
 * **Step Spacing**, in the Visual Editor, is the time from the start of one step to the start
 * of the next, measured in steps.  1 plays them one after another.  More adds a pause in
 * between.  Less overlaps them, and the whole morph is shorter.
 */
export class OverlappingFourierMorph extends DurationAgnosticComponent {
  readonly stepSpacingScalar: Scalar<"number">;
  /** Undefined only while the base class's constructor runs. */
  private readonly morph: ReturnType<typeof createFourierMorph> | undefined;
  private readonly titlePath: Path2D;
  /**
   * @param stepSpacing The starting value for Step Spacing.
   */
  constructor(title: string, options: FourierMorphOptions, stepSpacing = 0.5) {
    super(title);
    this.morph = createFourierMorph(options);
    reportMorph(title, this.morph);
    this.titlePath = makeTitlePath(title);
    this.stepSpacingScalar = this.makeNotifyingScalar(
      "number",
      "Step Spacing",
      stepSpacing,
    );
    this.scalars.push(this.stepSpacingScalar);
  }
  /** Step Spacing.  A negative spacing means nothing, so it's treated as 0. */
  private get stepSpacing() {
    return Math.max(0, this.stepSpacingScalar?.value ?? 1);
  }
  /** From the start of the first step to the end of the last. */
  private get morphDuration() {
    const stepCount = this.morph?.steps.length ?? 0;
    return ((stepCount - 1) * this.stepSpacing + 1) * STEP_MS;
  }
  protected override recomputeDuration(children: Mutable<ParallelChildInfo>[]) {
    return Math.max(
      super.recomputeDuration(children),
      DEFAULT_PRE_ROLL_MS + this.morphDuration + DEFAULT_POST_ROLL_MS,
    );
  }
  /** The morph at this time, 0 being the start of the first step. */
  private pathAt(timeInMs: number): PathShape | undefined {
    const morph = this.morph;
    if (!morph || morph.steps.length === 0) return undefined;
    const { steps, sampleCount } = morph;
    const start = steps[0].from;
    const spacingMs = this.stepSpacing * STEP_MS;
    const fractions = steps.map((step, index) =>
      sweepAt(step, (timeInMs - index * spacingMs) / STEP_MS),
    );
    return polyline(sampleCount, (i, t) => {
      let x = start.x[i];
      let y = start.y[i];
      steps.forEach((step, index) => {
        const fraction = fractions[index](t);
        if (fraction !== 0) {
          x += fraction * (step.to.x[i] - step.from.x[i]);
          y += fraction * (step.to.y[i] - step.from.y[i]);
        }
      });
      return { x, y };
    });
  }
  override show(options: ShowOptions): void {
    const pathShape = this.pathAt(options.timeInMs - DEFAULT_PRE_ROLL_MS);
    if (pathShape) drawMorph(options.context, this.titlePath, pathShape);
    super.show(options);
  }
}

/**
 * The "Fourier Morph Overlapping" slide:  the same as "Fourier Morph via Mean", but the steps
 * overlap.  Try different values of Step Spacing in the Visual Editor.
 */
export function fourierMorphOverlapping(): Showable {
  return new OverlappingFourierMorph("Fourier Morph Overlapping", {
    ...squareToPentagram(),
    ...viaOptions,
    via: [rounded(meanShape)],
  });
}

/**
 * The "Fourier Morph via Max Amplitude" slide:  like "Fourier Morph Overlapping", through
 * {@link maxAmplitudeShape}, rounded off, so the shape doesn't shrink in the middle.
 */
export function fourierMorphViaMaxAmplitude(): Showable {
  return new OverlappingFourierMorph("Fourier Morph via Max Amplitude", {
    ...squareToPentagram(),
    ...viaOptions,
    via: [rounded(maxAmplitudeShape)],
  });
}
