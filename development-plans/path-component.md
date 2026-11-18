# A First Path Component

A component that strokes one path. You type or paste the path, or pick one by name.

**Status (2026-11-15):** Two small tasks, nothing built. **Sooner rather than later (the user).**
"It's easy enough to do from code, but it just never made it into a component."
It's a first version, like the original Text component: it might grow into something better, or be replaced.
The details below are my guesses at what the user asked for.

## Version 1

- **One input for the path,** in any of the usual formats. Copy 7-pointed-star's Circuit field, which the user says is very powerful and works well:
  - It's one text property. Its suggestions are the names in a table (`choices` on a `StringScheduleInfo`).
  - One function reads it, `parseCircuit7()`: a name is looked up, and anything else is parsed. It returns the result, or a message saying what's wrong.
  - The component parses again only when the text changes.
- **The formats here:**
  - a name from the table
  - an SVG `d` string, like `M1,2 L3,4`
  - CSS's `path('…')`
  - the JSON that `JSON.stringify()` makes from a `PathShape`

  [`PathShape`](../src/glib/path-shape.ts) already reads the last three: `fromRawString()`, `fromCssString()` and `fromJson()`.

- **A table of named paths,** which a project adds to, like `FunctionGraphComponent.functions` ([function-graph.ts](../src/slide-components/function-graph.ts)). Maybe. The library would put in a few for the showcase.
- **The obvious options:** color, width, corner style (line join) and end style (line cap).
- **A mistake is a state** (CLAUDE.md's "User Errors"): a path that doesn't parse shows its message in the editor and on the canvas, as the Function Graph does for an unknown name. Never a throw from `show()`.
- The usual extras: an entry in the registry, a showcase slide, a default path so Insert shows something.

**Where it's drawn (the user, 2026-11-15):** "I rely heavily on makeItFit() and panAndZoom(). Those are the easy answers most of the time."

- **So version 1 fits the path into a destination rectangle,** with `PathShape.makeItFit()`. The rectangle can be animated.
  The line width stays in canvas units, because the path is moved before it's stroked.
  A default can't depend on the canvas size (CLAUDE.md), so Insert sets the rectangle, as it does for a Video Clip.
- **For more control, the planned transforms** ([transform-editor.md](transform-editor.md)). "More than control, those tell you what your coordinates are, which the fully automated version does not."
  `makeItFit()` fits the path's own bounding box, so the numbers in the path stop meaning anything, and two paths drawn to line up won't.
- **So I'd add one choice** (my suggestion): fit to the rectangle, which is the default, or draw the path's numbers as typed, for use inside a transform.

**To decide:**

- **A scalar or a schedule** for the path text. 7-pointed-star's is a schedule, so the circuit can switch partway through.
- **Its name** in the Insert list: "Path".

**Known limit:** `fromRawString()` doesn't read every `d` string. It throws on arcs (`A`), on `T`, on an absolute `S`, and probably on `.5`. Version 1 shows the message. Finishing the parser is in [svg-path-component.md](svg-path-component.md).

About half a day (a guess).

## Version 1.1

**Our first attempt at `strokeColors()`** ([stroke-colors.ts](../src/stroke-colors.ts)) in a component: the stroke cycles through several colors along the path, and the colors can move.

- A choice between one color and many.
- The properties `strokeColors()` already takes: the colors (the default is `myRainbow`), the offset along the path, which is the one to animate, and how many times the colors repeat.
- For a loop that repeats without a jump, the offset has to move a whole number of cycles (CLAUDE.md's "Seamless Loops"). Say so next to the property.
- It's a first attempt. Expect to learn what the properties should be.

About half a day (a guess).

## Later: don't lose these (the user's ideas)

- **Several strokes on one path,** each formatted its own way, maybe offset from the path.
- **A lot of overlap with Multi Text.** Ideally the two share the formatting. See [multiple-active-text-formats.md](multiple-active-text-formats.md).
- **`strokeColors()` for both** the path and the text.
- **The Handwriting effect on each stroke,** each on a slightly different schedule.
- **A path from an Inkscape file, and small edits in place:** [svg-path-component.md](svg-path-component.md). Its "Piece 1" is this component with more properties (a fill, a destination rectangle, a start and an end for drawing it on).
