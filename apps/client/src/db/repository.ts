import { and, asc, desc, eq, inArray, isNotNull, isNull } from 'drizzle-orm';

import { getDatabase } from '@/db/database';
import {
  categories,
  cookingChanges,
  cookingLogs,
  costItems,
  ingredients,
  media,
  recipeCategories,
  recipes,
  savedItemRecipes,
  savedItems,
  settings,
  variations,
} from '@/db/schema';
import type {
  AppSettings,
  CookingChange,
  CookingLog,
  CookingPhoto,
  CostItem,
  Ingredient,
  Recipe,
  RecipeInput,
  RecipeSnapshot,
  SavedItem,
  Variation,
} from '@/db/types';

const defaultSettings: AppSettings = {
  currency: 'USD',
  language: 'en',
  libraryView: 'grid',
  readingScale: 'standard',
};

export function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

async function hydrateRecipes(rows: (typeof recipes.$inferSelect)[]): Promise<Recipe[]> {
  if (rows.length === 0) return [];

  const database = getDatabase();
  const ids = rows.map((row) => row.id);
  const ingredientRows = await database
    .select()
    .from(ingredients)
    .where(inArray(ingredients.recipeId, ids))
    .orderBy(asc(ingredients.position));
  const categoryRows = await database
    .select({
      recipeId: recipeCategories.recipeId,
      name: categories.name,
    })
    .from(recipeCategories)
    .innerJoin(categories, eq(recipeCategories.categoryId, categories.id))
    .where(inArray(recipeCategories.recipeId, ids));

  return rows.map((row) => ({
    ...row,
    status: row.status as Recipe['status'],
    ingredients: ingredientRows
      .filter((ingredient) => ingredient.recipeId === row.id)
      .map(
        (ingredient): Ingredient => ({
          id: ingredient.id,
          groupName: ingredient.groupName,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          name: ingredient.name,
          preparation: ingredient.preparation,
          originalLine: ingredient.originalLine,
          position: ingredient.position,
        }),
      ),
    categories: categoryRows
      .filter((category) => category.recipeId === row.id)
      .map((category) => category.name),
  }));
}

// Include deleted content so an emptied collection does not become a first visit again.
export async function isNewCollection() {
  const database = getDatabase();
  const [recipe, log, saved] = await Promise.all([
    database.select({ id: recipes.id }).from(recipes).limit(1),
    database.select({ id: cookingLogs.id }).from(cookingLogs).limit(1),
    database.select({ id: savedItems.id }).from(savedItems).limit(1),
  ]);
  return recipe.length === 0 && log.length === 0 && saved.length === 0;
}

export async function listRecipes(options?: { deleted?: boolean; drafts?: boolean }) {
  const database = getDatabase();
  const filters = [
    options?.deleted ? isNotNull(recipes.deletedAt) : isNull(recipes.deletedAt),
  ];
  if (options?.drafts !== undefined) {
    filters.push(eq(recipes.status, options.drafts ? 'draft' : 'saved'));
  }
  const rows = await database
    .select()
    .from(recipes)
    .where(and(...filters))
    .orderBy(desc(recipes.updatedAt));
  return hydrateRecipes(rows);
}

export async function getRecipe(id: string) {
  const database = getDatabase();
  const rows = await database.select().from(recipes).where(eq(recipes.id, id)).limit(1);
  const hydrated = await hydrateRecipes(rows);
  return hydrated[0] ?? null;
}

