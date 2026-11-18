# Placing Things in Time

Put a video clip, or a text, anywhere in its scene by dragging it on the timeline, with no wrapper components to set up first.

**Status (2026-11-15):** Recorded, with a first proposal. Nothing built.
**An absolute requirement for 1.0 (the user).** "Someone should be able to add and move video clips without a masters degree!"
It needs serious thought, discussion and a plan before any code. The proposal below is speculation.

## The problem (the user, 2026-11-15)

- **7-pointed-star, Scratch 8:** four pieces of video in one scene. The first plays at the start, the second right after it, and there are long pauses before the other two.
  "It was a real pain to set it up." Tweaking is easy afterwards. The setup is the pain: an In Series so one piece starts right after another, and a Padding around each piece that has to move.
- **Why it's like this:** the containers were designed for code, and the Visual Editor shows them as they are. "Now we are exposing way too much to the GUI."
- **The requirement:** "A user should be able to drop a video clip anywhere in an appropriate container without thinking about an intermediate container, at least in the most common cases."
- **The same with a text** that should appear at just the right time. "The schedule works great, but it's totally disconnected from the timeline."
  The user could have added a Padding, but was frustrated and used a schedule to make the text appear and disappear.
  "I could imagine the parallel container automatically adding a padding (or the equivalent) in the middle."

- **A second gripe, later the same day:** to cut the clip inside a Padding, the user had to put an In Series between the Padding and the clip, because Split only works in a series.
  "I see what's going on, but the user shouldn't have to do this much work and certainly nothing this complicated."
  It worked after that. "We just need to automate more and hide more from the customer."

## What the code does today

Read on 2026-11-15, not run.

- **A parallel container starts every child at 0.** Its list of children already has a `start` for each one, and `show()` already subtracts it ([in-parallel.ts](../src/slide-components/in-parallel.ts)). The base class just never sets it. Its length is its longest child's.
- **Padding is the only way to start later.** It has four properties: Initial Time, Extra Time, Show Before (hide, freeze or live) and Show After. It sets `start` for its one child.
- **In Series is the only way to say "right after".** And Split only works on a clip whose parent is an In Series (`splitTarget()` in [canvas-recorder.ts](../dev/canvas-recorder.ts)): "the second piece has to start where the first one ends."
- **The timeline is halfway there.** It draws a Padding and its child as one block, and dragging the block's left edge changes Initial Time (`_buildTimelineBlocks()`). The component tree still shows both.
  No component's block can be dragged by its body. Only a sound clip's can.
- **Sound clips already work the way the user wants pictures to.** They're a list on their owner, each with its own start (`startMsIntoScene`). Drag one anywhere, trim either end, snap to a word. No wrappers.
- **Outside its own time,** a Video Clip draws nothing (`locationInClip()` returns NaN). Most other components draw at any time, which is why a text needs a Padding or a schedule to disappear.
- **Scratch 8 as saved** (`properties/7-pointed-star-shorts.txt` in that project): an In Series holding two clips, "Padding #1" holding a third at 79 360.512… ms, and "Padding #2" holding a fourth at 34 046.361… ms.
  That's three wrappers for four clips. All four clips are named "Video Clip" ([saturday-afternoon.md](saturday-afternoon.md#smarter-default-names)).
  Later that day "Padding #1" got an In Series inside it, around its clip, so the clip could be split. Four wrappers.
- **The structure that works** is a strip: a Padding, an In Series inside it, and the pieces of a clip inside that. The Padding says when the strip starts, and the series keeps the pieces end to end after a cut.

## Two ways to do it (speculation)

**A. The container keeps a start for each child.** This is "the equivalent" of the Padding, built in.

- Each child of a parallel container gets what a Padding gives it: a Start, and what to do before and after its own time (hide, freeze or live).
  The defaults are Start 0 and live, which is today's behavior. So nothing changes for old saves or for code, and it isn't breaking.
- The container sets each child's `start`, and its length becomes the latest end, not the longest child.
- The hide and freeze rules move from the Padding into the base class's `show()`. `getFramePromises()` and `getReady()` have to follow the same rules ([get-ready-everywhere.md](get-ready-everywhere.md)).
- Split stops needing a series: the second piece is the next child, starting where the first one ends.
- Padding stays, for old saves and for code.
- **The cost:** it changes the base class of every component, shortly before 1.0.
  Five classes replace `recomputeDuration()` (Duration Agnostic, Fixed Duration, Live Duration, Padding, In Series), and each would have to count the starts.
