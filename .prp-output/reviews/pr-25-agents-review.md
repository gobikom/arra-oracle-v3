---
pr: 25
title: "fix(security): replace Buffer.alloc(32) zero-key with randomBytes(32) for /mcp HMAC (#23)"
author: "gobikom"
reviewed: 2026-04-16T00:00:00Z
verdict: NEEDS FIXES
agents: [code-reviewer, security-reviewer, silent-failure-hunter, comment-analyzer, pr-test-analyzer, docs-impact-agent]
---

# PR Review Summary (Multi-Agent) — PR #25

**PR**: https://github.com/gobikom/arra-oracle-v3/pull/25
**Branch**: `fix/issue-23-mcp-bearer-hmac-key` → `main`
**Size**: +7/-2 across 1 file (`src/server.ts`)

---

## Agents Dispatched

| Agent | Status | Findings |
|-------|--------|----------|
| code-reviewer | Completed | 2 issues |
| security-reviewer | Completed | 2 issues (both Low) |
| silent-failure-hunter | Completed | 4 issues |
| comment-analyzer | Completed | 3 issues |
| pr-test-analyzer | Completed | 2 gaps |
| docs-impact-agent | Completed | 1 issue |

---

## Critical Issues (1 found)

| Agent | Issue | Location |
|-------|-------|----------|
| silent-failure-hunter | `randomBytes(32)` at module scope has no try/catch — a PRNG failure (entropy unavailable, FIPS policy, container early-boot) throws a synchronous exception that crashes the process with a raw stack trace and no operator context. The project already has the required pattern at lines 131–139 (OAuthProvider eager-init). | `src/server.ts:45` |

**Fix required** — wrap with same pattern used for OAuthProvider:
```typescript
let MCP_BEARER_HMAC_KEY: Buffer;
try {
  MCP_BEARER_HMAC_KEY = randomBytes(32);
} catch (err) {
  console.error('🔥 FATAL: randomBytes(32) failed for MCP_BEARER_HMAC_KEY — entropy unavailable:', err);
  process.exit(1);
}
```

---

## Important Issues (3 found)

| Agent | Issue | Location |
|-------|-------|----------|
| silent-failure-hunter | Empty catch block at startup (`// Table might not exist yet — that's fine`) swallows all exceptions, including DB corruption, schema mismatch, and permission errors. A corrupt database at startup goes undetected until request-time. Pre-existing issue, not introduced by this PR, but trivial to fix alongside. | `src/server.ts:54-56` |
| comment-analyzer | New comment misstates the threat: "offline precomputation of HMAC(known-key, guess) is not possible" is imprecise. The primary threat is that a **known** HMAC key lets an attacker compute valid digests for arbitrary token candidates, collapsing HMAC to an unkeyed transform and eliminating the security boundary. | `src/server.ts:43-44` |
| pr-test-analyzer | No test verifies the HMAC key is non-zero. Existing integration tests confirm auth behavior (right token → 200, wrong token → 401) but are agnostic to the key value — they would pass equally with `Buffer.alloc(32)`. A regression to the zero-key is invisible to the test suite. Criticality: 7/10. | `src/server.ts:45` |

**Suggested comment fix** (`src/server.ts:43-44`):
```typescript
// Per-process HMAC key for /mcp Bearer-only comparison.
// Fixes issue #23: was Buffer.alloc(32) (zero key) — must be randomBytes(32)
// so that the HMAC key is server-secret; a known key lets an attacker compute
// valid digests for arbitrary token candidates without knowing MCP_AUTH_TOKEN.
```

**Suggested test** (new `src/server/__tests__/mcp-hmac-key.test.ts`):
```typescript
import { describe, test, expect } from 'bun:test';
import { randomBytes } from 'crypto';

describe('MCP Bearer HMAC key', () => {
  test('randomBytes(32) produces non-zero output', () => {
    const key = randomBytes(32);
    expect(key.every((b) => b === 0)).toBe(false);
  });
  test('two calls produce different keys', () => {
    expect(randomBytes(32).equals(randomBytes(32))).toBe(false);
  });
});
```

---

## Suggestions (6 found)

| Agent | Suggestion | Location |
|-------|------------|----------|
| code-reviewer, comment-analyzer | `_hmacKey` uses underscore prefix (meaning "intentionally unused") but is actively read on the next two lines. Remove the alias entirely — use `MCP_BEARER_HMAC_KEY` directly in the two `createHmac` calls. | `src/server.ts:170` |
| silent-failure-hunter | Auth-layer HMAC errors (e.g., FIPS-mode failure of `createHmac`) fall through to the outer `/mcp` catch and are logged as generic `[MCP] Handler error:`, not distinguishable from tool-execution failures. No false-positive auth path — `authorized` stays `false` — but operability is poor. | `src/server.ts:170-173` |
| code-reviewer | `'crypto'` vs `'node:crypto'` import inconsistency: `api-auth.ts` (the stated reference pattern) uses `'node:crypto'`; `server.ts` uses bare `'crypto'`. Both work in Bun but the inconsistency is minor. | `src/server.ts:9` |
| security-reviewer | PIN comparison in `provider.ts` uses zero-padding + length check instead of the HMAC normalization pattern used everywhere else. Not an exploitable vulnerability — `timingSafeEqual` runs on equal-length buffers and the length check is not secret-dependent — but the pattern inconsistency is notable. Pre-existing. | `src/oauth/provider.ts:652-659` |
| pr-test-analyzer | No test for the "neither `MCP_AUTH_TOKEN` nor `MCP_OAUTH_PIN` configured" branch — endpoint should return 401 with config error message. Low priority (criticality 5/10). | `src/server.ts:153-155` |
| docs-impact-agent | `docs/architecture.md:276` describes Bearer-only mode as "Static token, HMAC timing-safe comparison" — still accurate, but could note the per-process random key: "Static token, HMAC timing-safe comparison with per-process random key." | `docs/architecture.md:276` |

