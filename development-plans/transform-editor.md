# A Graphical Transform Editor

Edit a Slide's transform by dragging things on the canvas, a step at a time, instead of writing a CSS template and ten numbers.

**Status (2026-11-15):** The user's requirements, and a proposal. Nothing built.
**Wanted before 1.0** (the user): "even if we don't get everything we want, a first version of this editor could make a huge difference."
Parts of the design are speculation, and they're marked.
**The user's answer (2026-11-15):** "Yes, that sounds very doable." One condition: understand and document how a component tells the Visual Editor about its transform, before a second component does it. See "First: the interface" below.

## The problem today

The Slide ([slide-component.ts](../src/slide-components/slide-component.ts)) has one CSS transform string, the Transform Template, and ten numeric schedules named 𝓐 to 𝓙.
You write `translate(𝓐px, 𝓑px) scale(𝓒)`, and each placeholder is replaced with that schedule's value at the current time.

- **Ugly:** Greek placeholder letters, CSS syntax, and units you must remember (`px`, `deg`). `rotate(𝓐)` with no `deg` is an error.
- **Fixed:** ten numbers, always. A collapsed matrix needs six of them.
- **Blind:** the Transform Info panel ([slide-panel.ts](../dev/slide-panel.ts)) only says whether the string is valid. You can't see or drag what the transform does.
- **Used for real:** affine-transforms, 7-pointed-star and the showcase all have Slides with templates. So whatever replaces it has to leave them working.

## What the user wants

1. **Translate:** drag from any point to move it. X and Y fields, editable and visible.
2. **Scale:** pick a center point, grab another point and move it to where you want it. An option to keep the aspect ratio or not.
   The arrow control already works like this, with Shift and Ctrl switching modes, and it works well. There should be overlap.
3. **Skew:** pick a horizontal or vertical _line_ instead of a point. Drag any other point, and only one dimension matters.
4. **Combined options,** like dragging two opposite corners of a rectangle to scale and translate in one move. All of them chosen from one master switch.
5. **Add a transform to the left** of the existing ones, and adjust it. And be able to adjust the others after more are added on the left.
6. **Collapse to a matrix only when the user asks.** Any set of adjacent transforms can be compressed.
7. **The layout of the data doesn't matter.** Today's fixed list of schedules was the quick way to get going, and this may need to break.

## What we already have to build on

Checked in the code on 2026-11-15, not run:

- **On-canvas handles** for Point, Rectangle, Lattice and Arrow schedules, with hit-testing and dragging ([canvas-recorder.ts](../dev/canvas-recorder.ts): `hitTestPointMarker()` and friends, the pointer handlers).
- **The arrow control's modifiers.** Dragging an arrow end: Shift constrains it to the arrow's own line (`"axial"`, so only the length changes), and Ctrl or Cmd to a circle around the other end (`"radial"`, so only the direction changes).
  Used as a transform, that's a scale and a rotation about the fixed end, and the modifiers pick which.
- **Handles inside a transformed Slide.** A Slide records its children's transforms (`registerTransform`), and `getMarkerRelTf()` converts between the canvas and the selected component's own coordinates. Rectangles and points inside a scaled Slide already drag correctly.
- **Wrap Component:** the editor can already wrap the selected component in another one (`isGoodForWrapping` in [registry.ts](../src/slide-components/registry.ts)).
- **`panAndZoom()`** ([transforms.ts](../src/glib/transforms.ts)) maps one rectangle onto another, which is the "drag two corners" combination.

## The key choice: where the list of transforms lives

|                                             | **A. Each step is its own wrapper component** | **B. One component holds a list**                                     | **C. A GUI over today's template** |
| ------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------- |
| Breaks old saves?                           | No. The Slide stays as it is.                 | Yes, so it needs a migration                                          | No                                 |
| New save mechanism?                         | None                                          | Yes: a variable number of properties ([load-hooks.md](load-hooks.md)) | None                               |
| Adjust a step after adding more on the left | Select its node                               | Select its row                                                        | Parse the template to find it      |
| A matrix step                               | 6 numbers, its own node                       | 6 numbers, in the list                                                | 6 of the 10 placeholders           |
| The tree                                    | Deeper: one node per step                     | One node                                                              | One node                           |

