# Multi Text Morph

Replace one piece of a Multi Text with another, the way an algebra or arithmetic step does: the old piece leaves, the new one arrives, the pieces around them slide to make room, and anything that survives travels to its new spot.

**Status (2026-11-15):** An idea with a first design, nothing built. **Not urgent, but don't lose it.** Not before 1.0 (the user).
The rough sketch is below, and parts of it are speculation.
The first step, a prototype with today's features, costs almost nothing and would show how far we already are.

## The problem

Today a Multi Text can't morph, and the layout is what makes it hard.
If "2 + 2" turns into "S(S(0)) + S(S(0))", everything after the change has to move, and the viewer has to follow which old piece became which new piece.
Moving things by hand means working out each position yourself, and the number of pieces grows fast.

**The test case:** the user's Peano arithmetic video, "My take on Peano Arithmetic" ([video](https://www.youtube.com/watch?v=4_Wiwai-gO8), [source](https://github.com/TradeIdeasPhilip/canvas-recorder/blob/master/src/peano-arithmetic.ts); well received).
It's all about replacing one thing with another. Even 2 + 2 blows up quickly, and a follow-up with multiplication would blow up faster and bigger.
If this works there, it works anywhere.

**Update, later on 2026-11-15:** I read the source, and the review is in [bridges.md](bridges.md).
The video never makes the layout move. Every row is laid out ahead of time in its final form, with the holes already there, and each piece is copied down from the row above.
So the Font Width 0 idea below isn't needed for a Peano successor. It's for rewriting one line in place, like a step of algebra.
What the two share is the pairing by tag, and the traveler.

## What the user realized

The Font Width stretch changes the layout, not just the drawing: a piece at width 0 takes up no room, and a piece going from 0 to 100% pushes its neighbors aside.
So **a hole is a piece of text at width 0**, and "make room" is something the layout already does.
That's the part the user was most worried about.
(Manim gets the same result differently: it lays out the before and the after separately, then pairs pieces and moves each from one position to the other.)

## What's already there

Checked in the code on 2026-11-15, not run:

- **Font Width** on a Text Format. [`Font.stretch()`](../src/glib/letters-base.ts) scales every letter's advance, the kerning and the space, so the paragraph layout sees the narrower piece.
  Multi Text (and Simple Text) clamp a Font Width of 0 or less to `MIN_FONT_WIDTH` = 0.01 ([line-font.ts](../src/glib/line-font.ts)), so the closest we get to a hole is 1% of the piece's width.
  The pen shrinks by the square root of the width, so a squeezed piece is a thin vertical smear, not nothing.
- **Alpha** on a Text Format, so a piece can be invisible while it changes width. Each format's text is stroked as one path, so the alpha is even.
- **ParagraphLayout** ([paragraph-layout.ts](../src/glib/paragraph-layout.ts)) returns every word's position, baseline, tag and letters.
- **A hook for a "smart child"** of a Multi Text: [text-effect.ts](../src/slide-components/text-effect.ts). An effect gets every letter after the layout, with `x`, `baseline`, `tag`, `wordIndex`, `hardLineIndex` and `spanIndex`, and returns the paths to stroke.
  The layout is decided before the effect runs, so what an effect does doesn't make the rest of the text move.
  Handwriting is the first effect. Only one effect works at a time.
- **Word wrap** also comes from the layout, so a piece growing can change where a line breaks.

## The design (speculation)

Everything that will ever be on screen is in one Multi Text, each piece in its own Text Span with its own Text Format.

1. **The layout makes room.**
   - A piece that goes away animates Font Width 100% → 0%, and Alpha to 0.
   - A piece that arrives animates Font Width 0% → 100%, with Alpha 0 while it opens.
   - The text around them moves by itself, with no positions to compute.
