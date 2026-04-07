/**
 * Backfill TTL for existing oracle_documents rows
 *
 * Sets ttl_days and expires_at on rows whose IDs match known TTL patterns
 * but currently have NULL values (created before TTL feature was added).
 *
 * Usage: bun src/scripts/backfill-ttl.ts [--dry-run]
 */

import { createDatabase } from '../db/index.ts';
import { defaultTtlDays } from '../tools/learn.ts';

const dryRun = process.argv.includes('--dry-run');
const { sqlite } = createDatabase();

// Fetch all rows missing TTL
const rows = sqlite.prepare(`
  SELECT id, source_file, created_at
  FROM oracle_documents
  WHERE ttl_days IS NULL AND expires_at IS NULL AND superseded_by IS NULL
`).all() as { id: string; source_file: string; created_at: number }[];

console.log(`Found ${rows.length} rows without TTL`);

let updated = 0;
let skipped = 0;

const updateStmt = sqlite.prepare(`
  UPDATE oracle_documents
  SET ttl_days = ?, expires_at = ?
  WHERE id = ?
`);

sqlite.exec('BEGIN');
try {
  for (const row of rows) {
    // Extract title-like text from ID (learning_YYYY-MM-DD_slug)
    const slugPart = row.id.replace(/^learning_\d{4}-\d{2}-\d{2}_/, '');
    // Reconstruct approximate title from slug for pattern matching
    const approxTitle = slugPart.replace(/-/g, ' ');

    // Also check source_file path for pattern hints
    const combined = `${approxTitle} ${row.source_file}`;

    // Try matching against TTL patterns using the title
    // The patterns check for [score-output], [infra-health], etc. prefixes
    // We need to check the slug which doesn't have brackets, so do manual matching
    let ttlDays: number | null = null;

    if (/^score-output/i.test(slugPart)) ttlDays = 7;
    else if (/^infra-health/i.test(slugPart)) ttlDays = 7;
    else if (/^remediation-audit/i.test(slugPart)) ttlDays = 14;
    else if (/^daily-goal/i.test(slugPart)) ttlDays = 7;
    else if (/^goal-carryover/i.test(slugPart)) ttlDays = 7;
    else if (/^retro/i.test(slugPart)) ttlDays = 30;
    // Also match patterns in the middle of the slug (e.g., "infrastructure-health-check")
    else if (/infrastructure-health/i.test(slugPart)) ttlDays = 7;

    if (ttlDays) {
      const expiresAt = row.created_at + (ttlDays * 86400000);
      if (dryRun) {
        console.log(`  [DRY-RUN] ${row.id} → ttl=${ttlDays}d, expires=${new Date(expiresAt).toISOString().split('T')[0]}`);
      } else {
        updateStmt.run(ttlDays, expiresAt, row.id);
      }
      updated++;
    } else {
      skipped++;
    }
  }
  sqlite.exec('COMMIT');
} catch (e) {
  sqlite.exec('ROLLBACK');
  throw e;
}

console.log(`\nDone${dryRun ? ' (dry-run)' : ''}:`);
console.log(`  Updated: ${updated}`);
console.log(`  Skipped (permanent): ${skipped}`);

sqlite.close();
