import type { TerminalStatus } from "./types.js";

const RAW_RESOURCE = /^T[2-8]_(?:ORE|HIDE|FIBER|WOOD|ROCK)$/;
const ENCHANTED_RAW_RESOURCE = /^T[4-8]_(?:ORE|HIDE|FIBER|WOOD)_LEVEL([1-4])@\1$/;
const MARKET_ARTIFACT = /^T[4-8]_ART(?:E|I)FACT_(?:MAIN|2H|OFF|HEAD|ARMOR|SHOES)_/;
const UNSUPPORTED = /(?:TOKEN|_ROCK_LEVEL[1-4]@[1-4]$)/;

export function isStandardRawResource(itemId: string): boolean {
  return RAW_RESOURCE.test(itemId) || ENCHANTED_RAW_RESOURCE.test(itemId);
}

export function classifyMaterial(itemId: string, category: string | undefined, hasRecipe: boolean): TerminalStatus {
  if (UNSUPPORTED.test(itemId) || /token|special/i.test(category ?? "")) return "unsupported";
  if (hasRecipe) return "requires_recipe";
  if (MARKET_ARTIFACT.test(itemId)) return "terminal";
  if (isStandardRawResource(itemId)) return "terminal";
  if (/ART(?:E|I)FACT/.test(itemId) || /artifact/i.test(category ?? "")) return "unknown";
  return "unknown";
}
