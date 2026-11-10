# Release 1.0.0

Make the next release 1.0.0, and put every breaking change we want into it, so the next one is a long way off.

**Status (2026-11-03):** Planning.  The old builders are deprecated; nothing else has started.

## What 1.0.0 means

Semantic versioning:  MAJOR.MINOR.PATCH.

- **Before 1.0**, anything may change.  The convention, which npm's `^` follows, is that the *minor* number is the breaking one:  `^0.5.0` accepts 0.5.x but never 0.6.0.
  That's what BREAKING-CHANGES.md and CLAUDE.md's release steps do today.
- **1.0.0 says the API is defined.**  Not finished:  a breaking change after this means 2.0.0, a new feature 1.1.0, a fix 1.0.1.
  `^1.0.0` accepts every 1.x, so a project gets new features and fixes with `npm update`, and never a breaking change by accident.
- The three video projects depend on `^0.5.0`, so they won't move to 1.0.0 until someone runs `npm install canvas-recorder-lib@1.0.0` in each.

It feels like 1.0 because the library does what the videos need.  That's the right reason.

## Before 1.0.0

The breaking changes, all in one release.  Each one gets a BREAKING-CHANGES.md entry in the same commit.

### 1.  Remove the old builders

`MakeShowableInParallel`, `MakeShowableInSeries`, `makeRepeater()`, `addMargins()` and `reschedule()` in [src/showable.ts](../src/showable.ts).
Deprecated on 2026-11-03; see "Old builders" there.

**Why:**  they only pass along `show()`.  Not `getFramePromises()`, so recording doesn't wait for an image, a video or a font inside one.  Not `getReady()`, so live playback doesn't warn a video clip before it starts.  And not anything added to `Showable` later.
They're from canvas-recorder, before components.

**Who uses them (2026-11-03):**

| | Uses |
| --- | --- |
| The library (`lib/`, `src/`, `dev/`) | None.  Only comments mention them. |
| affine-transforms, riemann-surfaces-3d, 7-pointed-star | None. |
| simple-video-editor | None. |
| The showcase | 20 slides use `MakeShowableInParallel`, only its `add()` and `build()`. |
| canvas-recorder | Lots.  It's historical and has its own copy, so it doesn't matter. |

**Replacements:**

| Old | New |
| --- | --- |
| `MakeShowableInParallel` | `InParallelComponent`, or a subclass:  `DurationAgnosticComponent`, `ComponentWithFixedDuration`. |
| `MakeShowableInSeries` | `InSeriesComponent`. |
| `addMargins()` | `PaddingComponent`:  Initial Time and Extra Time add the time, Show Before and Show After choose hide or freeze. |
| `reschedule()` | `PaddingComponent` with Show Before and Show After set to "live".  A negative Initial Time starts the child partway through. |
| `makeRepeater()` | Nothing yet.  Nothing uses it either.  If repeating is needed again, make it a component, so it gets the same forwarding as the rest. |

**Steps:**

1. Convert the 20 showcase slides to `InParallelComponent` (or `DurationAgnosticComponent`).  Mechanical:  `add()` and `build()` are all they use.
   Check each one still plays the same length:  `MakeShowableInParallel`'s duration is the longest child's.
