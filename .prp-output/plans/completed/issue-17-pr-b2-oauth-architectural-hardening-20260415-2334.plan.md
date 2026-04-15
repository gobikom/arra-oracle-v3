---
status: pending
runner: bun
mode: full
---

# Issue #17 PR-B2: OAuth Architectural Hardening Cluster

## Summary

Close the remaining 3 architectural findings from PR #716 multi-agent review of the OAuth 2.1 provider in `arra-oracle-v3`:

- **#17.4** — `redirect_uri` scheme validation (reject `javascript:`, `data:`, custom schemes, non-loopback `http://`) enforced at BOTH client registration and authorize time (defense in depth).
- **#17.5** — RFC 7009 client authentication on `/revoke` endpoint (Basic or form body, mutually exclusive, constant-time compare) + token-client binding enforcement.
- **#17.7** — Hash-before-lookup refactor of `state.tokens` keyed by `sha256hex(token)` to close the dict-key timing side-channel, with in-place migration of persisted state.

All three fixes are scoped to `src/oauth/*` and its direct helpers. No changes outside that module.

## User Story

```
As an operator of an Oracle v3 OAuth 2.1 provider
I want the provider to resist open-redirect, DoS, existence-probe, and timing side-channel attacks
So that a single malicious client cannot compromise or disrupt other clients' sessions
```

## Problem / Solution

