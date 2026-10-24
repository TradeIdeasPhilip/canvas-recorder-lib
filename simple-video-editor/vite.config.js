import { defineConfig } from "vite";

// See canvas-recorder-lib's README, "Notes for a project that uses this library".
// This project lives inside the library's repo and uses the library from "..", so it always
// gets the newest library, here and in the GitHub Pages build.
export default defineConfig({
  // Relative paths so the build works from GitHub Pages or any subdirectory.
  base: "./",
  build: {
    // If something fails in production, it should still be debuggable.
    sourcemap: "inline",
    chunkSizeWarningLimit: 5000,
    target: "esnext",
    // .github/workflows/docs.yml copies this into the site, under simple-video-editor/.
    outDir: "dist",
  },
  resolve: {
    // Only one copy of phil-lib, whichever node_modules it's found in.
    dedupe: ["phil-lib"],
  },
  server: {
    // Always the same port.  The video editor saves its work in the browser (IndexedDB),
    // and the browser keeps a separate copy for each port.  See the README's "Ports".
    port: 5177,
    strictPort: true,
    fs: {
      // The library is "..", outside this project.  Its transcription worker is loaded by URL,
      // so the folder has to be allowed explicitly.  ".." includes this folder too.
      allow: [".."],
    },
  },
});
