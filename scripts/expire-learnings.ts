#!/usr/bin/env bun
/**
 * Expire stale learnings — cron-based cleanup script (Issue #4)
 *
 * Finds documents where expires_at has passed and marks them as superseded.
 * Follows "Nothing is Deleted" principle — documents are superseded, not removed.
 *
 * Usage:
 *   bun scripts/expire-learnings.ts          # Run expiry
 *   bun scripts/expire-learnings.ts --dry-run # Preview without changes
 *
 * Cron: 0 1 * * * cd ~/repos/memory/arra-oracle-v3 && bun run expire
 */

import { createDatabase } from '../src/db/index.ts';

const dryRun = process.argv.includes('--dry-run');

let sqlite: ReturnType<typeof createDatabase>['sqlite'];
try {
  sqlite = createDatabase().sqlite;
} catch (err) {
  console.error('FATAL: Cannot open database:', err instanceof Error ? err.message : String(err));
  process.exit(1);
}

const now = Date.now();

// Find expired documents that haven't been superseded yet
const expired = sqlite.prepare(`
  SELECT id, type, source_file, ttl_days, expires_at, project
  FROM oracle_documents
  WHERE expires_at IS NOT NULL
    AND expires_at <= ?
    AND superseded_by IS NULL
`).all(now) as Array<{
  id: string;
  type: string;
  source_file: string;
  ttl_days: number | null;
  expires_at: number;
  project: string | null;
}>;

if (expired.length === 0) {
  console.log('No expired documents found.');
  process.exit(0);
}

console.log(`Found ${expired.length} expired document(s)${dryRun ? ' (dry-run)' : ''}:`);

if (dryRun) {
  for (const doc of expired) {
    const expiredDate = new Date(doc.expires_at).toISOString().split('T')[0];
    console.log(`  - ${doc.id} (TTL: ${doc.ttl_days}d, expired: ${expiredDate})`);
  }
  process.exit(0);
}

// Prepare statements once outside transaction
const updateDoc = sqlite.prepare(`
  UPDATE oracle_documents
  SET superseded_by = 'system:auto-expire',
      superseded_at = ?,
      superseded_reason = ?
  WHERE id = ?
`);

const insertLog = sqlite.prepare(`
  INSERT INTO supersede_log (old_path, old_id, old_title, old_type, reason, superseded_at, superseded_by, project)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const getFtsContent = sqlite.prepare('SELECT content FROM oracle_fts WHERE id = ?');

// Batch expire in a transaction
const transaction = sqlite.transaction(() => {
  for (const doc of expired) {
    const reason = `Auto-expired after ${doc.ttl_days ?? '?'} days`;

    updateDoc.run(now, reason, doc.id);

    // Get title for audit log
    const ftsRow = getFtsContent.get(doc.id) as { content: string } | null;
    if (!ftsRow) {
      console.error(`  WARNING: FTS row missing for ${doc.id} — audit title will be ID only`);
    }
    const title = ftsRow?.content.split('\n')[0]?.substring(0, 80) ?? doc.id;

    insertLog.run(
      doc.source_file,      // old_path
      doc.id,               // old_id
      title,                // old_title
      doc.type,             // old_type — actual document type from DB
      reason,               // reason
      now,                  // superseded_at
      'system:auto-expire', // superseded_by
      doc.project,          // project
    );

    console.log(`  Expired: ${doc.id} (TTL: ${doc.ttl_days}d)`);
  }
});

try {
  transaction();
} catch (err) {
  console.error('FATAL: Transaction failed:', err instanceof Error ? err.message : String(err));
  console.error('No documents were expired (transaction rolled back).');
  process.exit(1);
}

console.log(`\nDone. Expired ${expired.length} document(s).`);
