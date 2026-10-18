# New Project Lessons

Problems the first real projects ran into while using this library, and what the README should say about each.
The goal:  the next project follows the README and just works.

**Status:** Collecting.  Fold each item into [README.md](../README.md)'s "Notes for a project that uses this library" once its fix is proven, then mark it done here.

## Open

### `file:../canvas-recorder-lib` breaks GitHub Pages (2026-10-14)

**Symptom.**  riemann-surfaces-3d worked locally, but new features never reached its web page.
Its deploy workflow had failed on every push since 2026-10-14:

```
Error: src/full-screen-component.ts(18,8): error TS2307: Cannot find module 'canvas-recorder-lib' or its corresponding type declarations.
```

**Cause.**  The README said to link the library with `"canvas-recorder-lib": "file:../canvas-recorder-lib"`.
GitHub's build machine has no `../canvas-recorder-lib`.
`npm ci` doesn't notice, because a `file:` dependency is just a symlink, even a broken one; `tsc` is the first thing that needs the files.
affine-transforms has the same dependency, but no deploy workflow yet.

**Fix (in progress, 2026-10-17).**  Publish the library to npm, and depend on the published version.

- Tested before publishing:  a copy of riemann, with no library next to it, built cleanly (`tsc && vite build`) from the `npm pack` tarball.
  One copy of phil-lib (installed automatically, as a peer dependency), and the transcription worker made it into the build.
- For local development, `npm link ../canvas-recorder-lib` swaps in the local copy without touching `package.json` or `package-lock.json`.
  Tested:  a later `npm install` or `npm ci` puts the published copy back.
  That's the safe direction:  you see what the web will see.

**README changes, once riemann deploys:**

- Replace the `file:` instructions with `npm install canvas-recorder-lib`, plus the `npm link` paragraph from [CLAUDE.md](../CLAUDE.md#releasing-a-change).
- Say why:  `file:` works locally and silently breaks the deploy.
- Keep the `fs.allow` advice:  a linked library is still outside the project.

**Considered, not chosen:**

- **A GitHub dependency** (`github:TradeIdeasPhilip/canvas-recorder-lib`), like phil-lib's [test builds](https://github.com/TradeIdeasPhilip/phil-lib#github).
  It works for phil-lib because phil-lib commits its compiled `.js`.
  This library doesn't commit `dist/`, so it would need a `prepare` script, and every consumer's install would compile the library.
- **Checking out both repos in each project's workflow.**  No versions, and every project's workflow gets more complicated.

### To check after the switch

- **`npm run dev` with the published copy (not linked).**  Vite pre-bundles packages in `node_modules`, but treats linked ones as source.
  Pre-bundling can break `new URL("./transcribe-worker.js", import.meta.url)`, which Vite's docs say may need `optimizeDeps.exclude`.
  Production builds are fine (tested above).  Unverified.
- **The README is the npm page.**  Once published, its stale parts are public, especially "How this library is made" (see below).

### Gaps in the README's new-project instructions

Found while planning the [test project](test-project.md).  The instructions grew from what riemann-surfaces-3d ran into, so they're not a checklist yet.

- No list of the files a new project needs:  `package.json`, `tsconfig.json`, `index.html`, `src/main.ts`, `.gitignore`, `public/icon.png`, `CLAUDE.md`.
- Missing Vite settings that affine-transforms has:  `base: "./"`, `build.outDir`, `resolve.dedupe: ["phil-lib"]`, and `rollupOptions.input` for more than one page.
- No deploy workflow.  riemann-surfaces-3d's `.github/workflows/deploy.yml` is the one to copy.
- "How this library is made" is stale:  it still says canvas-recorder is the source of truth, and describes `npm run import`, which we don't run any more.
- phil-lib:  a project that imports phil-lib itself should list it in its own `package.json`.
  riemann doesn't import it, and npm installs it anyway as the library's peer dependency.

## Done

- **Fixed ports.**  The README's "Ports" table is the master list (2026-10-15).
