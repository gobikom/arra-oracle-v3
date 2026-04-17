# PR Review Context

**Branch**: `feature/ttl-auto-expire-learnings`
**Generated**: 2026-04-07 15:30
**Source Plan**: `.prp-output/plans/ttl-auto-expire-learnings-20260407-1520.plan.md`

---

## Files Changed

| File | Action | Summary |
|------|--------|---------|
| `src/db/schema.ts` | UPDATE | Add expiresAt, ttlDays columns to oracleDocuments + idx_expires index |
| `src/db/migrations/0007_huge_dormammu.sql` | CREATE | ALTER TABLE migration for new columns |
| `src/db/migrations/meta/_journal.json` | UPDATE | Register migration 0007 |
| `src/db/migrations/meta/0007_snapshot.json` | CREATE | Auto-generated schema snapshot |
| `src/tools/types.ts` | UPDATE | Add ttl field to OracleLearnInput interface |
| `src/tools/learn.ts` | UPDATE | parseTtl/defaultTtlDays helpers, TTL in tool schema + handler + response |
| `src/tools/search.ts` | UPDATE | Filter expired docs from FTS search results |
| `src/tools/list.ts` | UPDATE | Filter expired docs from list, add expired count to response |
| `scripts/expire-learnings.ts` | CREATE | Cron cleanup script with --dry-run, supersedes expired docs |
| `src/tools/__tests__/ttl.test.ts` | CREATE | 11 unit tests for parseTtl and defaultTtlDays |
| `src/indexer-preservation.test.ts` | UPDATE | Add new columns to test schema |
| `package.json` | UPDATE | Add "expire" script |

---

## Implementation Summary

TTL/auto-expire for ephemeral Oracle learnings. Key design decisions:
- Expired docs are auto-superseded, not deleted ("Nothing is Deleted" principle)
- Default TTL assigned by title pattern prefix (e.g. [score-output] = 7d)
- Explicit ttl param overrides default
- Search and list filter out expired docs via SQL WHERE clause
- Cleanup script runs as cron, uses transactions, logs to supersede_log

---

## Validation Status

| Check | Result | Details |
|-------|--------|---------|
| Type check | Pass | 4 pre-existing errors (server-legacy.ts, handlers.ts) — same on main |
| Tests | Pass | 156 passed, 0 failed |
| Build | Pass | No new errors introduced |

---

## Review Focus Areas

- `src/tools/learn.ts` parseTtl/defaultTtlDays — pattern matching correctness
- `src/tools/search.ts` TTL filter SQL — correct placement in WHERE clause with existing filters
- `scripts/expire-learnings.ts` — transaction safety, supersede_log audit trail
- Migration file — removed auto-generated DROP TABLE consult_log (verify this was correct)
