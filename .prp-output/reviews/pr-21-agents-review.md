---
pr: 21
title: "fix(deps): bump hono/drizzle-orm/undici/@hono/node-server for CVEs (#17 PR-A)"
author: "gobikom"
reviewed: 2026-04-15T22:35:00+07:00
verdict: NEEDS FIXES
agents: [code-reviewer, security-reviewer, silent-failure-hunter, dependency-analyzer]
---

# PR #21 Multi-Agent Review — Round 1

**Scope**: Dependency CVE remediation (2 files: `package.json` + `bun.lock`)
**Round**: 1

## Agents Dispatched

| Agent | Status | Findings |
|-------|--------|----------|
| code-reviewer | Completed | 2 issues |
| security-reviewer | Completed | 0 issues (all CVEs verified fixed) |
| silent-failure-hunter | Completed | 3 issues (1 medium dup, 1 medium, 1 low cosmetic) |
| dependency-analyzer | Completed | 0 blocking (1 false-positive investigated) |

## CVE Fix-Version Validation (from security-reviewer + dependency-analyzer)

All 9 cited CVEs verified fixed at target versions:

| CVE | Package | Fix Version | PR Target | Status |
|-----|---------|-------------|-----------|--------|
| GHSA-3vhc-576x-3qv4 | hono (JWT alg confusion) | ≥4.11.4 | 4.12.14 | ✅ FIXED |
| GHSA-f67f-6cw9-8mq4 | hono (JWT HS256 default) | ≥4.11.4 | 4.12.14 | ✅ FIXED |
| GHSA-q5qw-h33p-qvwr | hono (serveStatic traversal) | ≥4.12.4 | 4.12.14 | ✅ FIXED |
| GHSA-gpj5-g38j-94v9 | drizzle-orm (SQLi) | 0.45.2 exactly | 0.45.2 | ✅ FIXED |
| GHSA-wc8c-qw6v-h7f6 | @hono/node-server (authz bypass) | ≥1.19.10 | 1.19.14 | ✅ FIXED |
| GHSA-f269-vfmq-vjvj | undici (WS 64-bit length overflow) | ≥6.24.0 | 6.25.0 | ✅ FIXED |
| GHSA-vrm6-8vpv-qv8q | undici (WS permessage-deflate memory) | ≥6.24.0 | 6.25.0 | ✅ FIXED |
| GHSA-v9p9-hfj2-hcw8 | undici (WS unhandled exception) | ≥6.24.0 | 6.25.0 | ✅ FIXED |
| (bonus) GHSA-4992-7rv2-5pvq, GHSA-2mjp-6q6p-2qxm | undici (CRLF, HTTP smuggling) | ≥6.24.0 | 6.25.0 | ✅ FIXED (bonus coverage) |

**Key answers**:
- **Staying in undici v6 is correct** — all cited CVEs (+ 2 bonus) fixed at 6.24.0. v7+ not required. Moving to v7 would break `@qdrant/js-client-rest` `^6.23.0` peer.
- **hono 4.12.14 exceeds minimums** — JWT fix at 4.11.4, serveStatic fix at 4.12.4.
- **Bun overrides are respected** — verified in bun.lock, single-entry for each override target, no nested vulnerable versions.
- **OAuth surface not actively exposed to hono JWT CVEs** — `src/oauth/provider.ts` has no `jwt|jose|hono/jwt` imports. This PR is defense-in-depth, not hot-patch.

## Critical Issues (0 found)

None.

## Important Issues (0 found)

None.

## Medium Issues (2 found, deduplicated)

| Agent | Issue | Location | Fix |
|-------|-------|----------|-----|
| code-reviewer, silent-failure-hunter | `overrides` block uses caret ranges (`^6.25.0`, `^1.19.14`) instead of exact pins — security-intent should be unambiguous | `package.json:65-68` | Change to exact strings: `"undici": "6.25.0"`, `"@hono/node-server": "1.19.14"` |
| code-reviewer, silent-failure-hunter | `@modelcontextprotocol/sdk` silently floated 1.27.1 → 1.29.0 as side-effect of lockfile regen — undisclosed in PR description | `bun.lock:107` | Either document in PR description OR pin to 1.27.1 in package.json. Document is cheaper. |

## Suggestions (1 cosmetic)

| Agent | Issue | Location | Note |
|-------|-------|----------|------|
| silent-failure-hunter | `@qdrant/js-client-rest` lockfile entry still declares `undici: ^6.23.0` in its metadata | `bun.lock:109` | **No fix required** — expected Bun behavior (published manifest recorded verbatim; overrides win at install time). Cosmetic. |

## Strengths

- Bun `overrides` syntax correct (top-level, not nested). Verified in bun.lock.
- Semver constraints satisfied: 6.25.0 ∈ ^6.23.0; 1.19.14 ∈ ^1.19.9.
- No hono API breakage in source — all usage (`c.req.json`, `c.req.query`, cookie helpers, cors) is stable across 4.11→4.12.
- JWT middleware not used anywhere in codebase — no live exposure before fix (defense-in-depth).
- serveStatic CVE only reachable via dead `server-legacy.ts` (pre-existing TS errors, not in active server).
- Baseline test stability confirmed (157 unit / 0 fail; 20 integration fails identical to main).
- No license changes.
- No peer dependency conflicts.
- No phantom old versions in lockfile.

## Validation Results

| Check | Status | Details |
|-------|--------|---------|
| Unit Tests | ✅ PASS | 157 pass / 0 fail |
| Integration Tests | ⚠️ BASELINE | 24 pass / 20 fail / 13 skip — identical to main (tracked #20) |
| TypeScript Build | ⚠️ PRE-EXISTING | 4 errors in server-legacy.ts + handlers.ts — out-of-scope per #17 |
| Install | ✅ PASS | bun install clean, overrides applied |

## Verdict

**NEEDS FIXES** (Round 1)

Per #17 fix-loop protocol (target 0 issues all severities): 2 Medium findings must be addressed before merge. Both are mechanical:
1. Pin overrides to exact versions
2. Document (or pin) the MCP SDK silent bump

All 9 CVEs verified fixed. No security-blocking issues. Expected to be ready for merge after Round 1 fixes.

## Recommended Actions

1. Change `"^6.25.0"` → `"6.25.0"` and `"^1.19.14"` → `"1.19.14"` in package.json overrides
2. Document MCP SDK 1.27.1 → 1.29.0 bump in PR description (or pin to 1.27.1 if uncomfortable with the float)
3. Re-run bun install, verify bun.lock unchanged (should be idempotent)
4. Commit + push + re-review
