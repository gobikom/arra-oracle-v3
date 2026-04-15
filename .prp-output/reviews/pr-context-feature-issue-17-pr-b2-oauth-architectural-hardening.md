# PR Review Context

**Branch**: `feature/issue-17-pr-b2-oauth-architectural-hardening`
**Generated**: 2026-04-15 23:34
**Source Plan**: `.prp-output/plans/completed/issue-17-pr-b2-oauth-architectural-hardening-20260415-2334.plan.md`
**Source Report**: `.prp-output/reports/issue-17-pr-b2-report-20260415-2334.md`
**Parent Issue**: #17 (uses `Refs #17`, not `Fixes #17` — other sub-items remain)
**Prior arc**: PR #21 (dep CVEs), PR #22 (silent failures)

---

## Files Changed

| File | Action | Summary |
|------|--------|---------|
| `src/oauth/provider.ts` | UPDATE | Adds `validateRedirectUri` helper + `RedirectUriValidationError` export. Adds `hashToken`, `migrateTokenKeys`, `authenticateRevokeRequest` methods. Refactors `exchangeAuthorizationCode`, `verifyAccessToken`, `revokeToken` to hash-before-lookup. `revokeToken` gains optional `authenticatedClientId` param for token-client binding. `loadState` warns on grandfathered invalid URIs and runs token-key migration. Constructor eager-persists migrated state via `needsPostLoadSave` flag. |
| `src/oauth/routes.ts` | UPDATE | `/register` maps `RedirectUriValidationError` to HTTP 400 `invalid_redirect_uri`. `/revoke` rewritten to parse HTTP Basic or form-body client creds, call `authenticateRevokeRequest`, return 401+`WWW-Authenticate: Basic realm="oauth"` on failure, 400 if both methods present, and pass authenticated clientId to `revokeToken`. |
| `src/oauth/types.ts` | UPDATE | Adds `OAuthState.tokenKeyVersion?: 'sha256'` marker field and docstring noting the key is now sha256(rawToken) when the marker is set. |
| `src/oauth/__tests__/provider-silent-failures.test.ts` | UPDATE | PR-B1 regression tests updated to seed under hashed keys (same invariants, new storage layout). |
| `src/oauth/__tests__/routes-revoke.test.ts` | UPDATE | 17 new PR-B2 test cases + PR-B1 tests updated for client auth requirement. Covers all 3 findings' HTTP contract + a pure unit test for `validateRedirectUri`. |

---

## Implementation Summary

Three security-critical fixes to the OAuth 2.1 provider, all scoped to `src/oauth/*`:

**#17.4 — redirect_uri allowlist** — `validateRedirectUri(uri)` parses via WHATWG URL and rejects everything except `https://` and loopback `http://` (localhost, 127.0.0.1, ::1, [::1]). Called at BOTH `registerClient` (first enforcement point — rejects new registrations) and `authorize` (second enforcement point — catches tampered or grandfathered persisted state). `loadState` emits per-client warnings for grandfathered invalid URIs but does not delete or auto-migrate, per the "nothing deleted, only superseded" rule.

**#17.5 — RFC 7009 client auth on /revoke** — `authenticateRevokeRequest(authHeader, formBody)` accepts HTTP Basic (preferred) or form-body `client_id`+`client_secret` (fallback), rejects if both are present (RFC 6749 §2.3.1), validates `client_secret` via HMAC-normalised `timingSafeEqual` using the existing instance `hmacKey` (same pattern as `checkRegistrationAuth`). On unknown `client_id` the code still runs a dummy compare to equalise timing. On auth failure returns 401 with `WWW-Authenticate: Basic realm="oauth"`. `revokeToken(token, authenticatedClientId?)` enforces token-client binding: if the authenticated client differs from the token's owner, the revocation is silently ignored and HTTP 200 is returned (no existence leak per RFC 7009 §2.1).

**#17.7 — hash-before-lookup** — `state.tokens` is now keyed by `sha256hex(rawToken)`. The SHA-256 computation is the constant-time component; the subsequent object lookup leaks only on the digest value, which is indistinguishable from random for an attacker without prior knowledge of the token. All three access sites (`exchangeAuthorizationCode` issue, `verifyAccessToken` lookup, `revokeToken` delete) use `this.hashToken(token)`. Legacy state files are migrated in-place: `migrateTokenKeys(state)` re-keys every entry on first load, sets `state.tokenKeyVersion = 'sha256'`, returns the count. Migration is gated on the marker (idempotent). The constructor calls `saveState()` once after `loadState` returns if `needsPostLoadSave` is set, so the migration is durable immediately — not deferred until the next organic write. If the eager save throws, it propagates out of the constructor → eager-init in `server.ts` catches it → operator notices. No silent half-migrated state.

---

## Validation Status

| Check | Result | Details |
|-------|--------|---------|
| Type check (`bun run build`) | ✅ PASS | OAuth module clean. 4 pre-existing errors in `server-legacy.ts` and `server/handlers.ts` verified identical on clean main — not introduced by this PR. |
| Lint | ⏭️ N/A | No lint script in package.json; tsc --noEmit covers static analysis. |
| OAuth unit tests | ✅ PASS | 33/33 (`bun test src/oauth/__tests__/`). |
| Full unit suite (`bun run test:unit`) | ✅ PASS | 190/190 passed, 0 failed, across two bun test invocations. |
| Integration tests | ⚠️ PRE-EXISTING FAIL | 1 pre-existing fail in `src/integration/oauth-hardening.test.ts` (`PIN lockout ... spoofed headers`) — caused by the server now requiring `ORACLE_API_TOKEN` at startup from issue #12. Verified identical on clean `main` before this PR; NOT a regression. |
| Build | ✅ PASS | tsc clean on oauth module. |

