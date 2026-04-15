/**
 * OAuth /revoke route — HTTP contract tests
 *
 * Covers issue #17 PR-B1 fix #2 at the route-handler layer. The unit test
 * in provider-silent-failures.test.ts verifies that revokeToken throws on
 * saveState failure; this file verifies the /revoke route handler catches
 * that throw and returns HTTP 500 with the expected error body instead of
 * a 200 that would lie to the client about revocation success.
 *
 * The route handler is the client-observable contract — if someone
 * accidentally removes the try/catch, a unit test on the provider alone
 * would still pass but every client would get false revocation successes.
 */

import { describe, expect, test, beforeEach, afterAll, mock } from 'bun:test';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { Hono } from 'hono';

const TEST_PIN = '1234';
const TEST_AUTH_TOKEN = 'test-mcp-bearer-token-abcdef123456';
const TEST_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'oauth-routes-test-'));

mock.module('../../config.ts', () => ({
  MCP_OAUTH_PIN: TEST_PIN,
  MCP_EXTERNAL_URL: 'http://127.0.0.1:47778',
  ORACLE_DATA_DIR: TEST_DATA_DIR,
  MCP_AUTH_TOKEN: TEST_AUTH_TOKEN,
}));

const { getOAuthProvider, resetOAuthProvider } = await import('../provider.ts');
const { registerOAuthRoutes } = await import('../routes.ts');

function cleanDataDir(): void {
  for (const file of fs.readdirSync(TEST_DATA_DIR)) {
    fs.rmSync(path.join(TEST_DATA_DIR, file), { force: true, recursive: true });
  }
}

function makeApp(): Hono {
  resetOAuthProvider();
  const app = new Hono();
  registerOAuthRoutes(app);
  return app;
}

beforeEach(cleanDataDir);

afterAll(() => {
  fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
});

describe('POST /revoke (fix #17.2 — route layer)', () => {
  test('returns 200 for a nonexistent token (RFC 7009 no-op)', async () => {
    const app = makeApp();
    const res = await app.request('/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: 'nonexistent' }).toString(),
    });
    expect(res.status).toBe(200);
  });

  test('returns 200 for missing token parameter (RFC 7009 no-op)', async () => {
    const app = makeApp();
    const res = await app.request('/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: '',
    });
    expect(res.status).toBe(200);
  });

  test('returns 500 with server_error body when saveState throws during revocation', async () => {
    const app = makeApp();
    const provider = getOAuthProvider();

    // Seed a real token directly into internal state.
    const providerAny = provider as unknown as {
      state: { tokens: Record<string, unknown> };
      saveState: () => void;
    };
    providerAny.state.tokens['tkn-route-500'] = {
      client_id: 'test',
      scopes: ['read'],
      expires_at: Date.now() + 60_000,
    };

    const originalSave = providerAny.saveState.bind(provider);
    providerAny.saveState = () => { throw new Error('disk full (simulated)'); };

    try {
      const res = await app.request('/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: 'tkn-route-500' }).toString(),
      });
      expect(res.status).toBe(500);
      const body = (await res.json()) as { error: string; error_description?: string };
      expect(body.error).toBe('server_error');
      expect(body.error_description).toMatch(/persist/i);
    } finally {
      providerAny.saveState = originalSave;
    }

    // After the failure, the token must still be present (rollback worked).
    expect(provider.getTokenCount()).toBe(1);
  });

  test('returns 200 on successful revocation of an existing token', async () => {
    const app = makeApp();
    const provider = getOAuthProvider();

    const providerAny = provider as unknown as {
      state: { tokens: Record<string, unknown> };
    };
    providerAny.state.tokens['tkn-ok'] = {
      client_id: 'test',
      scopes: ['read'],
      expires_at: Date.now() + 60_000,
    };
    expect(provider.getTokenCount()).toBe(1);

    const res = await app.request('/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: 'tkn-ok' }).toString(),
    });
    expect(res.status).toBe(200);
    expect(provider.getTokenCount()).toBe(0);
  });
});
