---
status: pending
mode: fast-track
runner: bun
issue: 4
---

# Add TTL/Auto-Expire for Ephemeral Learnings

## Summary

Add optional TTL (time-to-live) support to Oracle learnings so ephemeral documents (score-outputs, health reports) auto-expire. Expired docs are auto-superseded (not deleted — "Nothing is Deleted" principle). Includes default TTL by title pattern, a cron-based cleanup script, and filtering expired docs from search/list results.

## User Story

As an AI agent using Oracle memory,
I want ephemeral learnings to auto-expire after a configured TTL,
So that my searches return relevant, up-to-date knowledge without manual cleanup.

## Metadata

- **Type**: ENHANCEMENT
- **Complexity**: MEDIUM
- **Systems**: oracle-v3 (DB schema, learn tool, search tool, list tool, cleanup script)
- **Dependencies**: drizzle-orm, bun:sqlite
- **Task Count**: 5
- **Runner**: bun
- **Type Check**: bun run build
- **Lint**: N/A (no lint script configured)
- **Test**: bun run test:unit
- **Build**: bun run build

## Files to Change

| Action | File | Insert At | Justification |
|--------|------|-----------|---------------|
| UPDATE | `src/db/schema.ts` | After line 21 (supersededReason) | Add expiresAt, ttlDays columns |
| CREATE | `src/db/migrations/0007_add_ttl_fields.sql` | — | Migration for new columns |
| UPDATE | `src/tools/types.ts` | Line 46-50 (OracleLearnInput) | Add ttl optional field |
| UPDATE | `src/tools/learn.ts` | Lines 22-50 (learnToolDef), 105-182 (handler) | Add ttl param, compute expiresAt, default TTL by pattern |
| UPDATE | `src/tools/search.ts` | Lines 337-355 (FTS queries) | Filter out expired docs in WHERE clause |
| UPDATE | `src/tools/list.ts` | Lines 53-77 (list queries) | Filter out expired docs, add count of expired |
| CREATE | `scripts/expire-learnings.ts` | — | Cron script to mark expired docs |
| CREATE | `src/tools/__tests__/ttl.test.ts` | — | Unit tests for TTL logic |

## Integration Points

| New Code | Connects To | Details |
|----------|-------------|---------|
| `expiresAt` column in schema | `learn.ts:171-182` DB insert | Compute expiresAt from ttlDays on insert |
| `defaultTtlDays()` function | `learn.ts:104` handleLearn | Auto-assign TTL based on title pattern prefix |
| WHERE filter `d.expires_at IS NULL OR d.expires_at > ?` | `search.ts:337-355` FTS queries | Exclude expired from search results |
| WHERE filter | `list.ts:59-73` list queries | Exclude expired from list results |
| `scripts/expire-learnings.ts` | `supersede.ts:35-77` handleSupersede logic | Reuse supersede pattern to mark expired docs |

## NOT Building