---

## Key Changes for Review

### Modified Files

- **`src/oauth/provider.ts`**: +348/-10 lines. New class `RedirectUriValidationError`. New module-level helper `validateRedirectUri(uri)`. New private methods: `hashToken`, `migrateTokenKeys`, `authenticateRevokeRequest`. Refactored public methods: `registerClient`, `authorize`, `exchangeAuthorizationCode`, `verifyAccessToken`, `revokeToken`, `loadState`, constructor.
- **`src/oauth/routes.ts`**: +72/-13 lines. `/register` catches `RedirectUriValidationError` → 400. `/revoke` rewritten end-to-end.
- **`src/oauth/types.ts`**: +10/-0 lines. New optional field `OAuthState.tokenKeyVersion`.

### Tests Updated / Added

- 33 unit tests total in `src/oauth/__tests__/` after PR-B2 (up from ~15 in PR-B1).
- 17 new PR-B2 contract tests across routes-revoke.test.ts covering all 3 findings.
- PR-B1 regression tests still pass after hashed-key migration.

---

## Review Focus Areas

**Security-critical — require extra attention:**

1. **`validateRedirectUri` allowlist correctness** — is the hostname check robust against edge cases like `http://evil.com@localhost`, URL encoding tricks, `http://localhost.evil.com`, IDN homoglyphs? Rely on WHATWG URL's `hostname` property (it strips userinfo, handles ports) but worth a second pair of eyes. IPv6 bracket handling: accepted both `::1` and `[::1]` because Bun and Node return them differently.

2. **Token-client binding in `revokeToken`** — is the `authenticatedClientId !== undefined` check tight? If a caller passes `undefined` deliberately, binding is bypassed. Current sole caller is `/revoke` route which always passes `authResult.clientId`. Internal callers (none today) could pass undefined — documented in the jsdoc.

3. **Hash-before-lookup completeness** — `grep -n "state\.tokens\[" src/oauth/provider.ts`:
   - Line 580 (`exchangeAuthorizationCode` issue) — uses `tokenKey`
   - Line 588 (`exchangeAuthorizationCode` rollback) — uses `tokenKey`
   - Line 753 (`verifyAccessToken` lookup) — uses `tokenKey`
   - Line 756 (`verifyAccessToken` expired cleanup) — uses `tokenKey`
   - Line 818 (`revokeToken` lookup) — uses `tokenKey`
   - Line 853 (`revokeToken` delete) — uses `tokenKey`
   - Line 867 (`revokeToken` rollback) — uses `tokenKey`
   - `cleanExpiredTokens` (line ~207): iterates `Object.entries(this.state.tokens)` and deletes by the iteration key, which is already hashed — no raw-token leak there.
   All lookups hash first. No bypass.

4. **Migration idempotency** — `migrateTokenKeys` checks `state.tokenKeyVersion === 'sha256'` and returns 0. First load migrates, sets marker, eager-saves. Second load sees marker, no-op. Tested.

5. **Migration durability** — eager save in constructor throws on failure → eager-init in `server.ts` catches → server exits non-zero. PR-B1 established this pattern.

6. **Timing-parity dummy compare in `authenticateRevokeRequest`** — when client_id is unknown, we still run `timingSafeEqual(dummy, providedDigest)` to prevent client enumeration by timing. The dummy is a constant string hashed once per call; the compiler cannot optimise this out because we don't store the result. Good.

7. **`WWW-Authenticate` header** — set via `c.header('WWW-Authenticate', ...)` before `c.json(body, 401)` in Hono. Tested explicitly — `res.headers.get('WWW-Authenticate')` returns `Basic realm="oauth"`.

8. **`RedirectUriValidationError` export** — exported from `provider.ts`, imported by `routes.ts`. instanceof check survives bundling because Bun does not re-emit error classes.

### Gotchas worth noting

- **`registerClient` empty-array check** — pre-PR-B2 the route handler already rejected empty `redirect_uris` at L72-74. We added a defense-in-depth check inside `registerClient` as well. Not a behavior change.
- **`authorize` error mapping** — `routes.ts:120-121` wraps any `error` string from `provider.authorize()` as `c.json({error: result.error}, 400)`. The new `invalid redirect_uri:` prefix flows through unchanged.
- **`exchangeAuthorizationCode` rollback** — line 588 uses `delete this.state.tokens[tokenKey]` where `tokenKey = this.hashToken(access_token)`. Matches the issue path at line 580.
- **Pre-existing non-loopback test** — the existing `src/integration/oauth-hardening.test.ts` `PIN lockout` test uses `http://localhost:47781` which is loopback, so `#17.4` does not regress that test. The test fails for an unrelated reason (ORACLE_API_TOKEN).

---

## PR Diff

(See full diff via `gh pr diff 24` — 1188 lines across 5 files. Key files to read directly for review:
- `src/oauth/provider.ts` (full file — changes woven throughout)
- `src/oauth/routes.ts` (/register error mapping and /revoke rewrite)
- `src/oauth/types.ts` (tokenKeyVersion marker)
- `src/oauth/__tests__/provider-silent-failures.test.ts`
- `src/oauth/__tests__/routes-revoke.test.ts`

Diff head/tail: see `/tmp/pr24.diff` or run `gh pr diff 24`.)
