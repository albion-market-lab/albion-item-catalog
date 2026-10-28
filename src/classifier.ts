import type { TerminalStatus } from "./types.js";

const RAW_RESOURCE = /^T[2-8]_(?:ORE|HIDE|FIBER|WOOD|ROCK)$/;
const ENCHANTED_RAW_RESOURCE = /^T[4-8]_(?:ORE|HIDE|FIBER|WOOD)_LEVEL([1-4])@\1$/;
const UNSUPPORTED = /(?:ARTEFACT|ARTIFACT|TOKEN|_ROCK_LEVEL[1-4]@[1-4]$)/;

export function classifyMaterial(itemId: string, category: string | undefined, hasRecipe: boolean): TerminalStatus {
  if (UNSUPPORTED.test(itemId) || /artifact|token|special/i.test(category ?? "")) return "unsupported";
  if (hasRecipe) return "requires_recipe";
  if (RAW_RESOURCE.test(itemId) || ENCHANTED_RAW_RESOURCE.test(itemId)) return "terminal";
  return "unknown";
}
