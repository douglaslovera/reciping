import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';

const migrations = readFileSync(new URL('../src/db/migrations.ts', import.meta.url), 'utf8');
const resetSource = readFileSync(new URL('../src/db/reset.ts', import.meta.url), 'utf8');
const schemaSql = migrations.match(/const migrations = \[\s*`([\s\S]*?)`/)[1];
const resetSql = resetSource.match(/resetDataSql = `([\s\S]*?)`/)[1];

function seededDatabase() {
  const db = new DatabaseSync(':memory:');
  db.exec(schemaSql);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA user_version = 1; BEGIN; PRAGMA defer_foreign_keys = ON;');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map(row => row.name);
  for (const table of tables) {
    const columns = db.prepare(`PRAGMA table_info("${table}")`).all();
    // Populate every column, including deleted_at and all foreign keys.
    const values = columns.map(column => column.type === 'TEXT' ? 'test' : 1);
    db.prepare(`INSERT INTO "${table}" VALUES (${columns.map(() => '?').join(',')})`).run(...values);
  }
  db.exec('COMMIT');
  return { db, tables };
}

test('reset clears all app tables, including deleted content, and preserves the schema', () => {
  const { db, tables } = seededDatabase();
  try {
    db.exec(`BEGIN; ${resetSql} COMMIT;`);
    for (const table of tables) {
      assert.equal(db.prepare(`SELECT count(*) AS count FROM "${table}"`).get().count, 0, table);
    }
    assert.equal(db.prepare('PRAGMA user_version').get().user_version, 1);
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
    db.exec("INSERT INTO recipes (id, title, created_at, updated_at) VALUES ('new', 'First recipe', 1, 1)");
    assert.equal(db.prepare('SELECT title FROM recipes').get().title, 'First recipe');
  } finally {
    db.close();
  }
});

test('a failed reset transaction can roll back without losing content', () => {
  const { db, tables } = seededDatabase();
  try {
    db.exec('BEGIN');
    assert.throws(() => db.exec(`${resetSql} DELETE FROM missing_table;`));
    db.exec('ROLLBACK');
    for (const table of tables) {
      assert.equal(db.prepare(`SELECT count(*) AS count FROM "${table}"`).get().count, 1, table);
    }
  } finally {
    db.close();
  }
});