- **A variant:** put it in one new container kind, a "Timeline", not in the base class. Then that's the "appropriate container", and a scene is one. It's safer, but it's one more kind to choose from.

**B. Keep the Padding, and have the editor hide it.**

- Dragging a block the first time wraps its component in a Padding. The tree shows one row. The Padding's four values show with the component's own properties, as a "Timing" group.
- Splitting a clip adds the In Series by itself, so the editor builds the strip above and the user never sees it built.
- Dragging one piece away from its neighbors moves it into a strip of its own. This is the part to design: when is a drag a move of the whole strip, and when does it pull one piece out?
- Nothing changes in how a video plays, and the save file already handles it.
- **The cost:** the wrapper is still there, and it leaks.
  It's in the save file and in the generated TypeScript. It's the clip's `parent`, so every check like `splitTarget()` has to know to look past it. So do copy and paste, Wrap Component, and names.

**My recommendation, changed later on 2026-11-15: B first.**
I first said A, because A takes a concept away and B only hides it.
Then the user reported that the strip works once it's built, and that the job is to "automate more and hide more". That's B.

- B is the shorter road to the 1.0 requirement, and the structure is proven in a real video.
- B doesn't touch the base class of every component just before 1.0.
- A stays possible later. B changes nothing about how a video plays or is saved, so nothing has to be undone.
- If the hidden wrappers leak too much in practice, that's the reason to do A.

## In the editor (speculation)

- **Drag a block's body to move it.** Its keyframes come along for free, since a component's keyframes are in its own time. That's a fifth operation, "move", next to the four in [stretch-vs-extend.md](stretch-vs-extend.md).
- **"Right after" is a snap.** A block's edge snaps to its neighbors' edges and to the playhead. The timeline already snaps sound clips to words (`snapPoints`).
  A lock that keeps holding ("starts when that one ends") needs one component to name another, which is the missing piece in [bridges.md](bridges.md). Later.
- **Insert at the playhead.** A new clip or text starts where the playhead is, not at 0.
- **A new text hides outside its block.** A component's default can't change, since that would change how old saves load. The Insert button can set the value explicitly, as it does for a new Video Clip's size.
- **Round the times a drag makes.** Sound clips use `tidyMs()`. The Padding drags don't, which is where 79 360.512 061 366 62 came from.
- **Show the selected component's keyframes on its block,** as ticks. That would connect the schedule to the timeline. A separate step.

## In Series stays

A series is still right for chapters, and for transitions between scenes.
For clips it's the other way of editing: trim one, and everything after it moves up. The Simple Video Editor's main list is a series ([simple-video-editor.md](simple-video-editor.md)).
Video editors usually have both. Scratch 8 wanted free placement and got the series by default.

## Open questions

- **Does the Start belong to the child or to the parent?** On the child it's one more property, shown with the others, and a series parent would ignore it. On the parent it's a record per child, saved in the child's entry.
- **A negative Start?** Padding allows it.
- **How long is a text?** "Appear here, disappear there" needs an end. Most drawn components have no length of their own, which is the problem in [timeline-durations.md](timeline-durations.md). This plan may have to settle that one first.
- **Overlap** is allowed: it's still a parallel container, and the list order is the drawing order. Does the timeline need one row per child, or does it pack them?
- **Converting old work:** a button that turns a Padding and its child into a child with a Start? Not needed for 1.0.

## Effort (rough guesses, nothing built)

| Step                                                                        | Effort   |
| --------------------------------------------------------------------------- | -------- |
| B: the editor builds and hides the strip, one row in the tree, Timing group | 1–2 days |
| The timeline: drag the body, snap, insert at the playhead                   | 1–2 days |
| Pulling one piece out of a strip, a showcase slide, the README              | 1 day    |
| A, later and only if needed: starts and hide rules in the container         | 1–2 days |

About **3–5 days** for B, after the design is agreed.

## Related

- [timeline-durations.md](timeline-durations.md): the timeline doesn't always show when things really play.
- [stretch-vs-extend.md](stretch-vs-extend.md): what dragging an edge should mean.
- [bridges.md](bridges.md): locking one component's time to another's.
- [get-ready-everywhere.md](get-ready-everywhere.md): the red ✕ marks in the same scene, which come from the same wrappers.
- [release-1.0.md](release-1.0.md), item 5.
