# Timeline Durations

The timeline doesn't always show when things really play.

**Status (2026-11-10):** Recorded only. Low priority until a serious release, or an epiphany. Worth fixing before sharing the editor widely.

## The case

7-pointed-star-shorts, Scratch 3 (`properties/7-pointed-star-shorts.txt` in that project), finished 2026-11-10:

- Scratch 3 has a fixed length: Min Duration 90 s.
- Inside it, four Fourier components: Star Circuit (its own Min Duration, 52.345 s), and Red, Blue and White (`FourierComponent`).
- Each one has a length of its own, so the timeline draws each as a shorter block.
- But they all play the whole 90 s, and their Step schedules keep changing long past the ends of their blocks (Step's last keyframe is at 90 000 ms in all four).

## The bigger problem

When components are stacked, it's very flexible about which one sets the length: a Min Duration, a child's length, a schedule's keyframes, the parent's length.
Sometimes that's too much freedom, and what the timeline shows doesn't match what plays.

## Related: a Padding Component inside a Parallel Component

The timeline is mostly right, but only when the padding shows nothing before and after (Show Before and Show After set to hide).
With freeze or live, the child draws outside the block the timeline shows.

## Notes

- The timeline's blocks are built by `_buildTimelineBlocks()` in [dev/canvas-recorder.ts](../dev/canvas-recorder.ts).
- If the fix changes how long anything plays, rather than only how the timeline draws it, it changes how old saves play. That would be a breaking change, so check against [release-1.0.md](release-1.0.md).
