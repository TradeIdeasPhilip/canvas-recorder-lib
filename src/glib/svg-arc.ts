/**
 * An SVG arc (the `A` and `a` path commands), as cubic Bézier curves.
 *
 * Pure math, with no dependencies, so it can be tested on its own.
 * See {@link svgPathSegments} for the caller.
 * @module
 */

/** One cubic Bézier curve.  It starts where the previous one ended. */
export type CubicCurve = {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly x: number;
  readonly y: number;
};

/**
 * Turn one SVG elliptical arc into cubic curves, each covering at most a quarter turn.
 * A full circle is four curves, off by about 0.03% of the radius.
 *
 * This is the endpoint to center conversion from the SVG specification, section F.6.5, and the
 * out of range rules from F.6.6.
 * Both are mostly translated directly, so the names match the specification.
 *
 * Out of range input is handled the way the specification says, not as an error:
 * * Negative radii are made positive.
 * * Radii too small to reach the end point are scaled up until they just reach it.
 * * Both ends in the same place means there's no arc, and an empty array.
 * * A radius of 0 means a straight line.  The caller has to check for that.  Not allowed here.
 * @param x0 Where the arc starts.
 * @param y0 Where the arc starts.
 * @param rx The ellipse's radius, before rotating it.
 * @param ry The ellipse's radius, before rotating it.  Not 0.
 * @param xAxisRotationDegrees How far the ellipse is turned, clockwise on the screen.
 * @param largeArc Of the two arcs that fit, choose the one that's longer than a half turn.
 * @param sweep Go clockwise on the screen (y down), as `true`.
 * @param x Where the arc ends.
 * @param y Where the arc ends.
 */
export function arcToCubics(
  x0: number,
  y0: number,
  rx: number,
  ry: number,
  xAxisRotationDegrees: number,
  largeArc: boolean,
  sweep: boolean,
  x: number,
  y: number,
): CubicCurve[] {
  if (x0 === x && y0 === y) {
    return [];
  }
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  if (!(rx > 0 && ry > 0)) {
    throw new Error("arcToCubics(): a radius of 0 is a straight line.");
  }
  const φ = (xAxisRotationDegrees * Math.PI) / 180;
  const cosφ = Math.cos(φ);
  const sinφ = Math.sin(φ);

  // F.6.5 step 1:  the start point, in a frame centered halfway between the ends, aligned with the ellipse.
  const dx2 = (x0 - x) / 2;
  const dy2 = (y0 - y) / 2;
  const x1p = cosφ * dx2 + sinφ * dy2;
  const y1p = -sinφ * dx2 + cosφ * dy2;

  // F.6.6 step 3:  if the radii can't reach, grow them.  The center is then halfway between the ends.
  const λ = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (λ > 1) {
    const scale = Math.sqrt(λ);
    rx *= scale;
    ry *= scale;
  }

  // Step 2:  the center, in that frame.
  const rx2 = rx * rx;
  const ry2 = ry * ry;
  const numerator = rx2 * ry2 - rx2 * y1p * y1p - ry2 * x1p * x1p;
  const denominator = rx2 * y1p * y1p + ry2 * x1p * x1p;
  // Rounding can make this a tiny negative number when the radii were just scaled up.
  const root = Math.sqrt(Math.max(0, numerator / denominator));
  const coefficient = largeArc === sweep ? -root : root;
  const cxp = (coefficient * rx * y1p) / ry;
  const cyp = (-coefficient * ry * x1p) / rx;

  // Step 3:  the center, in the real coordinates.
  const cx = cosφ * cxp - sinφ * cyp + (x0 + x) / 2;
  const cy = sinφ * cxp + cosφ * cyp + (y0 + y) / 2;

  // Step 4:  the start angle, and how far to sweep.
  const ux = (x1p - cxp) / rx;
  const uy = (y1p - cyp) / ry;
  const vx = (-x1p - cxp) / rx;
  const vy = (-y1p - cyp) / ry;
  const θ1 = Math.atan2(uy, ux);
  let Δθ = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  if (!sweep && Δθ > 0) {
    Δθ -= 2 * Math.PI;
  } else if (sweep && Δθ < 0) {
    Δθ += 2 * Math.PI;
  }

  // Each curve covers at most a quarter turn.  The small allowance keeps 90.00000001° from making two.
  const count = Math.max(1, Math.ceil(Math.abs(Δθ) / (Math.PI / 2) - 1e-9));
  const δ = Δθ / count;
  // The distance from each end to its control point, as a fraction of the tangent's length.
  const k = (4 / 3) * Math.tan(δ / 4);

  const pointAt = (θ: number) => {
    const cosθ = Math.cos(θ);
    const sinθ = Math.sin(θ);
    return {
      x: cx + rx * cosθ * cosφ - ry * sinθ * sinφ,
      y: cy + rx * cosθ * sinφ + ry * sinθ * cosφ,
      // The derivative with respect to θ.
      dx: -rx * sinθ * cosφ - ry * cosθ * sinφ,
      dy: -rx * sinθ * sinφ + ry * cosθ * cosφ,
    };
  };

  const result: CubicCurve[] = [];
  let start = pointAt(θ1);
  for (let i = 1; i <= count; i++) {
    const end = pointAt(θ1 + i * δ);
    result.push({
      x1: start.x + k * start.dx,
      y1: start.y + k * start.dy,
      x2: end.x - k * end.dx,
      y2: end.y - k * end.dy,
      // The last one lands exactly where the command said, not where the arithmetic did.
      x: i === count ? x : end.x,
      y: i === count ? y : end.y,
    });
    start = end;
  }
  return result;
}
