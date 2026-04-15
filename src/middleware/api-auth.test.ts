/**
 * Unit tests for the /api/* Bearer auth middleware factory.
 *
 * Uses the `createApiAuthMiddleware(token)` factory directly so each test
 * builds an isolated middleware with a known token — no env mutation, no
 * module re-import gymnastics, no module-cache assumptions.
 *
 * Mount path mirrors production: `app.use('/api/*', mw)` so Hono's router
 * decides path matching.
 */

import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { createApiAuthMiddleware } from './api-auth.ts';

const TEST_TOKEN = 'test-token-9c3a7b1e-f482-49ad';

function buildApp(token: string) {
  const app = new Hono();
  app.use('/api/*', createApiAuthMiddleware(token));
  app.get('/api/search', (c) => c.json({ ok: true, route: 'search' }));
  app.options('/api/search', (c) => c.json({ ok: true, route: 'search-options' }));
  app.get('/api/health', (c) => c.json({ ok: true, route: 'health' }));
  app.get('/mcp', (c) => c.json({ ok: true, route: 'mcp' }));
  app.get('/', (c) => c.json({ ok: true, route: 'root' }));
  return app;
}

describe('createApiAuthMiddleware — startup validation', () => {
  it('throws when token is empty string', () => {
    expect(() => createApiAuthMiddleware('')).toThrow(/ORACLE_API_TOKEN is required/);
  });

  it('throws when token is whitespace-only', () => {
    expect(() => createApiAuthMiddleware('   ')).toThrow(/ORACLE_API_TOKEN is required/);
  });
});

describe('createApiAuthMiddleware — enforce mode (token set)', () => {
  it('rejects /api/* with 401 when Authorization missing', async () => {
    const app = buildApp(TEST_TOKEN);
    const res = await app.request('/api/search');
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/missing/i);
  });

  it('rejects /api/* with 401 on non-Bearer scheme', async () => {
    const app = buildApp(TEST_TOKEN);
    const res = await app.request('/api/search', {
      headers: { Authorization: `Basic ${TEST_TOKEN}` },
    });
    expect(res.status).toBe(401);
  });

  it('rejects /api/* with 401 when Bearer token is empty', async () => {
    const app = buildApp(TEST_TOKEN);
    const res = await app.request('/api/search', {
      headers: { Authorization: 'Bearer ' },
    });
    expect(res.status).toBe(401);
  });

  it('rejects /api/* with 401 when Bearer token is wrong', async () => {
    const app = buildApp(TEST_TOKEN);
    const res = await app.request('/api/search', {
      headers: { Authorization: 'Bearer wrong-token-value' },
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/invalid/i);
  });

  it('accepts /api/* with correct Bearer token', async () => {
    const app = buildApp(TEST_TOKEN);
    const res = await app.request('/api/search', {
      headers: { Authorization: `Bearer ${TEST_TOKEN}` },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, route: 'search' });
  });

  it('accepts /api/* when Bearer header has extra whitespace around token', async () => {
    const app = buildApp(TEST_TOKEN);
    const res = await app.request('/api/search', {
      headers: { Authorization: `Bearer   ${TEST_TOKEN}   ` },
    });
    expect(res.status).toBe(200);
  });
});

describe('createApiAuthMiddleware — exemptions', () => {
  it('always allows /api/health (no header)', async () => {
    const app = buildApp(TEST_TOKEN);
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, route: 'health' });
  });

  it('always allows /api/health (with wrong header)', async () => {
    const app = buildApp(TEST_TOKEN);
    const res = await app.request('/api/health', {
      headers: { Authorization: 'Bearer wrong' },
    });
    expect(res.status).toBe(200);
  });

  it('allows OPTIONS preflight without Authorization (CORS preflight)', async () => {
    const app = buildApp(TEST_TOKEN);
    const res = await app.request('/api/search', { method: 'OPTIONS' });
    expect(res.status).toBe(200);
  });
});

describe('createApiAuthMiddleware — non-/api paths unaffected', () => {
  it('does not touch /mcp', async () => {
    const app = buildApp(TEST_TOKEN);
    const res = await app.request('/mcp');
    expect(res.status).toBe(200);
  });

  it('does not touch root /', async () => {
    const app = buildApp(TEST_TOKEN);
    const res = await app.request('/');
    expect(res.status).toBe(200);
  });
});
