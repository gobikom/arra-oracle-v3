/**
 * Document storage: SQLite + vector store batching
 */

import { Database } from 'bun:sqlite';
import { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import { eq, and, isNull } from 'drizzle-orm';
import * as schema from '../db/schema.ts';
import { oracleDocuments } from '../db/schema.ts';
import type { VectorStoreAdapter } from '../vector/types.ts';
import type { OracleDocument } from '../types.ts';

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
): Promise<void> {
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

  // Build set of source_files already owned by arra_learn — skip re-indexing
  // those to avoid duplicate entries with different IDs (agent-devops#539 RC2).
  const arralLearnFiles = new Set(
    db.select({ sourceFile: oracleDocuments.sourceFile })
      .from(oracleDocuments)
      .where(and(
        eq(oracleDocuments.createdBy, 'arra_learn'),
        isNull(oracleDocuments.supersededBy),
      ))
      .all()
      .map(r => r.sourceFile)
  );
  let skippedArraLearn = 0;

  // Wrap SQLite inserts in a transaction for performance + atomicity
  sqlite.exec('BEGIN');
  try {
    for (const doc of documents) {
      // Skip files already indexed by arra_learn — they have authoritative
      // entries with richer metadata (project, concepts, TTL) than the indexer
      // would produce. Re-indexing creates duplicates with _0 suffix IDs.
      if (arralLearnFiles.has(doc.source_file)) {
        skippedArraLearn++;
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

      // Vector store metadata (must be primitives, not arrays)
      ids.push(doc.id);
      contents.push(doc.content);
      metadatas.push({
        type: doc.type,
        source_file: doc.source_file,
        concepts: doc.concepts.join(',')
      });
    }
    sqlite.exec('COMMIT');
  } catch (e) {
    sqlite.exec('ROLLBACK');
    throw e;
  }

  if (skippedArraLearn > 0) {
    console.log(`Skipped ${skippedArraLearn} docs already owned by arra_learn`);
  }

  // Batch insert to vector store in chunks of 100 (skip if no client)
  if (!vectorClient) {
    console.log('Skipping vector indexing (SQLite-only mode)');
    return;
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
}
