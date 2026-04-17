---
pr: 18
branch: "feat/api-auth-middleware-12"
extracted: 2026-04-15T20:15:00+07:00
files_changed: 4
---

# PR Review Context: #18 — feat(server): /api/* Bearer auth middleware (#12 Stage 2A)

## PR Metadata
- **Author**: gobikom
- **Branch**: feat/api-auth-middleware-12 → main
- **State**: OPEN
- **Size**: +238 / -1 across 4 files
- **Repo**: gobikom/arra-oracle-v3 (production fork)

## Why
Closes the second half of issue #12. PR #14 (Stage 1) bound the server to loopback. Stage 2A adds application-layer Bearer auth on `/api/*` routes in **optional-enforce** mode — when `ORACLE_API_TOKEN` env is unset (current state), middleware allows all requests through. This is the rollout window before client PRs and the final required-enforce flip.

## Changed Files
- `src/middleware/api-auth.ts` (new, 73 LOC) — Hono middleware
- `src/middleware/api-auth.test.ts` (new, 12 tests, all pass)
- `src/config.ts` (+11 — `ORACLE_API_TOKEN` export with `.trim()` guard, matches `ORACLE_BIND_HOST` pattern from PR #14)
- `src/server.ts` (+3 — mount middleware before route registration, new startup banner line)

## Key Code Paths

### `src/middleware/api-auth.ts`
```ts
const HEALTH_PATH = '/api/health';
const _hmacKey = createHmac('sha256', String(Math.random())).digest();

function constantTimeEquals(a: string, b: string): boolean {
  const ah = createHmac('sha256', _hmacKey).update(a).digest();
  const bh = createHmac('sha256', _hmacKey).update(b).digest();
  return timingSafeEqual(ah, bh);
}

export const apiAuthMiddleware: MiddlewareHandler = async (c, next) => {
  if (!c.req.path.startsWith('/api/')) return next();
  if (c.req.path === HEALTH_PATH) return next();
  if (!ORACLE_API_TOKEN) return next();  // optional-enforce compat window

  const authHeader = c.req.header('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized: missing Bearer token' }, 401);
  }
  const presented = authHeader.slice('Bearer '.length).trim();
  if (!presented || !constantTimeEquals(presented, ORACLE_API_TOKEN)) {
    return c.json({ error: 'Unauthorized: invalid token' }, 401);
  }
  return next();
};
```

### `src/config.ts` addition
```ts
export const ORACLE_API_TOKEN = (process.env.ORACLE_API_TOKEN || '').trim();
```

### `src/server.ts` mount
```ts
// /api/* Bearer token auth (issue #12 Stage 2). Optional-enforce until
// ORACLE_API_TOKEN env is set; /api/health is always exempted.
app.use('*', apiAuthMiddleware);

// Register all route modules (order matters: auth middleware first)
registerAuthRoutes(app);
```

Mount order in server.ts:
1. CORS (`*`)
2. Security headers (`*`)
3. **apiAuthMiddleware (`*`)** ← new
4. `registerAuthRoutes` ... `registerSupersedeRoutes` (all routes)
5. OAuth routes (conditional on `MCP_OAUTH_PIN`)
6. `/mcp` CORS + handler

## Project Guidelines
- TypeScript strict, Bun runtime (not Node)
- Config via `src/config.ts` exports only — no raw `process.env` outside that module
- Hono framework, MiddlewareHandler type from hono
- Existing /mcp Bearer pattern at `src/server.ts:128-160` uses `MCP_AUTH_TOKEN`, HMAC-key + timingSafeEqual — middleware mirrors this exactly
- Test framework: bun:test (`describe`, `it`, `expect`, `beforeEach`, `afterEach`)

## Test Coverage
- 12 unit tests, all 12 passing on Bun 1.3.10 (verified locally)
- Test file uses dynamic re-import to give each test fresh module evaluation with the correct env state
- Coverage: compat-mode (3 envs), 401 paths (4 variants), 200 success, health exemption (2), /mcp pass-through, root pass-through

## Out of Scope for This PR
- Token provisioning (~/.secrets/oracle-api.env, systemd EnvironmentFile) — operational deploy step after merge
- 3 client PRs (my-ai-soul-mcp, auto-ops, arra-oracle-skills) — separate cross-repo PRs in Stage 2B
- Flip middleware from optional → required — separate Stage 2C PR after clients verified
- Touching /mcp auth (unchanged, separate code path)
- /api/health response shape (unchanged)
