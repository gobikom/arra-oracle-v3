---
pr: 26
title: "fix(test): wire Bearer auth into http.test.ts integration suite (#20)"
author: "gobikom"
reviewed: 2026-04-16T00:00:00Z
verdict: NEEDS FIXES
agents: [code-reviewer, security-reviewer, silent-failure-hunter, pr-test-analyzer]
---

# PR Review Summary (Multi-Agent) — PR #26

## Agents Dispatched

| Agent | Status | Findings |
|-------|--------|----------|
| code-reviewer | Completed | 2 issues |
| security-reviewer | Completed | 2 issues |
| silent-failure-hunter | Completed | 7 issues |
| pr-test-analyzer | Completed | 7 issues |

---

## Important Issues (4 found)

| Agent(s) | Issue | Location |
|----------|-------|----------|
| code-reviewer, security-reviewer, silent-failure-hunter, pr-test-analyzer | **`process.env.ORACLE_API_TOKEN = TEST_TOKEN` at module-load scope is a misleading no-op that creates silent failure risk.** The mutation runs before `beforeAll`. When an existing server is detected (`isServerRunning()` returns true), the suite reuses it but the server's actual token may differ from `TEST_TOKEN`, causing every `authFetch()` call to silently return 401. The failure manifests as 14 confusing `expected false to be true` assertion errors with zero HTTP status context. The `env:` block in the `beforeAll` spawn is the correct and sufficient mechanism — the comment at lines 10–13 already explains this correctly; the mutation at line 15 is contradictory noise. | `http.test.ts:15` |
| silent-failure-hunter | **`authFetch()` lets network errors propagate as raw `TypeError` with no URL or context.** `fetch()` throws `TypeError: Failed to fetch` or `ECONNREFUSED` — these bubble naked through every test as untyped crashes, making failure look like a test infrastructure crash rather than a connectivity issue. Fix: wrap in try/catch and re-throw with context: `throw new Error(\`authFetch failed for ${url}: ${err.message}\`)` | `http.test.ts:24-32` |
| silent-failure-hunter | **`...init?.headers` spread silently drops all headers when `init.headers` is a `Headers` object or `[string, string][]` array** — spread only works on plain objects. Current tests pass because all callers use plain-object headers (`{ "Content-Type": "application/json" }`), but any future caller using `new Headers(...)` will silently lose those headers, causing a confusing `415 Unsupported Media Type` rather than a header-merge failure. Fix: normalise before spread: `...Object.fromEntries(new Headers(init?.headers ?? {}))` | `http.test.ts:28` |
| pr-test-analyzer | **No integration test verifies that a request _without_ a token gets 401** (criticality 7/10). The suite only tests the happy path — it cannot detect if auth enforcement is accidentally removed at the routing layer (`app.use('/api/*', createApiAuthMiddleware(...))`). The middleware unit tests in `api-auth.test.ts` cover rejection in isolation, but no integration test confirms the middleware is actually wired to the real server. Fix: add one negative test: `const res = await fetch(\`${BASE_URL}/api/stats\`); expect(res.status).toBe(401);` | `http.test.ts` — missing test |

---

## Suggestions (6 found)

| Agent(s) | Suggestion | Location |
|----------|------------|----------|
| silent-failure-hunter, pr-test-analyzer | **14 `authFetch()` call sites have no HTTP status logging before `expect(res.ok).toBe(true)`** — when a 401/403/500 occurs, the assertion error gives no hint of the actual status code. A cheap fix: use `expect(res.status, \`Expected 2xx but got ${res.status}\`).toBeLessThan(300)` or add `if (!res.ok) throw new Error(\`${url} returned ${res.status}\`)` before the assertion. | `http.test.ts:109,122,129,136,154,161,168,180,193,200,207,219,226,248` |
| silent-failure-hunter | **`waitForServer()` reports "15 seconds" hardcoded** while the actual timeout is `maxAttempts * 500ms`. Currently accurate by coincidence; will become wrong if `maxAttempts` is changed. Fix: `\`within ${maxAttempts * 500 / 1000} seconds\`` | `http.test.ts:84` |
| silent-failure-hunter | **`catch { }` at line 82 silently discards `reader.read()` errors during startup-failure diagnosis** — if the stream reader throws, the thrown startup error says `Server stderr: ` with no content, making the failure more opaque. Fix: `catch (readErr) { stderr = \`(could not read stderr: ${readErr})\`; }` | `http.test.ts:79-83` |
| pr-test-analyzer | **`/api/health` not tested with an incorrect/arbitrary token** — the exemption is only confirmed positively. A variant test would confirm the `OPTIONS`/health exemption holds even when a wrong token is presented. | `http.test.ts:100-105` |
| pr-test-analyzer | **7 Dashboard/session `authFetch()` calls assert only `typeof data === "object"`** — effectively no behavioral contract beyond "did not crash". Strengthen at least `/api/dashboard` to assert a known key. | `http.test.ts:191-210` |
| code-reviewer | **PR description states "17 call sites replaced"** — the diff has 17 replacements, but the file now contains 19 `authFetch(` references (including the function definition and 2 in a single test). Minor doc discrepancy, no functional impact. | PR body |

