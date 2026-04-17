---
pr: 715
title: "docs: normalize Oracle family issue intake for #6"
author: "gobikom"
reviewed: "2026-04-12T00:00:00+07:00"
verdict: READY TO MERGE
agents: [code-reviewer, security-reviewer, silent-failure-hunter, pr-test-analyzer, type-design-analyzer, performance-analyzer]
---

# PR Review Summary (Multi-Agent)

## ⚠️ Important Context: Actual vs GitHub-Displayed Diff

`gh pr diff 715` showed 41 files (+5020/-178) because GitHub's comparison base diverged from the current `main` HEAD. The **actual change** introduced by this PR is:

```
git diff main HEAD --name-only
.github/ISSUE_TEMPLATE/oracle-awakening.yml
README.md
docs/oracle-family-issues.md
```

**This PR is pure documentation** (3 files, +140 lines), exactly as stated in the PR description. All code-quality, security, error-handling, and type issues found by agents are **pre-existing on `main`** and were NOT introduced by this PR.

---

## Agents Dispatched

| Agent | Status | Findings (re: PR scope) |
|-------|--------|------------------------|
| code-reviewer | Completed | 0 issues in PR scope (pre-existing code issues documented below) |
| security-reviewer | Completed | 0 issues in PR scope (pre-existing issues documented below) |
| silent-failure-hunter | Completed | 0 issues in PR scope (pre-existing issues documented below) |
| pr-test-analyzer | Completed | 0 gaps in PR scope — no executable logic added |
| type-design-analyzer | Completed | 0 issues in PR scope (pre-existing type design issues documented below) |
| performance-analyzer | Completed | 0 issues in PR scope (pre-existing perf issues documented below) |

---

## Review of Actual PR Changes (3 Files)

### `.github/ISSUE_TEMPLATE/oracle-awakening.yml` ✅
- Well-structured GitHub issue form with all required metadata fields
- Correctly warns against reusing historical thread #6
- Labels (`oracle-family`) and title format are consistent with project conventions
- All required fields marked `validations.required: true`
- YAML validates cleanly (confirmed by PR author + agents)

### `README.md` ✅
- Additive Oracle Family section pointing contributors to canonical registry (#16)
- Correct link to the new awakening form
- Clean, consistent formatting

### `docs/oracle-family-issues.md` ✅
- Comprehensive maintainer runbook covering canonical references, preserve-vs-consolidate rules, intake guidance, and title/label conventions
- Well-organized with clear decision guidance

---

## Critical Issues (0 found in PR scope)

*None. The 3 documentation files contain no executable code.*

---

## Important Issues (0 found in PR scope)

*None.*

---

## Suggestions (0 found in PR scope)

*None.*

---

## Strengths

- PR description accurately describes scope — transparent about pre-existing TS errors
- Documentation is well-structured and immediately actionable for maintainers
- Issue template prevents anti-pattern of reviving historical thread #6

---

## Validation Results

| Check | Status | Details |
|-------|--------|---------|
| Unit Tests | ✅ PASS | 157 pass, 0 fail (bun run test:unit) |
| Build (tsc --noEmit) | ⚠️ PRE-EXISTING | 4 errors in src/server-legacy.ts and src/server/handlers.ts — confirmed pre-existing, out of scope per PR description |
| YAML validation | ✅ PASS | oracle-awakening.yml and inbox-auto-add.yml parse cleanly |

---

## File Coverage Map

| File | Tier | Agents Run | In Actual PR Diff |
|------|------|------------|-------------------|
| `.github/ISSUE_TEMPLATE/oracle-awakening.yml` | 4 (Docs) | code, security, errors | ✅ Yes |
| `README.md` | 4 (Docs) | code, security, errors | ✅ Yes |
| `docs/oracle-family-issues.md` | 4 (Docs) | code, security, errors | ✅ Yes |

---

## Verdict

### ✅ READY TO MERGE

The PR introduces exactly what it describes: structured GitHub issue templates and a maintainer runbook for Oracle family intake. No application code, API, DB schema, or tests were modified. All pre-existing build errors are confirmed out of scope. Unit test suite passes cleanly.

---

## Pre-Existing Issues (Codebase — NOT blocking this PR)

These issues were found in the broader codebase during agent review. They are NOT introduced by this PR but warrant follow-up issues.

### Security (Found by security-reviewer)

| Priority | Issue | Location | Severity |
|----------|-------|----------|----------|
| 1 | Rate limit bypass via X-Forwarded-For spoofing (PIN brute-force) | `src/oauth/routes.ts:23-27` | High |
| 2 | `/revoke` endpoint has no authentication (token revocation DoS) | `src/oauth/routes.ts:178-201` | High |
| 3 | No redirect_uri scheme validation (accepts `javascript:` URIs) | `src/oauth/provider.ts:207` | High |
| 4 | Plugin file endpoint missing path traversal validation | `src/routes/files.ts:177-184` | Medium |
| 5 | HMAC key for Bearer auth is all-zeros buffer | `src/server.ts:145` | Medium |

### Error Handling (Found by silent-failure-hunter)

| Priority | Issue | Location | Severity |
|----------|-------|----------|----------|
| 1 | `main().catch(console.error)` — process exits 0 on crash | `src/index.ts:327` | Critical |
| 2 | `saveState()` swallows failure after token issuance — tokens silently lost | `src/oauth/provider.ts:100-113` | Critical |
| 3 | 6 bare `catch {}` blocks in dashboard.ts provide zero observability | `src/server/dashboard.ts:47,67,75,133,158,202` | Critical |
| 4 | `.env` parse failure is a bare `catch {}` — server starts broken | `src/index.ts:19-20` | Critical |
| 5 | `backfill-ttl.ts` script throws without `process.exit(1)` — cron sees success | `src/scripts/backfill-ttl.ts:72-75` | High |

### Code Quality (Found by code-reviewer)

| Priority | Issue | Location | Severity |
|----------|-------|----------|----------|
| 1 | `mcp-transport.ts` uses hardcoded `CHROMADB_DIR` instead of env-driven factory — all remote MCP clients get FTS5-only search in production | `src/mcp-transport.ts:96` | High |
| 2 | `.gitignore` has conflicting `AGENTS.md` directives (ignore + un-ignore) | `.gitignore:61,71` | Medium |

### Type Design (Found by type-design-analyzer)

| Priority | Issue | Location | Severity |
|----------|-------|----------|----------|
| 1 | `ToolResponse.content[].text` typed required but used as optional everywhere | `src/tools/types.ts:25` | High |
| 2 | `OracleReadInput` both `file` and `id` optional — no compile-time "at least one" guard | `src/tools/types.ts:106-109` | High |
| 3 | `VectorStatus` literal union duplicated 3 times (sync risk) | `src/tools/types.ts:19`, `src/index.ts:96`, `src/mcp-transport.ts:92` | Medium |

### Performance (Found by performance-analyzer)

| Priority | Issue | Location | Severity |
|----------|-------|----------|----------|
| 1 | Missing composite index `(project, superseded_by, expires_at)` | `src/db/schema.ts:30-37` | High |
| 2 | `handleList` fires 3 sequential queries — should be 1 aggregation | `src/tools/list.ts:57-66` | High |
| 3 | Post-filter adds 1 extra DB round-trip per hybrid search | `src/tools/search.ts:412-424` | High |

---

## Recommended Actions

1. **Merge this PR** — Documentation is clean and accurate, tests pass.
2. **Create follow-up issues** for the pre-existing code issues above (especially `mcp-transport.ts:96` CHROMADB_DIR bug and the 4 Critical error-handling issues).
