import { makeLineFont } from "canvas-recorder-lib/src/glib/line-font";

/**
 * Settings that many of the showcase's slides use.
 * Anything only one slide uses stays in that slide's file.
 * @module
 */

/** The font for most slides' titles. */
export const titleFont = makeLineFont(0.7);

/** Space around the edge of a slide, in units. */
export const margin = 0.25;

/**
 * Default display time for a static showcase slide (no internal animation).
 * Used as the duration for content items added to a MakeShowableInParallel
 * group that is itself placed in the top-level series.
 *
 * Reminder: duration=0 is fine *inside* a parallel group (the group's total
 * duration is the max of all children, so 0-duration children run for however
 * long the group lasts).  But every MakeShowableInParallel group that goes
 * into a series needs at least one child with a nonzero duration — otherwise
 * the series allocates zero time to it and the GUI hides it entirely.
 */
export const DEFAULT_SLIDE_DURATION_MS = 10_000;

/**
 * Default pre-roll: how long to hold a slide before the main action begins.
 * Gives the viewer a moment to orient before anything moves.
 */
export const DEFAULT_PRE_ROLL_MS = 1_500;

/**
 * Default post-roll: how long to hold a slide after the main action ends.
 * Gives the viewer a moment to absorb the final state before the cut.
 */
export const DEFAULT_POST_ROLL_MS = 2_000;
