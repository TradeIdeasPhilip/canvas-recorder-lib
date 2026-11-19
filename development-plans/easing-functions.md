# Easing Functions with Parameters

New easing functions that take inputs, like an exponential with one number or a cubic Bézier with four, chosen and adjusted in the Visual Editor and saved with the video.

**Status (2026-11-15):** A proposal to discuss. Nothing built.
Re-examine it next time there's room for something short and worthwhile (the user). It needs a brainstorm and maybe a prototype.
The work isn't the hard part. The user is stuck on the interface. The proposal below is speculation.

## What's wanted (the user, 2026-11-15)

- **At least three new functions:** an exponential, a quadratic Bézier and a cubic Bézier.
- **Pick a kind, and its inputs appear.** For "exponential" that's one number, which says what section of the curve to use, and its sign says the direction. Change to "cubic" and there are several inputs.
- **A custom panel for most of them,** "because just the numbers don't make sense". There are plenty of examples of a GUI for a cubic Bézier.
- **Library users can add their own.** "Very useful for testing and development, even if the easing function is eventually moved into the library."
- **Each function in its own file, with a very tight interface.** "We are trying to put the main program on a diet."
- **The question:** "how to allow for multiple types and numbers of inputs to a function generator, including text and custom user inputs and streaming."
- **And the order:** "Should we just try adding exponential, quadratic bezier and cubic bezier internally first?"

**Why it came up:** a big zoom animated as a plain number seems to speed up at the end ([transform-editor.md](transform-editor.md), "Zoom interpolation"). An exponential easing fixes that.

## Today

Read on 2026-11-15.

- **A keyframe has `easeAfter`,** a plain function from progress to progress ([interpolate.ts](../src/interpolate.ts)). `ease`, `easeIn` and `easeOut` are cosine curves.
- **There's no registry yet.** The five names (linear, ease, easeIn, easeOut, hold) are written out in six functions:
  - `buildEaseSelect()`, `easeFromName()`, `scheduleToTypeScript()` and `parseScheduleFromClipboard()` in [dev/schedule-helpers.ts](../dev/schedule-helpers.ts)
  - `easeName()` in [src/snapshot.ts](../src/snapshot.ts)
  - a second `easeFromName()` in [src/showable.ts](../src/showable.ts)
- **A function is recognized by `===`.** Anything that isn't one of the three is taken for a hold. So an easing of your own, set in code, turns into a hold when it's saved.
- **It's saved as a name:** `SerializedKf.easeAfter?: string`.

## The proposal (speculation)

### 1. A kind of easing is one small object

```ts
type EasingKind<P> = {
  /** Saved in the file, so it never changes. */
  name: string;
  /** One entry per input:  its type, its default and its limits. */
  parameters: { [K in keyof P]: EasingParameter };
  /** Make the function.  Called when an input changes, not every frame. */
  make(parameters: P): (progress: number) => number;
  /** Optional.  Points to drag on the curve.  See "The GUI". */
  handles?: {
    get(parameters: P): Point[];
    set(parameters: P, index: number, to: Point): P;
  };
  /** Optional.  A panel of its own, for a kind the standard one can't show. */
  panel?: () => Promise<EasingPanel>;
};
```

- **The parameters are a plain JSON object.** Any number of them, of any type that JSON holds. That's the answer to "any number and type", and it's how a component's properties already work.
- **`EasingParameter` uses the types the property tables already have:** number, string and select.
- **A bad value is a state, not an error** (CLAUDE.md's "User Errors"). `make()` gets whatever was typed or loaded, and returns something that works.
- **`registerEasing(kind)`** adds one. The five built in today register the same way, with no parameters, and the six lists above go away.

### 2. The function remembers how it was made

`makeEasing("exponential", { rate: 2 })` returns an ordinary function, and notes its kind and parameters in a table (a `WeakMap`). `easingRecipe(fn)` reads them back.

- **`Keyframe` doesn't change.** `easeAfter: ease` in code works as before, drawing costs the same, and nothing breaks.
- **Saving** asks for the recipe instead of comparing with `===`.
- **A function with no recipe** is one somebody wrote in code. The editor should say "custom", and never turn it into a hold. What to save for it is an open question.

The other way is to store the recipe on the keyframe and make the function from it. I'd rather not: keyframes are written as plain literals all over projects' code.

### 3. The save file

- No parameters: `"easeAfter": "ease"`, as now. Old saves load unchanged.
- With parameters: `"easeAfter": { "kind": "exponential", "parameters": { "rate": 2 } }`.
- **A kind that isn't registered** (a project's own, missing this time) plays as linear, shows a warning, and keeps its recipe, so saving again doesn't lose it.

