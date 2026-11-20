# Bridges: Animating from One Thing to Another

Two things each work by themselves, and the missing piece is the animation between them: this one flies to where that one is.

**Status (2026-11-15):** Brainstorming. Nothing built, and no code planned yet.
This note has the user's thoughts, a review of the Peano video's code, and a proposal that is mostly speculation.
**The testbed:** the Peano arithmetic video, and a possible successor with multiplication. Not right away, but the user wants to get back to it.

**The name is taken, a little.** In 7-pointed-star, a bridge is the straight line that closes a gap in a path so one Fourier series can draw it, usually transparent: the "invisible bridges" of Bridged Fourier, Bridged Morph and Bridged Path. That's a different thing. If the two ever meet, one needs another name.

## The problem (the user, 2026-11-15)

- "Very often I have one animation or widget or bit of code that works perfectly. And I have a second … And they are mostly separate, at least in their implementations. But I need to add a bridge between them."
  Animate from the end of one to the start of the next, or at least move the second so it starts where the first one is.
- **First thought:** an animator as one more special child of a Multi Text. The Multi Text has all the layout, and each animation would be a component you can see in the Visual Editor. Two flaws:
  - It doesn't help when a span moves to a different Multi Text.
  - It does nothing for other kinds of components.
- **Straw man:** a Slide can already do most of the animation, if something tells it to: fade, slide, stretch, rotate, shrink to a point.
  It was made for transitions on a whole slide, and could have been called a Transition component.
  It needs something to draw, and making another copy of a component is never hard. A text span needs a Multi Text made around it, which is more work but doable.
- "That's pretty much what I did in the Peano Arithmetic video, but I wrote a lot of code _by hand_. We need to encapsulate that in a component."
- **What's missing:**
  - A way to name the other objects, possibly from anywhere in the tree.
  - A start time and an end time that work well on the timeline.
  - A way to convert those times, to ask the source and the destination for their state at the right moment.
- **The In Series transitions are too strict for this.** One always starts exactly when the outgoing scene ends, and ends exactly when the next one starts.
- **A bridge can be a copy, not a move.** In the Peano video the source stays on screen. So the bridge doesn't start when the source ends: it starts at a time of its own.
  Lock to a component's start or end when that fits, and name a time when it doesn't. Either way, ask the source for its state at the moment the bridge starts.

## What the Peano video did

