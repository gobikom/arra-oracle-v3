/**
 * Vector store backfill — helpers for issue #29 (sqlite↔vector drift repair).
 *
 * Motivation: `storage.ts` dual-writes sqlite + vector store, but vector
 * failures are logged-and-swallowed (no retry, no queue). Over time this
 * creates permanent drift. This module provides pure helpers used by
 * `scripts/backfill-vector.ts` to re-upsert all non-superseded sqlite docs
 * into the configured vector store.
 *
 * Design:
 *   - No I/O in helpers — caller supplies the sqlite handle and vector
 *     adapter, so tests can inject mocks.
 *   - Full re-upsert (Option C) rather than diff-and-patch: simpler,
 *     idempotent (vector adapters upsert by id), and at current Oracle scale
 *     (~1.3k live docs) the embedding cost is bounded (~$0.60/full-run on
 *     text-embedding-3-small).
 *   - Failures are PER-BATCH: one bad batch doesn't abort the run; operator
 *     sees which batches failed for targeted retry.
 */

import type { Database } from 'bun:sqlite';
import type { VectorDocument, VectorStoreAdapter } from '../vector/types.ts';

export const ALLOWED_MODELS = ['bge-m3', 'nomic', 'qwen3'] as const;
export type EmbeddingModel = (typeof ALLOWED_MODELS)[number];

export interface BackfillOptions {
  dryRun: boolean;
  batchSize: number;
  model: EmbeddingModel;
}

export interface BackfillArgsError {
  code: number;      // exit code (2 for usage errors)
  message: string;   // operator-facing message
}

/**
 * Parse CLI argv into BackfillOptions or return an error shape.
 *
 * Accepts:
 *   --dry-run
 *   --batch-size=N          (positive integer, default 50)
 *   --model=<bge-m3|nomic|qwen3>   (default bge-m3)
 *
 * Unknown flags are ignored (bun/node may pass extras).
 */
export function parseArgs(argv: string[]): BackfillOptions | BackfillArgsError {
  const dryRun = argv.includes('--dry-run');
  const batchArg = argv.find((a) => a.startsWith('--batch-size='));
  const modelArg = argv.find((a) => a.startsWith('--model='));

  let batchSize = 50;
  if (batchArg) {
    const raw = batchArg.split('=')[1];
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed <= 0 || String(parsed) !== raw) {
      return {
        code: 2,
        message: `--batch-size must be a positive integer, got: ${raw}`,
      };
    }
    batchSize = parsed;
  }

  let model: EmbeddingModel = 'bge-m3';
  if (modelArg) {
    const raw = modelArg.split('=')[1] as EmbeddingModel;
    if (!ALLOWED_MODELS.includes(raw)) {
      return {
        code: 2,
        message: `--model must be one of ${ALLOWED_MODELS.join(', ')}; got: ${raw}`,
      };
    }
    model = raw;
  }

  return { dryRun, batchSize, model };
}

export interface BackfillRow {
  id: string;
  type: string;
  source_file: string;
  project: string | null;
  concepts: string;      // JSON-encoded array
  created_at: number;
  updated_at: number;
  content: string;
}

/**
 * Fetch all live (non-superseded) documents from sqlite, joined with their
 * FTS content. Returns rows in created_at ascending order so large runs
 * progress predictably from old → new.
 *
 * The INNER JOIN on oracle_fts excludes any document whose FTS row is
 * missing (should not happen in healthy DB, but if it does those docs
 * cannot be re-embedded without content and are intentionally skipped).
 */
export function fetchLiveRows(sqlite: Database): BackfillRow[] {
  const rows = sqlite
    .prepare(
      `SELECT d.id, d.type, d.source_file, d.project, d.concepts,
              d.created_at, d.updated_at, f.content
       FROM oracle_documents d
       INNER JOIN oracle_fts f ON f.id = d.id
       WHERE d.superseded_by IS NULL
       ORDER BY d.created_at ASC`,
    )
    .all() as BackfillRow[];
  return rows;
}

export interface Logger {
  info: (m: string) => void;
  error: (m: string) => void;
  warn: (m: string) => void;
}

/**
 * Convert a sqlite row into the VectorDocument shape expected by
 * VectorStoreAdapter.addDocuments. Metadata values MUST be primitives (no
 * arrays) — matches the contract set by storage.ts.
 *
 * `concepts` is stored as JSON text in sqlite. Degradation path (log + fall
 * back to empty string) fires when the JSON is malformed OR the parsed
 * value is not an array. Per the c7b252fc philosophy silent failures MUST
 * be detected AND surfaced — the logger makes each degraded row visible
 * so operators can spot data-corruption drift in the report.
 */
