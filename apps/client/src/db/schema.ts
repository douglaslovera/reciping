import { index, integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const recipes = sqliteTable(
  'recipes',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    summary: text('summary').notNull().default(''),
    body: text('body').notNull().default(''),
    servings: real('servings'),
    servingUnit: text('serving_unit').notNull().default('servings'),
    prepMinutes: integer('prep_minutes'),
    cookMinutes: integer('cook_minutes'),
    sourceName: text('source_name'),
    sourceUrl: text('source_url'),
    coverUri: text('cover_uri'),
    favorite: integer('favorite', { mode: 'boolean' }).notNull().default(false),
    status: text('status', { enum: ['draft', 'saved'] }).notNull().default('draft'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    deletedAt: integer('deleted_at'),
  },
  (table) => [
    index('recipes_updated_at_idx').on(table.updatedAt),
    index('recipes_deleted_at_idx').on(table.deletedAt),
  ],
);

export const ingredients = sqliteTable(
  'ingredients',
  {
    id: text('id').primaryKey(),
    recipeId: text('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    groupName: text('group_name'),
    quantity: text('quantity'),
    unit: text('unit'),
    name: text('name').notNull(),
    preparation: text('preparation'),
    originalLine: text('original_line'),
  },
  (table) => [index('ingredients_recipe_idx').on(table.recipeId, table.position)],
);

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  position: integer('position').notNull().default(0),
  createdAt: integer('created_at').notNull(),
});

export const recipeCategories = sqliteTable(
  'recipe_categories',
  {
    recipeId: text('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    categoryId: text('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.recipeId, table.categoryId] })],
);

export const variations = sqliteTable(
  'variations',
  {
    id: text('id').primaryKey(),
    recipeId: text('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    sourceLogId: text('source_log_id'),
    name: text('name').notNull(),
    snapshot: text('snapshot').notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [index('variations_recipe_idx').on(table.recipeId)],
);

export const cookingLogs = sqliteTable(
  'cooking_logs',
  {
    id: text('id').primaryKey(),
    recipeId: text('recipe_id').references(() => recipes.id, { onDelete: 'set null' }),
    variationId: text('variation_id').references(() => variations.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    state: text('state', { enum: ['active', 'completed'] }).notNull().default('active'),
    snapshot: text('snapshot').notNull(),
    checkedItems: text('checked_items').notNull().default('[]'),
    servings: real('servings'),
    cookedAt: integer('cooked_at').notNull(),
    completedAt: integer('completed_at'),
    updatedAt: integer('updated_at').notNull(),
    rating: integer('rating'),
    wouldMakeAgain: integer('would_make_again', { mode: 'boolean' }),
    notes: text('notes').notNull().default(''),
    costMode: text('cost_mode', { enum: ['none', 'quick', 'itemized'] })
      .notNull()
      .default('none'),
    currency: text('currency'),
    costTotal: real('cost_total'),
    deletedAt: integer('deleted_at'),
  },
  (table) => [
    index('cooking_logs_recipe_idx').on(table.recipeId, table.cookedAt),
    index('cooking_logs_state_idx').on(table.state, table.cookedAt),
    index('cooking_logs_deleted_at_idx').on(table.deletedAt),
  ],
);

export const cookingChanges = sqliteTable(
  'cooking_changes',
  {
    id: text('id').primaryKey(),
    logId: text('log_id')
      .notNull()
      .references(() => cookingLogs.id, { onDelete: 'cascade' }),
    kind: text('kind', {
      enum: ['replace', 'quantity', 'omit', 'add', 'preparation'],
    }).notNull(),
    ingredientId: text('ingredient_id'),
    originalValue: text('original_value'),
    resultingValue: text('resulting_value').notNull(),
    position: integer('position').notNull(),
  },
  (table) => [index('cooking_changes_log_idx').on(table.logId, table.position)],
);

export const costItems = sqliteTable(
  'cost_items',
  {
    id: text('id').primaryKey(),
    logId: text('log_id')
      .notNull()
      .references(() => cookingLogs.id, { onDelete: 'cascade' }),
    ingredientId: text('ingredient_id'),
    label: text('label').notNull(),
    amount: real('amount').notNull(),
    position: integer('position').notNull(),
  },
  (table) => [index('cost_items_log_idx').on(table.logId, table.position)],
);

export const media = sqliteTable(
  'media',
  {
    id: text('id').primaryKey(),
    logId: text('log_id')
      .notNull()
      .references(() => cookingLogs.id, { onDelete: 'cascade' }),
    uri: text('uri').notNull(),
    width: integer('width'),
    height: integer('height'),
    mimeType: text('mime_type'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('media_log_idx').on(table.logId, table.createdAt)],
);

export const savedItems = sqliteTable(
  'saved_items',
  {
    id: text('id').primaryKey(),
    kind: text('kind', { enum: ['video', 'article', 'tip'] }).notNull(),
    title: text('title').notNull(),
    url: text('url'),
    platform: text('platform'),
    body: text('body').notNull().default(''),
    thumbnailUri: text('thumbnail_uri'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    deletedAt: integer('deleted_at'),
  },
  (table) => [
    index('saved_items_updated_at_idx').on(table.updatedAt),
    index('saved_items_deleted_at_idx').on(table.deletedAt),
  ],
);

export const savedItemRecipes = sqliteTable(
  'saved_item_recipes',
  {
    savedItemId: text('saved_item_id')
      .notNull()
      .references(() => savedItems.id, { onDelete: 'cascade' }),
    recipeId: text('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.savedItemId, table.recipeId] })],
);

export type RecipeRow = typeof recipes.$inferSelect;
export type IngredientRow = typeof ingredients.$inferSelect;
export type VariationRow = typeof variations.$inferSelect;
export type CookingLogRow = typeof cookingLogs.$inferSelect;
export type CookingChangeRow = typeof cookingChanges.$inferSelect;
export type CostItemRow = typeof costItems.$inferSelect;
export type MediaRow = typeof media.$inferSelect;
export type SavedItemRow = typeof savedItems.$inferSelect;
