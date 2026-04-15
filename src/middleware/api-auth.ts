/**
 * /api/* Bearer Token Auth Middleware
 *
 * Protects /api/* routes (search, list, forum, settings, supersede, traces,
 * etc.) behind a Bearer token. Mounted via `app.use('/api/*', …)` so Hono's
 * router decides path matching — this middleware does NOT do its own path
 * filtering, which avoids URL normalisation / dot-segment / encoding bypasses
 * that a string-prefix check (`startsWith('/api/')`) would expose.
 *
 * Design:
 * - **Factory pattern**: `createApiAuthMiddleware(token)` returns a configured
 *   middleware. Tests inject a token directly; production wires
 *   `ORACLE_API_TOKEN` from config at startup. This avoids module-cache
 *   gymnastics in test isolation.
 * - **Optional-enforce**: if the configured token is empty, the middleware
 *   ALLOWS all requests through (backward-compat deployment window for
 *   issue #12 Stage 2 rollout). When the token is set, every gated request
 *   must carry `Authorization: Bearer <token>` matching exactly. A
 *   follow-up PR will retire optional-enforce after all clients ship.
 * - The path `/api/health` is always exempted so liveness probes
 *   (auto-ops watchdog, k8s-style monitors) keep working with no special
 *   config.
 * - OPTIONS preflight is always allowed so browser CORS preflight reaches
 *   the actual request handler without a 401 that would surface as an
 *   opaque CORS failure on the client side.
 * - **Token comparison** uses HMAC normalisation + `timingSafeEqual` so the
 *   compare runs in constant time regardless of input length. The HMAC key
 *   is fresh per process via `randomBytes(32)` — its only job is to give
 *   `timingSafeEqual` two equal-length digests; secrecy is not required.
 *
 * This middleware does NOT cover the /mcp endpoint (separate
 * `MCP_AUTH_TOKEN` / OAuth path in server.ts, unchanged).
 *
 * Refs: issue #12 Stage 2.
 */

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { MiddlewareHandler } from 'hono';

const HEALTH_PATH = '/api/health';
const BEARER_PREFIX = 'Bearer ';

export function createApiAuthMiddleware(token: string): MiddlewareHandler {
  // Per-process random key. Used only to normalise comparison inputs to
  // equal length via HMAC-SHA256 before timingSafeEqual sees them. Defeats
  // the length-leak side channel in raw timingSafeEqual (which throws on
  // unequal input lengths and can otherwise leak match progress).
  const hmacKey = randomBytes(32);

  function constantTimeEquals(a: string, b: string): boolean {
    const ah = createHmac('sha256', hmacKey).update(a).digest();
    const bh = createHmac('sha256', hmacKey).update(b).digest();
    return timingSafeEqual(ah, bh);
  }

  const configuredToken = token.trim();

  return async (c, next) => {
    // CORS preflight always passes. Browsers send OPTIONS without an
    // Authorization header to discover allowed methods/headers; blocking
    // it here would surface as an opaque CORS failure, not a clear 401.
    if (c.req.method === 'OPTIONS') {
      return next();
    }

    // Health probe always exempt regardless of enforcement state.
    if (c.req.path === HEALTH_PATH) {
      return next();
    }

    // Optional-enforce: no token configured → allow (compat deployment
    // window). When the token is provisioned in env, this branch goes away.
    if (!configuredToken) {
      return next();
    }

    const authHeader = c.req.header('Authorization') || '';
    if (!authHeader.startsWith(BEARER_PREFIX)) {
      return c.json({ error: 'Unauthorized: missing Bearer token' }, 401);
    }

    const presented = authHeader.slice(BEARER_PREFIX.length).trim();
    if (!presented || !constantTimeEquals(presented, configuredToken)) {
      return c.json({ error: 'Unauthorized: invalid token' }, 401);
    }

    return next();
  };
}
