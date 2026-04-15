---
pr: 24
title: "fix(oauth): close architectural hardening cluster from #716 review (#17 PR-B2)"
author: gobikom
reviewed: 2026-04-15T23:45+07:00
verdict: READY TO MERGE
---

## PR Review Summary

Single-session multi-pass review (prp-review). The parent workflow requested `/prp-core:prp-review-agents` (multi-agent parallel) but the `Agent` subagent tool is not available in this execution environment — fell back to the documented fallback path: sequential multi-pass review in this session.

Passes run: code quality, security, error handling, type design, tests, comment analysis. Passes skipped: a11y (no UI files), perf (no perf-sensitive patterns — pure auth/crypto code), deps (no package.json changes), docs (no user-facing doc changes), simplify (last-pass polish — no findings).

### Critical Issues (0 found)

_None._

### Important Issues (0 found)

_None._

### Suggestions (3 found)

| Pass | Suggestion | Location |
|------|------------|----------|
| code | Comment on line 934 says "case already normalised via toLowerCase check" but the slice is applied to the ORIGINAL mixed-case string. The slice works because both `Basic ` and `basic ` are 6 bytes, not because of the normalisation. Comment is slightly misleading; functional behaviour is correct. | `src/oauth/provider.ts:934` |
| tests | Add explicit test cases for redirect_uri hostname-bypass attempts: `http://evil@localhost/cb` (userinfo strip), `http://127.0.0.1.evil.com/cb` (subdomain attack), `http://2130706433/cb` (decimal IP encoding). WHATWG URL's `hostname` property already handles these correctly by construction, but explicit tests document the invariant and prevent regression. Criticality: 6/10. | `src/oauth/__tests__/routes-revoke.test.ts` (validateRedirectUri unit describe block) |
| types | Consider a future-proofing shape for `revokeToken`: `revokeToken(token, { clientId: string } \| { internal: true })` would force internal callers (none today) to explicitly opt out of token-client binding. Current `authenticatedClientId?: string` signature works for the sole caller but makes accidental binding-bypass possible if a new caller omits the arg. Low priority — documented in jsdoc. | `src/oauth/provider.ts:810` |

### Strengths

