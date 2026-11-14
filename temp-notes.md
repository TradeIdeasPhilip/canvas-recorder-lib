I've made the test project, ported the whole showcase into it split into one file per slide, and added your Fourier morph as a new slide. Nothing is committed.

I checked it with `tsc`, a production build, TypeDoc, and a run in Chromium: every slide builds, and the page loads with no errors or warnings.

**The showcase**

- It's in [test-project/src/showcase/](test-project/src/showcase/): 38 slides, one file each, and each file exports the function that builds its slide.
- [scene-list.ts](test-project/src/showcase/scene-list.ts) sets the order, like `registry.ts`. A main program can push more slides before building.
- [shared.ts](test-project/src/showcase/shared.ts) plays the role of `show-error.ts`: the title font, the margin and the default timings. Two groups of slides shared more than that, so they got their own helper files: `lissajous-shared.ts` and `multi-text-manual.ts`.
- The sound track and every reference to it are gone. One slide timed itself by a clip's length, so that's a plain number now.
- The "Freaky Dot Patterns" slide is ported but left off the list, as it was in canvas-recorder.

**The library**

- `fancy-text.ts` and `corner-rounder.ts` were never imported, because nothing in the player uses them. They're now in `src/`, which covers half of 7-pointed-star's issue 6.
- The library's README points to the showcase, `CLAUDE.md` describes `test-project/`, and `docs.yml` will publish it at `/tests/`.
- The [test project's README](test-project/README.md) calls it the showcase and says to start there for code to copy.

**Fourier morph** ([fourier-morph.ts](test-project/src/showcase/fourier-morph.ts))

- **Inputs:** both are `FourierSource`, the library's existing named type for a path, a parametric function, or precomputed terms. The square and the pentagram are at the top of `fourierMorph()`, placed with `makeItFit()`.
- **Exact ends:** it starts as the exact square and ends as the exact pentagram. Both are sampled at the same points, including every corner.
- **Motion:** in between, it uses a copy of the Fourier component's sweep. Each transition's sums are computed once, so a frame only blends two arrays.
- **Groups:** the default is the largest term, then everything but the three largest, then the second and third. Change it with the `termGroups` option.
- **Console:** a short per-group summary, plus the whole term table in a collapsed group.
- **First result:** the groups hold 44.7%, 16.5% and 38.9% of the total amplitude. Term 0 has frequency 1 and takes away the square's single loop, so after step 1 there's only a small tangle near the center. Terms 1 and 2 have frequencies 2 and −3: the pentagram's two big loops, which step 3 grows back. That table is a good starting point for the term-ordering algorithm.

**Issues from 7-pointed-star's list that came up**

- **#1:** the first `npm install` left out `fsevents` and a second one added it. The test project's README mentions it.
- **#10:** I avoided the `samplesFromParametric()` bug by sampling at `i / N` in the morph.
- **#11:** the `"use restrict"` warning shows up in this build too.
- **#13:** the morph had to copy `makeEasing()` and the sweep. A library `getAnimationRules()` that accepts a starting curve would serve both projects.

I didn't edit that list.
