/**
 * Tests for the agent-devops#960 cleanup script.
 *
 * These exist because the script shipped with a `--apply` path that could not
 * run at all: `new Database(path, { readonly: false })` throws SQLITE_MISUSE on
 * bun 1.3.10, so every write-mode invocation died at the constructor. The dry
 * run worked, I checked the dry run, and concluded the script worked. A path
 * with no test is a path that does not work until proven otherwise.
 *
 * So the important test here is the one that actually DELETES. Anything that
 * only exercises the read-only path would have passed against the broken
 * version.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import fs from 'fs';
import { dedupIndexerTwins } from './dedup-indexer-twins.ts';

const DB = '/tmp/oracle-dedup-twins-test.db';
const BACKUP = `${DB}.pre-dedup-960`;
const T = 1_700_000_000_000;

function seed(): void {
  for (const p of [DB, BACKUP]) if (fs.existsSync(p)) fs.unlinkSync(p);

  const db = new Database(DB, { readwrite: true, create: true });
  db.exec(`
    CREATE TABLE oracle_documents (
      id TEXT PRIMARY KEY, type TEXT NOT NULL, source_file TEXT NOT NULL,
      concepts TEXT NOT NULL DEFAULT '[]', created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL, indexed_at INTEGER NOT NULL,
      superseded_by TEXT, superseded_at INTEGER, superseded_reason TEXT,
      origin TEXT, project TEXT, created_by TEXT,
      expires_at INTEGER, ttl_days INTEGER
    );
    CREATE VIRTUAL TABLE oracle_fts USING fts5(id UNINDEXED, content, concepts);
  `);

  const ins = db.prepare(`
    INSERT INTO oracle_documents
      (id, type, source_file, concepts, created_at, updated_at, indexed_at, created_by, expires_at)
    VALUES (?, 'learning', ?, '[]', ?, ?, ?, ?, ?)
  `);
  const fts = db.prepare(`INSERT INTO oracle_fts (id, content, concepts) VALUES (?, ?, '[]')`);

  const add = (id: string, file: string, by: string, expires: number | null) => {
    ins.run(id, file, T, T, T, by, expires);
    fts.run(id, `content of ${id}`);
  };

  // Two files with an arra_learn owner AND an immortal indexer twin — the bug.
  add('learning_2026-05-19_a', 'ψ/a.md', 'arra_learn', T + 1000);
  add('learning_ψ/a.md_0',     'ψ/a.md', 'indexer',    null);
  add('learning_2026-05-20_b', 'ψ/b.md', 'arra_learn', T + 1000);
  add('learning_ψ/b.md_0',     'ψ/b.md', 'indexer',    null);

  // A file the indexer legitimately owns alone — the 442-file retro population.
  // Must survive untouched.
  add('retro_21.09_solo_0', 'ψ/solo.md', 'indexer', null);
  add('retro_21.09_solo_1', 'ψ/solo.md', 'indexer', null);

  // An arra_learn file with no twin — must survive untouched.
  add('learning_2026-07-26_c', 'ψ/c.md', 'arra_learn', T + 1000);

  db.close();
}

function rows(): { id: string; created_by: string }[] {
  const db = new Database(DB, { readonly: true });
  const r = db.query('SELECT id, created_by FROM oracle_documents ORDER BY id').all() as any[];
  db.close();
  return r;
}

function ftsIds(): string[] {
  const db = new Database(DB, { readonly: true });
  const r = (db.query('SELECT id FROM oracle_fts ORDER BY id').all() as any[]).map(x => x.id);
  db.close();
  return r;
}

beforeEach(seed);
afterEach(() => {
  for (const p of [DB, BACKUP]) if (fs.existsSync(p)) fs.unlinkSync(p);
});

describe('dedup-indexer-twins', () => {
  it('dry run reports the right counts and writes nothing', () => {
    const before = rows();

    const r = dedupIndexerTwins(DB, false);

    expect(r.twins).toBe(2);          // the two indexer twins
    expect(r.files).toBe(2);          // across two files
    expect(r.soloIndexer).toBe(2);    // the retro pair
    expect(r.deleted).toBe(0);
    expect(r.applied).toBe(false);
    expect(rows()).toEqual(before);
    expect(fs.existsSync(BACKUP)).toBe(false);
  });

  it('--apply actually deletes the twins', () => {
    // The test that would have caught the shipped SQLITE_MISUSE crash: it opens
    // the DB in write mode and asserts on the result, so a constructor that
    // throws fails here rather than in production six weeks later.
    const r = dedupIndexerTwins(DB, true);

    expect(r.applied).toBe(true);
    expect(r.deleted).toBe(2);

    const ids = rows().map(x => x.id);
    expect(ids).not.toContain('learning_ψ/a.md_0');
    expect(ids).not.toContain('learning_ψ/b.md_0');
  });

  it('never deletes an arra_learn row', () => {
    dedupIndexerTwins(DB, true);
    const learn = rows().filter(x => x.created_by === 'arra_learn').map(x => x.id);
    expect(learn.sort()).toEqual([
      'learning_2026-05-19_a',
      'learning_2026-05-20_b',
      'learning_2026-07-26_c',
    ]);
  });

  it('leaves solo indexer rows untouched', () => {
    // A predicate that deleted by created_by alone would pass every assertion
    // above and destroy the 442-file retro population.
    dedupIndexerTwins(DB, true);
    const ids = rows().map(x => x.id);
    expect(ids).toContain('retro_21.09_solo_0');
    expect(ids).toContain('retro_21.09_solo_1');
  });

  it('deletes the FTS rows alongside the documents', () => {
    // If FTS outlives its document, keyword search returns ids that no longer
    // resolve — a different flavour of the same stale-content bug.
    expect(ftsIds()).toContain('learning_ψ/a.md_0');
    dedupIndexerTwins(DB, true);
    const f = ftsIds();
    expect(f).not.toContain('learning_ψ/a.md_0');
    expect(f).not.toContain('learning_ψ/b.md_0');
    expect(f).toContain('retro_21.09_solo_0');
  });

  it('takes a verifiable backup before deleting', () => {
    dedupIndexerTwins(DB, true);

    expect(fs.existsSync(BACKUP)).toBe(true);

    // The backup must be the PRE-delete state — restoring it has to bring the
    // twins back, otherwise it is a backup in name only.
    const b = new Database(BACKUP, { readonly: true });
    const ids = (b.query('SELECT id FROM oracle_documents').all() as any[]).map(x => x.id);
    b.close();
    expect(ids).toContain('learning_ψ/a.md_0');
    expect(ids).toContain('learning_ψ/b.md_0');
  });

  it('is idempotent — a second apply finds nothing and leaves the DB alone', () => {
    dedupIndexerTwins(DB, true);
    fs.unlinkSync(BACKUP);           // the script refuses to overwrite a backup
    const after1 = rows();

    const r2 = dedupIndexerTwins(DB, true);

    expect(r2.twins).toBe(0);
    expect(r2.deleted).toBe(0);
    expect(rows()).toEqual(after1);
  });

  it('reports zero twins on a database that never had the bug', () => {
    const clean = '/tmp/oracle-dedup-clean-test.db';
    if (fs.existsSync(clean)) fs.unlinkSync(clean);
    const db = new Database(clean, { readwrite: true, create: true });
    db.exec(`
      CREATE TABLE oracle_documents (
        id TEXT PRIMARY KEY, type TEXT NOT NULL, source_file TEXT NOT NULL,
        concepts TEXT NOT NULL DEFAULT '[]', created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL, indexed_at INTEGER NOT NULL,
        superseded_by TEXT, superseded_at INTEGER, superseded_reason TEXT,
        origin TEXT, project TEXT, created_by TEXT,
        expires_at INTEGER, ttl_days INTEGER
      );
      CREATE VIRTUAL TABLE oracle_fts USING fts5(id UNINDEXED, content, concepts);
      INSERT INTO oracle_documents (id,type,source_file,concepts,created_at,updated_at,indexed_at,created_by)
      VALUES ('learning_x','learning','ψ/x.md','[]',1,1,1,'arra_learn');
    `);
    db.close();

    const r = dedupIndexerTwins(clean, true);
    expect(r.twins).toBe(0);
    expect(r.deleted).toBe(0);

    fs.unlinkSync(clean);
  });
});