**I'd go with A.**

- It needs nothing new in loading or saving, and it doesn't break anything.
- The question "can I still adjust the others after adding more on the left?" disappears: each step is a node, and each node has its own handles, drawn through the nodes outside it.
- It uses Wrap Component and the handle machinery that exist.
- B is the better tree and the harder build. It's the same machinery as "a property for each child" in load-hooks.md. If that gets built for other reasons, B becomes cheap.
- C is the smallest change, but its cap of ten numbers is what the user already doesn't like, and a gizmo would have to parse a string to know what it's editing.

## First: the interface

The user (2026-11-15): "There's a lot of magic in the slide component that makes the visual editor work. I've been afraid to touch that.
If we want to allow other components to do a transform, that's not an unreasonable ask, but I'd like to understand the interfaces and make sure it's all documented well before we take that step."

**What's there,** read on 2026-11-15, not run. It's smaller than it looks:

- **One optional callback,** `registerTransform(component, transform)`, in `ShowOptions` ([showable.ts](../src/showable.ts)). The Visual Editor supplies it in live playback, never while recording.
- **One caller.** `SlideComponent.showChild()` calls it for each child, with the context's transform at that moment ([slide-component.ts](../src/slide-components/slide-component.ts)).
- **One table in the editor,** `componentTransforms`, and one function, `getMarkerRelTf()`, that every handle uses to convert between the canvas and the selected component's own coordinates ([canvas-recorder.ts](../dev/canvas-recorder.ts)).
- **One rule for drawing somewhere else.** A component that draws its children on another canvas passes `registerTransform: undefined`. The Slide does when it's partly transparent, and so do Cross Fade and Halftone Shadow.
- **Nothing else in the editor is special to the Slide,** except its Transform Info panel.

**A gap, I believe.** Only a Slide's direct children are reported. For Slide → In Parallel → Rectangle, the Rectangle has no entry, so `getMarkerRelTf()` returns nothing and its handles would be drawn as if there were no transform.
Check this in the editor first. If it's real, it's a bug today, apart from this plan.

**A proposal (speculation):** move the call into the base class's `showChild()` ([in-parallel.ts](../src/slide-components/in-parallel.ts)), so every component reports every child.

- Then the interface for a component that transforms is one sentence: change the context's transform, draw the children, and put the transform back.
- The off-screen rule stays as it is.
- It fixes the gap.
- The cost is one `getTransform()` for each child in each frame, in live playback only.

**Before the first step component:** write this up as JSDoc on `registerTransform`, and add a showcase slide with handles two and three levels inside a transform.

## How it would work, with A (speculation)

**Steps are small components,** each wrapping its children, like Padding wraps one. Each one is a `DurationAgnosticComponent`, as the Slide is, and has a short list of schedules with plain names and plain units: canvas units and degrees.

| Step                 | Properties                                           | The gesture                                                                                                                     |
| -------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Move**             | X, Y                                                 | Drag anywhere.                                                                                                                  |
| **Scale**            | Center, Scale X, Scale Y                             | Grab a point and drop it somewhere else, and the scale is drop minus center over grab minus center. A lock on the aspect ratio. |
| **Scale and rotate** | Center, Scale, Angle                                 | The arrow control: no modifier does both, Shift only scales, Ctrl or Cmd only rotates.                                          |
| **Skew**             | A horizontal or vertical axis line (a point), Amount | Drag any other point. Only the distance along the line's own direction counts.                                                  |
| **Fit rectangle**    | From rectangle, To rectangle                         | Drag the To rectangle's corners.                                                                                                |
| **Matrix**           | a, b, c, d, e, f                                     | Three handles: where the origin, (1, 0) and (0, 1) end up. That's the picture the affine-transforms video explains.             |

**The master switch** is a mode chooser in the Visual Editor: Off, Move, Scale, Scale and rotate, Skew, Fit rectangle, Matrix. It's Off by default, so the existing handles still get the first click.

- **With the switch on, a drag edits the outermost step of that kind,** if the selected component is one. Otherwise it wraps the selected component in a new step of that kind, on the left, and the drag fills it in.
- **To adjust a different step,** select its node. The switch stays on.

