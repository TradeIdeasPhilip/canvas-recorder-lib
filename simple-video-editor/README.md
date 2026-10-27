# Simple Video Editor

The library's player and Visual Editor with an empty project.
The published copy is at https://tradeideasphilip.github.io/canvas-recorder-lib/simple-video-editor/.

## Running it locally

```
# Once, and after changing the library:  build the library, in the repo's root folder.
npm install
npm run build

# Then, in this folder:
cd simple-video-editor
npm install
npm run dev        # http://localhost:5177/
```

After changing the library, run `npm run build` in the root folder again and reload the page.

Or run `npm run watch` in the root folder instead of `npm run build`, and leave it running.
Every time a library file is saved, it recompiles that file, and the editor's page reloads by itself.
It copies the CSS files only when it starts, so after changing a `.css` file, restart it.

If the page shows `Failed to resolve import … from "../dist/lib/index.js"`, reloading won't fix it:  stop `npm run dev` and start it again.
That happens when `dist/` is emptied while `npm run dev` is running, e.g. by `npm run clean` or `npm publish`.

## A package inside a package

This folder is its own npm project, with its own `package.json` and `node_modules/`.
The library's `package.json` doesn't know about it, and `npm publish` leaves it out (the library's `"files"` list doesn't include it).

Its one dependency on the library is `"canvas-recorder-lib": "file:.."`.
`npm install` makes `node_modules/canvas-recorder-lib` a link to the root folder, so the editor always uses the library's newest *compiled* code, in `../dist/`.
That's why the library has to be built first.

Other projects use the published library from npm instead, and need `npm link` to try unpublished changes.
This one never does.

## Publishing

Nothing to do by hand.  On every push to master, [.github/workflows/docs.yml](../.github/workflows/docs.yml) builds the library, then this editor (`npm ci`, `npm run build`), and publishes it next to the API docs.

`npm run build` here runs `tsc` and `vite build`, into `dist/`.  `npm run preview` serves that build locally.

## Files

- `src/main.ts`:  the empty project, a black background and one placeholder clip.
- `properties/`:  the author's synced editor state (Sync to file), for debugging.  Not needed to run.
