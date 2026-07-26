/**
 * Clean up the immortal indexer twins left behind by agent-devops#960.
 *
 * Background: the dedup guard in src/indexer/storage.ts filtered arra_learn
 * ownership on `isNull(supersededBy)`, so a file dropped out of the skip-set the
 * moment its learning was superseded and the next scan re-indexed it. The twin
 * it wrote has expires_at NULL and superseded_by NULL — it never expires, is
 * never marked superseded, and outranks the real entry in search. The guard is
 * fixed; this removes what it already produced.
 *
 * SAFETY
 *   - Dry-run by default. `--apply` is required to write anything.
 *   - Only deletes rows where created_by='indexer' AND the SAME source_file also
 *     has an arra_learn row. A file the indexer legitimately owns alone is never
 *     touched — that is the 442-file multi-chunk retro population.
 *   - Never deletes an arra_learn row, under any flag.
 *   - Takes a backup copy of the DB before applying, and refuses to run without
 *     one. Recovery is a file copy, not a restore procedure.
 *   - Deletes the matching oracle_fts rows in the same transaction so the
 *     keyword index cannot outlive its document.
 *
 * Vector store is NOT touched. Qdrant points for the deleted ids remain and must
 * be cleaned separately (or left to be overwritten on next re-embed) — deleting
 * SQLite rows already removes them from every read path, since search joins
 * back to oracle_documents.
 *
 * Usage:
 *   bun src/scripts/dedup-indexer-twins.ts            # report only
 *   bun src/scripts/dedup-indexer-twins.ts --apply    # delete, after backup
 */

import { Database } from 'bun:sqlite';
import fs from 'fs';
import { DB_PATH } from '../config.ts';

const APPLY = process.argv.includes('--apply');

// A twin is an indexer row on a source_file that arra_learn also owns.
const TWIN_PREDICATE = `
  d.created_by = 'indexer'
  AND EXISTS (
    SELECT 1 FROM oracle_documents a
    WHERE a.source_file = d.source_file
      AND a.created_by = 'arra_learn'
  )
`;

function main(): void {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`FATAL: database not found at ${DB_PATH}`);
    process.exit(1);
  }

  const db = new Database(DB_PATH, { readonly: !APPLY });

  const [{ twins }] = db
    .query(`SELECT COUNT(*) AS twins FROM oracle_documents d WHERE ${TWIN_PREDICATE}`)
    .all() as { twins: number }[];

  const [{ files }] = db
    .query(`SELECT COUNT(DISTINCT d.source_file) AS files FROM oracle_documents d WHERE ${TWIN_PREDICATE}`)
    .all() as { files: number }[];

  const [{ soloIndexer }] = db
    .query(`
      SELECT COUNT(*) AS soloIndexer FROM oracle_documents d
      WHERE d.created_by = 'indexer' AND NOT (${TWIN_PREDICATE})
    `)
    .all() as { soloIndexer: number }[];

  const [{ total }] = db
    .query('SELECT COUNT(*) AS total FROM oracle_documents')
    .all() as { total: number }[];

  console.log(`database          : ${DB_PATH}`);
  console.log(`rows total        : ${total}`);
  console.log(`indexer twins     : ${twins}  (across ${files} files) <- to delete`);
  console.log(`indexer solo rows : ${soloIndexer}  <- PRESERVED (no arra_learn pair)`);

  if (twins === 0) {
    console.log('\nNothing to do.');
    db.close();
    return;
  }

  console.log('\nsample of what would be deleted:');
  const sample = db
    .query(`SELECT d.id, d.source_file FROM oracle_documents d WHERE ${TWIN_PREDICATE} LIMIT 5`)
    .all() as { id: string; source_file: string }[];
  for (const r of sample) console.log(`  ${r.id}`);

  if (!APPLY) {
    console.log(`\nDRY RUN — nothing written. Re-run with --apply to delete ${twins} rows.`);
    db.close();
    return;
  }

  // Backup first. Without this, a bad predicate is unrecoverable.
  const backup = `${DB_PATH}.pre-dedup-960`;
  if (fs.existsSync(backup)) {
    console.error(`FATAL: ${backup} already exists — refusing to overwrite a prior backup.`);
    console.error('Move or delete it once you are satisfied the previous run was correct.');
    db.close();
    process.exit(1);
  }
  fs.copyFileSync(DB_PATH, backup);
  if (!fs.existsSync(backup) || fs.statSync(backup).size !== fs.statSync(DB_PATH).size) {
    console.error('FATAL: backup verification failed — aborting without deleting anything.');
    db.close();
    process.exit(1);
  }
  console.log(`\nbackup written    : ${backup}`);

  db.exec('BEGIN');
  try {
    // FTS first: it keys off id, so it must go while the documents rows are
    // still there to identify them.
    db.run(`
      DELETE FROM oracle_fts WHERE id IN (
        SELECT d.id FROM oracle_documents d WHERE ${TWIN_PREDICATE}
      )
    `);
    db.run(`DELETE FROM oracle_documents WHERE id IN (
      SELECT d.id FROM oracle_documents d WHERE ${TWIN_PREDICATE}
    )`);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    console.error('FATAL: delete failed, rolled back. Database unchanged.');
    console.error(err);
    db.close();
    process.exit(1);
  }

  const [{ remaining }] = db
    .query(`SELECT COUNT(*) AS remaining FROM oracle_documents d WHERE ${TWIN_PREDICATE}`)
    .all() as { remaining: number }[];
  const [{ after }] = db
    .query('SELECT COUNT(*) AS after FROM oracle_documents')
    .all() as { after: number }[];

  console.log(`\ndeleted           : ${total - after} rows`);
  console.log(`twins remaining   : ${remaining}  (expected 0)`);

  if (remaining !== 0) {
    console.error('WARNING: twins remain after the delete — investigate before re-running.');
    db.close();
    process.exit(1);
  }

  const [{ soloAfter }] = db
    .query(`
      SELECT COUNT(*) AS soloAfter FROM oracle_documents d
      WHERE d.created_by = 'indexer' AND NOT (${TWIN_PREDICATE})
    `)
    .all() as { soloAfter: number }[];

  if (soloAfter !== soloIndexer) {
    console.error(
      `WARNING: solo indexer rows changed ${soloIndexer} -> ${soloAfter}. ` +
      `They should have been untouched. Restore from ${backup} and investigate.`
    );
    db.close();
    process.exit(1);
  }
  console.log(`solo rows intact  : ${soloAfter} (unchanged)`);
  console.log('\nDone. Restore with: cp ' + backup + ' ' + DB_PATH);

  db.close();
}

main();
