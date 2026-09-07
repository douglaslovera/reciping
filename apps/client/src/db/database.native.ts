import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

import { migrateDatabase } from '@/db/migrations';
import * as schema from '@/db/schema';

function createOrm(database: SQLiteDatabase) {
  return drizzle(database, { schema });
}

export type AppDatabase = ReturnType<typeof createOrm>;

let sqliteDatabase: SQLiteDatabase | null = null;
let appDatabase: AppDatabase | null = null;

export async function initializeDatabase() {
  if (Platform.OS === 'web') {
    return null;
  }

  if (!sqliteDatabase) {
    sqliteDatabase = openDatabaseSync('reciping.db', {
      enableChangeListener: true,
    });
    await migrateDatabase(sqliteDatabase);
    appDatabase = createOrm(sqliteDatabase);
  }

  return appDatabase;
}

export function getDatabase() {
  if (!appDatabase) {
    throw new Error('The local database has not finished initializing.');
  }

  return appDatabase;
}

export function getSQLiteDatabase() {
  if (!sqliteDatabase) {
    throw new Error('The local database has not finished initializing.');
  }

  return sqliteDatabase;
}
