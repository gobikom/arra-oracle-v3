/**
 * Tests for src/indexer/backfill.ts (vector store backfill helpers — Issue #29).
 *
 * Located at top-level src/ so the existing package.json test:unit script
 * picks it up (it enumerates `src/*.test.ts` individually rather than
 * scanning a directory).
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import {
  parseArgs,
  fetchLiveRows,
  rowToVectorDoc,
  summarizeByType,
  runBackfill,
  ALLOWED_MODELS,
  type BackfillRow,
  type BackfillOptions,
} from './indexer/backfill.ts';
import type { VectorDocument, VectorStoreAdapter, VectorQueryResult } from './vector/types.ts';

// ---------------------------------------------------------------------------
// parseArgs
// ---------------------------------------------------------------------------

describe('parseArgs', () => {
  test('defaults when no flags supplied', () => {
    const result = parseArgs([]);
    expect(result).toEqual({ dryRun: false, batchSize: 50, model: 'bge-m3' });
  });

  test('--dry-run flag', () => {
    const result = parseArgs(['--dry-run']);
    expect(result).toEqual({ dryRun: true, batchSize: 50, model: 'bge-m3' });
  });

  test('--batch-size=N parses positive integer', () => {
    const result = parseArgs(['--batch-size=100']);
    expect(result).toEqual({ dryRun: false, batchSize: 100, model: 'bge-m3' });
  });

  test.each([
    '--batch-size=0',
    '--batch-size=-5',
    '--batch-size=abc',
    '--batch-size=1.5',
  ])('--batch-size rejects bad value %s', (arg) => {
    const result = parseArgs([arg]);
    expect(result).toHaveProperty('code', 2);
    if ('code' in result) {
      expect(result.message).toContain('--batch-size');
    }
  });

  test.each(ALLOWED_MODELS)('--model=%s is accepted', (model) => {
    const result = parseArgs([`--model=${model}`]);
    expect(result).toEqual({ dryRun: false, batchSize: 50, model });
  });

  test('--model=unknown is rejected', () => {
    const result = parseArgs(['--model=text-embedding-xl']);
    expect(result).toHaveProperty('code', 2);
    if ('code' in result) {
      expect(result.message).toContain('--model');
      expect(result.message).toContain('bge-m3');
    }
  });

  test('unknown flags are ignored', () => {
    const result = parseArgs(['--unknown-flag', '--dry-run', '--extra']);
    expect(result).toEqual({ dryRun: true, batchSize: 50, model: 'bge-m3' });
  });
});

// ---------------------------------------------------------------------------
// rowToVectorDoc
// ---------------------------------------------------------------------------

describe('rowToVectorDoc', () => {
  const baseRow: BackfillRow = {
    id: 'learning_2026-04-24_test',
    type: 'learning',
    source_file: 'ψ/memory/learnings/2026-04-24_test.md',
    project: 'agent:psak',
    concepts: JSON.stringify(['phase-4', 'test']),
    created_at: 1714_000_000_000,
    updated_at: 1714_100_000_000,
    content: 'Test learning content.',
  };

  test('builds VectorDocument with parsed concepts', () => {
    const doc = rowToVectorDoc(baseRow);
    expect(doc).toEqual({
      id: 'learning_2026-04-24_test',
      document: 'Test learning content.',
      metadata: {
        type: 'learning',
        source_file: 'ψ/memory/learnings/2026-04-24_test.md',
        project: 'agent:psak',
        concepts: 'phase-4,test',
        created_at: 1714_000_000_000,
        updated_at: 1714_100_000_000,
      },
    });
  });

  test('null project becomes empty string', () => {
    const doc = rowToVectorDoc({ ...baseRow, project: null });
    expect(doc.metadata.project).toBe('');
  });

  test('malformed concepts JSON degrades to empty', () => {
    const doc = rowToVectorDoc({ ...baseRow, concepts: '{not-valid-json' });
    expect(doc.metadata.concepts).toBe('');
  });

  test('malformed concepts JSON emits warn when logger supplied', () => {
    const warnings: string[] = [];
    const logger = {
      info: (_: string) => {},
      error: (_: string) => {},
      warn: (m: string) => warnings.push(m),
    };
    rowToVectorDoc({ ...baseRow, concepts: '{not-valid-json' }, logger);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]!).toContain(baseRow.id);
    expect(warnings[0]!).toContain('malformed concepts JSON');
  });

  test('malformed concepts JSON stays silent when no logger', () => {
    // Pure-fn call site (no logger) must not throw / print.
    expect(() =>
      rowToVectorDoc({ ...baseRow, concepts: '{not-valid-json' }),
    ).not.toThrow();
  });

  test('non-array concepts JSON degrades to empty', () => {
    const doc = rowToVectorDoc({ ...baseRow, concepts: '"just a string"' });
    expect(doc.metadata.concepts).toBe('');
  });

  test('non-array concepts JSON emits warn when logger supplied', () => {
    const warnings: string[] = [];
    const logger = {
      info: (_: string) => {},
      error: (_: string) => {},
      warn: (m: string) => warnings.push(m),
    };
    rowToVectorDoc({ ...baseRow, concepts: '"just a string"' }, logger);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]!).toContain(baseRow.id);
    expect(warnings[0]!).toContain('not an array');
  });

  test('concepts with non-string entries coerces via String()', () => {
    const doc = rowToVectorDoc({
      ...baseRow,
      concepts: JSON.stringify(['a', 42, true]),
    });
    expect(doc.metadata.concepts).toBe('a,42,true');
  });
});

// ---------------------------------------------------------------------------
// summarizeByType
// ---------------------------------------------------------------------------

describe('summarizeByType', () => {
  test('sorts by count desc then type asc', () => {
    const rows: BackfillRow[] = [
      { ...makeRow('1'), type: 'learning' },
      { ...makeRow('2'), type: 'learning' },
      { ...makeRow('3'), type: 'pattern' },
      { ...makeRow('4'), type: 'principle' },
      { ...makeRow('5'), type: 'principle' },
    ];
    const summary = summarizeByType(rows);
    expect(summary).toEqual([
      { type: 'learning', count: 2 },
      { type: 'principle', count: 2 },
      { type: 'pattern', count: 1 },
    ]);
  });

  test('empty rows returns empty array', () => {
    expect(summarizeByType([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// fetchLiveRows (real tmp sqlite)
// ---------------------------------------------------------------------------

describe('fetchLiveRows', () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(`
      CREATE TABLE oracle_documents (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        source_file TEXT NOT NULL,
        concepts TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        indexed_at INTEGER NOT NULL,
        superseded_by TEXT,
        project TEXT
      );
      CREATE VIRTUAL TABLE oracle_fts USING fts5(id UNINDEXED, content, concepts);
    `);
  });

  test('returns all non-superseded docs with content', () => {
    db.prepare(
      `INSERT INTO oracle_documents
       (id, type, source_file, concepts, created_at, updated_at, indexed_at, superseded_by, project)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('L1', 'learning', 'ψ/a.md', '[]', 100, 100, 100, null, 'agent:psak');
    db.prepare(
      `INSERT INTO oracle_documents
       (id, type, source_file, concepts, created_at, updated_at, indexed_at, superseded_by, project)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('L2', 'learning', 'ψ/b.md', '[]', 200, 200, 200, null, null);
    db.prepare(
      `INSERT INTO oracle_documents
       (id, type, source_file, concepts, created_at, updated_at, indexed_at, superseded_by, project)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('L3-dead', 'learning', 'ψ/c.md', '[]', 300, 300, 300, 'superseded-by-L2', null);

    db.prepare(`INSERT INTO oracle_fts (id, content, concepts) VALUES (?, ?, ?)`).run('L1', 'A content', '');
    db.prepare(`INSERT INTO oracle_fts (id, content, concepts) VALUES (?, ?, ?)`).run('L2', 'B content', '');
    db.prepare(`INSERT INTO oracle_fts (id, content, concepts) VALUES (?, ?, ?)`).run('L3-dead', 'C content', '');

    const rows = fetchLiveRows(db);
    expect(rows.map((r) => r.id)).toEqual(['L1', 'L2']);
    expect(rows[0]!.content).toBe('A content');
    expect(rows[0]!.project).toBe('agent:psak');
    expect(rows[1]!.project).toBeNull();
  });

  test('docs missing FTS content are excluded (INNER JOIN)', () => {
    db.prepare(
      `INSERT INTO oracle_documents
       (id, type, source_file, concepts, created_at, updated_at, indexed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run('orphan', 'learning', 'ψ/orphan.md', '[]', 100, 100, 100);
    // No oracle_fts row inserted

    const rows = fetchLiveRows(db);
    expect(rows).toEqual([]);
  });

  test('order is created_at ascending', () => {
    for (const [id, created] of [['B', 200], ['C', 300], ['A', 100]] as const) {
      db.prepare(
        `INSERT INTO oracle_documents
         (id, type, source_file, concepts, created_at, updated_at, indexed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(id, 'learning', `ψ/${id}.md`, '[]', created, created, created);
      db.prepare(`INSERT INTO oracle_fts (id, content, concepts) VALUES (?, ?, ?)`).run(id, `content-${id}`, '');
    }
    const rows = fetchLiveRows(db);
    expect(rows.map((r) => r.id)).toEqual(['A', 'B', 'C']);
  });
});

// ---------------------------------------------------------------------------
// runBackfill (mock VectorStoreAdapter)
// ---------------------------------------------------------------------------

class FakeVectorStore implements VectorStoreAdapter {
  readonly name = 'fake';
  readonly upsertedBatches: VectorDocument[][] = [];
  failNextBatches: Set<number>; // 1-based batch indices to fail

  constructor(failOnBatches: number[] = []) {
    this.failNextBatches = new Set(failOnBatches);
  }

  async connect(): Promise<void> {}
  async close(): Promise<void> {}
  async ensureCollection(): Promise<void> {}
  async deleteCollection(): Promise<void> {}
  async addDocuments(docs: VectorDocument[]): Promise<void> {
    const nextIdx = this.upsertedBatches.length + 1;
    if (this.failNextBatches.has(nextIdx)) {
      this.upsertedBatches.push([]); // placeholder to maintain batch index
      throw new Error(`simulated-batch-${nextIdx}-failure`);
    }
    this.upsertedBatches.push(docs);
  }
  async query(): Promise<VectorQueryResult> {
    return { ids: [], documents: [], distances: [], metadatas: [] };
  }
  async queryById(): Promise<VectorQueryResult> {
    return { ids: [], documents: [], distances: [], metadatas: [] };
  }
  async getStats(): Promise<{ count: number }> {
    return { count: 0 };
  }
  async getCollectionInfo(): Promise<{ count: number; name: string }> {
    return { count: 0, name: this.name };
  }
}

function silentLogger() {
  return { info: (_m: string) => {}, error: (_m: string) => {}, warn: (_m: string) => {} };
}

function spyLogger() {
  const calls = { info: [] as string[], error: [] as string[], warn: [] as string[] };
  return {
    logger: {
      info: (m: string) => calls.info.push(m),
      error: (m: string) => calls.error.push(m),
      warn: (m: string) => calls.warn.push(m),
    },
    calls,
  };
}

const OPTS: BackfillOptions = { dryRun: false, batchSize: 2, model: 'bge-m3' };

describe('runBackfill', () => {
  test('upserts all rows in batches of batch-size', async () => {
    const rows: BackfillRow[] = [1, 2, 3, 4, 5].map((i) => makeRow(String(i)));
    const store = new FakeVectorStore();

    const result = await runBackfill(rows, store, OPTS, silentLogger());

    expect(result.totalRows).toBe(5);
    expect(result.upserted).toBe(5);
    expect(result.failed).toBe(0);
    expect(result.batchesTotal).toBe(3);
    expect(result.failures).toEqual([]);
    // Batch sizes: 2, 2, 1
    expect(store.upsertedBatches.map((b) => b.length)).toEqual([2, 2, 1]);
  });

  test('failed batch does not abort remaining', async () => {
    const rows: BackfillRow[] = [1, 2, 3, 4].map((i) => makeRow(String(i)));
    const store = new FakeVectorStore([1]); // fail the first batch

    const result = await runBackfill(rows, store, OPTS, silentLogger());

    expect(result.totalRows).toBe(4);
    expect(result.upserted).toBe(2); // batch 2 succeeded (rows 3+4)
    expect(result.failed).toBe(2);
    expect(result.batchesTotal).toBe(2);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]!).toMatchObject({
      batchIndex: 1,
      startOffset: 0,
      size: 2,
      error: 'simulated-batch-1-failure',
    });
  });

  test('empty rows produces zero-result', async () => {
    const store = new FakeVectorStore();
    const result = await runBackfill([], store, OPTS, silentLogger());
    expect(result).toMatchObject({
      totalRows: 0,
      upserted: 0,
      failed: 0,
      batchesTotal: 0,
      failures: [],
    });
  });

  test('durationMs is non-negative', async () => {
    const rows: BackfillRow[] = [makeRow('1')];
    const store = new FakeVectorStore();
    const result = await runBackfill(rows, store, OPTS, silentLogger());
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  test('failed batch logs error via logger (observability contract)', async () => {
    const rows: BackfillRow[] = [makeRow('1'), makeRow('2')];
    const store = new FakeVectorStore([1]);
    const { logger, calls } = spyLogger();
    await runBackfill(rows, store, OPTS, logger);
    expect(calls.error).toHaveLength(1);
    expect(calls.error[0]!).toContain('Batch 1');
    expect(calls.error[0]!).toContain('simulated-batch-1-failure');
  });

  test('successful batch logs info progress (observability contract)', async () => {
    const rows: BackfillRow[] = [makeRow('1'), makeRow('2')];
    const store = new FakeVectorStore();
    const { logger, calls } = spyLogger();
    await runBackfill(rows, store, OPTS, logger);
    expect(calls.info.some((m) => m.includes('Batch 1') && m.includes('upserted'))).toBe(true);
  });

  test('malformed-concepts row flows warning through runBackfill logger', async () => {
    const bad = makeRow('1');
    bad.concepts = '{garbage';
    const store = new FakeVectorStore();
    const { logger, calls } = spyLogger();
    await runBackfill([bad], store, OPTS, logger);
    expect(calls.warn.some((m) => m.includes(bad.id) && m.includes('malformed'))).toBe(true);
  });

  test('result invariant: upserted + failed === totalRows', async () => {
    const rows: BackfillRow[] = [1, 2, 3, 4, 5].map((i) => makeRow(String(i)));
    const store = new FakeVectorStore([1]);
    const result = await runBackfill(rows, store, OPTS, silentLogger());
    expect(result.upserted + result.failed).toBe(result.totalRows);
  });
});

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function makeRow(suffix: string): BackfillRow {
  return {
    id: `L-${suffix}`,
    type: 'learning',
    source_file: `ψ/${suffix}.md`,
    project: null,
    concepts: '[]',
    created_at: 1000,
    updated_at: 1000,
    content: `content-${suffix}`,
  };
}