---

## Strengths

- **`authFetch()` helper design is correct and idiomatic.** Spread order (`...init?.headers` first, `Authorization` last) ensures the auth header wins without clobbering `Content-Type`. Optional chain safely handles `init === undefined`.
- **Health check exemption is precisely correct.** All three bare `fetch()` call sites (`waitForServer`, `isServerRunning`, health endpoint test) target only `/api/health` — no auth-required endpoint was missed.
- **Token identity is guaranteed.** Passing `ORACLE_API_TOKEN: TEST_TOKEN` in the spawn `env` block is the correct mechanism. The `??` fallback to `"integration-test-token"` provides a clean CI default.
- **`POST /api/learn` test is the strongest in the suite.** It writes data, reads it back, and asserts on the returned `id` — a real behavioral contract, not just a smoke test.
- **Hardcoded fallback token does not reach production.** `src/integration/**` is excluded from `tsconfig.json` builds, and the production middleware throws at startup if `ORACLE_API_TOKEN` is empty — no realistic exploit path.
- **Unit tests in `api-auth.test.ts` are comprehensive.** Missing token, wrong token, Basic scheme, empty bearer, whitespace, OPTIONS exemption, health exemption — all rejection paths covered in isolation. This significantly compensates for the integration suite's happy-path-only stance.

---

## Validation Results

| Check | Status | Details |
|-------|--------|---------|
| TypeScript (`tsc --noEmit`) | WARN | 2 pre-existing errors in `src/server-legacy.ts` (UI_PATH, etc.) and `src/server/handlers.ts` — not introduced by this PR |
| Unit Tests (`bun test:unit`) | PASS | 159 + 34 = 193 pass, 0 fail |
| Integration Tests | NOT RUN | Requires live server; not run in review environment |
| Lint | N/A | No lint script configured |

### Pre-existing TypeScript Errors (not from this PR)
- `src/server-legacy.ts:34-36` — `UI_PATH`, `ARTHUR_UI_PATH`, `DASHBOARD_PATH` not exported from `config.ts`
- `src/server/handlers.ts:49` — `query` property unknown in `SearchResponse`

---

## File Coverage Map

| File | Tier | Agents Run |
|------|------|------------|
| `src/integration/http.test.ts` | 4 (Test) | code-reviewer, security-reviewer, silent-failure-hunter, pr-test-analyzer |

---

## Fix Outcome

**Fixed**: 2026-04-16T11:15:00+07:00
**Commit**: 1fa74d9
**Branch**: fix/issue-20-integration-test-bearer-token

| Severity | Fixed | Skipped | Already Fixed |
|----------|-------|---------|---------------|
| Critical | 0 | 0 | 0 |
| High | 4 | 0 | 0 |
| Medium | 0 | 0 | 0 |
| Suggestion | 5 | 1 | 0 |

### Skipped Issues
- PR body doc discrepancy (suggestion 6) — cannot edit PR body; no functional impact.

### Pattern Expansions
| Pattern | File | Siblings Found | Action |
|---------|------|----------------|--------|
| `expect(res.ok).toBe(true)` → status+message | http.test.ts | 15 | Fixed 15 |
| authFetch error wrapping | http.test.ts | 1 | Fixed (only file in PR) |
| headers spread normalization | http.test.ts | 1 | Fixed (only file in PR) |

---

## Verdict

**NEEDS FIXES**

The core fix is correct and complete — `authFetch()` is well-designed, all 17 previously-unauthenticated call sites are covered, the health exemption is accurately preserved, and unit tests pass. However 4 Important issues warrant attention before merge:

1. **Remove `process.env.ORACLE_API_TOKEN = TEST_TOKEN` at line 15** (or move inside `beforeAll`). This mutation is a misleading no-op that can cause every authenticated test to silently return 401 when the suite reuses an existing server with a different token.
2. **Add a 401 negative test** for an unauthenticated request to a protected endpoint — closes the "auth is actually wired" verification gap.
3. **Fix `authFetch()` to add context on network errors** — a one-line re-throw with URL makes CI failures diagnosable.
4. **Normalise `init.headers` before spreading** — prevents a future silent header-drop bug.

Items 3 and 4 are latent (no current test failure) but cheap to fix now.

## Recommended Actions

1. Remove or move `process.env.ORACLE_API_TOKEN = TEST_TOKEN` (line 15) — move inside `beforeAll` after server spawn check
2. Add one `fetch()` (no auth) test asserting `res.status === 401` against `/api/stats`
3. Wrap `authFetch` body in try/catch and re-throw with `url` context
4. Normalise `init.headers` before spread: `Object.fromEntries(new Headers(init?.headers ?? {}))`
5. Consider adding status to `expect()` messages at the 14 `res.ok` assertion sites
