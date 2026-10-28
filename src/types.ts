export interface CatalogItem {
  itemId: string;
  displayName: string;
  tier?: number;
  category?: string;
  purchasable: boolean;
  terminalStatus: TerminalStatus;
  nameStatus: string;
  hasCraftingRecipe: boolean;
  hasRefiningRecipe: boolean;
}

export type TerminalStatus = "terminal" | "requires_recipe" | "unknown" | "unsupported";

export interface Recipe {
  recipeId: string;
  outputItemId: string;
  outputQuantity: number;
  ingredients: Array<{ itemId: string; quantity: number }>;
  recipeType: "crafting" | "refining";
  sourceUrl: string;
}

export interface CatalogData {
  items: CatalogItem[];
  craftingRecipes: Recipe[];
  refiningRecipes: Recipe[];
}

export interface Manifest {
  schemaVersion: "2";
  importedAt: string;
  source: string;
  counts: { items: number; craftingRecipes: number; refiningRecipes: number };
}

export interface CoverageReport {
  totalItems: number;
  craftableItems: number;
  resolvedRecipes: number;
  missingLabels: number;
  unknownTerminalItems: number;
  unsupportedItems: number;
  danglingReferences: number;
}
