# New Project Lessons

Problems the first real projects ran into while using this library, and what the README should say about each.
The goal:  the next project follows the README and just works.

**Status:** Collecting.  Fold each item into [README.md](../README.md)'s "Notes for a project that uses this library" once its fix is proven, then move it to [Done](#done).

## Open

### affine-transforms still uses `file:`

Its `package.json` says `"canvas-recorder-lib": "file:../canvas-recorder-lib"`.
It has no deploy workflow yet, so nothing is broken.
Switch it the way riemann switched (README, [Installing](../README.md#installing)) before adding one.

### To check

- **`npm run dev` with the published copy (not linked).**  Vite pre-bundles packages in `node_modules`, but treats linked ones as source.
  Pre-bundling can break `new URL("./transcribe-worker.js", import.meta.url)`, which Vite's docs say may need `optimizeDeps.exclude`.
  Production builds are fine:  riemann's site works.  Test transcription in `npm run dev` without a link.  Unverified.
- **The README is the npm page.**  npmjs.com shows the README from the last publish, so README fixes appear there with the next version.

### Gaps in the README's new-project instructions

Found while planning the [test project](test-project.md).  The instructions grew from what riemann-surfaces-3d ran into, so they're not a checklist yet.

- No list of the files a new project needs:  `package.json`, `tsconfig.json`, `index.html`, `src/main.ts`, `.gitignore`, `public/icon.png`, `CLAUDE.md`.
- Missing Vite settings that affine-transforms has:  `base: "./"`, `build.outDir`, `resolve.dedupe: ["phil-lib"]`, and `rollupOptions.input` for more than one page.
- No deploy workflow.  riemann-surfaces-3d's `.github/workflows/deploy.yml` is the one to copy.
- phil-lib:  a project that imports phil-lib itself should list it in its own `package.json`.
  riemann doesn't import it, and npm installs it anyway as the library's peer dependency.

## Done

### `file:../canvas-recorder-lib` broke GitHub Pages (2026-10-14 → 2026-10-18)

**Symptom.**  riemann-surfaces-3d worked locally, but new features never reached its web page.
Its deploy workflow failed on every push from 2026-10-14:

```
Error: src/full-screen-component.ts(18,8): error TS2307: Cannot find module 'canvas-recorder-lib' or its corresponding type declarations.
```

**Cause.**  The README said to link the library with `"canvas-recorder-lib": "file:../canvas-recorder-lib"`.
GitHub's build machine has no `../canvas-recorder-lib`.
`npm ci` doesn't notice, because a `file:` dependency is just a symlink, even a broken one; `tsc` is the first thing that needs the files.

**Fix.**  Published 0.5.0 to npm on 2026-10-18.  riemann depends on `"^0.5.0"`, and its deploy went green the same day (`f2be281`).
For local work, `npm link ../canvas-recorder-lib` swaps in the local copy without touching `package.json` or `package-lock.json`, and a later `npm install` or `npm ci` puts the published copy back.

**README:**  [Installing](../README.md#installing), [Working on the library at the same time](../README.md#working-on-the-library-at-the-same-time) and [Releasing](../README.md#releasing).

**Considered, not chosen:**

- **A GitHub dependency** (`github:TradeIdeasPhilip/canvas-recorder-lib`), like phil-lib's [test builds](https://github.com/TradeIdeasPhilip/phil-lib#github).
  It works for phil-lib because phil-lib commits its compiled `.js`.
  This library doesn't commit `dist/`, so it would need a `prepare` script, and every consumer's install would compile the library.
- **Checking out both repos in each project's workflow.**  No versions, and every project's workflow gets more complicated.

### Install-script warnings (2026-10-18)

**Symptom.**  `npm install canvas-recorder-lib` ends with:

```
npm warn install-scripts 2 packages have install scripts not yet covered by allowScripts:
npm warn install-scripts   onnxruntime-node@1.30.0 (postinstall: node ./script/install)
npm warn install-scripts   protobufjs@7.6.6 (postinstall: node scripts/postinstall)
```

**Cause.**  npm 11 blocks dependencies' install scripts unless the project approves them, and lists the ones it skipped.
Both come from `@huggingface/transformers`, which the library uses for transcription.
Neither is needed:

- `onnxruntime-node` is for Node.js.  Its script downloads extra binaries, like Linux CUDA support.  Transcription runs in the browser, on `onnxruntime-web`.
- `protobufjs`'s script only prints a version-scheme warning.

**Fix.**  `npm install-scripts deny onnxruntime-node protobufjs`, which writes an `allowScripts` field into the project's `package.json`.
A project's `allowScripts` replaces the user-level `allow-scripts` in `~/.npmrc`, which approves `fsevents` on this Mac, so riemann approves `fsevents` too.

**README:**  [Installing](../README.md#installing).

**Side note.**  `package-lock.json` grew by about 1,100 lines when riemann switched from `file:` to the npm version.
The library's dependencies used to live in the library's own `node_modules`, behind the symlink; now the project installs them.
That includes Node-only packages (`onnxruntime-node`, `sharp`) that a browser never uses.
Making transcription's dependencies optional would shrink every project's install.  Speculation; not planned.

### Stale "How this library is made" (2026-10-18)

The README still said canvas-recorder was the source of truth, and described `npm run import`.
Now it says this library is the master copy, and has a [Releasing](../README.md#releasing) section.

### Fixed ports (2026-10-15)

The README's [Ports](../README.md#ports) table is the master list.
