import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { importCatalog } from "../src/importer.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

describe("importCatalog", () => {
  it("groups ingredient rows and creates a versioned manifest", async () => {
    const { catalog, manifest } = await importCatalog(fixtures, "fixture-2026-10-28", new Date("2026-10-28T00:00:00Z"));
    expect(catalog.craftingRecipes).toEqual([expect.objectContaining({
      recipeId: "T4_BAG",
      ingredients: [{ itemId: "T4_CLOTH", quantity: 4 }, { itemId: "T4_LEATHER", quantity: 4 }],
    })]);
    expect(catalog.items.every(({ purchasable, terminalStatus }) => !purchasable && terminalStatus === "unknown")).toBe(true);
    expect(manifest).toMatchObject({ schemaVersion: "1", source: "fixture-2026-10-28", counts: { items: 5, craftingRecipes: 1, refiningRecipes: 2 } });
  });

  it("reports an inconsistent recipe with its line and ID", async () => {
    const directory = await mkdtemp(join(tmpdir(), "catalog-import-"));
    const baseItems = "item_id,display_name_en,tier,enchantment,category,has_crafting_recipe,has_refining_recipe,name_status,source_url\nA,A,1,0,x,true,false,name_verified,x\nB,B,1,0,x,false,false,name_verified,x\nC,C,1,0,x,false,false,name_verified,x\n";
    await Promise.all([
      writeFile(join(directory, "items.csv"), baseItems),
      writeFile(join(directory, "craft-recipes.csv"), "recipe_id,output_item_id,output_quantity,ingredient_item_id,ingredient_quantity,return_eligible\nR,A,1,B,1,true\nR,A,2,C,1,true\n"),
      writeFile(join(directory, "refining-recipes.csv"), "recipe_id,output_item_id,output_quantity,ingredient_item_id,ingredient_quantity\n"),
    ]);
    await expect(importCatalog(directory, "broken")).rejects.toThrow("CSV line 3, recipe 'R': inconsistent output");
  });
});
