export interface CatalogItem {
  itemId: string;
  displayName: string;
  tier?: number;
  enchantment: number;
  category?: string;
  purchasable: boolean;
  terminalStatus: TerminalStatus;
  nameStatus: string;
  hasCraftingRecipe: boolean;
  hasRefiningRecipe: boolean;
  sourceUrl: string;
}

export type TerminalStatus = "terminal" | "requires_recipe" | "unknown" | "unsupported";

export interface Recipe {
  recipeId: string;
  outputItemId: string;
  outputQuantity: number;
  ingredients: Array<{ itemId: string; quantity: number; returnEligible?: boolean }>;
  recipeType: "crafting" | "refining";
  craftBonusCity?: string;
  validationStatus: string;
  notes?: string;
  sourceUrl: string;
}

export interface CatalogData {
  items: CatalogItem[];
  craftingRecipes: Recipe[];
  refiningRecipes: Recipe[];
}

export interface Manifest {
  schemaVersion: "3";
  importedAt: string;
  source: string;
  counts: { items: number; craftingRecipes: number; refiningRecipes: number };
}

export interface CoverageReport {
  totalItems: number;
  craftableItems: number;
  craftingRecipes: number;
  refiningRecipes: number;
  resolvedRecipes: number;
  missingCraftingRecipes: number;
  missingRefiningRecipes: number;
  missingLabels: number;
  verifiedTerminalItems: number;
  unknownTerminalItems: number;
  unsupportedItems: number;
  danglingReferences: number;
}