export function rowToVectorDoc(row: BackfillRow, logger?: Logger): VectorDocument {
  let conceptsList: string[] = [];
  try {
    const parsed = JSON.parse(row.concepts);
    if (Array.isArray(parsed)) {
      conceptsList = parsed.map((c) => String(c));
    } else if (logger) {
      logger.warn(
        `[backfill] doc ${row.id}: concepts JSON is not an array (type=${typeof parsed}) — ` +
          `degrading to empty concepts metadata`,
      );
    }
  } catch (err) {
    // Malformed JSON — surface via warn so operator can trace data corruption.
    // Do NOT abort the batch for one bad row; continue with empty concepts.
    if (logger) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(
        `[backfill] doc ${row.id}: malformed concepts JSON (${msg}) — ` +
          `degrading to empty concepts metadata`,
      );
    }
  }
  return {
    id: row.id,
    document: row.content,
    metadata: {
      type: row.type,
      source_file: row.source_file,
      project: row.project ?? '',
      concepts: conceptsList.join(','),
      created_at: row.created_at,
      updated_at: row.updated_at,
    },
  };
}

export interface BatchFailure {
  batchIndex: number;    // 1-based, matches the log line
  startOffset: number;   // 0-based row index where the batch began
  size: number;
  error: string;
}

export interface BackfillResult {
  totalRows: number;
  upserted: number;   // count of rows in successful batches (all-or-nothing per batch — see note)
  failed: number;     // count of rows in failed batches
  batchesTotal: number;
  failures: BatchFailure[];
  durationMs: number;
  // Invariant: upserted + failed === totalRows (every row is accounted for
  // in exactly one bucket). Asserted at the top of the CLI's result-handling
  // so a future refactor that introduces a skip path can't silently mask it.
  //
  // Note on per-batch semantics: `upserted` counts as if `addDocuments`
  // succeeds or fails atomically for the whole batch. The Qdrant adapter
  // (production) is atomic per batch. Some adapters (Cloudflare Vectorize)
  // sub-batch internally in groups of 1000; if outer `batchSize > 1000` AND
  // an inner sub-batch throws, `upserted` under-reports actual persisted
  // docs and `failed` over-reports. Default batchSize=50 avoids this.
}

/**
 * Run the backfill end-to-end. Assumes `vectorStore` is already connected.
 * A per-batch failure is logged but does NOT abort — the operator sees the
 * full failure list at the end and can re-run for just those ranges.
 *
 * Returns a structured result for the CLI wrapper to format and exit on.
 */
export async function runBackfill(
  rows: BackfillRow[],
  vectorStore: VectorStoreAdapter,
  opts: BackfillOptions,
  logger: Logger = {
    info: (m) => console.log(m),
    error: (m) => console.error(m),
    warn: (m) => console.warn(m),
  },
): Promise<BackfillResult> {
  const started = Date.now();
  const totalRows = rows.length;
  const batchesTotal = Math.ceil(totalRows / opts.batchSize);
  const failures: BatchFailure[] = [];
  let upserted = 0;
  let failed = 0;

  for (let i = 0; i < totalRows; i += opts.batchSize) {
    const startOffset = i;
    const batchIndex = Math.floor(i / opts.batchSize) + 1;
    const slice = rows.slice(i, i + opts.batchSize);
    // rowToVectorDoc now takes the same logger so malformed-concepts warnings
    // flow through to the operator rather than being silently swallowed.
    const docs = slice.map((r) => rowToVectorDoc(r, logger));
    try {
      await vectorStore.addDocuments(docs);
      upserted += slice.length;
      logger.info(
        `[backfill] Batch ${batchIndex}/${batchesTotal} — ${slice.length} upserted ` +
          `(running total: ${upserted}/${totalRows})`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Preserve stack for postmortem — err.message alone loses critical
      // context (HTTP status, response body, cause chain). Structured
      // BatchFailure still only carries `error: string` since callers serialize
      // it; the stack goes only to the logger.
      const stackLine = err instanceof Error && err.stack ? `\n${err.stack}` : '';
      failed += slice.length;
      failures.push({ batchIndex, startOffset, size: slice.length, error: msg });
      logger.error(
        `[backfill] Batch ${batchIndex}/${batchesTotal} FAILED: ${msg}${stackLine}`,
      );
    }
  }

  return {
    totalRows,
    upserted,
    failed,
    batchesTotal,
    failures,
    durationMs: Date.now() - started,
  };
}

/**
 * Summarize rows by type for the --dry-run output. Pure — returns a sorted
 * array so the CLI can format it identically across runs.
 */
export function summarizeByType(rows: BackfillRow[]): Array<{ type: string; count: number }> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.type, (counts.get(row.type) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
}
