/**
 * Weekly DB integrity check — flag orphaned entries whose source files
 * no longer exist on disk.
 *
 * Runs as cron after backfill-vector.ts. Marks orphans with
 * superseded_by='_verified_orphan' so they're excluded from search
 * results but preserved per "Nothing is Deleted" principle.
 *
 * Usage:
 *   bun scripts/verify-db-integrity.ts          # Flag orphans
 *   bun scripts/verify-db-integrity.ts --dry-run # Report only
 *
 * Fixes: agent-devops#539 RC3 (no periodic DB-disk reconciliation)
 */

import { createDatabase } from '../src/db/index.ts';
import { oracleDocuments } from '../src/db/schema.ts';
import { isNull } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

const dryRun = process.argv.includes('--dry-run');

const REPO_ROOT = process.env.ORACLE_REPO_ROOT
  || path.resolve(import.meta.dir, '..');

let sqlite: ReturnType<typeof createDatabase>['sqlite'];
let db: ReturnType<typeof createDatabase>['db'];
try {
  const result = createDatabase();
  sqlite = result.sqlite;
  db = result.db;
} catch (err) {
  console.error('FATAL: Cannot open database:', err instanceof Error ? err.message : String(err));
  process.exit(1);
}

const allDocs = db.select({
  id: oracleDocuments.id,
  sourceFile: oracleDocuments.sourceFile,
  createdBy: oracleDocuments.createdBy,
})
  .from(oracleDocuments)
  .where(isNull(oracleDocuments.supersededBy))
  .all();

const orphans = allDocs.filter(d =>
  d.sourceFile && !fs.existsSync(path.join(REPO_ROOT, d.sourceFile))
);

const byCreator: Record<string, number> = {};
for (const o of orphans) {
  const key = o.createdBy || 'null';
  byCreator[key] = (byCreator[key] || 0) + 1;
}

console.log(`DB integrity check: ${allDocs.length} active docs, ${orphans.length} orphans`);
console.log(`  By creator: ${Object.entries(byCreator).map(([k, v]) => `${k}=${v}`).join(', ') || 'none'}`);

if (orphans.length === 0) {
  console.log('No orphans found — DB is clean.');
  process.exit(0);
}

if (dryRun) {
  console.log(`[DRY-RUN] Would flag ${orphans.length} orphans. Top 10:`);
  for (const o of orphans.slice(0, 10)) {
    console.log(`  - ${o.id} (${o.createdBy || 'null'}) → ${o.sourceFile}`);
  }
  process.exit(0);
}

const now = Date.now();
const flagStmt = sqlite.prepare(`
  UPDATE oracle_documents
  SET superseded_by = '_verified_orphan',
      superseded_at = ?,
      superseded_reason = ?
  WHERE id = ?
`);

const transaction = sqlite.transaction(() => {
  for (const o of orphans) {
    flagStmt.run(now, `File not found on disk (verify-db-integrity ${new Date().toISOString().split('T')[0]})`, o.id);
  }
});

try {
  transaction();
  console.log(`Flagged ${orphans.length} orphans as superseded_by='_verified_orphan'`);
} catch (err) {
  console.error('FATAL: Transaction failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
}
