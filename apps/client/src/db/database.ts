import type { SQLiteDatabase } from 'expo-sqlite';
import type { AppDatabase } from './database.native';

// The browser is a UI preview. Avoid bundling the native SQLite worker there.
export type { AppDatabase } from './database.native';

export async function initializeDatabase() {
  return null;
}

export function getDatabase(): AppDatabase {
  throw new Error('Saving is available in the iOS and Android app.');
}

export function getSQLiteDatabase(): SQLiteDatabase {
  throw new Error('Saving is available in the iOS and Android app.');
}
