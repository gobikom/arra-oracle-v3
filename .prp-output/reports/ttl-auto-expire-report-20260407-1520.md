# Implementation Report

**Plan**: `.prp-output/plans/ttl-auto-expire-learnings-20260407-1520.plan.md`
**Source Issue**: #4 (gobikom/arra-oracle-v3)
**Branch**: `feature/ttl-auto-expire-learnings`
**Date**: 2026-04-07
**Status**: COMPLETE

---

## Summary

Added TTL/auto-expire support for ephemeral Oracle learnings. Documents with TTL patterns (score-output, infra-health, etc.) now auto-assign expiry dates. Expired documents are filtered from search and list results. A cleanup script marks expired docs as superseded following the "Nothing is Deleted" principle.

---

## Tasks Completed

| # | Task | File | Status | Notes |
|---|------|------|--------|-------|
| 1 | Add TTL columns to schema + migration | `src/db/schema.ts`, migration | Done | Used drizzle-kit generate |
| 2 | Add TTL support to arra_learn | `src/tools/learn.ts`, `types.ts` | Done | parseTtl + defaultTtlDays helpers |
| 3 | Filter expired docs from search/list | `src/tools/search.ts`, `list.ts` | Done | WHERE clause filter |
| 4 | Create expire-learnings script | `scripts/expire-learnings.ts` | Done | With --dry-run support |
| 5 | Add unit tests | `src/tools/__tests__/ttl.test.ts` | Done | 11 tests, all pass |

---

## Validation Results

| Check | Result | Details |
|-------|--------|---------|
| Type check | Pass (pre-existing errors only) | 4 errors in server-legacy.ts and handlers.ts — same on main |
| Unit tests | Pass | 156 passed, 0 failed |
| TTL tests | Pass | 11 tests, 22 assertions |
| Build | N/A | tsc --noEmit used for type check |

---

## Files Changed

| File | Action | Lines |
|------|--------|-------|
| `src/db/schema.ts` | UPDATE | +3 (TTL columns + index) |
| `src/db/migrations/0007_huge_dormammu.sql` | CREATE | +3 |
| `src/db/migrations/meta/_journal.json` | UPDATE | +8 |
| `src/db/migrations/meta/0007_snapshot.json` | CREATE | (auto-generated) |
| `src/tools/types.ts` | UPDATE | +1 |
| `src/tools/learn.ts` | UPDATE | +35 (TTL helpers + schema/handler changes) |
| `src/tools/search.ts` | UPDATE | +5 (TTL filter) |
| `src/tools/list.ts` | UPDATE | +12 (TTL filter + expired count) |
| `scripts/expire-learnings.ts` | CREATE | +85 |
| `src/tools/__tests__/ttl.test.ts` | CREATE | +65 |
| `src/indexer-preservation.test.ts` | UPDATE | +2 (new columns in test schema) |
| `package.json` | UPDATE | +1 (expire script) |

---

## Deviations from Plan

- Used drizzle-kit generate instead of manual migration (produces snapshot file automatically)
- Removed unwanted `DROP TABLE consult_log` from generated migration
- Fixed indexer-preservation.test.ts raw SQL schema to include new columns

---

## Tests Written

| Test File | Test Cases |
|-----------|------------|
| `src/tools/__tests__/ttl.test.ts` | parseTtl: 3 cases (valid, zero, invalid), defaultTtlDays: 8 cases (all patterns + null + case insensitive) |
