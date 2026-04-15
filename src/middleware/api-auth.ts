/**
 * /api/* Bearer Token Auth Middleware
 *
 * Protects unauthenticated /api/* routes (search, list, forum, settings,
 * supersede, traces, etc.) behind a Bearer token.
 *
 * Design:
 * - Optional-enforce: if `ORACLE_API_TOKEN` env is unset/empty, the middleware
 *   ALLOWS all requests (backward-compatible with current clients). This is
 *   the deployment window during which clients are coordinated to start
 *   sending the Bearer header. A separate follow-up PR will flip this to
 *   required-enforce once all callers are confirmed sending tokens.
 * - When the token IS set, every /api/* request must carry
 *   `Authorization: Bearer <token>` matching exactly. Comparison uses
 *   timing-safe equality to avoid leaking match progress under load.
 * - `/api/health` is always exempted from auth so liveness probes and
 *   monitoring (auto-ops watchdog) keep working with no special config.
 *
 * This middleware does NOT cover the /mcp endpoint, which has its own
 * MCP_AUTH_TOKEN / OAuth path in server.ts. /mcp remains gated by that.
 *
 * Refs: issue #12 Stage 2 — full timeline in the issue tracker.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import type { MiddlewareHandler } from 'hono';
import { ORACLE_API_TOKEN } from '../config.ts';

const HEALTH_PATH = '/api/health';

// HMAC key for timing-safe comparison. Using a process-lifetime random key
// means an attacker cannot pre-compute valid HMACs even if they obtain the
// token by some other means; comparison normalises both sides through HMAC
// before timingSafeEqual sees them, defeating length-leak side channels.
const _hmacKey = createHmac('sha256', String(Math.random())).digest();

function constantTimeEquals(a: string, b: string): boolean {
  const ah = createHmac('sha256', _hmacKey).update(a).digest();
  const bh = createHmac('sha256', _hmacKey).update(b).digest();
  return timingSafeEqual(ah, bh);
}

export const apiAuthMiddleware: MiddlewareHandler = async (c, next) => {
  // Only gate /api/* — other routes (/, /mcp, /oauth/*, etc.) are unaffected
  if (!c.req.path.startsWith('/api/')) {
    return next();
  }

  // Always allow health probes through
  if (c.req.path === HEALTH_PATH) {
    return next();
  }

  // Optional-enforce: no token configured → allow (compat window)
  if (!ORACLE_API_TOKEN) {
    return next();
  }

  // Token configured → require Bearer header
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