export async function saveRecipe(input: RecipeInput, id?: string) {
  const database = getDatabase();
  const now = Date.now();
  const recipeId = id ?? createId('recipe');
  const existing = id ? await getRecipe(id) : null;
  const ingredientRows = (input.ingredients ?? [])
    .filter((ingredient) => ingredient.name.trim())
    .map((ingredient, position) => ({
      id: ingredient.id ?? createId('ingredient'),
      recipeId,
      position,
      groupName: ingredient.groupName?.trim() || null,
      quantity: ingredient.quantity?.trim() || null,
      unit: ingredient.unit?.trim() || null,
      name: ingredient.name.trim(),
      preparation: ingredient.preparation?.trim() || null,
      originalLine: ingredient.originalLine?.trim() || null,
    }));
  const row = {
    title: input.title.trim() || 'Untitled recipe',
    summary: input.summary?.trim() ?? '',
    body: input.body ?? '',
    servings: input.servings ?? null,
    servingUnit: input.servingUnit?.trim() || 'servings',
    prepMinutes: input.prepMinutes ?? null,
    cookMinutes: input.cookMinutes ?? null,
    sourceName: input.sourceName?.trim() || null,
    sourceUrl: input.sourceUrl?.trim() || null,
    coverUri: input.coverUri ?? null,
    favorite: input.favorite ?? existing?.favorite ?? false,
    status: input.status ?? existing?.status ?? 'saved',
    updatedAt: now,
  } as const;

  database.transaction((tx) => {
    if (existing) {
      tx.update(recipes).set(row).where(eq(recipes.id, recipeId)).run();
    } else {
      tx.insert(recipes)
        .values({
          id: recipeId,
          ...row,
          createdAt: now,
          deletedAt: null,
        })
        .run();
    }

    tx.delete(ingredients).where(eq(ingredients.recipeId, recipeId)).run();
    if (ingredientRows.length > 0) {
      tx.insert(ingredients).values(ingredientRows).run();
    }

    tx.delete(recipeCategories).where(eq(recipeCategories.recipeId, recipeId)).run();
    for (const [position, rawName] of (input.categories ?? []).entries()) {
      const name = rawName.trim();
      if (!name) continue;
      let category = tx.select().from(categories).where(eq(categories.name, name)).limit(1).get();
      if (!category) {
        category = {
          id: createId('category'),
          name,
          position,
          createdAt: now,
        };
        tx.insert(categories).values(category).run();
      }
      tx.insert(recipeCategories)
        .values({ recipeId, categoryId: category.id })
        .onConflictDoNothing()
        .run();
    }
  });

  return recipeId;
}

export async function setRecipeFavorite(id: string, favorite: boolean) {
  await getDatabase()
    .update(recipes)
    .set({ favorite, updatedAt: Date.now() })
    .where(eq(recipes.id, id));
}

export async function softDeleteRecipe(id: string) {
  await getDatabase()
    .update(recipes)
    .set({ deletedAt: Date.now(), updatedAt: Date.now() })
    .where(eq(recipes.id, id));
}

export async function restoreRecipe(id: string) {
  await getDatabase()
    .update(recipes)
    .set({ deletedAt: null, updatedAt: Date.now() })
    .where(eq(recipes.id, id));
}

export async function listCategories() {
  return getDatabase().select().from(categories).orderBy(asc(categories.position), asc(categories.name));
}

export async function listVariations(recipeId: string): Promise<Variation[]> {
  const rows = await getDatabase()
    .select()
    .from(variations)
    .where(eq(variations.recipeId, recipeId))
    .orderBy(desc(variations.updatedAt));
  return rows.map((row) => ({
    ...row,
    snapshot: parseJson<RecipeSnapshot>(row.snapshot, emptySnapshot(row.name)),
  }));
}

function recipeToSnapshot(recipe: Recipe): RecipeSnapshot {
  return {
    recipeId: recipe.id,
    variationId: null,
    title: recipe.title,
    summary: recipe.summary,
    body: recipe.body,
    servings: recipe.servings,
    servingUnit: recipe.servingUnit,
    ingredients: recipe.ingredients,
    capturedAt: Date.now(),
  };
}

function emptySnapshot(title: string): RecipeSnapshot {
  return {
    recipeId: null,
    variationId: null,
    title,
    summary: '',
    body: '',
    servings: null,
    servingUnit: 'servings',
    ingredients: [],
    capturedAt: Date.now(),
  };
}

export async function createCookingSession(input: {
  recipeId?: string | null;
  variationId?: string | null;
  title?: string;
  servings?: number | null;
  cookedAt?: number;
  completed?: boolean;
}) {
  const database = getDatabase();
  let snapshot = emptySnapshot(input.title?.trim() || 'Cooking entry');
  if (input.recipeId) {
    const recipe = await getRecipe(input.recipeId);
    if (!recipe) throw new Error('Recipe not found');
    snapshot = recipeToSnapshot(recipe);
  }
  if (input.variationId) {
    const row = (
      await database.select().from(variations).where(eq(variations.id, input.variationId)).limit(1)
    )[0];
    if (!row) throw new Error('Variation not found');
    snapshot = parseJson<RecipeSnapshot>(row.snapshot, snapshot);
    snapshot.variationId = row.id;
  }

  const now = Date.now();
  const id = createId('log');
  await database.insert(cookingLogs).values({
    id,
    recipeId: input.recipeId ?? snapshot.recipeId,
    variationId: input.variationId ?? null,
    title: input.title?.trim() || snapshot.title,
    state: input.completed ? 'completed' : 'active',
    snapshot: JSON.stringify(snapshot),
    checkedItems: '[]',
    servings: input.servings ?? snapshot.servings,
    cookedAt: input.cookedAt ?? now,
    completedAt: input.completed ? now : null,
    updatedAt: now,
    rating: null,
    wouldMakeAgain: null,
    notes: '',
    costMode: 'none',
    currency: null,
    costTotal: null,
    deletedAt: null,
  });
  return id;
}