### 4. The GUI

One standard panel, in one file, used for every kind:

- **A picture of the curve,** drawn by calling the function from 0 to 1. Every kind gets it for free, including a project's own.
- **An input for each parameter,** made from the `parameters` list.
- **Handles on the picture.** A kind can name points to drag.
  - A cubic Bézier's handles are its two control points, like every GUI for one.
  - A quadratic's is its one control point.
  - An exponential's is the point where the curve crosses the middle: drag it up or down.
- **A panel of its own** is there for a kind that needs it, loaded only when it's opened. None of the three would.

So the three wanted functions are about a page of math each, with no GUI code.
The ease list in a keyframe's row stays. Picking a kind with parameters opens the panel under the row. Changes show right away (CLAUDE.md's "Dialogs with live changes", if it becomes a dialog).

### 5. Files, for the diet

- `src/easing/registry.ts`: `registerEasing()`, `makeEasing()`, `easingRecipe()`. Small. The player needs it to load a save.
- `src/easing/exponential.ts`, `quadratic-bezier.ts`, `cubic-bezier.ts`: the math and the parameter list. No DOM.
- `dev/easing-panel.ts`: the picture, the inputs and the handles. Only the editor loads it.

### 6. Internally first, through the real interface

Yes, add the three internally first. But register them with the same call a project would use, so the interface gets tested three times before anyone depends on it.
A project can already import by path (`canvas-recorder-lib/src/easing/registry`), so 7-pointed-star could try its own kind while the interface is still marked as unsettled.
The three cover one, two and four numbers, and all three use handles. A stepped easing (a count, and a select for which end jumps) would test the other types.

## The math

- **Exponential:** `(e^(k·t) − 1) / (e^k − 1)`, and linear when `k` is 0. Positive starts slow, negative starts fast.
  For a zoom from scale `a` to scale `b`, `k = ln(b / a)` makes the zoom look steady. So the input could be shown as that ratio.
- **Quadratic Bézier:** one control point, with its `x` between 0 and 1. Solve a quadratic to find the point for a given progress.
- **Cubic Bézier:** the same four numbers as CSS's `cubic-bezier()`. Solve the cubic by Newton's method, with bisection as the fallback.
  The result can leave 0–1 (an overshoot). Check that every interpolator accepts that. Colors might not.

## Open questions

- **A function from code, with no recipe:** what does the save file say? Today it silently becomes a hold.
- **"Text" as an input:** a name picked from a list is fine. A formula typed as text is code in the configuration, which [instant-startup.md](from-previous-project/instant-startup.md) decided against.
- **Schedules that shouldn't ease at all** (a text, a select): they only make sense with hold. See "TODO: Discrete only schedules" in [editor-with-changeable-schedules.md](from-previous-project/editor-with-changeable-schedules.md).
- **Copying a schedule as TypeScript** would write `makeEasing("exponential", { rate: 2 })`, and pasting has to read it back. `parseScheduleFromClipboard()` does that with regular expressions today, which won't stretch.
- **One recipe on many keyframes** ("all my zooms use the same curve"): a named preset? Later.
- **1.0:** adding this isn't breaking. But [release-1.0.md](release-1.0.md) item 3 makes `src/` public, so the interface should be marked as unsettled if it lands before it has settled.
- **`SerializedKf.easeAfter`** becomes a string or an object. A project that reads save files itself would see the new shape.

## Effort (rough guesses, nothing built)

| Step                                                                  | Effort     |
| --------------------------------------------------------------------- | ---------- |
| The registry, the five old names moved onto it, save and load         | Half a day |
| The three kinds, with tests of the math                               | Half a day |
| The panel: the picture, the inputs, the handles, and a showcase slide | 1–2 days   |

About **2–3 days**. A prototype of the panel alone, with one kind, is an afternoon.

## Earlier notes

No earlier plan file was found. The user remembered one in [from-previous-project](from-previous-project/README.md). I looked there, in canvas-recorder's `development-plans/` and its git history, and in the other projects. The nearest notes:

- canvas-recorder's `development-plans/historical/schedule-editor-prototype.md`, under "Easing": "We've discussed lots of options in the past. For now lets focus on a small fixed set". That's all it says. That file wasn't copied here.
- [instant-startup.md](from-previous-project/instant-startup.md): "What we do instead: a registry that maps names to real functions", the way the function graph picks a function by name.

**Why it stalled** (the user): no general answer that they liked, remembering that different easing functions could have any number of parameters, of any type.
