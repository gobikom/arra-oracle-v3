/**
 * Document storage: SQLite + vector store batching
 */

import { Database } from 'bun:sqlite';
import { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.ts';
import { oracleDocuments } from '../db/schema.ts';
import type { VectorStoreAdapter } from '../vector/types.ts';
import type { OracleDocument } from '../types.ts';

/**
 * Files whose canonical entry belongs to arra_learn, and which the indexer must
 * therefore never re-index (agent-devops#539 RC2, #960).
 *
 * Ownership is a property of the FILE, not of the row's lifecycle state. Once
 * arra_learn has written a source_file, that file has an authoritative entry
 * forever; superseding it does not hand the file back to the indexer.
 *
 * This is exported so the regression test can exercise the real query rather
 * than a re-implementation of it — a test that rebuilds the WHERE clause locally
 * passes no matter what this file does.
 */
export function selectArraLearnOwnedFiles(
  db: BunSQLiteDatabase<typeof schema>
): Set<string> {
  return new Set(
    db.select({ sourceFile: oracleDocuments.sourceFile })
      .from(oracleDocuments)
      // NOTE: deliberately NOT filtered on supersededBy — see #960. Adding
      // `isNull(oracleDocuments.supersededBy)` here drops a file out of the set
      // the moment its learning is superseded, so the next scan re-indexes it
      // into a twin with expires_at NULL and superseded_by NULL: never expires,
      // never marked superseded, fully live in search. Because
      // LEARN-AND-SUPERSEDE runs on every score, the better the supersede
      // hygiene the more immortal duplicates were produced — superseding an
      // entry was what resurrected it.
      //
      // Measured before the fix: of the 738 indexer rows written after the
      // original guard shipped (2d63f1f, 2026-06-12), 730 landed on files that
      // ended up duplicated. Of the 296 that had an arra_learn pair, 296 were
      // superseded and 0 were not.
      .where(eq(oracleDocuments.createdBy, 'arra_learn'))
      .all()
      .map(r => r.sourceFile)
  );
}

/**
 * What a store pass actually did. Returned rather than only logged so callers
 * can record it — `skippedArraLearn` is the observability the original #960 bug
 * lacked: a guard that silently stopped skipping looked identical from outside
 * to one that was working, for six weeks.
 */
export interface StoreResult {
  /** Documents written by this pass. Excludes skipped ones. */
  indexed: number;
  /** Documents left alone because arra_learn owns their source_file. */
  skippedArraLearn: number;
  /** arra_learn-owned documents refreshed in place (content updated, ID preserved). */
  refreshedArraLearn: number;
}

/**
 * Store documents in SQLite + vector store
 * Uses Drizzle for type-safe inserts and sets createdBy: 'indexer'
 */
export async function storeDocuments(
  sqlite: Database,
  db: BunSQLiteDatabase<typeof schema>,
  vectorClient: VectorStoreAdapter | null,
  project: string | null,
  documents: OracleDocument[]
): Promise<StoreResult> {
  const now = Date.now();

  // Prepare FTS statement (raw SQL required for FTS5)
  const insertFts = sqlite.prepare(`
    INSERT OR REPLACE INTO oracle_fts (id, content, concepts)
    VALUES (?, ?, ?)
  `);

  // Prepare for vector store
  const ids: string[] = [];
  const contents: string[] = [];
  const metadatas: any[] = [];

  // Files owned by arra_learn — never INSERT new rows for these (#539 RC2, #960),
  // but DO update existing rows when content drifts (#1012).
  const arralLearnFiles = selectArraLearnOwnedFiles(db);
  let skippedArraLearn = 0;
  let refreshedArraLearn = 0;

  // Wrap SQLite inserts in a transaction for performance + atomicity
  sqlite.exec('BEGIN');
  try {
    for (const doc of documents) {
      // arra_learn-owned files: update the canonical row in place instead of
      // creating a duplicate. Preserves the canonical ID, createdBy, project,
      // and supersede state while refreshing content (#1012).
      if (arralLearnFiles.has(doc.source_file)) {
        const canonical = db.select({ id: oracleDocuments.id })
          .from(oracleDocuments)
          .where(and(
            eq(oracleDocuments.sourceFile, doc.source_file),
            eq(oracleDocuments.createdBy, 'arra_learn'),
          ))
          .get();

        if (!canonical) {
          skippedArraLearn++;
          continue;
        }

        db.update(oracleDocuments)
          .set({
            concepts: JSON.stringify(doc.concepts),
            updatedAt: doc.updated_at,
            indexedAt: now,
          })
          .where(eq(oracleDocuments.id, canonical.id))
          .run();

        insertFts.run(canonical.id, doc.content, doc.concepts.join(' '));

        const vectorContent = doc.content && doc.content.trim();
        if (vectorContent) {
          ids.push(canonical.id);
          contents.push(doc.content);
          metadatas.push({
            type: doc.type,
            source_file: doc.source_file,
            concepts: doc.concepts.join(',')
          });
        }

        refreshedArraLearn++;
        continue;
      }

      // SQLite metadata - use doc.project if available, fall back to repo project
      const docProject = (doc.project || project)?.toLowerCase();

      // Drizzle upsert with createdBy: 'indexer'
      db.insert(oracleDocuments)
        .values({
          id: doc.id,
          type: doc.type,
          sourceFile: doc.source_file,
          concepts: JSON.stringify(doc.concepts),
          createdAt: doc.created_at,
          updatedAt: doc.updated_at,
          indexedAt: now,
          project: docProject,
          createdBy: 'indexer',
        })
        .onConflictDoUpdate({
          target: oracleDocuments.id,
          set: {
            type: doc.type,
            sourceFile: doc.source_file,
            concepts: JSON.stringify(doc.concepts),
            updatedAt: doc.updated_at,
            indexedAt: now,
            project: docProject,
          }
        })
        .run();

      // SQLite FTS (raw SQL required for FTS5)
      insertFts.run(
        doc.id,
        doc.content,
        doc.concepts.join(' ')
      );

      // Vector store metadata (must be primitives, not arrays).
      // Skip empty/whitespace content from the vector batch — OpenAI's
      // embedding API rejects empty strings ("input cannot be an empty
      // string") and aborts the whole 100-doc batch, causing permanent
      // sqlite<->vector drift. The doc still lands in SQLite/FTS (above),
      // so it remains searchable by keyword; it just has no vector.
      // (agent-devops task at-90a5c857bff4)
      const vectorContent = doc.content && doc.content.trim();
      if (vectorContent) {
        ids.push(doc.id);
        contents.push(doc.content);
        metadatas.push({
          type: doc.type,
          source_file: doc.source_file,
          concepts: doc.concepts.join(',')
        });
      } else {
        console.warn(`[indexer] Skipping vector embedding (empty content): ${doc.source_file}`);
      }
    }
    sqlite.exec('COMMIT');
  } catch (e) {
    sqlite.exec('ROLLBACK');
    throw e;
  }

  if (refreshedArraLearn > 0) {
    console.log(`Refreshed ${refreshedArraLearn} arra_learn-owned docs in place`);
  }
  if (skippedArraLearn > 0) {
    console.log(`Skipped ${skippedArraLearn} arra_learn-owned docs (canonical row not found)`);
  }

  // Batch insert to vector store in chunks of 100 (skip if no client)
  if (!vectorClient) {
    console.log('Skipping vector indexing (SQLite-only mode)');
    return { indexed: documents.length - skippedArraLearn - refreshedArraLearn, skippedArraLearn, refreshedArraLearn };
  }

  const BATCH_SIZE = 100;
  const MAX_RETRIES = 3;
  const RETRY_BASE_MS = 500;
  let vectorSuccess = true;
  const failedBatches: { batchIndex: number; docIds: string[]; error: string }[] = [];

  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batchIndex = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(ids.length / BATCH_SIZE);
    const batchIds = ids.slice(i, i + BATCH_SIZE);
    const batchContents = contents.slice(i, i + BATCH_SIZE);
    const batchMetadatas = metadatas.slice(i, i + BATCH_SIZE);

    const vectorDocs = batchIds.map((id, idx) => ({
      id,
      document: batchContents[idx],
      metadata: batchMetadatas[idx]
    }));

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await vectorClient.addDocuments(vectorDocs);
        console.log(`Vector batch ${batchIndex}/${totalBatches} stored`);
        break;
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        if (attempt < MAX_RETRIES) {
          const delayMs = RETRY_BASE_MS * Math.pow(2, attempt - 1);
          console.warn(`Vector batch ${batchIndex}/${totalBatches} failed (attempt ${attempt}/${MAX_RETRIES}): ${errMsg} — retrying in ${delayMs}ms`);
          await new Promise(r => setTimeout(r, delayMs));
        } else {
          console.error(`Vector batch ${batchIndex}/${totalBatches} FAILED after ${MAX_RETRIES} attempts: ${errMsg} [${batchIds.length} docs: ${batchIds[0]}..${batchIds[batchIds.length - 1]}]`);
          failedBatches.push({ batchIndex, docIds: batchIds, error: errMsg });
          vectorSuccess = false;
        }
      }
    }
  }

  if (failedBatches.length > 0) {
    console.error(`Vector drift: ${failedBatches.reduce((n, b) => n + b.docIds.length, 0)} docs in SQLite but NOT in ${vectorClient.name}. Weekly backfill cron will catch up, or run: bun scripts/backfill-vector.ts`);
  }
  console.log(`Stored in SQLite${vectorSuccess ? ` + ${vectorClient.name}` : ` (${vectorClient.name} failed — ${failedBatches.length} batch(es))`}`);
  return { indexed: documents.length - skippedArraLearn - refreshedArraLearn, skippedArraLearn, refreshedArraLearn };
}
