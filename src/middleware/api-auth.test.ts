/**
 * Unit tests for /api/* Bearer auth middleware.
 *
 * Covers the three configuration states:
 *   1. Token unset → optional-enforce (allow all) — backward compat window
 *   2. Token set + missing/wrong header → 401
 *   3. Token set + correct header → pass through
 *   4. /api/health is always exempted regardless of token state
 *   5. Non-/api/* paths are not gated
 *
 * The middleware is imported via dynamic import after setting/clearing
 * process.env.ORACLE_API_TOKEN so each test gets a fresh module evaluation
 * with the correct env state. Hono's request lifecycle is exercised via
 * a small in-test app rather than a full server spawn.
 */

import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { Hono } from 'hono';

const TEST_TOKEN = 'test-token-9c3a7b1e-f482-49ad';

async function buildApp() {
  // Re-import so the middleware reads the current env value
  delete require.cache?.[require.resolve('./api-auth.ts')];
  delete require.cache?.[require.resolve('../config.ts')];
  const { apiAuthMiddleware } = await import(`./api-auth.ts?cache=${Date.now()}`);
  const app = new Hono();
  app.use('*', apiAuthMiddleware);
  app.get('/api/search', (c) => c.json({ ok: true, route: 'search' }));
  app.get('/api/health', (c) => c.json({ ok: true, route: 'health' }));
  app.get('/mcp', (c) => c.json({ ok: true, route: 'mcp' }));
  app.get('/', (c) => c.json({ ok: true, route: 'root' }));
  return app;
}

describe('apiAuthMiddleware', () => {
  let savedToken: string | undefined;

  beforeEach(() => {
    savedToken = process.env.ORACLE_API_TOKEN;
  });

  afterEach(() => {
    if (savedToken === undefined) delete process.env.ORACLE_API_TOKEN;
    else process.env.ORACLE_API_TOKEN = savedToken;
  });

  it('allows /api/* without auth when ORACLE_API_TOKEN is unset (compat window)', async () => {
    delete process.env.ORACLE_API_TOKEN;
    const app = await buildApp();
    const res = await app.request('/api/search');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, route: 'search' });
  });

  it('allows /api/* without auth when ORACLE_API_TOKEN is empty string', async () => {
    process.env.ORACLE_API_TOKEN = '';
    const app = await buildApp();
    const res = await app.request('/api/search');
    expect(res.status).toBe(200);
  });

  it('allows /api/* without auth when ORACLE_API_TOKEN is whitespace-only', async () => {
    process.env.ORACLE_API_TOKEN = '   ';
    const app = await buildApp();
    const res = await app.request('/api/search');
    expect(res.status).toBe(200);
  });

  it('rejects /api/* with 401 when token set and Authorization header missing', async () => {
    process.env.ORACLE_API_TOKEN = TEST_TOKEN;
    const app = await buildApp();
    const res = await app.request('/api/search');
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/missing/i);
  });

  it('rejects /api/* with 401 when Authorization header is not Bearer scheme', async () => {
    process.env.ORACLE_API_TOKEN = TEST_TOKEN;
    const app = await buildApp();
    const res = await app.request('/api/search', {
      headers: { Authorization: `Basic ${TEST_TOKEN}` },
    });
    expect(res.status).toBe(401);
  });

  it('rejects /api/* with 401 when Bearer token is empty', async () => {
    process.env.ORACLE_API_TOKEN = TEST_TOKEN;
    const app = await buildApp();
    const res = await app.request('/api/search', {
      headers: { Authorization: 'Bearer ' },
    });
    expect(res.status).toBe(401);
  });

  it('rejects /api/* with 401 when Bearer token is wrong', async () => {
    process.env.ORACLE_API_TOKEN = TEST_TOKEN;
    const app = await buildApp();
    const res = await app.request('/api/search', {
      headers: { Authorization: 'Bearer wrong-token-value' },
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/invalid/i);
  });

  it('accepts /api/* with correct Bearer token', async () => {
    process.env.ORACLE_API_TOKEN = TEST_TOKEN;
    const app = await buildApp();
    const res = await app.request('/api/search', {
      headers: { Authorization: `Bearer ${TEST_TOKEN}` },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, route: 'search' });
  });

  it('always allows /api/health regardless of token state (no header)', async () => {
    process.env.ORACLE_API_TOKEN = TEST_TOKEN;
    const app = await buildApp();
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, route: 'health' });
  });

  it('always allows /api/health regardless of token state (with wrong header)', async () => {
    process.env.ORACLE_API_TOKEN = TEST_TOKEN;
    const app = await buildApp();
    const res = await app.request('/api/health', {
      headers: { Authorization: 'Bearer wrong' },
    });
    expect(res.status).toBe(200);
  });

  it('does not gate /mcp (handled by separate MCP auth)', async () => {
    process.env.ORACLE_API_TOKEN = TEST_TOKEN;
    const app = await buildApp();
    const res = await app.request('/mcp');
    expect(res.status).toBe(200);
  });

  it('does not gate root (/) or non-/api/* paths', async () => {
    process.env.ORACLE_API_TOKEN = TEST_TOKEN;
    const app = await buildApp();
    const res = await app.request('/');
    expect(res.status).toBe(200);
  });
});