2. **A traveler is what the viewer sees move.** Something draws the piece itself, at its real size, moving from the hole it left to the hole it's going to, along an arc.
   For something that is replaced, the traveler is just the old piece shrinking or fading in place, so this part is only for things that move.
   There are a few ways to build the traveler, and they could be combined:
   - **An offset property on Text Format**, like CSS `position: relative`: draw the piece displaced, without changing the layout. The user has wanted this for a while, and it's useful on its own (a shadow, a nudge, a wobble).
   - **A smart child of the Multi Text**, using the `TEXT_EFFECT` hook above. Each frame it reads the layout, finds the source hole and the destination hole by span, and moves the traveler between them. Because it reads the layout every frame, the destination can keep moving while the traveler is on the way, which is exactly what happens when other pieces are opening and closing at the same time.
   - **A "layout width" that isn't the glyph width** (a thought, not a decision): scale the room a piece takes without squeezing its letters. Then the piece at the destination _is_ the traveler: it starts displaced back at the source, with its letters at full size and only its room growing, and flies home. It avoids a third copy of the text, and a squashed glyph never appears.
3. **Curved travel.** Move along an arc, like Manim's `path_arc`, so pieces don't cut straight through each other. The user says we can make this look very good.

## Building the spans (speculation)

Writing the spans and keyframes by hand for every step won't scale to the Peano video.
A TypeScript helper could take a before and an after, with the pieces tagged, and make the spans and formats.
The Visual Editor comes later, if at all.
This is the same problem as "lay out both ends independently, then pair the pieces", which the user says keeps coming up in this software, so it may be worth a general helper once a second case exists.

- **Pairing:** by tag. A tag in both the before and the after travels. One in only the before leaves, and one in only the after arrives. If a tag appears more than once, pair the copies in order, with a manual override for the cases that are ambiguous.
  Manim's `TransformMatchingTex` works this way, from memory, and I haven't read its source.
- **Staggered starts:** the user's attempt to speed up a stagger partway through an animation, in the triangle video, never came out perfect. A stagger helper that allows a changing rate might belong here.

## Not now

- **Better word wrap animation** than jumping to the next line. The user has thought about it and it never seemed worth it. The usual advice is to avoid wrapping during a morph.
- **Morphing letter shapes** into other letter shapes (an "a" into a "b").
- **TeX.** Equations come from the separate [tex-component.md](tex-component.md). Morphing between two of them needs tagged parts and is a follow-up there.

## Prototype first

On a showcase slide, with only today's features: a Multi Text of spans whose Font Width and Alpha are animated, and no new code.
It answers the questions that decide the design:

- Does the layout alone give a good closing and opening of holes?
- Does the 1% leftover width show? A 5-unit phrase leaves about 0.05 units, around 6 px at 1920 wide. (Lowering `MIN_FONT_WIDTH` is an option.)
- Does a collapsing piece move a line break?
- How many animated Text Formats can it draw per frame? Each one whose width is animating rebuilds its font every frame. The letters are transformed only when asked for, but the font copies its letter table each time, so a Peano-sized step might be slow. Measure.

## Effort (rough guesses, nothing built)

| Step                                                          | Effort     |
| ------------------------------------------------------------- | ---------- |
| Prototype slide with today's features, plus measuring         | 2–3 hours  |
| Offset (X, Y) on Text Format, with its showcase slide         | Half a day |
| The smart child: read the layout, move the traveler on an arc | 1–2 days   |
| The helper that builds the spans from a before and an after   | 1–2 days   |
| The Visual Editor side                                        | Unknown    |

About **3–5 days** for a Peano-style demo.
The two big steps are the least certain, because the design isn't settled.
Some of it is speculation, and the prototype comes first.

## Related

- The user's four starting thoughts (2026-11-15): make the text transparent while it grows or shrinks, since the layout is the point; add an offset to Text Format; use the layout's positions; let a smart child guide the piece between two holes.
- [thin-strokes.md](thin-strokes.md): how a squeezed piece looks.
- [multiple-active-text-formats.md](multiple-active-text-formats.md): more than one stroke per format, which affects how an effect strokes a traveler.
- **Prior art:** Manim's `TransformMatchingTex` and `TransformMatchingShapes`. The user has bookmarked [Motion Canvas](https://github.com/motion-canvas/motion-canvas) too, which I haven't looked at.
