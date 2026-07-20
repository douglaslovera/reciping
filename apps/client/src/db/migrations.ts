import type { SQLiteDatabase } from 'expo-sqlite';

const migrations = [
  `
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS recipes (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    servings REAL,
    serving_unit TEXT NOT NULL DEFAULT 'servings',
    prep_minutes INTEGER,
    cook_minutes INTEGER,
    source_name TEXT,
    source_url TEXT,
    cover_uri TEXT,
    favorite INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );
  CREATE INDEX IF NOT EXISTS recipes_updated_at_idx ON recipes(updated_at);
  CREATE INDEX IF NOT EXISTS recipes_deleted_at_idx ON recipes(deleted_at);

  CREATE TABLE IF NOT EXISTS ingredients (
    id TEXT PRIMARY KEY NOT NULL,
    recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    group_name TEXT,
    quantity TEXT,
    unit TEXT,
    name TEXT NOT NULL,
    preparation TEXT,
    original_line TEXT
  );
  CREATE INDEX IF NOT EXISTS ingredients_recipe_idx ON ingredients(recipe_id, position);

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL UNIQUE,
    position INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS recipe_categories (
    recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY(recipe_id, category_id)
  );

  CREATE TABLE IF NOT EXISTS variations (
    id TEXT PRIMARY KEY NOT NULL,
    recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    source_log_id TEXT,
    name TEXT NOT NULL,
    snapshot TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS variations_recipe_idx ON variations(recipe_id);

  CREATE TABLE IF NOT EXISTS cooking_logs (
    id TEXT PRIMARY KEY NOT NULL,
    recipe_id TEXT REFERENCES recipes(id) ON DELETE SET NULL,
    variation_id TEXT REFERENCES variations(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'active',
    snapshot TEXT NOT NULL,
    checked_items TEXT NOT NULL DEFAULT '[]',
    servings REAL,
    cooked_at INTEGER NOT NULL,
    completed_at INTEGER,
    updated_at INTEGER NOT NULL,
    rating INTEGER,
    would_make_again INTEGER,
    notes TEXT NOT NULL DEFAULT '',
    cost_mode TEXT NOT NULL DEFAULT 'none',
    currency TEXT,
    cost_total REAL,
    deleted_at INTEGER
  );
  CREATE INDEX IF NOT EXISTS cooking_logs_recipe_idx ON cooking_logs(recipe_id, cooked_at);
  CREATE INDEX IF NOT EXISTS cooking_logs_state_idx ON cooking_logs(state, cooked_at);
  CREATE INDEX IF NOT EXISTS cooking_logs_deleted_at_idx ON cooking_logs(deleted_at);

  CREATE TABLE IF NOT EXISTS cooking_changes (
    id TEXT PRIMARY KEY NOT NULL,
    log_id TEXT NOT NULL REFERENCES cooking_logs(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    ingredient_id TEXT,
    original_value TEXT,
    resulting_value TEXT NOT NULL,
    position INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS cooking_changes_log_idx ON cooking_changes(log_id, position);

  CREATE TABLE IF NOT EXISTS cost_items (
    id TEXT PRIMARY KEY NOT NULL,
    log_id TEXT NOT NULL REFERENCES cooking_logs(id) ON DELETE CASCADE,
    ingredient_id TEXT,
    label TEXT NOT NULL,
    amount REAL NOT NULL,
    position INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS cost_items_log_idx ON cost_items(log_id, position);

  CREATE TABLE IF NOT EXISTS media (
    id TEXT PRIMARY KEY NOT NULL,
    log_id TEXT NOT NULL REFERENCES cooking_logs(id) ON DELETE CASCADE,
    uri TEXT NOT NULL,
    width INTEGER,
    height INTEGER,
    mime_type TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS media_log_idx ON media(log_id, created_at);

  CREATE TABLE IF NOT EXISTS saved_items (
    id TEXT PRIMARY KEY NOT NULL,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT,
    platform TEXT,
    body TEXT NOT NULL DEFAULT '',
    thumbnail_uri TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );
  CREATE INDEX IF NOT EXISTS saved_items_updated_at_idx ON saved_items(updated_at);
  CREATE INDEX IF NOT EXISTS saved_items_deleted_at_idx ON saved_items(deleted_at);

  CREATE TABLE IF NOT EXISTS saved_item_recipes (
    saved_item_id TEXT NOT NULL REFERENCES saved_items(id) ON DELETE CASCADE,
    recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    PRIMARY KEY(saved_item_id, recipe_id)
  );
  `,
];

export async function migrateDatabase(database: SQLiteDatabase) {
  await database.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const result = await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = result?.user_version ?? 0;

  while (version < migrations.length) {
    await database.withTransactionAsync(async () => {
      await database.execAsync(migrations[version]);
      await database.execAsync(`PRAGMA user_version = ${version + 1}`);
    });
    version += 1;
  }
}