- On-read lazy expiry (adds latency to every search — cron-based is simpler)
- On-write piggyback cleanup (too aggressive, may supersede docs that shouldn't be)
- ChromaDB/vector store cleanup (separate concern — expired docs just get low relevance)
- Frontend UI for TTL management

## Tasks

### Task 1: Add TTL columns to schema + migration

**ACTION**: UPDATE `src/db/schema.ts`, CREATE migration file
**IMPLEMENT**:
- Add to `oracleDocuments` table after `supersededReason`:
  ```typescript
  expiresAt: integer('expires_at'),    // Unix timestamp (ms) when doc auto-expires
  ttlDays: integer('ttl_days'),        // TTL in days (for reference/display)
  ```
- Add index: `index('idx_expires').on(table.expiresAt)` to the table indexes array
- Create `src/db/migrations/0007_add_ttl_fields.sql`:
  ```sql
  ALTER TABLE `oracle_documents` ADD `expires_at` integer;
  ALTER TABLE `oracle_documents` ADD `ttl_days` integer;
  CREATE INDEX `idx_expires` ON `oracle_documents` (`expires_at`);
  ```
- Update `src/db/migrations/meta/_journal.json` to include the new migration entry
**MIRROR**: `src/db/migrations/0001_chunky_dark_phoenix.sql` (supersede fields migration pattern)
**GOTCHA**: Drizzle migrations use `_journal.json` to track applied migrations — must add entry there too. Check existing journal format.
**VALIDATE**: `bun run build`

### Task 2: Add TTL support to arra_learn tool

**ACTION**: UPDATE `src/tools/types.ts`, UPDATE `src/tools/learn.ts`
**IMPLEMENT**:
- Add to `OracleLearnInput` interface:
  ```typescript
  ttl?: string; // e.g. "7d", "14d", "30d" — parsed to days
  ```
- Add to `learnToolDef.inputSchema.properties`:
  ```typescript
  ttl: {
    type: 'string',
    description: 'Optional TTL for auto-expiry (e.g. "7d", "14d", "30d"). Defaults based on title pattern: [score-output]=7d, [infra-health]=7d, [remediation-audit]=14d, [daily-goal]=7d, [goal-carryover]=7d, [retro]=30d, others=no TTL'
  }
  ```
- Create helper function `parseTtl(ttl: string): number | null` — parse "7d" → 7, "14d" → 14
- Create helper function `defaultTtlDays(title: string): number | null` — pattern-match title prefix:
  ```typescript
  const TTL_PATTERNS: [RegExp, number][] = [
    [/^\[score-output\]/i, 7],
    [/^\[infra-health\]/i, 7],
    [/^\[remediation-audit\]/i, 14],
    [/^\[daily-goal\]/i, 7],
    [/^\[goal-carryover\]/i, 7],
    [/^\[retro\]/i, 30],
  ];
  ```
- In `handleLearn`, after line 182, compute and include TTL:
  ```typescript
  const ttlDays = parseTtl(input.ttl) ?? defaultTtlDays(pattern);
  const expiresAt = ttlDays ? now.getTime() + (ttlDays * 86400000) : null;
  ```
- Add `expiresAt` and `ttlDays` to the DB insert values object
- Add `ttl` frontmatter field to the markdown file when TTL is set
- Include TTL info in response JSON
**MIRROR**: `src/tools/learn.ts:171-182` (existing insert pattern)
**GOTCHA**: `now.getTime()` returns milliseconds — keep consistent with existing `createdAt` which also uses ms timestamps
**VALIDATE**: `bun run build && bun run test:unit`

### Task 3: Filter expired docs from search and list

**ACTION**: UPDATE `src/tools/search.ts`, UPDATE `src/tools/list.ts`
**IMPLEMENT**:
- In `search.ts`, add to both FTS query WHERE clauses (lines 341, 351):
  ```sql
  AND (d.expires_at IS NULL OR d.expires_at > ?)
  ```
  Add `Date.now()` to the parameter arrays
- In `list.ts`, add same filter to both list queries (lines 59-66, 66-73):
  ```sql
  WHERE (d.expires_at IS NULL OR d.expires_at > ?)
  ```
  and for type-filtered:
  ```sql
  WHERE d.type = ? AND (d.expires_at IS NULL OR d.expires_at > ?)
  ```
  Add `Date.now()` to parameter arrays
- In `list.ts`, update count queries (lines 53-55) with same filter
- Add expired count to list response metadata:
  ```typescript
  const expiredCount = ctx.sqlite.prepare(
    'SELECT count(*) as cnt FROM oracle_documents WHERE expires_at IS NOT NULL AND expires_at <= ?'
  ).get(Date.now()) as { cnt: number };
  ```
**MIRROR**: `src/tools/search.ts:325-328` (existing projectFilter pattern)
**GOTCHA**: Vector search results come from ChromaDB which doesn't have TTL — filter them post-query using the DB lookup (or accept showing some expired vector results)
**VALIDATE**: `bun run build && bun run test:unit`

### Task 4: Create expire-learnings cleanup script

**ACTION**: CREATE `scripts/expire-learnings.ts`
**IMPLEMENT**:
- Script that:
  1. Opens DB connection (reuse `src/db/index.ts` pattern)
  2. Queries documents where `expires_at IS NOT NULL AND expires_at <= ? AND superseded_by IS NULL`
  3. For each expired doc: update `superseded_by = 'system:auto-expire'`, `superseded_at = Date.now()`, `superseded_reason = 'Auto-expired after {ttl_days} days'`
  4. Log to `supersede_log` table (mirror `src/tools/supersede.ts` pattern)
  5. Print summary: `Expired N documents`
- Add to package.json scripts: `"expire": "bun scripts/expire-learnings.ts"`
- Designed to be called from cron: `0 1 * * * cd ~/repos/memory/arra-oracle-v3 && bun run expire`
**MIRROR**: `src/tools/supersede.ts:35-77` (supersede DB update pattern), `scripts/seed-test-data.ts` (script DB connection pattern)
**GOTCHA**: Don't supersede already-superseded docs (check `superseded_by IS NULL`). Use transaction for batch updates.
**VALIDATE**: `bun run build && bun scripts/expire-learnings.ts`

### Task 5: Add unit tests for TTL logic

**ACTION**: CREATE `src/tools/__tests__/ttl.test.ts`
**IMPLEMENT**:
- Test `parseTtl`:
  - `"7d"` → 7, `"14d"` → 14, `"30d"` → 30
  - `"0d"` → null, `"abc"` → null, `undefined` → null
- Test `defaultTtlDays`:
  - `"[score-output] infra..."` → 7
  - `"[infra-health] disk..."` → 7
  - `"[remediation-audit] ..."` → 14
  - `"[daily-goal] P2:..."` → 7
  - `"[goal-carryover] P0:..."` → 7
  - `"[retro] session..."` → 30
  - `"Oracle v3 ChromaDB..."` → null (no TTL)
  - Case insensitive: `"[SCORE-OUTPUT] ..."` → 7
**MIRROR**: `src/tools/__tests__/learn.test.ts` (bun:test describe/it/expect pattern)
**VALIDATE**: `bun test src/tools/__tests__/ttl.test.ts`

## Validation Commands

| Level | Command | Expected |
|-------|---------|----------|
| Static Analysis | `bun run build` | No type errors |
| Unit Tests | `bun run test:unit` | All pass |
| TTL Tests | `bun test src/tools/__tests__/ttl.test.ts` | All pass |
| Integration | `bun run test:integration:db` | DB tests pass |
| Manual | `bun scripts/expire-learnings.ts` | Script runs, reports 0 expired (clean DB) |

## Confidence Score

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| Patterns | 2/2 | Supersede pattern is well-established, learn tool clearly understood |
| Gotchas | 2/2 | Timestamp format (ms), migration journal, vector post-filter identified |
| Integration | 2/2 | All hook points mapped with file:line |
| Validation | 2/2 | Type check, unit tests, integration tests available |
| Testing | 1/2 | Pure function tests easy, integration test for search filtering needs DB setup |

**Total: 9/10**

## Acceptance Criteria

- [ ] `arra_learn` accepts optional `ttl` parameter (e.g. `"7d"`)
- [ ] Default TTL applied based on title pattern (score-output=7d, infra-health=7d, etc.)
- [ ] Learnings without TTL remain permanent
- [ ] `arra_search` excludes expired documents from results
- [ ] `arra_list` excludes expired documents from results
- [ ] Cleanup script marks expired docs as superseded (not deleted)
- [ ] `bun run build` passes with no type errors
- [ ] Unit tests cover parseTtl and defaultTtlDays functions
- [ ] Unit tests cover >= 90% of new code