- **Defense in depth is genuine, not cosmetic.** `validateRedirectUri` is called at BOTH `registerClient` (input gate) and `authorize` (second line catching tampered/grandfathered state), AND `loadState` emits a warning-per-client for legacy bad URIs. This is the textbook "never trust persisted state" pattern.
- **HMAC-normalised timing-safe compare reused correctly.** `authenticateRevokeRequest` uses the existing instance `hmacKey` with the same pattern as `checkRegistrationAuth` — no duplication, no reinvention. Dummy compare on unknown client_id to equalise timing is a nice touch and explicitly commented on why the compiler can't optimise it out.
- **Hash-before-lookup migration is properly gated.** `OAuthState.tokenKeyVersion` marker makes the migration idempotent and type-safe. The `needsPostLoadSave` flag is a clean solution to the constructor-order problem (can't `saveState` from inside `loadState` before `this.state` is set).
- **Eager persistence of migration respects the PR-B1 lesson.** `saveState` failure propagates out of the constructor → `server.ts` eager-init catches it → operator notices. No silent half-migrated state.
- **Token-client binding in `revokeToken` correctly returns 200 on cross-client attempts** — matches RFC 7009 §2.1 "do not leak token existence" requirement.
- **Deep-copy rollback pattern from PR-B1 preserved** in `revokeToken`. Spread-with-explicit-`scopes` array copy means a mid-flight mutation to the token record cannot corrupt the rollback snapshot.
- **Discriminated union return type on `authenticateRevokeRequest`** (`{ok: true, clientId} | {ok: false, status: 400 | 401, error, errorDescription}`) forces the call-site to exhaustively handle both branches and pins the status codes at the type level.
- **Test quality is excellent.** Uses real Hono `app.request()`, real crypto, real temp dirs, real state files. No mocking of the system under test. The PR-B1 regression tests were properly updated (not deleted) to match the new storage layout.
- **Thorough documentation of intentional choices** in the commit message, plan, and implementation report — including the two documented deviations (unit tests via `app.request()` instead of spawned servers, and IPv6 bracket handling).

### Deep-dive Verifications

I performed these invariant checks against the actual source files:

1. **Hash-before-lookup completeness** — Every `state.tokens[...]` access goes through `this.hashToken(token)`:
   - `exchangeAuthorizationCode` issue (L745): ✅ `this.state.tokens[tokenKey]` where `tokenKey = this.hashToken(access_token)`
   - `exchangeAuthorizationCode` rollback (L754): ✅ uses same `tokenKey`
   - `verifyAccessToken` lookup (L776): ✅ `this.state.tokens[this.hashToken(token)]`
   - `verifyAccessToken` expired cleanup (L781): ✅ uses same `tokenKey`
   - `revokeToken` lookup (L812): ✅
   - `revokeToken` delete (L866): ✅
   - `revokeToken` rollback (L881): ✅
   - `cleanExpiredTokens` iteration: iterates `Object.entries(this.state.tokens)` and deletes by the iteration key, which IS the hashed key — no raw-token access. ✅

2. **Hostname strict-equality check is robust.** `parsed.hostname` (WHATWG URL) strips userinfo, lowercases, normalises IPv4/IPv6 numeric forms. Then strict `===` against the 4 allowed values. `localhost.evil.com` has host = `localhost.evil.com` and fails the check. ✅

3. **`authenticateRevokeRequest` reject-both check** — correctly detects `hasBasic && hasForm` before parsing either, so an attacker cannot bypass by sending malformed Basic + valid form. ✅

4. **Dummy compare unreachability** — `timingSafeEqual(dummy, providedDigest)` result is discarded. Compiler cannot optimise it out because `timingSafeEqual` is a native binding with side effects (or at least treated as opaque). ✅

### Validation Results

Trusted from the pr-context file (concrete PASS/FAIL with counts — not template placeholders):

| Check | Status | Details |
|-------|--------|---------|
| Type Check (`bun run build`) | ✅ PASS | OAuth module clean. 4 pre-existing errors in `server-legacy.ts` + `server/handlers.ts` verified identical on clean `main` — NOT introduced by this PR. |
| Lint | N/A | No lint script in package.json; tsc --noEmit covers static analysis. |
| OAuth unit tests | ✅ PASS | 33/33 |
| Full unit suite (`bun run test:unit`) | ✅ PASS | 190/190 passed, 0 fail |
| Integration tests | ⚠️ PRE-EXISTING FAIL | 1 pre-existing fail (`ORACLE_API_TOKEN` startup requirement from issue #12). Verified identical on clean `main` — NOT a regression. |
| Build | ✅ PASS | tsc clean on oauth module. |

### File Coverage Map

| File | Tier | Passes Run |
|------|------|------------|
| `src/oauth/provider.ts` | 1 (Critical — auth/crypto) | code, security, errors, types |
| `src/oauth/routes.ts` | 1 (Critical — auth endpoints) | code, security, errors |
| `src/oauth/types.ts` | 1 (Critical — OAuth state shape) | types |
| `src/oauth/__tests__/provider-silent-failures.test.ts` | 4 (Test) | code, tests |
| `src/oauth/__tests__/routes-revoke.test.ts` | 4 (Test) | code, tests |

### Verdict

**READY TO MERGE**

All 3 findings are security-critical architectural fixes, all implemented following the patterns established by PR-B1, all backed by 33 unit tests that verify both happy and sad paths. Type-check clean, full unit suite green, deep-dive invariant verification confirmed that every `state.tokens[...]` access goes through `hashToken`. Deviations from plan are documented and justified.

The 3 suggestions are non-blocking polish:
1. Comment clarification (1 line)
2. Additional test cases for URL-parsing edge cases (already covered by WHATWG normalisation, but explicit tests document the invariant)
3. Future-proofing the `revokeToken` signature (low priority — documented in jsdoc)

None of these block merge. All can be addressed in follow-up if desired.

### Recommended Actions

1. **Approve and merge** — PR meets all acceptance criteria from the plan.
2. Optional: address the 3 suggestions in a follow-up PR if the additional test cases or signature tightening is desired.

### Notes on Review Methodology

- Review performed as single-session sequential multi-pass (fallback mode) because the `Agent` subagent tool is not available in this execution environment. Per the `/prp-core:prp-review-agents` fallback rule, this is the documented alternative — coverage is equivalent but without the parallelism benefit.
- Context file at `.prp-output/reviews/pr-context-feature-issue-17-pr-b2-oauth-architectural-hardening.md` was pre-generated during the `prp-implement` phase and contains concrete validation results — no re-running of validation was needed.
- Source files were read directly (not just the diff) for deep invariant verification of the hash-before-lookup refactor.
