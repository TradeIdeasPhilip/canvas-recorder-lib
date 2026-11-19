# A Simple SVG Path Component, with an Editor

A component that draws one path, takes it from an SVG file (the simple kind Inkscape saves), and lets you make small changes to it in the Visual Editor, in place.

**Status (2026-11-15):** A plan, nothing built. Priority not given yet.
Later the same day: a smaller first Path component comes first, with a typed or pasted path and no file or editor. See [path-component.md](path-component.md). This plan is what it could grow into.
The user's own framing: _simple_ paths, like an arrow with a few bends in the middle to go around another object. **Not a replacement for Inkscape**, closer to a replacement for PowerPoint's drawing tools.
Parts of this are speculation, and they're marked.

## What I think

It's a good plan, and the split into two pieces is the right one, because they have very different costs.

- **Showing a path, and getting one out of a file, is cheap, and most of the value.** The one real risk is not the component, it's the path parser. See below.
- **Editing in place is where the scope can balloon.** Inkscape's node tool took years. The way to keep it small is a short list of edits that take 10 seconds each (below), and a firm rule against growing it.
- **Your clutter worry is right,** if the editor shows every control point. It doesn't have to. Dragging the curve itself needs no points on the screen, and everything else can be shown only near the cursor or on the selected node.
- **Store the path in the save file, not a reference to the SVG.** In-place editing needs the project to own the data, and a `local:` file exists only on one computer.

## What's already there

Checked in the code on 2026-11-15, not run:

- **An SVG already shows as an image.** [`IMAGE_FILE_TYPES`](../src/local-files.ts) includes `.svg`, so the Image component draws one. That gives a picture, not a path: no recoloring, no draw-on, no editing.
- **`PathShape.fromRawString()`** ([path-shape.ts](../src/glib/path-shape.ts)) reads a `d` string. **It's incomplete,** and that matters, because Inkscape writes compact, mostly relative paths.
  - It handles `M m L l H h V v Q q C c s Z z`, numbers with no separator before a minus, and exponents.
  - It throws "Confused." on `A a` (arcs), `T t`, and an absolute `S`. Arcs are what a circle or an ellipse turns into, I believe.
  - Its number pattern requires a digit before the decimal point, so `.5` fails, and minified SVG writes `.5`. Confirm with a test.
  - An absolute `M` with extra number pairs is a TODO. Its own comment about a missing `c` is out of date, since `c` is handled now.
- **`rawPath`** writes a path back out. Its own TODO says it sometimes adds a spurious `Z`, which changes how a stroke ends (a cap versus a join). An editor that rewrites the path needs that fixed, with a round-trip test.
- **`getBBoxRect()`** gives a path's bounding box. **`panAndZoom()`** ([transforms.ts](../src/glib/transforms.ts)) fits one rectangle into another.
- **`PathShapeSplitter`** and `Command.split()` cut a path by distance, so drawing it on, from 0 to 1, is already possible.
- **The file picker row,** [`buildLocalFileRow()`](../dev/local-file-row.ts), is what Image and Video Clip use. A path file would use the same row.
- **The Visual Editor drags rectangles, lattices, points and arrows** on the canvas (`hitTestPointMarker()` and friends, and the pointer handlers in [canvas-recorder.ts](../dev/canvas-recorder.ts)). A path would be one more kind of marker. It isn't a schedule, so it doesn't fit the existing ones without new code.
- **The Arrow component** ([arrow.ts](../src/slide-components/arrow.ts)) is straight only. A bent arrow would be a new job, and a likely one (below).
- **Fourier sources** take a path ([fourier.ts](../src/slide-components/fourier.ts)). A saved path could later feed one.

## Piece 1: the Path component

**Properties (speculation):**

- **The path:** its `d` string, in the SVG's own units. A text area in the editor, so you can paste one in from anywhere.
- **Source Rect:** the part of the SVG's world this path lives in, fixed when the path is imported (from the SVG's `viewBox`, or the path's bounding box). It does not follow edits, so dragging one node doesn't move everything else.
- **Dest Rect:** where that rectangle goes on the canvas, animatable, using `panAndZoom()`. The same idea as the Image and Video Clip components, so their snap and fit buttons might work here.
  A default can't depend on the canvas size (CLAUDE.md), so Insert sets it explicitly, as it does for a Video Clip.
