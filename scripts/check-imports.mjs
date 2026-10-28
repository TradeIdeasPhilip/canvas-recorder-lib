/**
 * Fail the build if a relative import leaves out the file's extension, like `from "./utility"`.
 *
 * Write `from "./utility.ts"` instead.  tsc turns that into `"./utility.js"` in dist/
 * (rewriteRelativeImportExtensions), which works everywhere.  With no extension, tsc copies the
 * import unchanged:  Vite and tsx guess the extension, but Node and a browser on its own can't.
 *
 * VS Code's auto-import copies whatever the file already does, so a file's first import is
 * the one to watch.  tsc itself could check this (`"module": "nodenext"`), but that setting
 * changes too much else.
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const here = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const problems = [];
for (const folder of ["lib", "dev", "src"]) {
  for (const entry of readdirSync(join(here, folder), { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".ts")) continue;
    const path = join(entry.parentPath, entry.name);
    const text = readFileSync(path, "utf8");
    // TypeScript's own scanner, so an example in a comment doesn't count.
    const { importedFiles } = ts.preProcessFile(text, true, true);
    for (const { fileName, pos } of importedFiles) {
      const relativeImport = fileName.startsWith("./") || fileName.startsWith("../");
      const hasExtension = /\.[a-z]+$/i.test(fileName.split("/").pop());
      if (relativeImport && !hasExtension) {
        const line = text.slice(0, pos).split("\n").length;
        problems.push(`${relative(here, path)}:${line}  "${fileName}"`);
      }
    }
  }
}

if (problems.length > 0) {
  console.error(
    `These imports need the file's extension, e.g. "./utility.ts":\n  ${problems.join("\n  ")}`,
  );
  process.exit(1);
}
