import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { classifyMaterial } from "./classifier.js";
import { getCoverage } from "./coverage.js";
import { parseCsv, type CsvRow } from "./csv.js";
import type { CatalogData, CatalogItem, CoverageReport, Manifest, Recipe } from "./types.js";

const required = (row: CsvRow, key: string): string => {
  const value = row.values[key];
  if (value === undefined) throw new Error(`CSV line ${row.line}: missing column '${key}'`);
  if (!value.trim()) throw new Error(`CSV line ${row.line}: '${key}' is empty`);
  return value.trim();
};

const optional = (row: CsvRow, key: string): string | undefined => row.values[key]?.trim() || undefined;

const positiveInteger = (row: CsvRow, key: string, optionalValue = false): number | undefined => {
  const raw = optional(row, key);
  if (raw === undefined && optionalValue) return undefined;
  if (raw === undefined || !/^\d+$/.test(raw) || Number(raw) <= 0) throw new Error(`CSV line ${row.line}: '${key}' must be a positive integer`);
  return Number(raw);
};

const enchantment = (row: CsvRow): number => {
  const raw = required(row, "enchantment");
  if (!/^[0-4]$/.test(raw)) throw new Error(`CSV line ${row.line}: 'enchantment' must be an integer from 0 to 4`);
  return Number(raw);
};

const boolean = (row: CsvRow, key: string): boolean => {
  const raw = required(row, key).toLowerCase();
  if (raw !== "true" && raw !== "false") throw new Error(`CSV line ${row.line}: '${key}' must be true or false`);
  return raw === "true";
};

function parseItems(rows: CsvRow[]): CatalogItem[] {
  const seen = new Set<string>();
  return rows.map((row) => {
    const itemId = required(row, "item_id");
    if (seen.has(itemId)) throw new Error(`CSV line ${row.line}: duplicate item_id '${itemId}'`);
    seen.add(itemId);
    const hasCraftingRecipe = boolean(row, "has_crafting_recipe");
    const hasRefiningRecipe = boolean(row, "has_refining_recipe");
    const tier = positiveInteger(row, "tier", true);
    const category = optional(row, "category");
    const terminalStatus = classifyMaterial(itemId, category, hasCraftingRecipe || hasRefiningRecipe);
    const item: CatalogItem = {
      itemId,
      displayName: optional(row, "display_name_en") ?? itemId,
      enchantment: enchantment(row),
      purchasable: terminalStatus === "terminal",
      terminalStatus,
      nameStatus: required(row, "name_status"),
      hasCraftingRecipe,
      hasRefiningRecipe,
      sourceUrl: required(row, "source_url"),
    };
    if (tier !== undefined) item.tier = tier;
    if (category !== undefined) item.category = category;
    return item;
  });
}

function parseRecipes(rows: CsvRow[], recipeType: Recipe["recipeType"], itemIds: Set<string>): Recipe[] {
  const recipes = new Map<string, Recipe>();
  for (const row of rows) {
    const recipeId = required(row, "recipe_id");
    const outputItemId = required(row, "output_item_id");
    const outputQuantity = positiveInteger(row, "output_quantity")!;
    const ingredientItemId = required(row, "ingredient_item_id");
    const ingredientQuantity = positiveInteger(row, "ingredient_quantity")!;
    const sourceUrl = required(row, "source_url");
    const validationStatus = required(row, "validation_status");
    const craftBonusCity = recipeType === "crafting" ? optional(row, "craft_bonus_city") : undefined;
    const notes = recipeType === "refining" ? optional(row, "notes") : undefined;
    const returnEligible = recipeType === "crafting" ? boolean(row, "return_eligible") : undefined;
    if (!itemIds.has(outputItemId)) throw new Error(`CSV line ${row.line}, recipe '${recipeId}': unknown output '${outputItemId}'`);
    if (!itemIds.has(ingredientItemId)) throw new Error(`CSV line ${row.line}, recipe '${recipeId}': unknown ingredient '${ingredientItemId}'`);
    const recipe = recipes.get(recipeId);
    if (recipe && (recipe.outputItemId !== outputItemId || recipe.outputQuantity !== outputQuantity || recipe.sourceUrl !== sourceUrl || recipe.validationStatus !== validationStatus || recipe.craftBonusCity !== craftBonusCity || recipe.notes !== notes)) {
      throw new Error(`CSV line ${row.line}, recipe '${recipeId}': inconsistent recipe metadata`);
    }
    if (recipe?.ingredients.some(({ itemId }) => itemId === ingredientItemId)) {
      throw new Error(`CSV line ${row.line}, recipe '${recipeId}': duplicate ingredient '${ingredientItemId}'`);
    }
    const ingredient = { itemId: ingredientItemId, quantity: ingredientQuantity, ...(returnEligible === undefined ? {} : { returnEligible }) };
    if (recipe) recipe.ingredients.push(ingredient);
    else {
      const value: Recipe = { recipeId, outputItemId, outputQuantity, ingredients: [ingredient], recipeType, validationStatus, sourceUrl };
      if (craftBonusCity !== undefined) value.craftBonusCity = craftBonusCity;
      if (notes !== undefined) value.notes = notes;
      recipes.set(recipeId, value);
    }
  }
  return [...recipes.values()];
}

function validateEnchantedDependencies(recipes: Recipe[]): void {
  for (const recipe of recipes) {
    const match = /^T([4-8])_(METALBAR|LEATHER|CLOTH|PLANKS)_LEVEL([1-4])@\3$/.exec(recipe.outputItemId);
    if (!match) continue;
    const tier = Number(match[1]);
    const lowerTier = tier - 1;
    const lowerId = tier === 4 ? `T3_${match[2]}` : `T${lowerTier}_${match[2]}_LEVEL${match[3]}@${match[3]}`;
    if (!recipe.ingredients.some(({ itemId }) => itemId === lowerId)) {
      throw new Error(`Recipe '${recipe.recipeId}': enchanted dependency '${lowerId}' is missing`);
    }
  }
}

export async function importCatalog(inputDirectory: string, source: string, now = new Date()): Promise<{ catalog: CatalogData; manifest: Manifest; coverage: CoverageReport }> {
  const load = async (name: string) => parseCsv(await readFile(join(inputDirectory, name), "utf8"));
  const items = parseItems(await load("items.csv"));
  const itemIds = new Set(items.map(({ itemId }) => itemId));
  const craftingRecipes = parseRecipes(await load("craft-recipes.csv"), "crafting", itemIds);
  const refiningRecipes = parseRecipes(await load("refining-recipes.csv"), "refining", itemIds);
  validateEnchantedDependencies(refiningRecipes);
  const catalog = { items, craftingRecipes, refiningRecipes };
  return {
    catalog,
    coverage: getCoverage(catalog),
    manifest: {
      schemaVersion: "3",
      importedAt: now.toISOString(),
      source,
      counts: { items: items.length, craftingRecipes: craftingRecipes.length, refiningRecipes: refiningRecipes.length },
    },
  };
}
