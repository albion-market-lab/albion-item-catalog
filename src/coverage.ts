import type { CatalogData, CoverageReport } from "./types.js";

export function getCoverage(catalog: CatalogData): CoverageReport {
  const itemIds = new Set(catalog.items.map(({ itemId }) => itemId));
  const recipes = [...catalog.craftingRecipes, ...catalog.refiningRecipes];
  const craftingOutputs = new Set(catalog.craftingRecipes.map(({ outputItemId }) => outputItemId));
  const refiningOutputs = new Set(catalog.refiningRecipes.map(({ outputItemId }) => outputItemId));
  return {
    totalItems: catalog.items.length,
    craftableItems: catalog.items.filter(({ hasCraftingRecipe }) => hasCraftingRecipe).length,
    craftingRecipes: catalog.craftingRecipes.length,
    refiningRecipes: catalog.refiningRecipes.length,
    resolvedRecipes: recipes.length,
    missingCraftingRecipes: catalog.items.filter(({ itemId, hasCraftingRecipe }) => hasCraftingRecipe && !craftingOutputs.has(itemId)).length,
    missingRefiningRecipes: catalog.items.filter(({ itemId, hasRefiningRecipe }) => hasRefiningRecipe && !refiningOutputs.has(itemId)).length,
    missingLabels: catalog.items.filter(({ nameStatus }) => nameStatus === "name_missing").length,
    verifiedTerminalItems: catalog.items.filter(({ terminalStatus }) => terminalStatus === "terminal").length,
    unknownTerminalItems: catalog.items.filter(({ terminalStatus }) => terminalStatus === "unknown").length,
    unsupportedItems: catalog.items.filter(({ terminalStatus }) => terminalStatus === "unsupported").length,
    danglingReferences: recipes.reduce((count, recipe) => count + Number(!itemIds.has(recipe.outputItemId)) + recipe.ingredients.filter(({ itemId }) => !itemIds.has(itemId)).length, 0),
  };
}
