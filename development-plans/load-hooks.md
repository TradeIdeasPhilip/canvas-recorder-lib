# Load Hooks

Letting a component take part in loading its own saved state.

**Status (2026-11-10):** Brainstorm. Not urgent until there's a real use case to test with.

## The idea

An optional method on a component, called at the end of loading it, given the part of the saved JSON that it was loaded from.

## The use cases

1. **A variable number of properties.** Today a component's properties are whatever a freshly built one has.
   A better Slide: the Transform Template says which properties exist, so there are exactly as many as it needs, not always 10 numbers (𝓐 to 𝓙), and they don't all have to be numbers.
   1a. **A property for each child** of a container. Adding or removing a child adds or removes a property.
2. **Renames.**
   - A property: `sizeInInches` becomes `sizeInCm`. If a save still has `sizeInInches`, convert it. That code stays forever, which is fine.
   - Slides in one project: a map from old names to new names.

## How loading works today

- **Three ways in,** all doing roughly the same thing:
  - `applyFixedComponents()` ([src/snapshot.ts:192](../src/snapshot.ts#L192)), for components written in TypeScript. `applyTree()` is this, starting at the root.
  - `buildComponents()` ([src/slide-components/serialize.ts](../src/slide-components/serialize.ts)), for components added in the Visual Editor. It builds a fresh one from the registry, then applies.
  - `applyJsonEntry()` ([src/snapshot.ts:296](../src/snapshot.ts#L296)), one node, e.g. a chapter.
- **The order:** scalars, then schedules, then children. The other parts (duration, sound clips, name) are applied in different orders in the three functions.
- **Properties are matched by description and type** (`applySnapshot()` and `applyScalarSnapshot()`, [src/showable.ts:659](../src/showable.ts#L659)).
  A saved value with no matching live property is dropped without a word.
  So the live object decides which properties exist. It's the archetype.
- **Children are matched by description,** in order among equal names (`counterparts()`, [src/snapshot.ts:146](../src/snapshot.ts#L146)).
  A saved child with no match is dropped without a word.
- **Saves leave out default values.**
  - A component added in the editor is compared with a fresh one of its kind (`registryDefault()`, [src/snapshot.ts:405](../src/snapshot.ts#L405)).
  - The rest is compared with the TypeScript defaults, and `fillTreeDefaults()` puts those back before applying.
- **Everything goes through these functions:** startup, Load and its previews, opening a file, Paste, and TypeScript defaults.
  So a hook in them covers every way state comes in.

## What I think

A good idea. It's the standard answer: Java serialization has `readObject()`, Python's pickle has `__setstate__`, and every database has migrations.
But I'd make it **two hooks,** because the two use cases need different moments:

- **Migrate, before:** saved JSON in, saved JSON out. Nothing live is touched.
  This is the one for renames. A renamed thing has to be fixed _before_ matching, or it's already been dropped.
- **After load, your idea:** the live component, plus the saved node it was loaded from, after its children are loaded.
  This is the one that can fix up live state.

And case 1 may not need a hook at all (below). Its hard part isn't loading.

### Slide renames don't fit a per-component hook

Children are matched in the _parent's_ loop. A slide whose name changed is never matched, so a hook on the slide itself never runs.
A rename has to happen on the parent's saved node, or on the whole tree, before matching.
For a project, the simplest is one function over the whole saved tree, before anything else:

```ts
// Speculation.
canvasRecorder.migrateSavedTree = (tree) =>
  renameChildren(tree, ["7-pointed-star-shorts"], {
    "Scratch 3": "Four Fouriers",
  });
```

That would also fix 7-pointed-star's `library-issues.md` item 7, where the root was wrapped in a new In Series and every saved setting stopped matching.
Item 7 was closed as "no code change"; this would be the code change, if it comes up again.

### Property renames

A component's own migrate hook: if the saved node has "Size in Inches", replace it with "Size in cm", times 2.54.

- **The old name is the version.** A new save never writes the old name, so its presence says the save is old. No version numbers needed, at least to start.
- **Running it twice must be harmless.** Rewriting `sizeInInches` the second time finds nothing to do.
- **Old saves never go away.** The next save writes the new form, but history entries, `properties/*.json` in git, and pasted JSON keep the old one. So the hook stays forever, as you said.
- **A limit: defaults are left out.** A save made when Size in Inches was at its default has no Size in Inches at all, so there's nothing to convert.
  It loads with the new default. That's right if the new default is the same size; if not, that's a changed default, which CLAUDE.md already calls a breaking change.
- **Where it runs matters.** The hook sees a node with the current defaults already filled in, so "Size in cm" is always there.
  Rule: when both names are there, the old one wins. The filling never adds old names, so that's safe.

### Case 1: maybe no hook

If the component **keeps its property list up to date itself,** loading already works for the simple case:

- Make Transform Template a notifying scalar. When it changes, the Slide rebuilds its `schedules` list right away.
- Scalars are applied before schedules, in all three functions. So by the time the saved schedules are applied, the properties they belong to exist.

1a is harder: children are applied _after_ the parent's own properties, so a property for each child doesn't exist yet when the saved values go by.
Two generic fixes, both small:

- **A second pass:** after applying a node, if its list of properties changed, apply its properties again. No component code at all.
- **Or the after-load hook,** with a helper that applies whatever the first pass skipped.

The after-load hook is the general fallback, for anything these don't cover.

### What case 1 really needs, besides loading

These are the bigger part of the work, and they'd be needed with or without a hook:

- **The editor rebuilds the properties when the list changes.** Today the only thing like it is the Slide's Transform Info panel ([dev/slide-panel.ts](../dev/slide-panel.ts)), which `updateScheduleEditor()` rebuilds on every keystroke in the template.
  Simplest: after each edit, compare the selected component's lists with the last ones, and rebuild if they differ.
- **A property's default depends only on its name.** Same reason as "a default never depends on the canvas size": saves leave out values equal to the default, so the default has to come out the same when it's loaded.
- **Names stay unique.** Matching is by description and type; two with the same name already log a warning.
- **The diff file.** It names each property by finding the field that holds it ([`propertyNamesOf()`, dev/canvas-recorder.ts:3490](../dev/canvas-recorder.ts#L3490)).
  A property made on the fly has no field, so today it would guess a name like `𝓚Schedule`, which doesn't compile.
  And it writes schedules before scalars, so the code would set a property before the template that creates it.
  It needs a lookup by name, something like `slide.property("𝓚").set(…)`, and scalars first.

## A sketch

Speculation:

```ts
// On Showable:
/**
 * Saved state about to be applied to this component.  Return it, changed or not.
 * Runs before anything is matched, so it can rename this component's properties and its children.
 * JSON in, JSON out:  don't touch live state here.
 */
migrateSaved?(saved: SerializedFixedChild): SerializedFixedChild;
/**
 * Called after this component's saved state has been applied, and its children's.
 * @param saved What was applied, with the current defaults filled in.
 */
afterLoad?(saved: SerializedFixedChild): void;

// On canvasRecorder, for a project:
/** Runs on the whole saved tree before anything else. */
migrateSavedTree?: (tree: SerializedFixedChild) => SerializedFixedChild;
```

- **Order:** the project's `migrateSavedTree`, then filling in defaults, then, for each component as it's matched: `migrateSaved`, apply, its children, `afterLoad`. So children finish first.
- **A component added in the editor** is built fresh and then applied, so the same instance methods work there. `SerializedChild` and `SerializedFixedChild` are close; one type for both would be tidier.
- **A hook that throws** is a programmer's mistake: log it and load the rest. Never stop a load.
- **Pure:** `migrateSaved` and `migrateSavedTree` are plain JSON functions, so they can be tested in Node, once the library loads there (7-pointed-star's `library-issues.md` item 24).

## Effort

| Piece                                                             | Effort | Certainty                                                                             |
| ----------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------- |
| `migrateSavedTree` and a `renameChildren()` helper                | Small  | High                                                                                  |
| `migrateSaved` and `afterLoad`, in the three apply functions      | Small  | High: a few lines each                                                                |
| The second pass, for 1a                                           | Small  | Medium: what counts as "changed"                                                      |
| Case 1 in the editor: rebuilding, the diff file, `property(name)` | Medium | Medium                                                                                |
| A new Slide with only the properties its template needs           | Medium | Medium. A breaking change for old saves of Slide, unless `migrateSaved` maps 𝓐–𝓙 over |

## Open questions

1. **Which comes first, if any?** Probably whichever use case shows up first. A slide rename is the most likely, and `migrateSavedTree` is the smallest piece.
2. **Does `afterLoad` get the node as saved, or with defaults filled in?** Filled in is what was applied. As saved says what the user changed. Maybe both.
3. **A version number per component?** Not until a migration can't be told apart by its content.
