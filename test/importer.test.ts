import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { classifyMaterial } from "../src/classifier.js";
import { importCatalog } from "../src/importer.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

describe("catalog import", () => {
  it("classifies only verified raw resources as purchasable terminals", () => {
    expect(classifyMaterial("T4_ORE", "raw", false)).toBe("terminal");
    expect(classifyMaterial("T4_ORE_LEVEL1@1", "raw", false)).toBe("terminal");
    expect(classifyMaterial("T4_METALBAR", "refined", true)).toBe("requires_recipe");
    expect(classifyMaterial("UNRECOGNIZED_ITEM", undefined, false)).toBe("unknown");
    expect(classifyMaterial("T4_ROCK_LEVEL1@1", "raw", false)).toBe("unsupported");
    expect(classifyMaterial("T4_ARTEFACT_SWORD", "artifact", false)).toBe("unsupported");
  });

  it("imports real recipes transitively through verified terminal materials", async () => {
    const { catalog, manifest, coverage } = await importCatalog(fixtures, "fixture-2026-10-28", new Date("2026-10-28T00:00:00Z"));
    expect(catalog.craftingRecipes).toEqual(expect.arrayContaining([
      expect.objectContaining({ outputItemId: "T6_ARMOR_CLOTH_SET1", ingredients: [{ itemId: "T6_CLOTH", quantity: 16 }] }),
      expect.objectContaining({ outputItemId: "T5_SHOES_PLATE_SET1", ingredients: [{ itemId: "T5_METALBAR", quantity: 8 }] }),
    ]));
    expect(catalog.refiningRecipes).toHaveLength(9);
    expect(catalog.items.filter(({ purchasable }) => purchasable).map(({ terminalStatus }) => terminalStatus)).toEqual(Array(9).fill("terminal"));
    expect(catalog.items.filter(({ terminalStatus }) => terminalStatus === "requires_recipe")).toHaveLength(11);
    expect(manifest).toMatchObject({ schemaVersion: "2", source: "fixture-2026-10-28", counts: { items: 20, craftingRecipes: 2, refiningRecipes: 9 } });
    expect(coverage).toEqual({ totalItems: 20, craftableItems: 2, resolvedRecipes: 11, missingLabels: 0, unknownTerminalItems: 0, unsupportedItems: 0, danglingReferences: 0 });
  });

  it("reports an inconsistent recipe with its line and ID", async () => {
    const directory = await mkdtemp(join(tmpdir(), "catalog-import-"));
    const baseItems = "item_id,display_name_en,tier,enchantment,category,has_crafting_recipe,has_refining_recipe,name_status,source_url\nA,A,1,0,x,true,false,name_verified,x\nB,B,1,0,x,false,false,name_verified,x\nC,C,1,0,x,false,false,name_verified,x\n";
    await Promise.all([
      writeFile(join(directory, "items.csv"), baseItems),
      writeFile(join(directory, "craft-recipes.csv"), "recipe_id,output_item_id,output_quantity,ingredient_item_id,ingredient_quantity,return_eligible,source_url\nR,A,1,B,1,true,x\nR,A,2,C,1,true,x\n"),
      writeFile(join(directory, "refining-recipes.csv"), "recipe_id,output_item_id,output_quantity,ingredient_item_id,ingredient_quantity,source_url\n"),
    ]);
    await expect(importCatalog(directory, "broken")).rejects.toThrow("CSV line 3, recipe 'R': inconsistent output");
  });

  it("rejects an enchanted refining recipe without its lower-tier dependency", async () => {
    const directory = await mkdtemp(join(tmpdir(), "catalog-enchanted-"));
    await Promise.all([
      writeFile(join(directory, "items.csv"), "item_id,display_name_en,tier,enchantment,category,has_crafting_recipe,has_refining_recipe,name_status,source_url\nT4_CLOTH_LEVEL1@1,Cloth,4,1,refined,false,true,name_verified,x\nT4_FIBER_LEVEL1@1,Fiber,4,1,raw,false,false,name_verified,x\n"),
      writeFile(join(directory, "craft-recipes.csv"), "recipe_id,output_item_id,output_quantity,ingredient_item_id,ingredient_quantity,return_eligible,source_url\n"),
      writeFile(join(directory, "refining-recipes.csv"), "recipe_id,output_item_id,output_quantity,ingredient_item_id,ingredient_quantity,source_url\nR,T4_CLOTH_LEVEL1@1,1,T4_FIBER_LEVEL1@1,2,x\n"),
    ]);
    await expect(importCatalog(directory, "broken")).rejects.toThrow("enchanted dependency 'T3_CLOTH' is missing");
  });
});