- **Stroke:** color, width, alpha, line cap, line join.
- **Fill:** none by default, or a color, with a fill rule (nonzero or even-odd).
- **Start and End,** each 0 to 1: draw only that part of the path. It's the draw-on effect, and for an arrow that draws itself it's probably the most useful property here.

**Not in the first version:**

- An arrowhead at either end. For the user's own example, a bent arrow, it's the likely next property: it needs the direction of the path at its end, and the shaft has to stop short of the head. Look at how the Arrow component does it.
- A dash pattern and its offset, which is animatable.
- A multi-color stroke, using `strokeColors()`.

## Piece 2: finding a path in an SVG file

**The picker:**

1. The same file row as Image: open a file, or pick one the browser already knows about.
2. Parse it with `DOMParser`, as data only. Never put it in the page, since an SVG can contain scripts.
3. List the paths. Each row shows its label (Inkscape's `inkscape:label`, else the `id`), its node count, and a small thumbnail drawn where the path sits in the whole picture, with the other paths in gray. Hovering a row previews it on the canvas.
4. Choosing a row copies the path's data into the component.
5. A **Replace from file** button picks the path again, for when you've changed it in Inkscape. The file and the id are saved only as a note for that button.
6. A row for "all the paths" would join them into one (speculation, cheap): several `M` subpaths in one `d`.

**What the import must do:**

- **Apply transforms.** Inkscape puts a `transform` on a layer's group, I believe, so the path's own numbers are not where it's drawn. Compose the transforms of the path and every group above it, and apply them to the path's coordinates.
- **Convert arcs to cubic curves,** which means finishing the parser.
- **Say what it skipped.** A rectangle, circle, ellipse, line, polyline or polygon isn't a `<path>` until you do Path → Object to Path in Inkscape (Shift+Ctrl+C). Converting them ourselves is a small second step.
  Clones, clips, masks and text are not supported. List them in gray with a hint. That's a state, not an error (CLAUDE.md's "User Errors").
- Ignore the SVG's own colors and stroke width by default. An optional "copy its style" button could bring them in.

**The Inkscape workflow to document:** make the file hold just the paths you want (delete the rest, or save only the selection), convert objects to paths, and save as Plain SVG.

## Piece 3: editing a path in place

**Principles:** small changes, no clutter, the least new machinery.
The edits are the ones that take ten seconds, and nothing else.

1. **Drag the curve.** Hover highlights the segment under the cursor, and dragging it reshapes it. No points have to be on the screen for this.
   For a cubic segment, grabbing the curve at parameter `t` and moving it by `d`: move both control points by `d / (3t(1−t))`, and the curve follows the cursor exactly. For a quadratic, one control point by `d / (2t(1−t))`. Keep `t` away from 0 and 1, where the shift gets huge.
   Dragging a straight segment moves its two end nodes, or bends it, to be decided by trying.
2. **Drag a node.** Nodes are small dots, shown near the cursor or on the selected path, not all at once. A node's handles show only for the selected node and its neighbors.
3. **Add a node:** double-click a segment. This splits the segment, and `Command.split()` does most of it.
4. **Delete a node:** select it and press Delete. The neighbors reconnect.
5. **Turn a segment from a line into a curve, and back.**
6. **A text field with the raw `d`,** always there, for pasting in and copying out. This is also the fallback for anything the editor can't do.
7. **A node table:** x and y for each node, with arrow keys to nudge. This scales to a path with a hundred nodes without cluttering the screen. (Optional, and probably worth it.)

**A node cap (speculation):** above some number of nodes, say 40, the editor only moves the whole path and says why. Traced shapes have hundreds, and that's a job for Inkscape.

**Left out on purpose:** node types (smooth, symmetric, cusp), selecting several nodes, snapping, boolean operations, drawing tools, rotating or scaling a selection. Each one is a reason to open Inkscape.

**Where the code goes:**

