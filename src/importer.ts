import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseCsv, type CsvRow } from "./csv.js";
import type { CatalogData, CatalogItem, Manifest, Recipe } from "./types.js";

const required = (row: CsvRow, key: string): string => {
  const value = row.values[key];
  if (value === undefined) throw new Error(`CSV line ${row.line}: missing column '${key}'`);
  if (!value.trim()) throw new Error(`CSV line ${row.line}: '${key}' is empty`);
  return value.trim();
};

const optional = (row: CsvRow, key: string): string | undefined => row.values[key]?.trim() || undefined;

const integer = (row: CsvRow, key: string, optionalValue = false): number | undefined => {
  const raw = optional(row, key);
  if (raw === undefined && optionalValue) return undefined;
  if (raw === undefined || !/^\d+$/.test(raw) || Number(raw) <= 0) throw new Error(`CSV line ${row.line}: '${key}' must be a positive integer`);
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
    boolean(row, "has_crafting_recipe");
    boolean(row, "has_refining_recipe");
    const tier = integer(row, "tier", true);
    const item: CatalogItem = {
      itemId,
      displayName: optional(row, "display_name_en") ?? itemId,
      purchasable: false,
      terminalStatus: "unknown",
      nameStatus: required(row, "name_status"),
    };
    if (tier !== undefined) item.tier = tier;
    const category = optional(row, "category");
    if (category !== undefined) item.category = category;
    return item;
  });
}

function parseRecipes(rows: CsvRow[], recipeType: Recipe["recipeType"], itemIds: Set<string>): Recipe[] {
  const recipes = new Map<string, Recipe>();
  for (const row of rows) {
    const recipeId = required(row, "recipe_id");
    const outputItemId = required(row, "output_item_id");
    const outputQuantity = integer(row, "output_quantity")!;
    const ingredientItemId = required(row, "ingredient_item_id");
    const ingredientQuantity = integer(row, "ingredient_quantity")!;
    if (recipeType === "crafting") boolean(row, "return_eligible");
    if (!itemIds.has(outputItemId)) throw new Error(`CSV line ${row.line}, recipe '${recipeId}': unknown output '${outputItemId}'`);
    if (!itemIds.has(ingredientItemId)) throw new Error(`CSV line ${row.line}, recipe '${recipeId}': unknown ingredient '${ingredientItemId}'`);
    const recipe = recipes.get(recipeId);
    if (recipe && (recipe.outputItemId !== outputItemId || recipe.outputQuantity !== outputQuantity)) {
      throw new Error(`CSV line ${row.line}, recipe '${recipeId}': inconsistent output`);
    }
    if (recipe?.ingredients.some(({ itemId }) => itemId === ingredientItemId)) {
      throw new Error(`CSV line ${row.line}, recipe '${recipeId}': duplicate ingredient '${ingredientItemId}'`);
    }
    if (recipe) recipe.ingredients.push({ itemId: ingredientItemId, quantity: ingredientQuantity });
    else recipes.set(recipeId, { recipeId, outputItemId, outputQuantity, ingredients: [{ itemId: ingredientItemId, quantity: ingredientQuantity }], recipeType });
  }
  return [...recipes.values()];
}

export async function importCatalog(inputDirectory: string, source: string, now = new Date()): Promise<{ catalog: CatalogData; manifest: Manifest }> {
  const load = async (name: string) => parseCsv(await readFile(join(inputDirectory, name), "utf8"));
  const items = parseItems(await load("items.csv"));
  const itemIds = new Set(items.map(({ itemId }) => itemId));
  const craftingRecipes = parseRecipes(await load("craft-recipes.csv"), "crafting", itemIds);
  const refiningRecipes = parseRecipes(await load("refining-recipes.csv"), "refining", itemIds);
  return {
    catalog: { items, craftingRecipes, refiningRecipes },
    manifest: {
      schemaVersion: "1",
      importedAt: now.toISOString(),
      source,
      counts: { items: items.length, craftingRecipes: craftingRecipes.length, refiningRecipes: refiningRecipes.length },
    },
  };
}