async function hydrateLogs(rows: (typeof cookingLogs.$inferSelect)[]): Promise<CookingLog[]> {
  if (rows.length === 0) return [];
  const database = getDatabase();
  const ids = rows.map((row) => row.id);
  const changeRows = await database
    .select()
    .from(cookingChanges)
    .where(inArray(cookingChanges.logId, ids))
    .orderBy(asc(cookingChanges.position));
  const itemRows = await database
    .select()
    .from(costItems)
    .where(inArray(costItems.logId, ids))
    .orderBy(asc(costItems.position));
  const photoRows = await database
    .select()
    .from(media)
    .where(inArray(media.logId, ids))
    .orderBy(asc(media.createdAt));

  return rows.map((row) => ({
    ...row,
    state: row.state as CookingLog['state'],
    snapshot: parseJson<RecipeSnapshot>(row.snapshot, emptySnapshot(row.title)),
    checkedItems: parseJson<string[]>(row.checkedItems, []),
    costMode: row.costMode as CookingLog['costMode'],
    changes: changeRows
      .filter((change) => change.logId === row.id)
      .map((change) => ({
        id: change.id,
        kind: change.kind as CookingChange['kind'],
        ingredientId: change.ingredientId,
        originalValue: change.originalValue,
        resultingValue: change.resultingValue,
      })),
    costItems: itemRows
      .filter((item) => item.logId === row.id)
      .map((item) => ({
        id: item.id,
        ingredientId: item.ingredientId,
        label: item.label,
        amount: item.amount,
      })),
    photos: photoRows
      .filter((photo) => photo.logId === row.id)
      .map(
        (photo): CookingPhoto => ({
          id: photo.id,
          uri: photo.uri,
          width: photo.width,
          height: photo.height,
          mimeType: photo.mimeType,
        }),
      ),
  }));
}

export async function listCookingLogs(options?: {
  recipeId?: string;
  state?: 'active' | 'completed';
  deleted?: boolean;
}) {
  const database = getDatabase();
  const filters = [
    options?.deleted ? isNotNull(cookingLogs.deletedAt) : isNull(cookingLogs.deletedAt),
  ];
  if (options?.recipeId) filters.push(eq(cookingLogs.recipeId, options.recipeId));
  if (options?.state) filters.push(eq(cookingLogs.state, options.state));
  const rows = await database
    .select()
    .from(cookingLogs)
    .where(and(...filters))
    .orderBy(desc(cookingLogs.cookedAt));
  return hydrateLogs(rows);
}

export async function getCookingLog(id: string) {
  const rows = await getDatabase()
    .select()
    .from(cookingLogs)
    .where(eq(cookingLogs.id, id))
    .limit(1);
  return (await hydrateLogs(rows))[0] ?? null;
}

export async function updateCookingLog(
  id: string,
  input: Partial<{
    title: string;
    checkedItems: string[];
    servings: number | null;
    cookedAt: number;
    rating: number | null;
    wouldMakeAgain: boolean | null;
    notes: string;
    costMode: 'none' | 'quick' | 'itemized';
    currency: string | null;
    costTotal: number | null;
    changes: CookingChange[];
    costItems: CostItem[];
    photos: CookingPhoto[];
  }>,
) {
  const database = getDatabase();
  const row: Record<string, unknown> = { updatedAt: Date.now() };
  if (input.title !== undefined) row.title = input.title.trim() || 'Cooking entry';
  if (input.checkedItems !== undefined) row.checkedItems = JSON.stringify(input.checkedItems);
  if (input.servings !== undefined) row.servings = input.servings;
  if (input.cookedAt !== undefined) row.cookedAt = input.cookedAt;
  if (input.rating !== undefined) row.rating = input.rating;
  if (input.wouldMakeAgain !== undefined) row.wouldMakeAgain = input.wouldMakeAgain;
  if (input.notes !== undefined) row.notes = input.notes;
  if (input.costMode !== undefined) row.costMode = input.costMode;
  if (input.currency !== undefined) row.currency = input.currency;
  if (input.costTotal !== undefined) row.costTotal = input.costTotal;
  await database.update(cookingLogs).set(row).where(eq(cookingLogs.id, id));

  if (input.changes) {
    await database.delete(cookingChanges).where(eq(cookingChanges.logId, id));
    if (input.changes.length) {
      await database.insert(cookingChanges).values(
        input.changes.map((change, position) => ({
          id: change.id ?? createId('change'),
          logId: id,
          kind: change.kind,
          ingredientId: change.ingredientId ?? null,
          originalValue: change.originalValue ?? null,
          resultingValue: change.resultingValue,
          position,
        })),
      );
    }
  }
  if (input.costItems) {
    await database.delete(costItems).where(eq(costItems.logId, id));
    if (input.costItems.length) {
      await database.insert(costItems).values(
        input.costItems.map((item, position) => ({
          id: item.id ?? createId('cost'),
          logId: id,
          ingredientId: item.ingredientId ?? null,
          label: item.label,
          amount: item.amount,
          position,
        })),
      );
    }
    const total = input.costItems.reduce((sum, item) => sum + item.amount, 0);
    await database
      .update(cookingLogs)
      .set({ costTotal: input.costItems.length ? total : null })
      .where(eq(cookingLogs.id, id));
  }
  if (input.photos) {
    await database.delete(media).where(eq(media.logId, id));
    if (input.photos.length) {
      await database.insert(media).values(
        input.photos.map((photo, position) => ({
          id: photo.id || createId('photo'),
          logId: id,
          uri: photo.uri,
          width: photo.width,
          height: photo.height,
          mimeType: photo.mimeType,
          createdAt: Date.now() + position,
        })),
      );
    }
  }
}

