import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { importCatalog } from "./importer.js";

const args = process.argv.slice(2);
if (args[0] === "--") args.shift();
const [input, output, source] = args;
if (!input || !output || !source) {
  console.error("Usage: pnpm run import -- <input-directory> <output-directory> <snapshot-source>");
  process.exitCode = 1;
} else {
  try {
    const result = await importCatalog(resolve(input), source);
    await mkdir(resolve(output), { recursive: true });
    await Promise.all([
      writeFile(resolve(output, "catalog.json"), JSON.stringify(result.catalog, null, 2) + "\n"),
      writeFile(resolve(output, "manifest.json"), JSON.stringify(result.manifest, null, 2) + "\n"),
    ]);
    console.log(`Imported ${result.manifest.counts.items} items, ${result.manifest.counts.craftingRecipes} crafting recipes, and ${result.manifest.counts.refiningRecipes} refining recipes.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
