import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { classifyMaterial } from "../src/classifier.js";
import { getCoverage } from "../src/coverage.js";
import { importCatalog } from "../src/importer.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

describe("catalog import", () => {
  it("classifies only verified raw resources as purchasable terminals", () => {
    expect(classifyMaterial("T4_ORE", "raw", false)).toBe("terminal");
    expect(classifyMaterial("T4_ORE_LEVEL1@1", "raw", false)).toBe("terminal");
    expect(classifyMaterial("T4_METALBAR", "refined", true)).toBe("requires_recipe");
    expect(classifyMaterial("UNRECOGNIZED_ITEM", undefined, false)).toBe("unknown");
    expect(classifyMaterial("T4_ROCK_LEVEL1@1", "raw", false)).toBe("unsupported");
    expect(classifyMaterial("T4_ARTEFACT_2H_BOW_HELL", "Other", false)).toBe("terminal");
    expect(classifyMaterial("T4_ARTIFACT_MAIN_SWORD_TEST", "Other", false)).toBe("terminal");
    expect(classifyMaterial("T4_ARTEFACT_TOKEN_FAVOR_1", "Other", false)).toBe("unsupported");
    expect(classifyMaterial("T4_ARTEFACT_UNKNOWN_FAMILY", "Other", false)).toBe("unknown");
  });

  it("imports real recipes transitively through verified terminal materials", async () => {
    const { catalog, manifest, coverage } = await importCatalog(fixtures, "fixture-2026-10-28", new Date("2026-10-28T00:00:00Z"));
    expect(catalog.craftingRecipes).toEqual(expect.arrayContaining([
      expect.objectContaining({ outputItemId: "T6_ARMOR_CLOTH_SET1", craftBonusCity: "Fort Sterling", validationStatus: "upstream_snapshot", ingredients: [{ itemId: "T6_CLOTH", quantity: 16, returnEligible: true }] }),
      expect.objectContaining({ outputItemId: "T5_SHOES_PLATE_SET1", craftBonusCity: "Martlock", validationStatus: "upstream_snapshot", ingredients: [{ itemId: "T5_METALBAR", quantity: 8, returnEligible: true }] }),
    ]));
    expect(catalog.items[0]).toMatchObject({ enchantment: 0, sourceUrl: expect.stringContaining("ao-bin-dumps") });
    expect(catalog.refiningRecipes[0]).toMatchObject({ validationStatus: "official_standard_recipe", notes: "RRR and Focus excluded", sourceUrl: "https://albiononline.com/news/guide-refining" });
    expect(catalog.refiningRecipes).toHaveLength(9);
    expect(catalog.items.filter(({ purchasable }) => purchasable).map(({ terminalStatus }) => terminalStatus)).toEqual(Array(9).fill("terminal"));
    expect(catalog.items.filter(({ terminalStatus }) => terminalStatus === "requires_recipe")).toHaveLength(11);
    expect(manifest).toMatchObject({ schemaVersion: "3", source: "fixture-2026-10-28", counts: { items: 20, craftingRecipes: 2, refiningRecipes: 9 } });
    expect(coverage).toEqual({ totalItems: 20, craftableItems: 2, craftingRecipes: 2, refiningRecipes: 9, resolvedRecipes: 11, missingCraftingRecipes: 0, missingRefiningRecipes: 0, missingLabels: 0, verifiedTerminalItems: 9, unknownTerminalItems: 0, unsupportedItems: 0, danglingReferences: 0 });
  });

  it("normalizes source-specific standard raw categories to the canonical value", async () => {
    const directory = await mkdtemp(join(tmpdir(), "catalog-raw-category-"));
    await Promise.all([
      writeFile(join(directory, "items.csv"), "item_id,display_name_en,tier,enchantment,category,has_crafting_recipe,has_refining_recipe,name_status,source_url\nT2_ORE,Copper Ore,2,0,Raw: Ore,false,false,name_verified,x\nT4_HIDE_LEVEL1@1,Runite Hide,4,1,Raw: Hide,false,false,name_verified,x\nT4_ARTEFACT_MAIN_SWORD_HELL,Artifact,4,0,Other,false,false,name_verified,x\n"),
      writeFile(join(directory, "craft-recipes.csv"), "recipe_id,output_item_id,output_quantity,ingredient_item_id,ingredient_quantity,return_eligible,craft_bonus_city,validation_status,source_url\n"),
      writeFile(join(directory, "refining-recipes.csv"), "recipe_id,output_item_id,output_quantity,ingredient_item_id,ingredient_quantity,validation_status,notes,source_url\n"),
    ]);
    const { catalog } = await importCatalog(directory, "raw-category");
    expect(catalog.items.map(({ itemId, category, terminalStatus, purchasable }) => ({ itemId, category, terminalStatus, purchasable }))).toEqual([
      { itemId: "T2_ORE", category: "raw", terminalStatus: "terminal", purchasable: true },
      { itemId: "T4_HIDE_LEVEL1@1", category: "raw", terminalStatus: "terminal", purchasable: true },
      { itemId: "T4_ARTEFACT_MAIN_SWORD_HELL", category: "Other", terminalStatus: "terminal", purchasable: true },
    ]);
  });

  it("preserves zero/max enchantment and per-ingredient crafting metadata", async () => {
    const directory = await mkdtemp(join(tmpdir(), "catalog-metadata-"));
    await Promise.all([
      writeFile(join(directory, "items.csv"), "item_id,display_name_en,tier,enchantment,category,has_crafting_recipe,has_refining_recipe,name_status,source_url\nA,A,4,0,equipment,true,false,named,item-source\nB,B,4,4,raw,false,false,named,item-source\nC,C,4,1,raw,false,false,named,item-source\n"),
      writeFile(join(directory, "craft-recipes.csv"), "recipe_id,output_item_id,output_quantity,ingredient_item_id,ingredient_quantity,return_eligible,craft_bonus_city,validation_status,source_url\nR,A,1,B,2,true,Martlock,verified,recipe-source\nR,A,1,C,3,false,Martlock,verified,recipe-source\n"),
      writeFile(join(directory, "refining-recipes.csv"), "recipe_id,output_item_id,output_quantity,ingredient_item_id,ingredient_quantity,validation_status,notes,source_url\n"),
    ]);
    const { catalog } = await importCatalog(directory, "metadata");
    expect(catalog.items.map(({ enchantment }) => enchantment)).toEqual([0, 4, 1]);
    expect(catalog.craftingRecipes[0]).toMatchObject({ craftBonusCity: "Martlock", validationStatus: "verified", sourceUrl: "recipe-source", ingredients: [
      { itemId: "B", quantity: 2, returnEligible: true },
      { itemId: "C", quantity: 3, returnEligible: false },
    ] });
  });

  it("reports incomplete recipe flags, statuses, labels, and dangling references separately", async () => {
    const { catalog } = await importCatalog(fixtures, "coverage");
    catalog.craftingRecipes.shift();
    catalog.items[0]!.nameStatus = "name_missing";
    catalog.items[1]!.terminalStatus = "unknown";
    catalog.items[2]!.terminalStatus = "unsupported";
    catalog.refiningRecipes[0]!.ingredients.push({ itemId: "MISSING", quantity: 1 });
    expect(getCoverage(catalog)).toMatchObject({
      craftingRecipes: 1,
      refiningRecipes: 9,
      missingCraftingRecipes: 1,
      missingRefiningRecipes: 0,
      missingLabels: 1,
      verifiedTerminalItems: 9,
      unknownTerminalItems: 1,
      unsupportedItems: 1,
      danglingReferences: 1,
    });
  });

  it("ships independent golden totals whose shopping items are verified terminals", async () => {
    const { catalog } = await importCatalog(fixtures, "golden");
    const expected = JSON.parse(await readFile(join(fixtures, "expected-plan.json"), "utf8")) as { shoppingList: Array<{ itemId: string; quantity: number }> };
    const terminals = new Set(catalog.items.filter(({ terminalStatus }) => terminalStatus === "terminal").map(({ itemId }) => itemId));
    expect(expected.shoppingList).toContainEqual({ itemId: "T6_FIBER", quantity: 6400 });
    expect(expected.shoppingList).toContainEqual({ itemId: "T5_ORE", quantity: 480 });
    expect(expected.shoppingList.every(({ itemId }) => terminals.has(itemId))).toBe(true);
  });

  it("reports inconsistent grouped recipe metadata with its line and ID", async () => {
    const directory = await mkdtemp(join(tmpdir(), "catalog-import-"));
    const baseItems = "item_id,display_name_en,tier,enchantment,category,has_crafting_recipe,has_refining_recipe,name_status,source_url\nA,A,1,0,x,true,false,name_verified,x\nB,B,1,0,x,false,false,name_verified,x\nC,C,1,0,x,false,false,name_verified,x\n";
    await Promise.all([
      writeFile(join(directory, "items.csv"), baseItems),
      writeFile(join(directory, "craft-recipes.csv"), "recipe_id,output_item_id,output_quantity,ingredient_item_id,ingredient_quantity,return_eligible,craft_bonus_city,validation_status,source_url\nR,A,1,B,1,true,Martlock,verified,x\nR,A,1,C,1,true,Thetford,verified,x\n"),
      writeFile(join(directory, "refining-recipes.csv"), "recipe_id,output_item_id,output_quantity,ingredient_item_id,ingredient_quantity,validation_status,notes,source_url\n"),
    ]);
    await expect(importCatalog(directory, "broken")).rejects.toThrow("CSV line 3, recipe 'R': inconsistent recipe metadata");
  });

  it("rejects an enchanted refining recipe without its lower-tier dependency", async () => {
    const directory = await mkdtemp(join(tmpdir(), "catalog-enchanted-"));
    await Promise.all([
      writeFile(join(directory, "items.csv"), "item_id,display_name_en,tier,enchantment,category,has_crafting_recipe,has_refining_recipe,name_status,source_url\nT4_CLOTH_LEVEL1@1,Cloth,4,1,refined,false,true,name_verified,x\nT4_FIBER_LEVEL1@1,Fiber,4,1,raw,false,false,name_verified,x\n"),
      writeFile(join(directory, "craft-recipes.csv"), "recipe_id,output_item_id,output_quantity,ingredient_item_id,ingredient_quantity,return_eligible,craft_bonus_city,validation_status,source_url\n"),
      writeFile(join(directory, "refining-recipes.csv"), "recipe_id,output_item_id,output_quantity,ingredient_item_id,ingredient_quantity,validation_status,notes,source_url\nR,T4_CLOTH_LEVEL1@1,1,T4_FIBER_LEVEL1@1,2,verified,,x\n"),
    ]);
    await expect(importCatalog(directory, "broken")).rejects.toThrow("enchanted dependency 'T3_CLOTH' is missing");
  });
});