| # | Problem | Solution |
|---|---------|----------|
| 17.4 | `registerClient()` accepts any `redirect_uri` — attacker registers `javascript:alert(1)` and gets the `/authorize` endpoint to respond with a redirect that executes JS on PIN page or turns the endpoint into an open redirector. | Allowlist: `https://` always, `http://localhost` and `http://127.0.0.1` per RFC 8252, everything else rejected. Enforced at `registerClient()` AND in the `/authorize` flow (defense in depth). |
| 17.5 | `/revoke` accepts any token with no client auth — attacker who learns one token can revoke arbitrary tokens (DoS) or probe token existence via 200-vs-400. Violates RFC 7009 §2.1. | Require HTTP Basic or form-body client credentials (mutually exclusive per RFC 6749 §2.3.1), timing-safe HMAC compare on client_secret, and enforce token-client binding (client A cannot revoke client B's tokens). |
| 17.7 | `state.tokens[token]` uses raw token as object key — JS property-access timing varies with hash bucket distribution, enabling offline probing of the token space. | Hash-before-lookup: key the `tokens` record by `sha256hex(token)`. The SHA-256 computation is the constant-time portion; the subsequent lookup leaks only on hash value (indistinguishable from random). Migrate persisted state in place on `loadState`. |

## Metadata

| Field | Value |
|-------|-------|
| **Type** | REFACTOR + ENHANCEMENT (security-critical) |
| **Complexity** | HIGH |
| **Affected Systems** | `src/oauth/provider.ts`, `src/oauth/routes.ts`, `src/oauth/types.ts`, `src/integration/oauth-hardening.test.ts` |
| **Task Count** | 9 |
| **Runner** | bun |
| **Type Check** | `bun run build` (maps to `tsc --noEmit`) |
| **Lint** | (no lint script — skip or use `tsc`) |
| **Test (unit)** | `bun run test:unit` |
| **Test (integration)** | `bun run test:integration` |
| **Build** | `bun run build` |

## Mandatory Reading

### P0 — Read first
- `src/oauth/provider.ts` (ALL — 715 lines) — understand existing state shape, hmacKey instance field (line 79), checkRegistrationAuth HMAC pattern (lines 282-302), revokeToken deep-copy rollback (lines 638-668), verifyAccessToken lookup (lines 593-614), exchangeAuthorizationCode token issuance (lines 524-585), cleanExpiredTokens (lines 198-231), loadState rename-on-corrupt (lines 129-176).
- `src/oauth/routes.ts` (ALL — 254 lines) — `/register` handler (52-91), `/authorize` handler (95-125), `/revoke` handler (176-209).
- `src/oauth/types.ts` (ALL — 41 lines) — `OAuthState`, `OAuthTokenData`, `OAuthClientInfo` shapes.
- `src/integration/oauth-hardening.test.ts` (ALL — 152 lines) — existing test patterns (spawned server, tempDirs, waitForServer, register → authorize → callback).

### P1
- `src/middleware/api-auth.ts` lines 38-63 — canonical HMAC-normalized timing-safe compare pattern (the `hmacKey = randomBytes(32)` + double-HMAC-digest approach). Note: this is a per-module random key, not a secret.

### P2
- `~/repos/agents/agent-psak/ψ/memory/learnings/2026-04-15_lessons-issue-17-full-arc-scope-split-eag.md` — PR-B1 lessons: eager-init, deep-copy rollback, `mock.module` isolation. Read before touching tests.
- Commit `48eddb9` (PR #22) — reference for rollback patterns and silent-failure fixes.

### External
- [RFC 7009 — OAuth 2.0 Token Revocation §2.1](https://www.rfc-editor.org/rfc/rfc7009#section-2.1) — client auth requirement, token existence non-leak rule.
- [RFC 6749 §2.3.1](https://www.rfc-editor.org/rfc/rfc6749#section-2.3.1) — "the client MUST NOT use more than one authentication method in each request".
- [RFC 8252 §7.3](https://www.rfc-editor.org/rfc/rfc8252#section-7.3) — loopback IP redirect (localhost / 127.0.0.1 / ::1) for native apps.

## Patterns to Mirror

### HMAC-normalized timing-safe compare (SOURCE: codebase `src/oauth/provider.ts:282-302`)

```typescript
// hmacKey field (line 79)
private readonly hmacKey: Buffer = randomBytes(32);

// Compare (lines 292-301)
const providedToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
if (!providedToken) return false;
const expectedDigest = createHmac('sha256', this.hmacKey).update(MCP_AUTH_TOKEN).digest();
const providedDigest = createHmac('sha256', this.hmacKey).update(providedToken).digest();
return timingSafeEqual(expectedDigest, providedDigest);
```

Mirror this exactly for client_secret comparison in `authenticateRevokeRequest`. Reuse `this.hmacKey` — do not create a new one.

### Deep-copy rollback on persistence failure (SOURCE: codebase `src/oauth/provider.ts:638-668`)

```typescript
const current = this.state.tokens[token];
if (!current) return;
const snapshot = { ...current, scopes: [...current.scopes] };
delete this.state.tokens[token];
try {
  this.saveState();
} catch (error) {
  this.state.tokens[token] = snapshot;  // rollback
  throw new Error('Failed to persist token revocation', { cause: error });
}
```

Finding #17.7 migration must follow the same pattern: take a snapshot of `state.tokens` BEFORE migrating, mutate in place, attempt `saveState()`, on failure restore the pre-migration snapshot and THROW (eager-init catches it at startup).

### State-file rename-on-corrupt (SOURCE: codebase `src/oauth/provider.ts:129-176`)

For #17.7 migration: if migration throws, do NOT fall back to empty state. Let the exception propagate out of `loadState()` — the eager-init pattern from PR-B1 (server.ts constructs the provider at startup) will catch it and exit non-zero.

### Integration test layout (SOURCE: codebase `src/integration/oauth-hardening.test.ts:14-44`)

- `createTempEnvRoot(prefix)` returns `{repoRoot, dataDir}` with isolated temp dirs.
- `Bun.spawn` with explicit env vars (`ORACLE_PORT`, `ORACLE_REPO_ROOT`, `ORACLE_DATA_DIR`, `MCP_AUTH_TOKEN`, `MCP_OAUTH_PIN`, `MCP_EXTERNAL_URL`).
- `waitForServer(baseUrl)` polls `/api/health`.
- `afterAll` kills all spawned processes and removes temp dirs.
- Each new test MUST use a unique port (avoid clashing with 47781/47782).

### Error shape (SOURCE: codebase `src/oauth/routes.ts:58-62`)

```typescript
return c.json(
  { error: 'unauthorized', error_description: 'Client registration requires a valid Bearer token' },
  401,
);
```

Mirror for /revoke 401 responses. Include `WWW-Authenticate: Basic realm="oauth"` header per RFC 7009.

## Files to Change

| File | Action | Insert At / Purpose |
|------|--------|---------------------|
| `src/oauth/provider.ts` | UPDATE | Add `validateRedirectUri` (static or module-level helper, ~line 300 before `registerClient`); call it in `registerClient` (line 313 after `redirect_uris:` construction) AND in `authorize` (line 358 area, before the `client.redirect_uris.includes()` check). Add `authenticateRevokeRequest(authHeader, formBody)` helper method. Refactor `state.tokens` access: `exchangeAuthorizationCode` (line 564), `verifyAccessToken` (line 597), `revokeToken` (line 639), `cleanExpiredTokens` (line 201) — all lookups/writes go through `sha256hex(token)`. Add `migrateTokenKeys(state)` static helper called from `loadState` after JSON.parse. Add `console.warn` in `loadState` for grandfathered invalid redirect_uris. Add `hashToken(token): string` private helper using `createHash('sha256').update(token).digest('hex')`. |
| `src/oauth/routes.ts` | UPDATE | `/revoke` handler (lines 176-209): parse Authorization header and form body; call `provider.authenticateRevokeRequest(...)` before `revokeToken`; pass authenticated clientId to `revokeToken(token, clientId)` so the provider can enforce token-client binding. Return 401 with `WWW-Authenticate: Basic realm="oauth"` on auth failure. Return 400 if both Basic AND form body present. |
| `src/oauth/provider.ts` | UPDATE | `revokeToken` signature: add optional `authenticatedClientId?: string` param. If provided and the token belongs to a different client, return silently (do NOT delete, do NOT throw) — matches RFC 7009 non-leak requirement. Existing no-auth internal callers (none currently, but keep back-compat by making param optional). |
| `src/integration/oauth-hardening.test.ts` | UPDATE | Extend with new `describe` blocks for the 3 findings. Use unique ports: 47783 (#17.4), 47784 (#17.5), 47785 (#17.7). |

No changes to `src/oauth/types.ts` needed — `OAuthState.tokens` remains `Record<string, OAuthTokenData>` (the key is now opaque SHA-256 hex, still a string).

## Integration Points

- `registerClient` caller: `src/oauth/routes.ts:78` (POST /register). When it throws from `validateRedirectUri`, the route handler already has a `try/catch` — extend it to distinguish validation errors (400) from persistence errors (503).
- `authorize` caller: `src/oauth/routes.ts:110-118`. The `validateRedirectUri` check happens inside `provider.authorize()` — no route handler change needed beyond error mapping.
- `verifyAccessToken` caller: `src/middleware/api-auth.ts` and MCP bearer-auth middleware (hash-before-lookup is transparent — takes the raw token as input, hashes internally).
- `/revoke` route already exists at `src/oauth/routes.ts:176-209`. Rewrite body; preserve the 500-on-persistence-failure behavior from PR-B1.

## NOT Building

- NOT adding refresh tokens (out of scope — PR-C).
- NOT rewriting `OAuthTokenData` shape — only the map key changes.
- NOT touching `/token` endpoint auth (handled in a future PR).
- NOT changing the static `MCP_AUTH_TOKEN` fallback path in `verifyAccessToken` (lines 617-633) — static tokens don't live in `state.tokens`.
- NOT auto-migrating grandfathered invalid redirect_uris — operator must re-register ("nothing deleted, only superseded").
- NOT expanding scope to files outside `src/oauth/*` or `src/integration/oauth-hardening.test.ts`.

## Step-by-Step Tasks

### Task 1 — Add `validateRedirectUri` helper

**ACTION**: CREATE helper at top of `src/oauth/provider.ts` (near `escapeHtml`, ~line 62).

**IMPLEMENT**:
```typescript
/**
 * RFC 8252-compliant redirect_uri allowlist.
 * - https://      — always allowed
 * - http://localhost or http://127.0.0.1 (any port, any path) — loopback per RFC 8252 §7.3
 * - everything else — rejected (javascript:, data:, ftp:, file:, custom schemes, non-loopback http://)
 * Throws RedirectUriValidationError on invalid input.
 */
export class RedirectUriValidationError extends Error {
  constructor(message: string) { super(message); this.name = 'RedirectUriValidationError'; }
}

export function validateRedirectUri(uri: string): void {
  if (typeof uri !== 'string' || uri.length === 0) {
    throw new RedirectUriValidationError('redirect_uri must be a non-empty string');
  }
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    throw new RedirectUriValidationError(`redirect_uri is not a valid URL: ${uri}`);
  }
  if (parsed.protocol === 'https:') return;
  if (parsed.protocol === 'http:') {
    const host = parsed.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1') return;
    throw new RedirectUriValidationError(`redirect_uri scheme http:// only allowed for loopback (got host=${host})`);
  }
  throw new RedirectUriValidationError(`redirect_uri scheme not allowed: ${parsed.protocol}`);
}
```

**MIRROR**: Standalone helper — no existing analog. Pattern "export class FooError extends Error" matches TypeScript idiom used elsewhere.

**GOTCHA**: `new URL('javascript:alert(1)')` parses successfully (protocol=`javascript:`). Do NOT assume URL constructor rejects malicious schemes — the allowlist is what protects us. Also `[::1]` — IPv6 loopback with brackets.

**VALIDATE**: `bun test src/oauth/__tests__/` still passes.

### Task 2 — Call `validateRedirectUri` in `registerClient`

**ACTION**: UPDATE `src/oauth/provider.ts:306-332`.

**IMPLEMENT**: After constructing `redirect_uris` from metadata, iterate and call `validateRedirectUri(uri)` on each. Before `this.state.clients[client_id] = client`. Let the error propagate — caller at `routes.ts:78` already has a try/catch.

**GOTCHA**: Must reject EMPTY `redirect_uris` array too (already handled at route level but add defense in depth: `if (client.redirect_uris.length === 0) throw new RedirectUriValidationError('at least one redirect_uri required')`).

**VALIDATE**: Task 8 integration test round 1.

### Task 3 — Map error in `/register` route handler

**ACTION**: UPDATE `src/oauth/routes.ts:76-88`.

**IMPLEMENT**: Catch `RedirectUriValidationError` specifically, return 400 with `{error: 'invalid_redirect_uri', error_description: err.message}`. Other errors stay 503.

```typescript
try {
  client = provider.registerClient({ ... });
} catch (err) {
  if (err instanceof RedirectUriValidationError) {
    return c.json({ error: 'invalid_redirect_uri', error_description: err.message }, 400);
  }
  return c.json({ error: 'temporarily_unavailable: failed to persist client registration' }, 503);
}
```

**IMPORTS**: `import { RedirectUriValidationError } from './provider.ts';` — export the class.

**VALIDATE**: Task 8 — POST /register with `javascript:` returns 400, not 503.

### Task 4 — Call `validateRedirectUri` in `authorize`

**ACTION**: UPDATE `src/oauth/provider.ts:344-395` (`authorize` method).

**IMPLEMENT**: After `if (!client.redirect_uris.includes(params.redirect_uri))` check at line 358, ADD a second-line-of-defense call:
```typescript
try { validateRedirectUri(params.redirect_uri); }
catch (err) {
  const msg = err instanceof RedirectUriValidationError ? err.message : 'invalid redirect_uri';
  return { error: `invalid redirect_uri: ${msg}` };
}
```

**RATIONALE**: The inclusion check at line 358 protects against "unregistered URIs" but does NOT re-validate the scheme — a client registered before this PR may have a grandfathered invalid URI in `state.clients`. Defense in depth.

**VALIDATE**: Task 8 — simulating a tampered state.clients record with `javascript:` URI → /authorize returns 400.

### Task 5 — Warn on load for grandfathered invalid redirect_uris

**ACTION**: UPDATE `src/oauth/provider.ts:129-176` (`loadState`).

**IMPLEMENT**: After successful JSON.parse, iterate `state.clients` and for each `redirect_uris[i]`, try `validateRedirectUri(uri)`. On failure, `console.warn('[OAuth] Grandfathered invalid redirect_uri for client=<id>: <uri> — operator must re-register')`. Do NOT throw, do NOT delete.

**GOTCHA**: This runs at construction time — make it tolerant of totally missing fields (e.g., `client.redirect_uris === undefined` from a truncated state file).

**VALIDATE**: Task 8 — seed state file with `data:text/html,x` URI, spawn server, check stderr contains the warning, check server still boots.

### Task 6 — Add `hashToken` helper + migrate `state.tokens` key scheme

**ACTION**: UPDATE `src/oauth/provider.ts` — add private method `hashToken(token: string): string` returning `createHash('sha256').update(token).digest('hex')`.

**IMPLEMENT**: Then refactor these sites to hash-before-access:
1. `exchangeAuthorizationCode` line 564: `this.state.tokens[this.hashToken(access_token)] = { ... }`. Rollback at line 573 uses same hash.
2. `verifyAccessToken` line 597: `const data = this.state.tokens[this.hashToken(token)];`. The cleanup-on-expired at line 600 uses same hash.
3. `cleanExpiredTokens` lines 201-206: iterating `Object.entries(this.state.tokens)` — the keys are now hashes, but we still just compare `data.expires_at < now` and delete by key. No change to logic, just note the key semantics changed.
4. `revokeToken` lines 638-668: `const hashed = this.hashToken(token); const current = this.state.tokens[hashed]; ... delete this.state.tokens[hashed]; ... this.state.tokens[hashed] = snapshot;`

**MIGRATION**: In `loadState`, after JSON.parse and before return, call `migrateTokenKeys(state)`:
```typescript
private static readonly TOKEN_HASH_PATTERN = /^[0-9a-f]{64}$/;
private migrateTokenKeys(state: OAuthState): number {
  const oldTokens = state.tokens;
  const migrated: Record<string, OAuthTokenData> = {};
  let count = 0;
  for (const [key, value] of Object.entries(oldTokens)) {
    if (OAuthProvider.TOKEN_HASH_PATTERN.test(key)) {
      // Already hashed — keep as-is
      migrated[key] = value;
    } else {
      // Raw token — hash and migrate
      const hashed = createHash('sha256').update(key).digest('hex');
      migrated[hashed] = value;
      count += 1;
    }
  }
  state.tokens = migrated;
  return count;
}
```

Call it from `loadState` after the JSON.parse success branch:
```typescript
const parsed = JSON.parse(raw) as OAuthState;
const migratedCount = this.migrateTokenKeys(parsed);
if (migratedCount > 0) {
  console.log(`[OAuth] Migrated ${migratedCount} token(s) from raw-key to sha256-key storage`);
  // Persist the migrated state immediately — but we're inside loadState,
  // so we can't call saveState (this.state not set yet). Instead, set a
  // flag and let the constructor call saveState after loadState returns.
}
return parsed;
```

**Simpler approach**: Track `this.needsPostLoadSave = true` as instance field, then at end of constructor after `this.state = this.loadState()`, check and call `this.saveState()`. If save fails, THROW (don't silent-fallback — PR-B1 eager-init lesson).

**GOTCHA**: Migration is idempotent — running it twice on already-hashed state is a no-op. The regex `^[0-9a-f]{64}$` distinguishes SHA-256 hex (exactly 64 chars of lowercase hex) from the current raw token format (`randomBytes(32).toString('hex')` which is ALSO 64 chars of hex). So the regex alone doesn't distinguish! Need another signal: currently tokens are 64-char hex, and after migration they're 64-char sha256-hex. They are INDISTINGUISHABLE by shape.

**RESOLUTION**: Use a version marker in state. Change `OAuthState` to include `tokenKeyVersion?: 'raw' | 'sha256'`. Default (absent) = 'raw' (for back-compat with existing state files). After migration, set to 'sha256'. Check marker at loadState to decide whether to migrate. Add to `types.ts`:

```typescript
export interface OAuthState {
  clients: Record<string, OAuthClientInfo>;
  tokens: Record<string, OAuthTokenData>;
  tokenKeyVersion?: 'raw' | 'sha256';  // v2: 'sha256' = keys are sha256(token). Absent = legacy raw-key.
}
```

Migration logic:
```typescript
private migrateTokenKeys(state: OAuthState): number {
  if (state.tokenKeyVersion === 'sha256') return 0;  // already migrated
  const migrated: Record<string, OAuthTokenData> = {};
  let count = 0;
  for (const [rawToken, value] of Object.entries(state.tokens ?? {})) {
    const hashed = createHash('sha256').update(rawToken).digest('hex');
    migrated[hashed] = value;
    count += 1;
  }
  state.tokens = migrated;
  state.tokenKeyVersion = 'sha256';
  return count;
}
```

**New tokens written after migration**: `exchangeAuthorizationCode` already goes through `this.hashToken(access_token)`, and `state.tokenKeyVersion` stays 'sha256' (it's set at load time; saveState persists the whole state including the marker).

**VALIDATE**: Task 8 — migration test: seed state file with `tokens: {rawtokenvalue: {...}}` and no `tokenKeyVersion`, spawn server, read state file after startup, verify `tokenKeyVersion === 'sha256'` and the key is `sha256(rawtokenvalue)`, then hit `/api/health` with the original raw token (via mcp bearer path) and confirm it still validates.

### Task 7 — Add `authenticateRevokeRequest` + enforce token-client binding in `revokeToken`

**ACTION**: UPDATE `src/oauth/provider.ts`.

**IMPLEMENT**: New method:

```typescript
/**
 * Authenticate a /revoke request per RFC 7009 §2.1.
 * Accepts client credentials via:
 *   - HTTP Basic (preferred): Authorization: Basic base64(client_id:client_secret)
 *   - Form body (fallback): client_id=X&client_secret=Y
 * Rejects if BOTH are present (RFC 6749 §2.3.1 — MUST use only one method).
 * Uses HMAC-normalized timingSafeEqual for client_secret compare.
 * Returns {ok: true, clientId} on success, or {ok: false, status, error, errorDescription} on failure.
 */
authenticateRevokeRequest(
  authHeader: string,
  formBody: { client_id?: string; client_secret?: string },
): { ok: true; clientId: string } | { ok: false; status: 400 | 401; error: string; errorDescription: string } {
  const hasBasic = authHeader.toLowerCase().startsWith('basic ');
  const hasForm = !!(formBody.client_id || formBody.client_secret);
  if (hasBasic && hasForm) {
    return { ok: false, status: 400, error: 'invalid_request', errorDescription: 'use only one client authentication method (RFC 6749 §2.3.1)' };
  }
  let clientId: string;
  let clientSecret: string;
  if (hasBasic) {
    let decoded: string;
    try {
      decoded = Buffer.from(authHeader.slice(6).trim(), 'base64').toString('utf-8');
    } catch {
      return { ok: false, status: 401, error: 'invalid_client', errorDescription: 'malformed Basic auth' };
    }
    const colonIdx = decoded.indexOf(':');
    if (colonIdx < 0) return { ok: false, status: 401, error: 'invalid_client', errorDescription: 'malformed Basic auth' };
    clientId = decoded.slice(0, colonIdx);
    clientSecret = decoded.slice(colonIdx + 1);
  } else if (hasForm) {
    clientId = formBody.client_id ?? '';
    clientSecret = formBody.client_secret ?? '';
  } else {
    return { ok: false, status: 401, error: 'invalid_client', errorDescription: 'client authentication required' };
  }
  if (!clientId || !clientSecret) {
    return { ok: false, status: 401, error: 'invalid_client', errorDescription: 'client_id and client_secret required' };
  }
  const client = this.state.clients[clientId];
  if (!client || !client.client_secret) {
    // Still run a constant-time compare against a dummy to equalize timing
    const dummy = createHmac('sha256', this.hmacKey).update('dummy-secret').digest();
    const providedDigest = createHmac('sha256', this.hmacKey).update(clientSecret).digest();
    timingSafeEqual(dummy, providedDigest);  // throw-away compare
    return { ok: false, status: 401, error: 'invalid_client', errorDescription: 'invalid credentials' };
  }
  const expectedDigest = createHmac('sha256', this.hmacKey).update(client.client_secret).digest();
  const providedDigest = createHmac('sha256', this.hmacKey).update(clientSecret).digest();
  if (!timingSafeEqual(expectedDigest, providedDigest)) {
    return { ok: false, status: 401, error: 'invalid_client', errorDescription: 'invalid credentials' };
  }
  return { ok: true, clientId };
}
```

**Update `revokeToken` signature**:

```typescript
revokeToken(token: string, authenticatedClientId?: string): void {
  const hashed = this.hashToken(token);
  const current = this.state.tokens[hashed];
  if (!current) return;  // RFC 7009: unknown token — 200, no-op

  // Token-client binding: if caller provided an authenticated clientId,
  // the token MUST belong to that client. Otherwise return silently
  // (per RFC 7009 §2.1, do not leak token existence to other clients).
  if (authenticatedClientId !== undefined && current.client_id !== authenticatedClientId) {
    console.warn(`[OAuth] /revoke: client ${authenticatedClientId} attempted to revoke token belonging to ${current.client_id} — ignored`);
    return;
  }

  const snapshot = { ...current, scopes: [...current.scopes] };
  delete this.state.tokens[hashed];
  try {
    this.saveState();
    console.log(`[OAuth] Token revoked (client=${current.client_id})`);
  } catch (error) {
    this.state.tokens[hashed] = snapshot;
    console.error('[OAuth] Token revocation failed to persist — state restored', error);
    throw new Error('Failed to persist token revocation', { cause: error });
  }
}
```

**GOTCHA**: `client_secret` is currently stored as plaintext hex in `state.clients` (see line 308 `randomBytes(24).toString('hex')`). We're hashing both sides with HMAC before compare — this is NOT bcrypt-style storage hardening, it's length-hiding for the timing-safe compare. Don't confuse the two concerns. Client-secret-at-rest hardening is a separate future PR.

**VALIDATE**: Task 8 — 6 test cases below.

### Task 8 — Rewrite `/revoke` route handler

**ACTION**: UPDATE `src/oauth/routes.ts:176-209`.

**IMPLEMENT**:

```typescript
app.post('/revoke', async (c) => {
  const authHeader = c.req.header('Authorization') ?? '';

  // Parse form body or JSON
  let formBody: { client_id?: string; client_secret?: string; token?: string } = {};
  const contentType = c.req.header('Content-Type') || '';
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await c.req.text();
    const params = new URLSearchParams(text);
    formBody = {
      client_id: params.get('client_id') ?? undefined,
      client_secret: params.get('client_secret') ?? undefined,
      token: params.get('token') ?? undefined,
    };
  } else {
    try {
      const body = await c.req.json() as Record<string, string>;
      formBody = { client_id: body.client_id, client_secret: body.client_secret, token: body.token };
    } catch {
      // ignore — no body, no client auth via form
    }
  }

  const provider = getOAuthProvider();
  const authResult = provider.authenticateRevokeRequest(authHeader, {
    client_id: formBody.client_id,
    client_secret: formBody.client_secret,
  });
  if (!authResult.ok) {
    const headers: Record<string, string> = {};
    if (authResult.status === 401) {
      headers['WWW-Authenticate'] = 'Basic realm="oauth"';
    }
    return c.json(
      { error: authResult.error, error_description: authResult.errorDescription },
      authResult.status,
      headers,
    );
  }

  const token = formBody.token;
  if (token) {
    try {
      provider.revokeToken(token, authResult.clientId);
    } catch (err) {
      console.error('[OAuth] /revoke: persistence failed', err);
      return c.json({ error: 'server_error', error_description: 'Revocation failed to persist' }, 500);
    }
  }

  return c.json({}, 200);
});
```

**GOTCHA**: Hono's `c.json(body, status, headers)` signature — confirm it accepts a headers object. If not, use `c.header('WWW-Authenticate', ...)` before `return c.json(...)`.

**VALIDATE**: Task 9 integration tests.

### Task 9 — Integration tests

**ACTION**: UPDATE `src/integration/oauth-hardening.test.ts`.

**IMPLEMENT**: Add three `describe` blocks.

**Port assignments**: #17.4 → 47783, #17.5 → 47784, #17.7 → 47785.

**Test checklist**:

#17.4 (redirect_uri validation):
- [ ] POST /register with `javascript:alert(1)` → 400 `invalid_redirect_uri`
- [ ] POST /register with `data:text/html,x` → 400
- [ ] POST /register with `http://evil.com/cb` → 400
- [ ] POST /register with `https://valid.example/cb` → 201
- [ ] POST /register with `http://localhost:9999/cb` → 201
- [ ] POST /register with `http://127.0.0.1:9999/cb` → 201
- [ ] loadState with pre-seeded state.json containing a grandfathered `data:` URI → server boots + stderr contains "Grandfathered invalid redirect_uri"

#17.5 (/revoke auth):
- [ ] POST /revoke without auth → 401 + `WWW-Authenticate: Basic realm="oauth"`
- [ ] POST /revoke with invalid Basic creds → 401
- [ ] POST /revoke with both Basic header AND form-body client_id/secret → 400
- [ ] POST /revoke with valid client A auth + token issued to client A → 200, token gone
- [ ] POST /revoke with valid client A auth + token issued to client B → 200, token still present (not leaked)
- [ ] POST /revoke with valid client A auth + nonexistent token → 200

#17.7 (hash-before-lookup):
- [ ] Seed state.json with `{clients: {...}, tokens: {"raw-token-abc": {...}}}` (no `tokenKeyVersion`). Spawn server. After startup, read state file → `tokenKeyVersion === 'sha256'` and key is `sha256hex('raw-token-abc')`.
- [ ] Same test: hit `/api/health` with `Authorization: Bearer raw-token-abc` → 200 (verifyAccessToken finds the hashed record).
- [ ] Issue a new token via the full OAuth flow → state file shows the new key is 64-char hex AND `tokenKeyVersion === 'sha256'`.
- [ ] Tampered token `raw-token-abd` (1 char changed) → /api/health returns 401. (Regression check for code-path parity.)

**GOTCHA**: `Bun.spawn` server startup is slow (~1-2s). Reuse one server per `describe` where possible; `waitForServer` before first test; kill in a per-describe `afterAll` (not top-level) so cross-describe isolation is clean. Alternative: ONE server per finding, factor helpers.

**GOTCHA (mock.module lesson from PR-B1)**: These are black-box integration tests via HTTP — no `mock.module` needed. If a test needs to bypass PIN to get a token quickly, either (a) use the static `MCP_AUTH_TOKEN` bearer path for reads, or (b) drive the full flow: register → authorize → parse state key from redirect → POST callback with correct PIN → exchange code → token. The existing lockout test uses flow (b) partially — mirror that.

**VALIDATE**: `bun run test:integration` — all 3 describe blocks green.

## Testing Strategy

### Unit vs Integration Split

- `validateRedirectUri` pure function → unit test in `src/oauth/__tests__/provider-redirect-uri.test.ts` (NEW). Fast (<100ms total).
- `authenticateRevokeRequest` method → unit test in same new file or `src/oauth/__tests__/provider-revoke-auth.test.ts` (NEW). Can be tested without spawning a server — just construct `OAuthProvider`, register a client, call the method directly.
- `migrateTokenKeys` → unit test by constructing a provider with a pre-seeded state file in a temp dir.
- End-to-end HTTP flows → integration tests as listed in Task 9.

### Test Data

- Valid redirect URIs: `https://example.com/cb`, `http://localhost/cb`, `http://127.0.0.1:9999/oauth/callback`
- Invalid: `javascript:alert(1)`, `data:text/html,x`, `ftp://files.example/cb`, `file:///tmp/cb`, `http://evil.example/cb`, `custom-scheme://callback`
- Tokens: `randomBytes(32).toString('hex')` → 64 chars of hex

### Coverage target

New code ≥ 90% line coverage. Unit tests cover all branches of `validateRedirectUri` and `authenticateRevokeRequest`. Integration tests cover end-to-end happy and sad paths.

## Validation Commands

### Level 1 — Static Analysis
```bash
bun run build   # tsc --noEmit — type check
```

### Level 2 — Unit Tests
```bash
bun run test:unit
```

### Level 3 — Full Integration Suite
```bash
bun run test:integration
```

### Level 4 — Manual smoke (post-merge, on server)
```bash
curl -sS https://oracle.goko.digital/.well-known/oauth-authorization-server | jq
curl -sS -X POST https://oracle.goko.digital/revoke -d 'token=bogus'  # expect 401 now
```

### Level 5 — Full build
```bash
bun run build && bun test
```

## Confidence Score

**9/10** (Patterns:2 + Gotchas:2 + Integration:2 + Validation:2 + Testing:1)

- Patterns 2/2: PR-B1 established HMAC, deep-copy rollback, eager-init — reusing them.
- Gotchas 2/2: identified URL-constructor parses javascript:, SHA-256-hex vs raw-hex collision (needed version marker), mock.module isolation.
- Integration 2/2: file:line refs throughout; routes handler mapping explicit.
- Validation 2/2: all 3 levels defined with exact commands.
- Testing 1/2: integration test flow is well-defined but the hash-migration test is subtle — will likely need 1 round of iteration.

Risk: the `revokeToken` signature change adds an optional param; callers outside `routes.ts` (if any) won't enforce binding. Quick grep pre-commit to confirm no other callers. PR-B1 path used `getOAuthProvider().revokeToken(token)` from exactly one site.

## Acceptance Criteria

- [ ] `validateRedirectUri` exported from `provider.ts`, rejects all disallowed schemes, accepts https + loopback.
- [ ] `registerClient` throws `RedirectUriValidationError` on any invalid URI; `/register` returns 400.
- [ ] `/authorize` re-validates redirect_uri and returns 400 on tampered state.
- [ ] `loadState` warns on grandfathered invalid URIs but does not throw or delete.
- [ ] `/revoke` requires client auth (Basic or form); returns 401 + WWW-Authenticate on missing/invalid; 400 if both present.
- [ ] `revokeToken(token, clientId)` silently ignores cross-client revoke attempts (returns 200 to the HTTP caller, token remains).
- [ ] `state.tokens` keyed by sha256(token); `tokenKeyVersion: 'sha256'` marker set.
- [ ] `loadState` migrates legacy raw-key state in place, persists, logs count. Idempotent.
- [ ] Migration failure propagates (no silent empty-state fallback).
- [ ] All existing unit + integration tests still pass.
- [ ] New integration tests cover all 6/6/4 cases from Task 9.
- [ ] `bun run build && bun test` exits 0.
- [ ] PR body uses `Refs #17`, links PR #21 and #22, lists 3 findings with file:line.
- [ ] Commit message: `fix(oauth): close architectural hardening cluster from #716 review (#17 PR-B2)`.

## Completion Checklist

- [ ] Level 1 type-check passes
- [ ] Level 2 unit tests pass
- [ ] Level 3 integration tests pass
- [ ] No `console.log` debug noise left in production paths
- [ ] `grep -rn "state\.tokens\[" src/oauth/` — every access goes via `hashToken`
- [ ] `grep -n "revokeToken(" src/` — only one caller outside provider.ts (routes.ts), passes clientId

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Migration corrupts token state on partial-write crash | Low | High | Reuse existing `saveState` atomic temp-file+rename. If save fails post-migrate, rollback `state.tokens` to pre-migration snapshot and THROW (eager-init catches). |
| `client_secret` stored plaintext in state.clients is weaker than bcrypt | Medium | Medium | Explicit out-of-scope note. Timing-safe compare closes the immediate attack surface (compare-time leak) — at-rest hardening is a separate PR. |
| Hono `c.json(body, status, headersObj)` 3-arg form not supported → `WWW-Authenticate` missing | Low | Low | Fallback: `c.header('WWW-Authenticate', 'Basic realm="oauth"'); return c.json(...)`. Task 8 test covers header presence. |
| `revokeToken` signature change breaks an unknown caller | Low | Low | New param is optional; back-compat for any caller omitting it (no binding enforcement). Grep confirms single caller. |
| Integration tests flake on slow server startup | Medium | Low | `waitForServer` already polls `/api/health` with 30×500ms retries. Add per-test timeout 30s. |

## Technical Design

### API Contract — POST /revoke (changed)

| Field | Before | After |
|-------|--------|-------|
| Auth required | No | Yes (RFC 7009) |
| Methods | None | HTTP Basic OR form `client_id`+`client_secret` (mutually exclusive) |
| Unknown token | 200 | 200 (unchanged) |
| Wrong-client token | 200 (token revoked!) | 200 (token preserved, no leak) |
| Missing auth | — | 401 + `WWW-Authenticate: Basic realm="oauth"` |
| Both Basic + form | — | 400 `invalid_request` |
| Invalid creds | — | 401 `invalid_client` |

### State Schema Migration

```
// v1 (legacy, implicit)
{
  "clients": { ... },
  "tokens": {
    "raw-hex-token-value": { "client_id": "...", "expires_at": ..., "scopes": [...] }
  }
}

// v2 (sha256-keyed)
{
  "clients": { ... },
  "tokens": {
    "sha256-hex-of-raw-token": { "client_id": "...", "expires_at": ..., "scopes": [...] }
  },
  "tokenKeyVersion": "sha256"
}
```

Migration: on `loadState`, if `tokenKeyVersion !== 'sha256'`, re-key all entries via `createHash('sha256').update(rawKey).digest('hex')` and set the marker. Save immediately (in constructor, after `loadState` returns).

Rollback plan: the `.corrupt` rename behavior from PR-B1 already covers unparseable state files. If migration itself fails (e.g., disk full during save), provider throws at construction → server fails eager-init → operator restores from backup. No silent partial migration.
