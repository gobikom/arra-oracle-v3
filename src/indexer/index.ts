/**
 * Oracle v2 Indexer
 *
 * Parses markdown files from psi/memory and creates:
 * 1. SQLite index (source of truth for metadata)
 * 2. Chroma vectors (semantic search)
 *
 * Following claude-mem's granular vector pattern:
 * - Split large documents into smaller chunks
 * - Each principle/pattern becomes multiple vectors
 * - Enable concept-based filtering
 */

import fs from 'fs';
import path from 'path';
import { Database } from 'bun:sqlite';
import { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import { eq, or, isNull, inArray } from 'drizzle-orm';
import * as schema from '../db/schema.ts';
import { oracleDocuments } from '../db/schema.ts';
import { createDatabase } from '../db/index.ts';
import { createVectorStore } from '../vector/factory.ts';
import type { VectorStoreAdapter } from '../vector/types.ts';
import { detectProject } from '../server/project-detect.ts';
import type { OracleDocument, IndexerConfig } from '../types.ts';

import { setIndexingStatus } from './status.ts';
import { backupDatabase } from './backup.ts';
import { parseResonanceFile, parseLearningFile, parseRetroFile } from './parser.ts';
import { collectDocuments } from './collectors.ts';
import { storeDocuments } from './storage.ts';

export class OracleIndexer {
  private sqlite: Database;
  private db: BunSQLiteDatabase<typeof schema>;
  private vectorClient: VectorStoreAdapter | null = null;
  private config: IndexerConfig;
  private project: string | null;
  private seenContentHashes: Set<string> = new Set();

  constructor(config: IndexerConfig) {
    this.config = config;
    const { sqlite, db } = createDatabase(config.dbPath);
    this.sqlite = sqlite;
    this.db = db;
    this.project = detectProject(config.repoRoot);
    console.log(`[Indexer] Detected project: ${this.project || '(universal)'}`);
  }

  /**
   * Main indexing workflow
   */
  async index(): Promise<void> {
    console.log('Starting Oracle indexing...');
    this.seenContentHashes.clear();

    setIndexingStatus(this.sqlite, this.config, true, 0, 100);
    backupDatabase(this.sqlite, this.config);

    // Smart deletion: remove ALL docs whose source file no longer exists on disk.
    // Previously only cleaned createdBy='indexer' entries — arra_learn orphans
    // accumulated indefinitely (agent-devops#539).
    const allDocs = this.db.select({
      id: oracleDocuments.id,
      sourceFile: oracleDocuments.sourceFile,
      createdBy: oracleDocuments.createdBy,
    })
      .from(oracleDocuments)
      .all();

    const orphanedDocs = allDocs
      .filter(d => !fs.existsSync(path.join(this.config.repoRoot, d.sourceFile)));
    const indexerOrphans = orphanedDocs.filter(d => d.createdBy !== 'arra_learn');
    const learnOrphans = orphanedDocs.filter(d => d.createdBy === 'arra_learn');
    console.log(`Smart delete: ${orphanedDocs.length} orphaned docs (indexer=${indexerOrphans.length}, arra_learn=${learnOrphans.length})`);

    if (indexerOrphans.length > 0) {
      const indexerIds = indexerOrphans.map(d => d.id);
      const deleteOrphans = this.sqlite.transaction(() => {
        const BATCH_SIZE = 500;
        for (let i = 0; i < indexerIds.length; i += BATCH_SIZE) {
          const batch = indexerIds.slice(i, i + BATCH_SIZE);
          const placeholders = batch.map(() => '?').join(',');
          this.sqlite.prepare(`DELETE FROM oracle_documents WHERE id IN (${placeholders})`).run(...batch);
          this.sqlite.prepare(`DELETE FROM oracle_fts WHERE id IN (${placeholders})`).run(...batch);
        }
      });
      deleteOrphans();
    }

    if (learnOrphans.length > 0) {
      const now = Date.now();
      const supersedeOrphans = this.sqlite.transaction(() => {
        const stmt = this.sqlite.prepare(`
          UPDATE oracle_documents
          SET superseded_by = '_verified_orphan', superseded_at = ?, superseded_reason = ?
          WHERE id = ?
        `);
        for (const doc of learnOrphans) {
          stmt.run(now, 'File not found on disk (indexer smart-delete)', doc.id);
        }
      });
      supersedeOrphans();
    }

    // Initialize vector store
    try {
      // Use factory defaults from env vars (ORACLE_VECTOR_DB, ORACLE_EMBEDDING_PROVIDER)
      this.vectorClient = createVectorStore();
      await this.vectorClient.connect();
      await this.vectorClient.deleteCollection();
      await this.vectorClient.ensureCollection();
      console.log(`Vector store (${this.vectorClient.name}) connected`);
    } catch (e) {
      console.log('Vector store not available, using SQLite-only mode:', e instanceof Error ? e.message : e);
      this.vectorClient = null;
    }

    // Collect documents from all source types
    const shared = { config: this.config, seenContentHashes: this.seenContentHashes };
    const documents: OracleDocument[] = [
      ...collectDocuments({ ...shared, subdir: 'resonance', parseFn: parseResonanceFile, label: 'resonance' }),
      ...collectDocuments({ ...shared, subdir: 'learnings', parseFn: parseLearningFile, label: 'learning' }),
      ...collectDocuments({ ...shared, subdir: 'retrospectives', parseFn: parseRetroFile, label: 'retrospective' }),
    ];

    await storeDocuments(this.sqlite, this.db, this.vectorClient, this.project, documents);

    setIndexingStatus(this.sqlite, this.config, false, documents.length, documents.length);
    console.log(`Indexed ${documents.length} documents`);
    console.log('Indexing complete!');
  }

  /** Close database connections */
  async close(): Promise<void> {
    this.sqlite.close();
    if (this.vectorClient) {
      await this.vectorClient.close();
    }
  }
}
