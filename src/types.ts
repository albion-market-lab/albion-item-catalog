export interface CatalogItem {
  itemId: string;
  displayName: string;
  tier?: number;
  category?: string;
  purchasable: false;
  terminalStatus: "unknown";
  nameStatus: string;
}

export interface Recipe {
  recipeId: string;
  outputItemId: string;
  outputQuantity: number;
  ingredients: Array<{ itemId: string; quantity: number }>;
  recipeType: "crafting" | "refining";
}

export interface CatalogData {
  items: CatalogItem[];
  craftingRecipes: Recipe[];
  refiningRecipes: Recipe[];
}

export interface Manifest {
  schemaVersion: "1";
  importedAt: string;
  source: string;
  counts: { items: number; craftingRecipes: number; refiningRecipes: number };
}