- The geometry (reshape a segment, insert a node, delete a node, find the nearest point) in `src/glib/`, as pure functions. They can be tested in headless Chromium without the editor. I believe bezier-js's `project()` finds the nearest point on a curve.
- The interaction in a new `dev/path-editor.ts`, with hooks like the other panels. [canvas-recorder.ts](../dev/canvas-recorder.ts) is already huge, so it only gets the few lines that add this marker kind.
- Edits are saved like any other change: autosave, then the Load history as the undo. Dragging is one edit.

## Decisions to make

- **One value, or keyframes?** If the path is a plain value, it can't change over time. A keyframed path, interpolated between two paths with the same structure, would let an arrow bend around an obstacle as it moves in.
  That needs a new schedule type in the save format and the editor, which is a lot more work. **I'd start with a plain value,** and keep the door open. Notes:
  - You can already morph between two paths with the Fourier morph, and Start and End give you draw-on.
  - Keyframes would make "add a node" harder, since every keyframe would need the node.
  - [paint-layers.md](from-previous-project/paint-layers.md) already mentions interpolating paths with the same command structure.
- **What it's called.** "Path" or "SVG Path"? It's about the component's name in the Insert list.
- **Whether to bake the Dest Rect into the data** (path already in canvas units, and no Source or Dest Rect) is simpler, but then scaling or moving the path means rewriting every node, and it can't be animated. I prefer the two rectangles.

## Effort (rough guesses, nothing built)

| Step                                                                                                              | Effort      |
| ----------------------------------------------------------------------------------------------------------------- | ----------- |
| Finish the parser (`A a T t S`, `.5`, absolute `M`), fix `rawPath`'s `Z`, round-trip tests on real Inkscape files | 0.5–1 day   |
| The component: properties, Start and End, registry, Insert default, showcase slide                                | About 1 day |
| The importer: file row, parsing, transforms, the list with thumbnails and preview, Replace from file              | 1.5–2 days  |
| Editing, first cut: the raw `d` field, drag a node, handles for the selected node                                 | 1–2 days    |
| Editing, the rest: drag the curve, add and delete a node, line and curve, the node table, the cap                 | 2–3 days    |
| Later: arrowheads, basic shapes, a dash pattern                                                                   | 2–3 days    |

About **3–4 days** gets you a path from an Inkscape file on the screen, with draw-on (the first three rows).
Editing adds **3–5 days**. Allow plus or minus half again.

**Order:** parser, component, importer, and then use it for a while, so the editor gets the edits you actually make.

## Risks

- **The parser.** Everything depends on it, and real files have the odd syntax that a hand-written regular expression misses. Test with a few real files from the user.
- **Rewriting the path.** An editor that regenerates `d` can change a path it shouldn't. The round-trip test is the guard.
- **The editor's pointer code** is one big file with several marker kinds. Add this one without changing how the others behave.
- **A large, hard-to-undo edit** isn't a worry today, because autosave and the Load history are the undo. Named backups ([load-history.md](load-history.md)) would help here.

## Making Progress

### Testing The Parser

One big issues is that my parser doesn't understand everything.

One of the reasons the parser changes so slowly is for lack of test cases.
Without a real test case in front of me there was less pressure to make progress.
With so many different things to do, the parser and most other parts of the library are often limited to what I've required for a specific project.
If we want to make progress we need to start with some test cases.

My preferred way to do most of the testing is to display each path two ways.
Take each test case and try to draw it with our library and create and svg "file" (probably a data url or a blob url) and draw them both on top of each other.

