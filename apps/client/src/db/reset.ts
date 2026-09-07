import { getSQLiteDatabase } from '@/db/database';
import { removeAllJournalImages } from '@/media-storage';

// Children first so foreign-key enforcement stays enabled throughout the reset.
export const resetDataSql = `
  DELETE FROM saved_item_recipes;
  DELETE FROM recipe_categories;
  DELETE FROM cooking_changes;
  DELETE FROM cost_items;
  DELETE FROM media;
  DELETE FROM cooking_logs;
  DELETE FROM variations;
  DELETE FROM ingredients;
  DELETE FROM saved_items;
  DELETE FROM recipes;
  DELETE FROM categories;
  DELETE FROM settings;
`;

export async function resetAppDataForDevelopment() {
  if (!__DEV__) throw new Error('App data reset is only available in development.');

  const database = getSQLiteDatabase();
  database.withTransactionSync(() => database.execSync(resetDataSql));

  // The database is already reset. A failed photo cleanup can be retried safely.
  try {
    await removeAllJournalImages();
    return { photosRemoved: true };
  } catch {
    return { photosRemoved: false };
  }
}
