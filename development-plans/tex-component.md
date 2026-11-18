# A TeX Component

Paste TeX source (or point to a file) and get typeset math, drawn as a component, the same way we draw an image or a block of text.

**Status (2026-11-15):** An idea, nothing built. **Not before 1.0, not urgent (the user).**
Later the same day, the user: there's no good way to draw equations today, and the samples in the showcase aren't good. "I can absolutely see real value to displaying static latex inputs, even if we never get any further than that."
The user hasn't used TeX, so the spike page below is also a place to learn it: type some source, and see what it makes.
It's a self-contained component that fits the system as it is, and it's aimed at the same audience as Manim.
Some of this is speculation, and the first step is a spike to check the guesses.
**A real use case (the user, later on 2026-11-15):** the matrices in the unfinished SoME5 video. See "A real use case" below. It adds a second way to do this: a small formula layout of our own.

## What it is

TeX is a language for typesetting math: `\frac{a}{b}`, `\sqrt{x}`, `\sum_{i=1}^{n}`, matrices.
The valuable part is its layout rules: where the fraction bar goes, how big the superscripts are, how the parentheses stretch, how the symbols are spaced.
The glyphs are the easy part.

Manim runs a real TeX install and loads the SVG it makes, which is why Manim needs TeX installed.
We don't have to do that: JavaScript libraries do the same layout in the browser.

## A real use case: the matrices in the SoME5 video

The user, 2026-11-15, about the SoME5 video on affine transforms, started and never finished (the `affine-transforms` project):
"One thing that really sucked about writing the code was the matrices. I was doing way too much work by hand. This is exactly where the standard mathematical notation stuff would come in handy."

The user's two ideas: "A simple tex interpreter might have helped there. Or maybe we take the n most important features and build our own math formula editor in our own style."

**What the hand-written code does.** Read on 2026-11-15, in that project's `src/affine-transforms.ts`. Not run.

- One class, `MatrixLayout`, about 525 lines.
- It draws 3 × 3 and 3 × 1 matrices side by side, with × and = between them, such as transform × point = point (`show311()`).
- The square brackets are drawn by hand, from measured margins and lips.
- **The numbers are live.** They come from a `DOMMatrix` that changes while the animation runs.
- Every cell has the same width, and every number is written with two decimals and right-aligned, so the decimal points line up. Its own comment: "As you change the numbers, nothing should jump around."
- Each matrix has a color, and the bottom row (0 0 1) is drawn faded.
- It's all drawn with the stroke font, so it matches the rest of the video.

**What that says about this plan (my reading):**

1. **This isn't a still equation.** Typesetting a matrix again on every frame would be slow, and the widths would jump as the numbers change.
   It needs a layout made once, with **slots** that are filled while drawing: a cell of a fixed size, and a number put in it each frame.
2. **A slot is a named part of a formula, with a position.** That's the same thing the morph needs (below), and the same as an anchor in [bridges.md](bridges.md). So it's the piece to get right, whichever way the layout is made.
3. **Color and weight for one part** (one matrix, one row) need named parts too.

**The two ideas may be one project (speculation):**

- **A small layout of our own,** for the most important pieces: a matrix with brackets that stretch, a fraction, a superscript and a subscript, a square root, tall parentheses, and a sum or integral with limits.
  Each is a rule about boxes: side by side or stacked, on a baseline.
- **Drawn with our stroke fonts,** so it looks like the rest of the video, and the Handwriting effect and `strokeColors()` work on it.
- **Its input can be the small part of TeX that names those pieces:** `\frac{a}{b}`, `x^2`, `\begin{bmatrix}`. Then "a simple TeX interpreter" and "our own formula layout" are the same thing, and what the user learns carries over to real TeX.
- **MathJax, below, becomes the second way to make the layout,** for everything else TeX can do. The same component, with the same slots.
- **The trade:** ours matches the video and handles live numbers. But TeX's spacing rules are the hard part, and a homemade layout can look a little off. The fonts also limit the symbols: `internals.md` lists what they have.
- **A formula editor with a GUI is a much bigger job** than a text box with a live preview. Start with the text box.

**A first test for either way:** rebuild transform × point = point, with live numbers, and compare it with those 525 lines.

## Which library (speculation, to check in the spike)

- **MathJax, with SVG output.** It gives outlines as path data, which `PathShape.fromRawString()` ([path-shape.ts](../src/glib/path-shape.ts)) can already read. I believe it has a setting to put each glyph's path in the output, not in a shared `<defs>` section, which would be simpler to parse. Check.
- **KaTeX** draws with HTML and fonts, so there are no outlines to get. A poor fit.
- **Not looked at:** Typst compiled to WebAssembly, which has its own math syntax. TeX is what people paste from papers, Wikipedia and their own notes, so TeX comes first.
- Check the license of the library and of its fonts, and the current release's size and how it loads under Vite.