2. Delete the five, and the `// MARK: Old builders` comment.
3. The comments that mention them:  [in-series.ts:32 and :159](../src/slide-components/in-series.ts#L32), [in-parallel.ts:75](../src/slide-components/in-parallel.ts#L75), [utility.ts:56](../src/utility.ts#L56).
   And CLAUDE.md's "Composing Showables".
4. BREAKING-CHANGES.md:  the table above.

### 2.  The save file's format version

`formatVersion` in every save file ([src/snapshot.ts:221-244](../src/snapshot.ts#L221-L244)) is the last of the scaffolding from the move to one tree per video.

- The version 1 reader is already gone ([dev/canvas-recorder.ts:7550-7560](../dev/canvas-recorder.ts#L7550-L7560)).
- Nothing compares the number.  `isVideoSnapshot()` only checks that it *is* a number, as a way of recognizing a save file.
- IndexedDB entries never had one.

**Not the same thing:**  the backup in `sessionStorage`.
When the page unloads, `saveOnUnload()` writes the whole tree to `sessionStorage` as well as starting an IndexedDB write, because a write started during unload often doesn't finish.
On the next load, `initFromDB()` uses the backup only if its **timestamp** is newer than the newest IndexedDB entry.
No version number there; it's fine as it is.

**Recommendation:  remove `formatVersion`** (and `SNAPSHOT_FORMAT_VERSION`), since version numbers are for big changes that can't be done any other way.

- Recognize a save file by its `videoKey` and `tree` instead.
- Files that have it still load; the field is ignored.
- If a big change ever comes, "no `formatVersion`" can mean this format.  So nothing is lost by removing it now.
- It's breaking only because `SNAPSHOT_FORMAT_VERSION` is exported.
- The synced `.json` files change once, losing one line.

The alternative is keeping it and refusing a file from a newer version.  That only matters if more than one copy of the library is writing files, and that's never happened.

### 3.  Say what's public

`package.json` exports `"./*"`, so every file in `lib/`, `src/` and `dev/` can be imported, and after 1.0 renaming any of them is a breaking change.
That's more than we mean.  riemann-surfaces-3d already imports `canvas-recorder-lib/dev/transcripts`.

Options:

- **Declare it in the README:**  the package root and `src/…` are public; `dev/…` is the player's insides and can change in any release.
  No code change.  Move what consumers really need out of `dev/`, like `makeTranscript()`, or re-export it from the root.
- **Or narrow `exports`** to the root and `src/*`.  Enforced, but a project that reaches into `dev/` stops compiling.

Recommendation:  the README sentence now, and narrow `exports` later only if it becomes a problem.

### 4.  Anything else that's been waiting

Renames, default values, signatures:  anything we've wanted to change but didn't want to break.
Collect them here before release.  So far:

- **`InParallelComponent` → `Component`** (proposed 2026-11-03).
  It's the base of every component, `InSeriesComponent` included, so "in parallel" is just its default, and "In Series extends In Parallel" reads wrong.
  - Rename the file too:  `src/slide-components/in-parallel.ts` → `component.ts`, and maybe move `PaddingComponent` into its own `padding.ts`.
    That changes the deep-import paths, which is fine in this release.
  - `ParallelChildInfo` and `ShowChildInfo` follow:  `ChildInfo`, `ShowChildInfo`.
  - Save files don't change:  they store `registryKey`, and nothing registers a plain In Parallel.
    The generated TypeScript in the diff files (`properties/*.txt`) uses class names, so it says `Component` from the next sync on.
  - Users:  18 lines in the library, `affine-transforms.ts`, and the showcase.
  - Docs:  `Showable` is the interface; `Component` is the standard implementation.  A plain object can still be a `Showable` in the tree.
- ~~**`samplesFromParametric()` samples at `i / (N - 1)`**~~ Fixed 2026-11-09 as a patch:  a bug fix isn't breaking, even when it changes what's drawn.  7-pointed-star's issue 10.

- **The video size moves into the save file** ([configurable-video-size.md](configurable-video-size.md#proposal--the-size-and-the-last-save-range-in-the-json-file-2026-10-24)), added 2026-11-09.
  Wanted for the Simple Video Editor's projects.  It isn't an API change.
  But an old save has no size, so once the localStorage key goes away, the old save would open at the program's default size instead of the size it was made at.
  Copy the size from localStorage into the state the first time an old save loads, and it isn't breaking.  Without that copy step, it's breaking, and belongs in this release.

Additions aren't breaking and can come any time.  7-pointed-star's issues 5 and 9 (export `FourierComponent` and `LatticeValue` from the package root) went into 0.6.0.

## Order

The sound work in [live-sound-mixing.md](live-sound-mixing.md) changes no public API, so it doesn't have to wait for 1.0.0, or hold it up.

0.6.0 (2026-11-05) came first, so 7-pointed-star could have the fixes since 0.5.0, including the new diff file.

1. Items 1–4 above.  Small.
2. Release 1.0.0.

The sound work didn't wait:  it shipped in 0.7.0.

## The release itself

1. BREAKING-CHANGES.md:  an "Unreleased" section, with every entry from above, becomes "1.0.0 (date)".
2. README.md's "Quick Instructions for Publishing", with `npm version major` (0.7.x → 1.0.0).
3. `npm publish` (you:  login and 2FA).
4. In affine-transforms, riemann-surfaces-3d and 7-pointed-star:  `npm install canvas-recorder-lib@1.0.0`, `npx tsc --noEmit`, commit both package files.
5. Update CLAUDE.md's "Releasing a change":  from now on, an Unreleased section in BREAKING-CHANGES.md means `npm version major`; new features `minor`; fixes `patch`.

Optional:  `npm deprecate canvas-recorder-lib@0.0.0-stage "Not a real release."`  It's a leftover on npm.
