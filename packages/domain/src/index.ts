import { z } from 'zod';

export const cookingChangeKindSchema = z.enum([
  'replace',
  'quantity',
  'omit',
  'add',
  'preparation',
]);

export const recipeStatusSchema = z.enum(['draft', 'saved']);
export const cookingLogStateSchema = z.enum(['active', 'completed']);
export const savedItemKindSchema = z.enum(['video', 'article', 'tip']);

export function calculateCostPerServing(total: number | null, servings: number | null) {
  if (total === null || servings === null || servings <= 0) return null;
  return total / servings;
}

export function calculateServingScale(base: number | null, target: number | null) {
  if (base === null || target === null || base <= 0) return 1;
  return target / base;
}