**The frame rule.** A step's handles are drawn in the step's own frame: the coordinates after every transform _outside_ it. A drag is converted into that frame by the inverse of those outer transforms.
The step then edits its own numbers, and stays in its own family: a Move stays a Move, and a Scale stays a Scale about a center. So the third step in a stack is no harder to edit than the first.
This is what `getMarkerRelTf()` does today for a child inside a Slide.
The exception is an outer transform that can't be inverted, like a scale of 0. The handles say so and stay off.

**Numbers:** every property shows in the property table, like any other schedule, so the fields are always visible and editable, and each can be keyframed. A drag changes the keyframe being edited, by the same rules as a Point.

**Collapse to a matrix.** A button on a step: "Collapse this and the N steps outside it into a Matrix." Only on request, and only for a chain, where each step wraps exactly one thing. The result replaces the chain with one Matrix step.

- **Animated steps are the catch.** A matrix is six numbers at one moment, and the product of animated steps doesn't interpolate like six numbers. So collapsing animated steps loses the animation.
  The button should say so, and the options are the matrix at the playhead (fixed), or at each keyframe time with in-between values that are only approximate.
  Open question; I'd start with "at the playhead, and refuse if anything is animated, unless the user says so".
- It's undone by the Load history, like any edit.
- **What it's for** (the user, 2026-11-15): not for animating. It's for folding a lot of small tweaks and adjustments into one step, and not everything is animated.
- **Matrices also come from outside.** Inkscape likes to write them, so the Matrix step is where an imported transform lands ([svg-path-component.md](svg-path-component.md)).

**Why the old Slide stays:** it keeps Alpha (and the planned Clip, [clipping.md](clipping.md)) and its template.
A "Convert to steps" button is possible when each placeholder is used once, and not otherwise. That's a nice-to-have, not a requirement.
Eventually the template could be hidden in the editor. Removing it would be a breaking change, and the user can decide that later.

## A first version

**Wanted before 1.0, and it isn't breaking with A,** so nothing forces the date except the user's preference.

- **First version:** Move, Scale and rotate (the arrow-like gesture), the master switch, the numbers, add on the left, and the Matrix step with an explicit Collapse. A showcase slide.
- **Next:** Scale with separate X and Y, Skew, Fit rectangle, the three-handle Matrix, and Convert.

## Effort (rough guesses, nothing built)

| Step                                                                                                         | Effort       |
| ------------------------------------------------------------------------------------------------------------ | ------------ |
| The step components (Move, Scale, Scale and rotate, Skew, Fit rectangle, Matrix), registry, a showcase slide | 1–1.5 days   |
| The master switch, the handle for Move, "add on the left", the frame rule                                    | 1.5–2 days   |
| Scale and rotate, with Shift and Ctrl                                                                        | 1–2 days     |
| Collapse, with the warning about animation                                                                   | About 1 day  |
| **A first version (Move, Scale and rotate, Matrix, Collapse)**                                               | **5–7 days** |
| Scale X and Y, Skew, Fit rectangle, the three-handle Matrix                                                  | 3–4 days     |
| Convert to steps                                                                                             | About 1 day  |

Allow plus or minus half again. The least certain part is how new handles fit into the editor's pointer code, which is one very large file.

## Open questions

- **Zoom interpolation.** A scale animated from 1 to 100 looks like it speeds up at the end, because equal steps in the number aren't equal steps in the zoom. A Scale could store its log, or offer a "geometric" option. The same complaint comes up for any big zoom, like the star circuits in 7-pointed-star.
  The user's answer (2026-11-15): the obvious fix is a new easing function. An exponential one would be easy, with exactly one number to set its curve. But an easing can't take a parameter yet, in the Visual Editor or in a save file. See [easing-functions.md](easing-functions.md).
- **Where does the master switch live?** In the player's toolbar, or at the top of the properties panel of a selected step?
- **A drag with several keyframes.** Reuse exactly what a Point does, and write down what that is.
- **Names.** "Move" or "Translate"? The user's words were Translate, Scale and Skew.
- **Handle clutter,** with several steps on one thing: show only the selected step's handles.
- **What the Slide's own Transform Info panel becomes,** when the same Slide could also contain steps.
- **A Fit rectangle whose rectangles are looked up, not typed,** is most of a bridge from one component to another. See [bridges.md](bridges.md).
