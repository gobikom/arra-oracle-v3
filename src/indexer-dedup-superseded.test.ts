/**
 * Regression test for agent-devops#960 — superseding a learning must not hand
 * its source_file back to the indexer.
 *
 * The original dedup guard selected arra_learn-owned files with
 * `isNull(supersededBy)`. That made ownership a property of the ROW's lifecycle
 * rather than of the FILE, so the moment a learning was superseded its file
 * dropped out of the skip-set and the next scan re-indexed it into a twin with
 * expires_at NULL and superseded_by NULL — never expires, never marked
 * superseded, fully live in search. LEARN-AND-SUPERSEDE runs on every score, so
 * good supersede hygiene actively manufactured immortal duplicates.
 *
 * These tests import the REAL `selectArraLearnOwnedFiles` from storage.ts. A
 * test that rebuilt the WHERE clause locally would pass no matter what the
 * source did, which is precisely the failure this bug already demonstrates:
 * a guard that looks present and is not doing its job.
 *
 * Sabotage-checked — restoring `isNull(oracleDocuments.supersededBy)` to the
 * query makes "superseded file stays owned", "mixed", "supersede chain" and
 * "not a subset" fail. If a refactor leaves all four green, the tests are no
 * longer binding to the real query and should be rewritten, not trusted.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { drizzle, BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import * as schema from './db/schema.ts';
import { selectArraLearnOwnedFiles } from './indexer/storage.ts';
import fs from 'fs';

let sqlite: Database;
let db: BunSQLiteDatabase<typeof schema>;
const TEST_DB_PATH = '/tmp/oracle-indexer-dedup-superseded-test.db';

beforeAll(() => {
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  sqlite = new Database(TEST_DB_PATH);
  db = drizzle(sqlite, { schema });
  sqlite.exec(`
    CREATE TABLE oracle_documents (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      source_file TEXT NOT NULL,
      concepts TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      indexed_at INTEGER NOT NULL,
      superseded_by TEXT,
      superseded_at INTEGER,
      superseded_reason TEXT,
      origin TEXT,
      project TEXT,
      created_by TEXT,
      expires_at INTEGER,
      ttl_days INTEGER
    );
    CREATE INDEX idx_created_by ON oracle_documents(created_by);
  `);
});

afterAll(() => {
  sqlite.close();
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
});

beforeEach(() => {
  sqlite.exec('DELETE FROM oracle_documents');
});

const T = 1_700_000_000_000;

function insertDoc(o: {
  id: string;
  sourceFile: string;
  createdBy: string;
  supersededBy?: string | null;
}) {
  sqlite.prepare(`
    INSERT INTO oracle_documents
      (id, type, source_file, concepts, created_at, updated_at, indexed_at, superseded_by, created_by)
    VALUES (?, 'learning', ?, '[]', ?, ?, ?, ?, ?)
  `).run(o.id, o.sourceFile, T, T, T, o.supersededBy ?? null, o.createdBy);
}

describe('agent-devops#960 — arra_learn file ownership survives supersede', () => {
  it('keeps a superseded arra_learn file in the owned set', () => {
    insertDoc({
      id: 'learning_2026-05-19_daily-goal',
      sourceFile: 'ψ/memory/learnings/2026-05-19_daily-goal.md',
      createdBy: 'arra_learn',
      supersededBy: 'learning_2026-07-26_daily-goal',
    });

    const owned = selectArraLearnOwnedFiles(db);

    // The whole bug in one assertion. Under the old `isNull(supersededBy)`
    // guard this set is empty, the indexer re-indexes the file, and the twin
    // it writes never expires.
    expect(owned.has('ψ/memory/learnings/2026-05-19_daily-goal.md')).toBe(true);
    expect(owned.size).toBe(1);
  });

  it('keeps a non-superseded arra_learn file in the owned set', () => {
    insertDoc({
      id: 'learning_2026-07-26_active',
      sourceFile: 'ψ/memory/learnings/2026-07-26_active.md',
      createdBy: 'arra_learn',
    });

    expect(selectArraLearnOwnedFiles(db).has('ψ/memory/learnings/2026-07-26_active.md')).toBe(true);
  });

  it('owns both superseded and active files when the store holds a mix', () => {
    insertDoc({ id: 'a', sourceFile: 'ψ/a.md', createdBy: 'arra_learn', supersededBy: 'b' });
    insertDoc({ id: 'b', sourceFile: 'ψ/b.md', createdBy: 'arra_learn' });
    insertDoc({ id: 'c', sourceFile: 'ψ/c.md', createdBy: 'arra_learn', supersededBy: 'b' });

    const owned = selectArraLearnOwnedFiles(db);

    expect(owned.size).toBe(3);
    expect([...owned].sort()).toEqual(['ψ/a.md', 'ψ/b.md', 'ψ/c.md']);
  });

  it('still owns every file in a multi-step supersede chain', () => {
    // v1 -> v2 -> v3, the shape LEARN-AND-SUPERSEDE produces over a topic's life.
    // Only v3 is live, but all three files must stay off-limits to the indexer.
    insertDoc({ id: 'v1', sourceFile: 'ψ/topic-v1.md', createdBy: 'arra_learn', supersededBy: 'v2' });
    insertDoc({ id: 'v2', sourceFile: 'ψ/topic-v2.md', createdBy: 'arra_learn', supersededBy: 'v3' });
    insertDoc({ id: 'v3', sourceFile: 'ψ/topic-v3.md', createdBy: 'arra_learn' });

    expect(selectArraLearnOwnedFiles(db).size).toBe(3);
  });

  it('does NOT claim files the indexer legitimately owns', () => {
    // A guard that returns everything would pass every test above while
    // silently disabling indexing altogether.
    insertDoc({ id: 'retro_21.09_x_0', sourceFile: 'ψ/memory/retro/x.md', createdBy: 'indexer' });
    insertDoc({ id: 'legacy', sourceFile: 'ψ/memory/legacy.md', createdBy: null as unknown as string });
    insertDoc({ id: 'own', sourceFile: 'ψ/memory/learnings/own.md', createdBy: 'arra_learn' });

    const owned = selectArraLearnOwnedFiles(db);

    expect(owned.has('ψ/memory/retro/x.md')).toBe(false);
    expect(owned.has('ψ/memory/legacy.md')).toBe(false);
    expect(owned.has('ψ/memory/learnings/own.md')).toBe(true);
    expect(owned.size).toBe(1);
  });

  it('is not a subset of the live-only set — that is the regression', () => {
    // Stated as a relationship rather than a count, so the test keeps meaning
    // if the fixture changes: the owned set must be strictly larger than what
    // an isNull(supersededBy) filter would have returned.
    insertDoc({ id: 'live', sourceFile: 'ψ/live.md', createdBy: 'arra_learn' });
    insertDoc({ id: 'dead', sourceFile: 'ψ/dead.md', createdBy: 'arra_learn', supersededBy: 'live' });

    const owned = selectArraLearnOwnedFiles(db);
    const liveOnly = new Set(
      sqlite.prepare(
        `SELECT source_file FROM oracle_documents
         WHERE created_by = 'arra_learn' AND superseded_by IS NULL`
      ).all().map((r: any) => r.source_file)
    );

    expect(liveOnly.size).toBe(1);
    expect(owned.size).toBeGreaterThan(liveOnly.size);
    for (const f of liveOnly) expect(owned.has(f)).toBe(true);
  });

  it('returns an empty set when arra_learn owns nothing', () => {
    insertDoc({ id: 'i1', sourceFile: 'ψ/only-indexer.md', createdBy: 'indexer' });
    expect(selectArraLearnOwnedFiles(db).size).toBe(0);
  });
});
