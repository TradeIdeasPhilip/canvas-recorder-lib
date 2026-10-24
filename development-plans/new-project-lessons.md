# New Project Lessons

Problems the first real projects ran into while using this library, and what the README should say about each.
The goal:  the next project follows the README and just works.

**Status:** Collecting.  Fold each item into [README.md](../README.md)'s "Notes for a project that uses this library" once its fix is proven, then move it to [Done](#done).

## Open

### The library needs a very new browser (2026-10-19)

The library calls `Map.prototype.getOrInsertComputed()` (in `src/utility.ts`, `dev/audio-builder.ts`, `multi-text.ts` and `handwriting-effect.ts`).
Chrome 155 has it.  Puppeteer's own Chrome 138 doesn't, and the player's Debug Log fills with
`[audio] Skipped "./Some 5 part 1.m4a": TypeError: this[#cache].getOrInsertComputed is not a function`.
The video still draws, without its sound.

- For headless tests, give Puppeteer `executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`.
- Undecided:  a fallback for older browsers.  It matters most for the [Simple Video Editor](simple-video-editor.md), whose users aren't programmers.
  Not checked yet:  Safari and Firefox.

### A project inside this repo (2026-10-18)

[simple-video-editor/](../simple-video-editor/) is the first.  What was different from a separate repo:

- `"canvas-recorder-lib": "file:.."` works on GitHub too, because the library is in the same checkout.  The workflow builds the library first.
- `npm install-scripts ls` lists the *library's* dependencies (`onnxruntime-node`, `protobufjs`, `esbuild`), found through the link.
  They're installed by the library's own `npm ci`, so the project denies all three.
  It also needs `fsevents` approved, like riemann.  I first wrote that it didn't:  `ls` said so before the project's own `npm install` added it.
- `fs.allow: [".."]` covers both the library and the project.
- Untested so far:  whether a test project (see [test-project.md](test-project.md)) should copy this exactly.  Probably.

### To check

- **`npm run dev` with the published copy (not linked).**  Vite pre-bundles packages in `node_modules`, but treats linked ones as source.
  Pre-bundling can break `new URL("./transcribe-worker.js", import.meta.url)`, which Vite's docs say may need `optimizeDeps.exclude`.
  Production builds are fine:  riemann's site works.
  - **Mostly checked (2026-10-19), in affine-transforms with 0.5.0 and Vite 8.3.4.**  Vite pre-bundled the library (every deep import, plus the player chunk), and the worker still loaded from
    `/node_modules/canvas-recorder-lib/dist/dev/transcribe-worker.js?worker_file&type=module`.
    The editor's automatic transcript of the voiceover got to "downloading models 35%" before the test stopped.
    No `optimizeDeps.exclude` needed.  Not seen:  a finished transcript.
- **The README is the npm page.**  npmjs.com shows the README from the last publish, so README fixes appear there with the next version.

### Gaps in the README's new-project instructions

Found while planning the [test project](test-project.md).  The instructions grew from what riemann-surfaces-3d ran into, so they're not a checklist yet.

- No list of the files a new project needs:  `package.json`, `tsconfig.json`, `index.html`, `src/main.ts`, `.gitignore`, `public/icon.png`, `CLAUDE.md`.
- Missing Vite settings that affine-transforms has:  `base: "./"` and `resolve.dedupe: ["phil-lib"]`.
  Not `build.outDir` any more:  affine-transforms used to build into a committed `docs/`, and now uses Vite's default, `dist/`, like riemann.
  `rollupOptions.input` (more than one page) is canvas-recorder's, not affine-transforms'.
- No deploy workflow.  riemann-surfaces-3d's `.github/workflows/deploy.yml` is the one to copy.
  affine-transforms copied it unchanged (2026-10-19).  Once its first deploy is green, that's two projects:  fold a "Publishing" section into the README,
  including the one-time **Settings → Pages → Source: GitHub Actions**.
- phil-lib:  a project that imports phil-lib itself should list it in its own `package.json`.
  riemann doesn't import it, and npm installs it anyway as the library's peer dependency.

## Done

### The first Import audio reloads the page (2026-10-24)

**Symptom.**  In simple-video-editor under `npm run dev`, clicking Import audio reloaded the page.
Chrome forgot the local file's permission, so 🔓 appeared.  Later reloads were fine.

**Cause.**  Only the transcription worker imports `@huggingface/transformers`.  (transcribe-core.ts imports it for types only, and those imports vanish.)
Vite doesn't look inside workers when it starts, so it found the package the first time a transcript started, prepared it, and reloaded:

```
[vite] (client) dependency optimized: @huggingface/transformers
[vite] (client) optimized dependencies changed. reloading
```

Reproduced with a second dev server and a fresh cache, by requesting the worker module the way the browser does.

**Fix.**  `optimizeDeps.include: ["canvas-recorder-lib > @huggingface/transformers"]` in vite.config.js.  The same test then logs nothing.
`npm run dev` only; production builds were never affected.
affine-transforms links the library the same way and probably needs the same line.

**README:**  [Vite setup](../README.md#vite-setup).

### affine-transforms used `file:` (2026-10-14 → 2026-10-19)

It was the first project, set up from an earlier version of the README.
It switched the way riemann did ([Installing](../README.md#installing)):  `"canvas-recorder-lib": "^0.5.0"`, the same `allowScripts` as riemann, and riemann's `deploy.yml`.
The build moved from a committed `docs/` to a gitignored `dist/`.

It built with 0.5.0 unchanged, although the library had moved on locally.
A copy with no `../canvas-recorder-lib` beside it passed `npm ci` and `npm run build`, the same steps as GitHub's build.
Its CLAUDE.md and README now say to use `npm link`, never `file:`.

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
