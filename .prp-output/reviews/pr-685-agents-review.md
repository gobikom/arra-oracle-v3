---
pr: 685
title: "feat: add TTL/auto-expire for ephemeral learnings"
reviewed: 2026-04-07T15:35:00Z
verdict: NEEDS FIXES
agents: [code-reviewer, security-reviewer, silent-failure-hunter]
---

## PR Review Summary (Multi-Agent)

### Agents Dispatched
| Agent | Status | Findings |
|-------|--------|----------|
| code-reviewer | Completed | 4 issues |
| security-reviewer | Completed | 3 issues (1 pre-existing) |
| silent-failure-hunter | Completed | 10 issues (5 pre-existing) |

---

### Critical Issues (1 found)

| Agent | Issue | Location | Suggestion |
|-------|-------|----------|------------|
| code-reviewer, silent-failure-hunter | `defaultTtlDays(pattern)` called with full multi-line pattern instead of extracted `title`. The `^` regex anchor matches start of entire string, not first line. Should use `title` (first line, 80 chars). | `src/tools/learn.ts:184` | Change to `defaultTtlDays(title)` |

### Important Issues (4 found)

| Agent | Issue | Location | Suggestion |
|-------|-------|----------|------------|
| code-reviewer | `expire-learnings.ts` hardcodes `old_type = 'learning'` in supersede_log insert. Should use actual document type from query. | `scripts/expire-learnings.ts:79` | Add `type` to SELECT query, use `doc.type` in insertLog |
| silent-failure-hunter | `createDatabase()` called at module top-level with zero error handling. Cron failure shows raw stack trace. | `scripts/expire-learnings.ts:15-19` | Wrap in try/catch with `console.error('FATAL: ...')` and `process.exit(1)` |
| silent-failure-hunter | `transaction()` called bare — failure gives raw stack trace with no per-document context. | `scripts/expire-learnings.ts:90` | Wrap in try/catch, log which operation failed, exit(1) |
| security-reviewer | No upper bound on TTL — `parseTtl("999999d")` is accepted. Defeats purpose of ephemeral TTL. | `src/tools/learn.ts:30-36` | Add max TTL cap (e.g. 365 days) |

### Suggestions (3 found)

| Agent | Issue | Location | Suggestion |
|-------|-------|----------|------------|
| code-reviewer | Vector search results NOT filtered by TTL — expired docs can surface via semantic search. | `src/tools/search.ts:366-378` | Post-filter combined results against DB expires_at |
| code-reviewer | `sqlite.prepare()` called inside transaction loop — should be pre-compiled outside like other statements. | `scripts/expire-learnings.ts:72` | Move prepare outside the transaction |
| silent-failure-hunter | FTS title lookup silently falls back to raw ID when FTS row is missing. | `scripts/expire-learnings.ts:72-73` | Add warning log when ftsRow is null |

### Pre-existing Issues (not from this PR — noted for future)

- FTS5 MATCH injection via sanitize fallback (search.ts:78-83)
- Frontmatter injection via unescaped `source` field (learn.ts:191)
- Unguarded three-step write sequence in learn handler (file+DB+FTS with no transaction)
- `JSON.parse(row.concepts)` unguarded in search.ts and list.ts
- Vault init failure silently degrades write path

### Strengths

- Clean `parseTtl` with proper guard clauses (rejects "0d", negatives, non-numeric)
- Correct FTS5 TTL filter placement — parameterized queries, both typed/untyped branches handled
- `expire-learnings.ts` uses SQLite transaction for atomic batch updates
- `--dry-run` flag with clean exit for operator safety
- Migration is minimal and non-breaking (nullable columns only)
- "Nothing is Deleted" principle properly followed — supersede, not delete

### Validation Results

| Check | Status | Details |
|-------|--------|---------|
| Type Check | PASS | 4 pre-existing errors (same on main) |
| Tests | PASS | 156 passed, 0 failed |
| Build | PASS | No new errors |

### Verdict

**NEEDS FIXES** — 1 critical (defaultTtlDays argument bug) + 4 important issues. All are straightforward fixes.