export async function completeCookingLog(id: string) {
  const now = Date.now();
  await getDatabase()
    .update(cookingLogs)
    .set({ state: 'completed', completedAt: now, updatedAt: now })
    .where(eq(cookingLogs.id, id));
}

export async function createVariationFromLog(logId: string, name: string) {
  const log = await getCookingLog(logId);
  if (!log?.recipeId) throw new Error('A variation must belong to a recipe.');
  const now = Date.now();
  const id = createId('variation');
  const snapshot = applyChangesToSnapshot(log.snapshot, log.changes);
  await getDatabase().insert(variations).values({
    id,
    recipeId: log.recipeId,
    sourceLogId: log.id,
    name: name.trim() || 'Variation',
    snapshot: JSON.stringify({
      ...snapshot,
      variationId: id,
      capturedAt: now,
    }),
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

function applyChangesToSnapshot(snapshot: RecipeSnapshot, changes: CookingChange[]): RecipeSnapshot {
  let nextIngredients = snapshot.ingredients.map((ingredient) => ({ ...ingredient }));
  for (const change of changes) {
    if (change.kind === 'add') {
      nextIngredients.push({
        id: createId('variation_ingredient'),
        groupName: null,
        quantity: null,
        unit: null,
        name: change.resultingValue,
        preparation: null,
        originalLine: null,
        position: nextIngredients.length,
      });
      continue;
    }
    if (!change.ingredientId) continue;
    if (change.kind === 'omit') {
      nextIngredients = nextIngredients.filter((ingredient) => ingredient.id !== change.ingredientId);
      continue;
    }
    nextIngredients = nextIngredients.map((ingredient) => {
      if (ingredient.id !== change.ingredientId) return ingredient;
      if (change.kind === 'replace') return { ...ingredient, name: change.resultingValue };
      if (change.kind === 'quantity') return { ...ingredient, quantity: change.resultingValue };
      if (change.kind === 'preparation') {
        return { ...ingredient, preparation: change.resultingValue };
      }
      return ingredient;
    });
  }
  return {
    ...snapshot,
    ingredients: nextIngredients.map((ingredient, position) => ({ ...ingredient, position })),
  };
}

export async function repeatCookingLog(logId: string) {
  const log = await getCookingLog(logId);
  if (!log) throw new Error('Cooking entry not found.');
  if (log.recipeId) {
    return createCookingSession({
      recipeId: log.recipeId,
      variationId: log.variationId,
      servings: log.servings,
    });
  }
  const now = Date.now();
  const id = createId('log');
  await getDatabase().insert(cookingLogs).values({
    id,
    recipeId: null,
    variationId: null,
    title: log.title,
    state: 'active',
    snapshot: JSON.stringify({ ...log.snapshot, capturedAt: now }),
    checkedItems: '[]',
    servings: log.servings,
    cookedAt: now,
    completedAt: null,
    updatedAt: now,
    rating: null,
    wouldMakeAgain: null,
    notes: '',
    costMode: 'none',
    currency: null,
    costTotal: null,
    deletedAt: null,
  });
  return id;
}

export async function attachCookingLogToRecipe(logId: string, recipeId: string) {
  const [log, recipe] = await Promise.all([getCookingLog(logId), getRecipe(recipeId)]);
  if (!log) throw new Error('Cooking entry not found.');
  if (!recipe) throw new Error('Recipe not found.');
  await getDatabase()
    .update(cookingLogs)
    .set({ recipeId, updatedAt: Date.now() })
    .where(eq(cookingLogs.id, logId));
}

export async function replaceCookingLogSnapshotWithCurrentRecipe(logId: string) {
  const log = await getCookingLog(logId);
  if (!log?.recipeId) throw new Error('This entry is not connected to a recipe.');
  const recipe = await getRecipe(log.recipeId);
  if (!recipe) throw new Error('Recipe not found.');
  const snapshot = recipeToSnapshot(recipe);
  await getDatabase()
    .update(cookingLogs)
    .set({
      snapshot: JSON.stringify(snapshot),
      checkedItems: '[]',
      updatedAt: Date.now(),
    })
    .where(eq(cookingLogs.id, logId));
}

export async function softDeleteCookingLog(id: string) {
  await getDatabase()
    .update(cookingLogs)
    .set({ deletedAt: Date.now(), updatedAt: Date.now() })
    .where(eq(cookingLogs.id, id));
}

export async function restoreCookingLog(id: string) {
  await getDatabase()
    .update(cookingLogs)
    .set({ deletedAt: null, updatedAt: Date.now() })
    .where(eq(cookingLogs.id, id));
}

export async function listSavedItems(options?: { deleted?: boolean }) {
  const database = getDatabase();
  const rows = await database
    .select()
    .from(savedItems)
    .where(options?.deleted ? isNotNull(savedItems.deletedAt) : isNull(savedItems.deletedAt))
    .orderBy(desc(savedItems.updatedAt));
  if (!rows.length) return [];
  const links = await database
    .select()
    .from(savedItemRecipes)
    .where(inArray(savedItemRecipes.savedItemId, rows.map((row) => row.id)));
  return rows.map(
    (row): SavedItem => ({
      ...row,
      kind: row.kind as SavedItem['kind'],
      recipeIds: links.filter((link) => link.savedItemId === row.id).map((link) => link.recipeId),
    }),
  );
}

export async function getSavedItem(id: string) {
  return (await listSavedItems()).find((item) => item.id === id) ?? null;
}

export async function saveSavedItem(
  input: Omit<SavedItem, 'id' | 'createdAt' | 'updatedAt'>,
  id?: string,
) {
  const database = getDatabase();
  const now = Date.now();
  const savedItemId = id ?? createId('saved');
  const row = {
    kind: input.kind,
    title: input.title.trim() || 'Untitled',
    url: input.url?.trim() || null,
    platform: input.platform?.trim() || null,
    body: input.body,
    thumbnailUri: input.thumbnailUri,
    updatedAt: now,
  };
  if (id && (await getSavedItem(id))) {
    await database.update(savedItems).set(row).where(eq(savedItems.id, id));
  } else {
    await database.insert(savedItems).values({
      id: savedItemId,
      ...row,
      createdAt: now,
      deletedAt: null,
    });
  }
  await database.delete(savedItemRecipes).where(eq(savedItemRecipes.savedItemId, savedItemId));
  if (input.recipeIds.length) {
    await database.insert(savedItemRecipes).values(
      input.recipeIds.map((recipeId) => ({ savedItemId, recipeId })),
    );
  }
  return savedItemId;
}

export async function softDeleteSavedItem(id: string) {
  await getDatabase()
    .update(savedItems)
    .set({ deletedAt: Date.now(), updatedAt: Date.now() })
    .where(eq(savedItems.id, id));
}

export async function restoreSavedItem(id: string) {
  await getDatabase()
    .update(savedItems)
    .set({ deletedAt: null, updatedAt: Date.now() })
    .where(eq(savedItems.id, id));
}

export async function getSettings(): Promise<AppSettings> {
  const rows = await getDatabase().select().from(settings);
  const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return {
    currency: values.currency || defaultSettings.currency,
    language: values.language === 'es' ? 'es' : 'en',
    libraryView: values.libraryView === 'list' ? 'list' : 'grid',
    readingScale:
      values.readingScale === 'large' || values.readingScale === 'extra-large'
        ? values.readingScale
        : 'standard',
  };
}

export async function setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
  await getDatabase()
    .insert(settings)
    .values({ key, value, updatedAt: Date.now() })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value, updatedAt: Date.now() },
    });
}

export async function getRawSetting(key: string) {
  const row = (
    await getDatabase().select().from(settings).where(eq(settings.key, key)).limit(1)
  )[0];
  return row?.value ?? null;
}

export async function setRawSetting(key: string, value: string) {
  await getDatabase()
    .insert(settings)
    .values({ key, value, updatedAt: Date.now() })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value, updatedAt: Date.now() },
    });
}
