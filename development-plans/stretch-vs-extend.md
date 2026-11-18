# Stretch vs Extend

When a component's length changes, do its keyframes move with it?

**Status (2026-11-15):** Brainstorming. Nothing built, nothing decided.
The user: "that is a huge issue. We should seriously look at extend vs stretch."
"What I think" below is speculation.

## The problem (the user, 2026-11-15)

- **Each component's code decides** whether a schedule's times are milliseconds or a share of the duration.
  That wasn't planned. It came from scheduling by hand, long before the Visual Editor: sometimes thinking about how many milliseconds per item look good, and sometimes about how many each item gets to fit the total.
- **Durations are often wrong in 7-pointed-star.** A star circuit uses only its schedules and ignores its own duration. Many are set to 0, because eight identical blocks from 0 to the parent's end only waste room on the timeline.
- **A bridge needs them right** ([bridges.md](bridges.md)).
  - If the two components' start and end times are right, the user doesn't type them a second time, and they stay in step.
  - A bridge's own schedule, like a color from red at 0% to blue at 100%, should follow when the bridge's length changes.
- **Four operations:**
  - **Extend right:** change the duration and nothing else. This is what we do now.
  - **Extend left by n:** add n to the duration, take n off the start time, and add n to every keyframe's time. Everything seen before stays the same. It just starts sooner.
  - **Stretch right:** scale every keyframe's time, keeping the start fixed.
  - **Stretch left:** scale every keyframe's time, keeping the end fixed.
- **The worry:** rewriting every value for each small adjustment. A drag fires several events per frame, and the rounding errors would build up.
- **The user's idea:** store every schedule in milliseconds, since that's how it's used. A checkbox switches the GUI between ms and %. The Go To buttons stay in ms.

## What the code does today

Checked on 2026-11-15, read, not run:

- **A keyframe's time has no unit.** Its comment in [interpolate.ts](../src/interpolate.ts) says "This can be any value". A schedule is a list of times and values, and the component passes whatever number it likes to `.at()`.
  So yes, the component's code decides, and there's no reason for it but history.
- **The % option that exists is only a label.** A schedule can have a `timeAxisLabel`, and `progressAxisLabel` is "Progress (0 - 1)" ([showable.ts](../src/showable.ts)).
  It changes the heading of the time column in the property table. The editor converts nothing and doesn't know the unit.
  - Only `NumberScheduleInfo` takes it.
  - No component in the library uses it. affine-transforms does.
  - Not checked: what Go To does on a schedule like that.
- **The timeline only extends right.** Dragging a block's right edge sets Min Duration, or calls `setDuration()`. No keyframe changes. A Padding's left edge changes its Initial Time.
  There's no stretch, and no modifier key (`_buildTimelineBlocks()` in [canvas-recorder.ts](../dev/canvas-recorder.ts)).
- **A Video Clip stretches.** Its speed is the range of the file it plays, divided by its duration (`playbackSpeed()` in [video-clip-panel.ts](../dev/video-clip-panel.ts)). So changing the duration alone changes the speed.
  The panel shows the speed, and has a button to put it back to real time.
- **A sound clip extends, on both sides.** Its left edge trims or extends the beginning, and the rest of the sound keeps playing at exactly the same moment. It never stretches.
- **An old plan has a Retime component:** a wrapper with one schedule, outside time in and inner time out ([syncing-voiceover.md](from-previous-project/syncing-voiceover.md), item 1). Never built.

## What I think (speculation)

1. **Durations change when nobody is dragging.**
   - A duration-agnostic component takes its parent's length.
   - Something in an In Series moves when an earlier sibling changes.
   - A bridge locked to two components' edges changes length when either one moves.

   Nothing would rewrite the keyframes in those cases. So "always milliseconds, and rewrite on a stretch" can't do the bridge's red-to-blue case.
   For that, the schedule has to be stored as a share of the duration.

2. **So: a unit for each schedule, saved with it.** Milliseconds, or a share of the duration.
   - Milliseconds is the default, and a save file leaves out a default. Old saves don't change.
   - The checkbox converts the keyframes once, using the duration at that moment. Nothing on the screen changes when you click it.
   - After that, a new duration rewrites nothing. A millisecond schedule extends, and a share schedule stretches.
   - It's the user's "based on the needs of the moment", decided for each schedule.
   - A possible third unit: milliseconds before the end, for a fade-out that always takes the last 500 ms.

3. **Stretching everything at once is a time map, not a rewrite.** That's the Retime wrapper, or one Speed number on a component.
   It's the same rule as the transform editor: keep the steps, and bake them in only when the user asks ([transform-editor.md](transform-editor.md)).

4. **Extend left moves the origin.** It does need a rewrite: each millisecond keyframe, each child's start, and each sound clip's start gets n added.
   It's one operation for one drag. A Padding in front does the same job with no rewrite.

5. **Rounding: compute from a snapshot.**
   - Keep the original keyframes when the drag starts. Each mouse event computes from the originals and the total distance, never from the last event's result.
   - Then a drag rounds once, however many events fire.
   - `tidyMs()` rounds to a millionth of a millisecond, and a frame is 16.7 ms. So it's not a real risk, if every drag follows the rule.

6. **The timeline is part of this.** If "fills its parent" were something the timeline could draw in one compact row, there'd be no reason to set a duration to 0.
   See [timeline-durations.md](timeline-durations.md).

## Open questions

- **How does a schedule learn its component's duration?** Today it's `.at(timeInMs)`. An optional second argument would not be a breaking change.
- **A duration of 0, or one with no end,** with a share schedule. That's a state with a warning, not an error.
- **Modifier keys on a timeline drag,** to choose stretch or extend. The user remembers a prototype in some5 that did this for video. It may never have reached this editor.
- **The default for a new schedule.** Milliseconds matches the voiceover. A share matches "fit the total".
- **Does a Video Clip get an extend,** which would change its range of the file, to go with its stretch?

## Related

- [bridges.md](bridges.md): why durations and shares matter now.
- [timeline-durations.md](timeline-durations.md): the timeline doesn't always show when things play.
- [placing-in-time.md](placing-in-time.md): dragging a block's body, which moves it without changing any keyframe. That one is required for 1.0, so it comes first.
- [syncing-voiceover.md](from-previous-project/syncing-voiceover.md): the Retime component.
- [transform-editor.md](transform-editor.md): the same "keep the steps, bake on request" rule, for space.