Draw at the same size and position.
The reference image / SVG "file" is on the bottom (further from the user's face in the Z order).
It will use a larger line width, probably 2× the one on top.
I do that a lot, including every example in the "Will it Fourier" video.

Sometimes, when I'm looking for an exact match, really looking close and squinting, I'll use the same line width in both places.
That's not the focus.
But as long as these are all drawn as animations we can set the line width to change and show the tight fit briefly, and the standard 2× fit most of the time.

Ideally each of these would sweep through some reasonable range of values.
We have the infrastructure.
This will help make the tests interactive and good looking.
But also, it will give us a lot more test cases for free, even if we own describe a small number of keyframes.

We might as well add test cases for everything, even though the existing stuff has been tested heavily by use.

I'm imagining a lot of small, simple, test cases, with documentation right on the screen.

### Adding Arcs to the Parser

What's left of quadratics, the cubics and the M's should not be difficult.

I've been avoiding the arcs for multiple reasons.
Mostly I really hate the  arc commands in SVG.
I always find them confusing and hard to write and often I find it easier just to guess and test it!
I would need a better description of these.

My current library contains a way to create arcs of a circle.
I avoided the ellipse because I didn't need it.
Also, I really like my circle API.
It's different from anything I've seen before, so it's useful when I use it directly, but it probably won't help at all with the task at hand.
(I'm actually drawing a spiral, not a circle, with the assumption that the two input radii are probably meant to be the same length, but might not be *exactly* the same length.)

Let's focus on the standard approach of turning each SVG arc commands a series of cubic Bézier segments.
I don't have an algorithm handy, but I think this is a standard request.
Usually a circle becomes 4 cubics with very, very little error.
If I ever need a circle made of quadratics I'd use a standard algorithm to turn all of th cubics into (a good approximation created with) quadratics.

Note that I recently added simple ellipses to https://github.com/TradeIdeasPhilip/7-pointed-star.
There are notes in that project about porting the code back to this library.
Again, those are very custom to my needs and might not help here.
But there might be some overlap between the projects.
Ideally I'd have a simple way to make an ellipse at will, not just as part of a path command.

### Editor Prototype

I'd love to see a **very** simple path editor component.
This should be marked clearly as a prototype.
Do what's easy and if something gets in the way skip it.

I can imagine something that works a lot like the transforms in SlideComponent.
The user writes a string for the entire path.
And the Visual Editor provides *exactly* 10 variables.

Let's say that all of the variables are points.
My main focus is on lines and quadratics, so this should cover most of my needs.

We already have a point editor in the Visual Editor, so this shouldn't be hard.

Depending on the context, we might need to deal with transforms.
If we are drawing arrows in place, we probably want to focus on normal screen coordinates.
But it seems like SVG images will be moved and scaled and rotated a lot.
If we add a destination rectangle, that will be doing transforms, so the Visual Editor will have to tell the point editor about that.
Alternatively, we can apply the transform directly to all of the points individually.

Add a Boolean property to add a marker to the final end of the path.
Make it a triangle so the line becomes an arrow.
This is just a quick and dirty test.
If I remember correctly I never liked that feature of SVG.
The end of the line is the middle of the marker.
It becomes hard to match the tip of the arrow with anything.

### Z commands

I have some comments in the code warning about the state of the Z commands.

For the most part the Z commands work as they should.
The problem is that my underlying library does not directly support Z commands, and I don't plan to change that.
So if we input or output a lot of external things we might run into  trouble.
But mostly I'm just importing SVG art one image at a time, and mostly those work as is.

If we run into real problems we can take a look.
But for now my plan is to keep what we have.

### Importing from a File

I recently started some manual work on that process.
See https://github.com/TradeIdeasPhilip/7-pointed-star/blob/76359ebcf9bd6f6606bf126c00ace343290e57a6/src/svg-sources.ts#L28.

To do this right we need to understand multiple types of elements.
* `g` - Combine all of the children recursively. Or possibly return a list of separate paths. 
* `path` - Our goal is to output something that an SVGPathElement can understand.  We already understand the basics and we already have an action item to understand the rest.
* `ellipse` - Note my previous comments about creating a function to make a path from an SVGEllipseElement.  The path version of a circle or ellipse is complicated and hard to use.  IF you just want an ellipse, the standard SVG element works well.  And we want a stand alone function to do the same.
* `circle` - Just a special case of an ellipse.
* `rect`, `line`, `polygon` - These should be very easy to read and parse and convert to a path.

This would be parsed in advance, not every frame.
It might be done in a dialog box, if not a completely separate window.
I can imagine a way to select a subset of the file.

There are a lot of features we could add.
It seems like the only urgent one is the size and position.
I've found that random SVG files all have different standards for this.
We can add more features as we run into more issues.

The assumption is that we're focused on simple things.
We can do most of the work, like deleting useless things, in Inkscape.
One exception, we might want to extract a lot of separate paths from one SVG file, instead of using Inkscape to create N different simple files.

Does Inkscape let me tag SVG elements?
Like the id field or maybe “data-find-me="7"”.
It would be great if the import code could generate a map from id strings to path strings.