## The component (speculation)

**Properties:** the TeX source (a string; multi-line), Position, Size, Color, and Anchor, like the other drawn components.
**Or a file:** read it through `fetchMedia()` ([local-files.ts](../src/local-files.ts)), so a `local:` URL works, as CLAUDE.md says for all media.

**The pipeline:**

1. TeX source → the library → SVG.
2. SVG → one `PathShape` per glyph or rule, each with its position.
3. Keep the result, keyed by the source string. Render each source once, not every frame.
4. `show()` draws the paths **filled**, scaled and translated to the component's position.

**Not tied to Multi Text.** It's another component, like [traditional-text.ts](../src/slide-components/traditional-text.ts), which is also not a Multi Text and has its own options (the user's point, 2026-11-15).
The look is different from the stroke fonts: TeX glyphs are filled outlines. Filled paths are fine for HEVC, since the edges are crisp.

**Waiting for it.** Typesetting is asynchronous and may be slow the first time.
Follow the Image component ([image.ts](../src/slide-components/image.ts)): `getFramePromises()` makes the recording wait, and `getReady()` ([get-ready-everywhere.md](get-ready-everywhere.md)) starts it early in live playback.

**Mistakes in the source are a state, not an error** (CLAUDE.md's "User Errors"): show a warning in the editor and on the canvas, draw whatever still makes sense, and never throw from `show()`.
MathJax reports a parse error with a message, so the message can be shown.

**A big dependency.** The library already depends on large packages that load separately: [transcribe-worker.ts](../dev/transcribe-worker.ts) holds `@huggingface/transformers` in a worker.
The TeX library should load only when a TeX component is first used, with a dynamic `import()`, so a project that never uses TeX doesn't pay for it. Whether it's a regular dependency, an optional one, or a separate entry point is an open question.

**In the Visual Editor:** an entry in the Insert list ([registry.ts](../src/slide-components/registry.ts)), a showcase slide (a new feature gets one), and probably a dialog for the source, with a live preview.
A dialog with live changes reverts the way ✎ Edit Text… does (CLAUDE.md's "Dialogs with live changes").

## Later, when it's worth doing

- **A "Write" effect,** like Manim's signature one: trace the outline, then fade in the fill.
  The user sees the Handwriting effect as our equivalent, and says there's no rush, but if we do anything serious with TeX, that's the time to add it. They're aimed at the same audience.
- **Morphing between equations,** the part of Manim that's hard to do by hand. TeX gives every symbol a position, and a way to tag parts of the source gives the pairing.
  - Manim does this by splitting the source into pieces and pairing them by their text, from memory, and I haven't read its source.
  - MathJax has `\class{name}{...}` for tagging, and I believe the tag reaches the SVG. That's unverified, and the spike should check it.
  - The pairing, the arcs and the staggered starts are the same problem as [multi-text-morph.md](multi-text-morph.md), so the two plans should share one answer.
  - The two are separable: the morph needs named pieces with positions, and TeX is one way to get them.

## The spike (first step)

A page in the test project, no component yet:

- TeX source → SVG → `PathShape`s, drawn filled on a canvas, with a few formulas (a fraction, a root, a sum with limits, a matrix, an error).
- Does it load and bundle under Vite, and how big is it?
- How long does the first typeset take, and a later one?
- Does a `\class` tag survive into the SVG, so each tagged part can be found?
- The matrix from the SoME5 video, with numbers that change: typeset once with empty cells of a fixed size, then draw the numbers into them. Does it stay still?

## Effort (rough guesses, nothing built)

| Step                                                                                  | Effort                                                       |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| The spike above                                                                       | Half a day to a day                                          |
| The component: properties, cache, async readiness, warnings, registry, showcase slide | 2–3 days                                                     |
| The source dialog with a live preview                                                 | About a day                                                  |
| A "Write" effect                                                                      | About a day                                                  |
| Morphing between equations (tags, pairing, arcs)                                      | 2–4 days, and unknown until the Multi Text design is settled |

About **3–5 days** for a first useful component, not counting the morph.
The risks are the library's size and loading under Vite, and how closely the SVG's structure follows the source.
That's why the spike comes first.

## Not now

- TeX packages beyond what the library supports. Anything the library can't typeset shows a warning.
- Text that mixes TeX and ordinary text in one paragraph. Use two components, or a Multi Text and a TeX component side by side.