"My take on Peano Arithmetic" ([video](https://www.youtube.com/watch?v=4_Wiwai-gO8), [source](https://github.com/TradeIdeasPhilip/canvas-recorder/blob/master/src/peano-arithmetic.ts)).
Read on 2026-11-15, not run. This is about the "2 + 2 = 4?" scene, lines 1568 to 2592. "Definition of +" works the same way.

**How it's built:**

- **One layout for everything.** One `FullFormatter` holds all ten lines: the title, eight "Does … ?" rows, and "Yes!". `formatter.align()` runs once, and every piece gets its final position. Nothing ever reflows.
- **One action per piece.** The scene's `show()` is `actions.forEach((action) => action(options))`, and each action is a closure that draws one piece.
- **Four small primitives:**
  - `PathElement.handwriting(pieces, start, end)`: the first row writes itself.
  - `morphFrom(toAnimate, startFrom, start, end)`: one shape turns into another (`matchShapes()` on `fixCorners()`), and the line width follows. The title's "2" turns into its five pieces, and "Does 0 = 0?" turns into "Yes!".
  - `slideFrom(toAnimate, startFrom, start, end)`: draws the destination piece, shifted back toward the source by an amount that eases to zero. The shift is the distance between the two paths' first points.
  - `slideAndHide(copy, start, end)`: for a piece with nowhere to go. A copy of it drifts up half a line and fades out.
- **The destination owns the bridge.** A piece isn't drawn at all before its action starts, and it's drawn in place forever after the action ends. The source row is never touched.
  So every bridge here is a copy, and the screen fills up with the whole proof.
- **Both ends hold still.** A row never moves after it lands. So "the source's state at what time?" never came up.
- **The hole is there from the start.** The next row is laid out in its final form, so the gap where a late piece will land is visible while that piece travels. The user's screenshot shows it: "Does", a gap, then the rest of the row.
- **Two rounds for each step.** First the pieces that keep their order come straight down. Then the pair that crosses the + travels, a `OnePlus(` and its `)`.
- **The times are typed in,** in milliseconds of the scene, matched to the voiceover.
- **Pieces are paired by counting.** `topFirstRound.splice(7, 1)`, `splice(10, 1)`, `bottomFirstRound.splice(1, 1)`, `splice(6, 1)`, and then `zip()`. The file has 20 `splice()` calls, most of them like these.
- **Color is the identity.** `op1` to `op4` are the four successors. Each `OnePlus(` shares a color with its own `)`, and later steps choose what to remove with `strokeStyle == op4`.
  So the tags already exist. They're stored as colors.

**What I think:**

- **The animation code is the good part.** Three or four primitives cover the whole video. Keep them.
- **The cost is somewhere else.** 723 lines build the ten rows by hand, with 143 `formatter.add()` calls, and 302 lines animate them. The fragile part is the hand-counted indices.
- **Both go away with a small model.** A row is "Does a + b = c?", and a number is a list of successor tags, outermost first.
  A short function builds a row from that. Pairing by tag is then automatic:
  - a tag in both rows slides
  - a tag only in the source slides and hides
  - a tag only in the destination arrives
  - which round a piece moves in depends on whether its order changed
- **That's Manim's `TransformMatchingTex`,** which pairs pieces by a key (from memory).
- **The video never needed the layout to make room.** The holes were laid out ahead of time.
  So a Peano successor doesn't need the Font Width 0 idea in [multi-text-morph.md](multi-text-morph.md). That idea is for rewriting one line in place.
- **`slideFrom()` and `morphFrom()` are each written twice,** once per scene, a little different each time: one can fade away, the other animates the line width.
- **One small bug:** `pack()` in "Going Further" (line 2636) has `height = Math.max(width, bBox.y.max)`. It should start from `height`. It matters only if that table is ported.

## Another Example

In "scratch 13" in the vertical video in https://github.com/TradeIdeasPhilip/7-pointed-star I tried to line up two pieces of text that were drawn with different methods.
First I draw text using a multi text component and the handwriting effect.
Then I use a bridged Fourier component to draw the same text, hopefully landing on top of the first.
(The latter has a slightly thinner line width and sits closer to the user in the z-order.)

It was very hard to make the text line up perfectly.
I adjusted things by hand and eye and got them *close enough*.
As mentioned elsewhere, I'm not just lining up two controls.
I'm trying to line up the text in two controls.
That's part of what this code needs to do.

## What a bridge is (speculation)

- **The parts:**
  - Something to draw: usually a copy of the destination, or of the source when it has no destination.
  - Two anchors: where the source is, and where the destination is.
  - Progress from 0 to 1 over a time range.
  - What changes on the way: position (straight or along an arc), size, alpha, and sometimes the shape or the color.
- **The user's straw man holds up.** A Slide with the right transform and alpha does all of it except the change of shape.
  The transform is the one that carries the source's rectangle onto the destination's, and [`panAndZoom()`](../src/glib/transforms.ts) already makes it.
- **It's the "Fit rectangle" step in [transform-editor.md](transform-editor.md),** with its From and To rectangles looked up, not typed.
  So the drawing isn't new. The new part is looking up another component's rectangle.
- **It's also the In Series [`Transition`](../src/slide-components/in-series.ts), made general** in three ways:
  - The two ends are named, not the neighbors before and after.
  - The times are typed, or locked to an end.
  - An end can be a part of a component, like one span.

## What's missing (speculation)

1. **Anchors:** a way for a component to say where a named part of it is, at a given time.
   - Today the layout happens inside `show()`, and nothing reports it in general.
   - `registerTransform` tells the Visual Editor the transform of each child of a Slide, but only for the frame just drawn, and only in live playback.
   - The `TEXT_EFFECT` hook ([text-effect.ts](../src/slide-components/text-effect.ts)) gives a child of a Multi Text every letter after the layout.
   - A sketch: an optional method on a component that returns a rectangle for a name and a time.
2. **References by name:** a property that points at another component, or at a part of one.
   - Every component already has a name the user can edit (`userEditableDescription`).
   - A Text Span already finds its Text Format by its Style Name, looking up the tree.
   - [editor-with-changeable-schedules.md](from-previous-project/editor-with-changeable-schedules.md) asked the same thing for the slide deck: "Maybe names would be better than numbers?!"
   - Needed: a picker in the editor, a rule for two components with one name, and a warning when a name isn't found. That's a state, not an error (CLAUDE.md's "User Errors").
   - The same mechanism could name a moment. [instant-startup.md](from-previous-project/instant-startup.md) points to the `MOMENTS` table in riemann-surfaces-3d, which is named times kept in code.
3. **Time:** when the bridge runs, and when to sample each end.
   - Locked to the source's end, locked to the destination's start, or a typed time. A copy needs the typed time.
   - It only matters when an end is moving. In the Peano video neither end moves.
   - Locking only works when the components' durations are right, and in 7-pointed-star they often aren't. See [stretch-vs-extend.md](stretch-vs-extend.md) and [timeline-durations.md](timeline-durations.md).
   - The two ends have their own clocks. The Visual Editor's `startWithin()` already finds a component's start inside the chapter, and a bridge needs the same while drawing.

## Start inside one Multi Text (speculation, my recommendation)

The user's first thought has two real flaws, and the Peano video needs neither fix: all ten rows are in one formatter.
The same video today would be one Multi Text with every row, plus one effect child.
They share one clock and one layout, and no name crosses from one component to another.

- **Build the Peano pieces there first:** the row builder, pairing by tag, and slide, slide and hide, and morph, as one effect.
  That tests the parts most likely to be wrong, the primitives and the pairing, without the three missing mechanisms above. It's also most of a successor video.
- **Then pull the anchor and the reference out,** when a second kind of host needs them. By then we'll know what an anchor has to say.
- **Limits to check first:**
  - Only one effect works at a time, and Handwriting is one. The Peano title row writes itself.
  - An effect returns one path per tag, stroked by that tag's format. So it can move letters, but a piece can only fade by itself if it has its own format.

## Open questions

- **Copy or move?** If it's a move, who hides the source? The Peano video never hides anything.
- **The successor.** Multiplication makes a much longer proof. Does the page scroll? That's one more thing moving while bridges are in the air.
- **Arcs and staggered starts:** see [multi-text-morph.md](multi-text-morph.md).
- **Other kinds of components.** A rectangle to a rectangle is the easy case. A Fourier shape has its own morph already.
- **In the Visual Editor:** a bridge is a block on the timeline from its start to its end. How do you pick its two ends? By clicking them?

## Related

- [multi-text-morph.md](multi-text-morph.md): rewriting one line in place, and the tagged pairing.
- [transform-editor.md](transform-editor.md): the Fit rectangle step, and how a component reports its transform.
- [stretch-vs-extend.md](stretch-vs-extend.md): a bridge's own schedules should follow its length.
- [placing-in-time.md](placing-in-time.md): where a thing starts on the timeline. A bridge locked to another component's start or end needs that settled first.
- [tex-component.md](tex-component.md): morphing between two equations is the same pairing.