---

## Strengths

- **Core fix is correct**: `randomBytes(32)` at module scope eliminates the zero-key vulnerability precisely and completely. The precomputation attack vector is closed.
- **Module-scope placement is right**: Key generated once per process, matching the pattern in `api-auth.ts:58` and `oauth/provider.ts:136`.
- **Buffer.alloc sweep clean**: Remaining `Buffer.alloc` calls in `oauth/provider.ts:655-656` and `808-809` are intentional zero-padding for `timingSafeEqual` length equalization — not HMAC keys. No other zero-key HMAC vulnerability exists.
- **No false-positive auth path**: `authorized` is initialized `false` and can only be set `true` by a successful `timingSafeEqual`. Any exception in the HMAC block falls through to the outer catch and returns 500 — not `authorized = true`.
- **No regression risk in auth behavior**: Drop-in substitution. The HMAC computation, comparison logic, and authorization flow are structurally unchanged.
- **Security impact validated**: The fix aligns `/mcp` with `api-auth.ts` and `oauth/provider.ts` — both well-established reference patterns.
- **Integration test coverage exists**: `src/integration/mcp-http.test.ts` covers the auth path (no-token → 401, wrong-token → 401, empty-Bearer → 401, valid-token → 200). 11 of 12 tests pass; the 1 failure (`GET /api/stats`) is a pre-existing API regression unrelated to this PR.

---

## Validation Results

| Check | Status | Details |
|-------|--------|---------|
| TypeScript (tsc --noEmit) | PASS (pre-existing errors only) | 4 pre-existing errors in `server-legacy.ts` (missing config exports) and `server/handlers.ts` (unknown `query` property) — confirmed identical on both `main` and this branch |
| Integration tests (mcp-http) | 11/12 PASS | 1 failure (`GET /api/stats still works`) is pre-existing and unrelated to auth changes — confirmed by comparison against server without this branch's changes |
| Lint | Not run (no lint script in package.json) | — |
| Build | PASS | Same pre-existing TS errors; no new errors introduced |

---

## File Coverage Map

| File | Tier | Agents Run |
|------|------|------------|
| `src/server.ts` | 1 (Critical — auth/security) | code-reviewer, security-reviewer, silent-failure-hunter, comment-analyzer, pr-test-analyzer |
| `src/middleware/api-auth.ts` | 1 (reference pattern) | code-reviewer, security-reviewer, silent-failure-hunter (read-only for pattern comparison) |
| `src/oauth/provider.ts` | 1 (reference pattern) | security-reviewer, silent-failure-hunter (read-only for pattern comparison) |
| `docs/architecture.md` | 4 (docs) | docs-impact-agent |

---

## Verdict

### NEEDS FIXES

The security fix itself is **correct and well-executed**. The vulnerability is closed, the pattern is right, and no false-positive auth path exists.

However, the PR introduces `randomBytes(32)` at module scope without the try/catch guard that the project already uses for all other eager-init operations (see `src/server.ts:131-139`). This is the only blocking issue — a PRNG failure at module load would crash the process silently. The fix is mechanical (3-4 lines) and the pattern is already in the same file.

### Recommended Actions (Priority Order)

1. **[Blocking]** Wrap `randomBytes(32)` at `server.ts:45` in try/catch with FATAL log + `process.exit(1)`, matching the OAuthProvider pattern at lines 131-139.
2. **[Should fix]** Fix the empty catch block at `server.ts:54-56` — add `console.warn` so non-"table missing" failures are visible in logs.
3. **[Should fix]** Correct the comment at lines 43-44 to accurately describe the threat model (known key → attacker can compute valid digests for any token candidate).
4. **[Should fix]** Remove `_hmacKey` alias at line 170 — use `MCP_BEARER_HMAC_KEY` directly in the two `createHmac` calls.
5. **[Consider]** Add unit test asserting HMAC key non-zero property to guard against regression.
6. **[Consider]** Update `docs/architecture.md:276` to note per-process random key.

---

## Pattern Sweep Results (Aggregated)

| Pattern | Files Swept | Instances Found |
|---------|-------------|-----------------|
| `Buffer.alloc` as HMAC key | All `src/**/*.ts` | 0 additional instances (remaining Buffer.alloc calls in provider.ts are zero-padding, not key material) |
| Module-scope `randomBytes()` without try/catch | `src/server.ts`, `src/middleware/api-auth.ts`, `src/oauth/provider.ts` | Pre-existing in `api-auth.ts:58` and `provider.ts:136` — not introduced by this PR |
| Empty/comment-only catch blocks | `src/server.ts` | 1 instance (startup indexing reset, line 54-56) — pre-existing |
| `_hmacKey` underscore prefix on used variable | All `src/**/*.ts` | 1 instance — `src/server.ts:170`, introduced by this PR |
