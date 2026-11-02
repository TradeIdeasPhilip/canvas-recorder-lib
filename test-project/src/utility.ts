/**
 * Small helpers for this project, and fixes waiting to go back into phil-lib.
 * @module
 */

// TODO copy this to phil-lib/misc.ts:  the only change is `readonly`.
/** The total of some numbers.  0 for an empty list. */
export function sum(items: readonly number[]): number {
  return items.reduce((accumulator, current) => accumulator + current, 0);
}
