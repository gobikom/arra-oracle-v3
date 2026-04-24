#!/usr/bin/env bun
/**
 * Backfill missing vector store entries from sqlite (Issue #29).
 *
 * Fixes sqlite↔vector drift caused by `storage.ts` dual-write with swallowed
 * vector failures. Re-upserts all non-superseded documents from sqlite into
 * the configured vector store for the given embedding model.
 *
 * Usage:
 *   bun scripts/backfill-vector.ts
 *   bun scripts/backfill-vector.ts --dry-run
 *   bun scripts/backfill-vector.ts --batch-size=50 --model=bge-m3
 *
 * Exit codes:
 *   0  success (no failures, or dry-run completed)
 *   1  any batch failed — see stderr for offsets to retry
 *   2  usage error (bad flag value)
 *
 * Invoked by `oracle-cli vault reindex-vector` (src/cli/commands/vault.ts).
 */

import { createDatabase } from '../src/db/index.ts';
import { ensureVectorStoreConnected } from '../src/vector/factory.ts';
import {
  parseArgs,
  fetchLiveRows,
  summarizeByType,
  runBackfill,
  type BackfillOptions,
} from '../src/indexer/backfill.ts';

const parsed = parseArgs(process.argv.slice(2));
if ('code' in parsed) {
  console.error(`FATAL: ${parsed.message}`);
  process.exit(parsed.code);
}
const opts: BackfillOptions = parsed;

console.log(
  `[backfill] Starting — model=${opts.model} batch-size=${opts.batchSize} ` +
    `dry-run=${opts.dryRun}`,
);

// Open sqlite
let sqlite: ReturnType<typeof createDatabase>['sqlite'];
try {
  sqlite = createDatabase().sqlite;
} catch (err) {
  console.error(
    `FATAL: Cannot open sqlite database: ${err instanceof Error ? err.message : String(err)}`,
  );
  process.exit(1);
}

// Fetch rows (sqlite join against FTS — no I/O beyond sqlite here)
let rows: ReturnType<typeof fetchLiveRows>;
try {
  rows = fetchLiveRows(sqlite);
} catch (err) {
  console.error(
    `FATAL: sqlite query failed: ${err instanceof Error ? err.message : String(err)}`,
  );
  process.exit(1);
}

// Orphan-doc count: rows visible to oracle_documents but missing from the
// oracle_fts INNER JOIN. Silent exclusion would hide partial sync failures
// upstream — surface the gap so the operator can investigate (per c7b252fc).
let orphanCount = 0;
try {
  const totalLive = (
    sqlite.prepare(
      `SELECT COUNT(*) AS n FROM oracle_documents WHERE superseded_by IS NULL`,
    ).get() as { n: number }
  ).n;
  orphanCount = totalLive - rows.length;
} catch (err) {
  console.warn(
    `[backfill] orphan-count query failed (non-fatal): ${
      err instanceof Error ? err.message : String(err)
    }`,
  );
}

console.log(`[backfill] Found ${rows.length} live document(s) in sqlite`);
if (orphanCount > 0) {
  console.warn(
    `[backfill] WARNING: ${orphanCount} live doc(s) excluded from backfill — ` +
      `oracle_documents has entries without matching oracle_fts content rows. ` +
      `These cannot be re-embedded without content; investigate upstream sync.`,
  );
}

if (rows.length === 0) {
  console.log('[backfill] Nothing to upsert.');
  process.exit(0);
}

if (opts.dryRun) {
  console.log('[backfill] Dry-run — breakdown by type:');
  for (const { type, count } of summarizeByType(rows)) {
    console.log(`  ${type.padEnd(20)} ${count}`);
  }
  console.log(
    '[backfill] Dry-run complete — no vector store writes. ' +
      'NOTE: vector store connectivity is NOT verified under --dry-run; ' +
      'a misconfigured QDRANT_URL / API_KEY / model only surfaces at real-run time.',
  );
  process.exit(0);
}

// Connect vector store
let vectorStore;
try {
  vectorStore = await ensureVectorStoreConnected(opts.model);
} catch (err) {
  console.error(
    `FATAL: Cannot connect to vector store (model=${opts.model}): ${
      err instanceof Error ? err.message : String(err)
    }`,
  );
  process.exit(1);
}

// Run backfill
const result = await runBackfill(rows, vectorStore, opts);

// Invariant assertion: every row accounted for. If a future refactor
// introduces a "skip" path, this surfaces immediately rather than silently
// reporting upserted=0 + failed=0 as a successful no-op.
if (result.upserted + result.failed !== result.totalRows) {
  console.error(
    `[backfill] INVARIANT VIOLATION: upserted(${result.upserted}) + ` +
      `failed(${result.failed}) != totalRows(${result.totalRows}). ` +
      'Some rows were silently skipped — investigate runBackfill logic.',
  );
  process.exit(1);
}

console.log(
  `[backfill] Done — ${result.upserted} upserted, ${result.failed} failed ` +
    `across ${result.batchesTotal} batch(es) in ${result.durationMs}ms`,
);

if (result.failed > 0) {
  console.error('[backfill] Failed batch details:');
  for (const f of result.failures) {
    console.error(
      `  batch ${f.batchIndex} (offset ${f.startOffset}, ${f.size} docs): ${f.error}`,
    );
  }
  process.exit(1);
}

process.exit(0);
