/**
 * tsc only emits JavaScript (and the JSON files that TypeScript imports).
 * Copy everything else that the JavaScript imports, like CSS, into dist/.
 */

import { cpSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const COPY = /\.(css)$/;

let count = 0;
for (const folder of ["lib", "dev", "src"]) {
  for (const entry of readdirSync(join(here, folder), { recursive: true, withFileTypes: true })) {
    if (entry.isFile() && COPY.test(entry.name)) {
      const from = join(entry.parentPath, entry.name);
      const to = join(here, "dist", relative(here, from));
      mkdirSync(dirname(to), { recursive: true });
      cpSync(from, to);
      count++;
    }
  }
}
console.log(`Copied ${count} asset files into dist/.`);
