export type IngredientInput = {
  id?: string;
  groupName?: string | null;
  quantity?: string | null;
  unit?: string | null;
  name: string;
  preparation?: string | null;
  originalLine?: string | null;
};

export type RecipeInput = {
  title: string;
  summary?: string;
  body?: string;
  servings?: number | null;
  servingUnit?: string;
  prepMinutes?: number | null;
  cookMinutes?: number | null;
  sourceName?: string | null;
  sourceUrl?: string | null;
  coverUri?: string | null;
  favorite?: boolean;
  status?: 'draft' | 'saved';
  ingredients?: IngredientInput[];
  categories?: string[];
};

export type Recipe = {
  id: string;
  title: string;
  summary: string;
  body: string;
  servings: number | null;
  servingUnit: string;
  prepMinutes: number | null;
  cookMinutes: number | null;
  sourceName: string | null;
  sourceUrl: string | null;
  coverUri: string | null;
  favorite: boolean;
  status: 'draft' | 'saved';
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  ingredients: Ingredient[];
  categories: string[];
};

export type Ingredient = {
  id: string;
  groupName: string | null;
  quantity: string | null;
  unit: string | null;
  name: string;
  preparation: string | null;
  originalLine: string | null;
  position: number;
};

export type RecipeSnapshot = {
  recipeId: string | null;
  variationId: string | null;
  title: string;
  summary: string;
  body: string;
  servings: number | null;
  servingUnit: string;
  ingredients: Ingredient[];
  capturedAt: number;
};

export type CookingChange = {
  id?: string;
  kind: 'replace' | 'quantity' | 'omit' | 'add' | 'preparation';
  ingredientId?: string | null;
  originalValue?: string | null;
  resultingValue: string;
};

export type CostItem = {
  id?: string;
  ingredientId?: string | null;
  label: string;
  amount: number;
};

export type CookingLog = {
  id: string;
  recipeId: string | null;
  variationId: string | null;
  title: string;
  state: 'active' | 'completed';
  snapshot: RecipeSnapshot;
  checkedItems: string[];
  servings: number | null;
  cookedAt: number;
  completedAt: number | null;
  updatedAt: number;
  rating: number | null;
  wouldMakeAgain: boolean | null;
  notes: string;
  costMode: 'none' | 'quick' | 'itemized';
  currency: string | null;
  costTotal: number | null;
  deletedAt: number | null;
  changes: CookingChange[];
  costItems: CostItem[];
  photos: CookingPhoto[];
};

export type Variation = {
  id: string;
  recipeId: string;
  sourceLogId: string | null;
  name: string;
  snapshot: RecipeSnapshot;
  createdAt: number;
  updatedAt: number;
};

export type CookingPhoto = {
  id: string;
  uri: string;
  width: number | null;
  height: number | null;
  mimeType: string | null;
};

export type SavedItem = {
  id: string;
  kind: 'video' | 'article' | 'tip';
  title: string;
  url: string | null;
  platform: string | null;
  body: string;
  thumbnailUri: string | null;
  recipeIds: string[];
  createdAt: number;
  updatedAt: number;
};

export type AppSettings = {
  currency: string;
  language: 'en' | 'es';
  libraryView: 'grid' | 'list';
  readingScale: 'standard' | 'large' | 'extra-large';
};
