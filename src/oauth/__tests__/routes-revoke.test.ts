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
import { createHash } from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { Hono } from 'hono';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function basicAuth(clientId: string, clientSecret: string): string {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
}

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

/**
 * Helper: register a client and return its credentials. Used by every
 * /revoke test in PR-B2 because the endpoint now requires RFC 7009
 * client authentication (finding #17.5).
 */
function registerTestClient(): { clientId: string; clientSecret: string } {
  const provider = getOAuthProvider();
  const client = provider.registerClient({
    redirect_uris: ['https://test.example/cb'],
    client_name: 'test-client',
  });
  return { clientId: client.client_id, clientSecret: client.client_secret! };
}

describe('POST /revoke (fix #17.2 — route layer, updated for PR-B2 client auth)', () => {
  test('returns 200 for a nonexistent token (RFC 7009 no-op) when authenticated', async () => {
    const app = makeApp();
    const { clientId, clientSecret } = registerTestClient();
    const res = await app.request('/revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': basicAuth(clientId, clientSecret),
      },
      body: new URLSearchParams({ token: 'nonexistent' }).toString(),
    });
    expect(res.status).toBe(200);
  });

  test('returns 401 when unauthenticated (finding #17.5)', async () => {
    const app = makeApp();
    const res = await app.request('/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: 'nonexistent' }).toString(),
    });
    expect(res.status).toBe(401);
    expect(res.headers.get('WWW-Authenticate')).toBe('Basic realm="oauth"');
  });

  test('returns 401 for missing token parameter without auth', async () => {
    const app = makeApp();
    const res = await app.request('/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: '',
    });
    // No auth → 401 before even looking at the token.
    expect(res.status).toBe(401);
  });

  test('returns 500 with server_error body when saveState throws during revocation', async () => {
    const app = makeApp();
    const { clientId, clientSecret } = registerTestClient();
    const provider = getOAuthProvider();

    const providerAny = provider as unknown as {
      state: { tokens: Record<string, unknown> };
      saveState: () => void;
    };
    providerAny.state.tokens[hashToken('tkn-route-500')] = {
      client_id: clientId,
      scopes: ['read'],
      expires_at: Date.now() + 60_000,
    };

    const originalSave = providerAny.saveState.bind(provider);
    providerAny.saveState = () => { throw new Error('disk full (simulated)'); };

    try {
      const res = await app.request('/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': basicAuth(clientId, clientSecret),
        },
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
    const { clientId, clientSecret } = registerTestClient();
    const provider = getOAuthProvider();

    const providerAny = provider as unknown as {
      state: { tokens: Record<string, unknown> };
    };
    providerAny.state.tokens[hashToken('tkn-ok')] = {
      client_id: clientId,
      scopes: ['read'],
      expires_at: Date.now() + 60_000,
    };
    expect(provider.getTokenCount()).toBe(1);

    const res = await app.request('/revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': basicAuth(clientId, clientSecret),
      },
      body: new URLSearchParams({ token: 'tkn-ok' }).toString(),
    });
    expect(res.status).toBe(200);
    expect(provider.getTokenCount()).toBe(0);
  });
});

describe('POST /revoke — PR-B2 RFC 7009 client authentication (#17.5)', () => {
  test('401 with invalid Basic credentials', async () => {
    const app = makeApp();
    registerTestClient(); // ensure at least one client exists
    const res = await app.request('/revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': basicAuth('oracle-nosuch', 'bogus-secret'),
      },
      body: new URLSearchParams({ token: 'any' }).toString(),
    });
    expect(res.status).toBe(401);
    expect(res.headers.get('WWW-Authenticate')).toBe('Basic realm="oauth"');
  });

  test('401 with correct client_id but wrong client_secret', async () => {
    const app = makeApp();
    const { clientId } = registerTestClient();
    const res = await app.request('/revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': basicAuth(clientId, 'wrong-secret'),
      },
      body: new URLSearchParams({ token: 'any' }).toString(),
    });
    expect(res.status).toBe(401);
  });

  test('400 when both Basic AND form-body credentials are present (RFC 6749 §2.3.1)', async () => {
    const app = makeApp();
    const { clientId, clientSecret } = registerTestClient();
    const res = await app.request('/revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': basicAuth(clientId, clientSecret),
      },
      body: new URLSearchParams({
        token: 'any',
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('invalid_request');
  });

  test('200 with form-body credentials (fallback method)', async () => {
    const app = makeApp();
    const { clientId, clientSecret } = registerTestClient();
    const res = await app.request('/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        token: 'nonexistent',
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
    });
    expect(res.status).toBe(200);
  });

  test('200 but token NOT revoked when client A tries to revoke client B\'s token', async () => {
    const app = makeApp();
    const clientA = registerTestClient();
    const clientB = registerTestClient();
    const provider = getOAuthProvider();

    const providerAny = provider as unknown as {
      state: { tokens: Record<string, unknown> };
    };
    // Seed a token belonging to client B.
    providerAny.state.tokens[hashToken('tkn-belongs-to-B')] = {
      client_id: clientB.clientId,
      scopes: ['read'],
      expires_at: Date.now() + 60_000,
    };
    const beforeCount = provider.getTokenCount();

    // Client A authenticates and tries to revoke B's token.
    const res = await app.request('/revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': basicAuth(clientA.clientId, clientA.clientSecret),
      },
      body: new URLSearchParams({ token: 'tkn-belongs-to-B' }).toString(),
    });
    // Per RFC 7009 §2.1: return 200, but do NOT actually revoke (no existence leak).
    expect(res.status).toBe(200);
    expect(provider.getTokenCount()).toBe(beforeCount);
  });
});

describe('registerClient redirect_uri validation (#17.4)', () => {
  test('POST /register rejects javascript: redirect_uri with 400', async () => {
    const app = makeApp();
    const res = await app.request('/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_AUTH_TOKEN}`,
      },
      body: JSON.stringify({ redirect_uris: ['javascript:alert(1)'] }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('invalid_redirect_uri');
  });

  test('POST /register rejects data: redirect_uri with 400', async () => {
    const app = makeApp();
    const res = await app.request('/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_AUTH_TOKEN}`,
      },
      body: JSON.stringify({ redirect_uris: ['data:text/html,<script>x</script>'] }),
    });
    expect(res.status).toBe(400);
  });

  test('POST /register rejects non-loopback http:// with 400', async () => {
    const app = makeApp();
    const res = await app.request('/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_AUTH_TOKEN}`,
      },
      body: JSON.stringify({ redirect_uris: ['http://evil.example/cb'] }),
    });
    expect(res.status).toBe(400);
  });

  test('POST /register accepts https://', async () => {
    const app = makeApp();
    const res = await app.request('/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_AUTH_TOKEN}`,
      },
      body: JSON.stringify({ redirect_uris: ['https://valid.example/cb'] }),
    });
    expect(res.status).toBe(201);
  });

  test('POST /register accepts http://localhost', async () => {
    const app = makeApp();
    const res = await app.request('/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_AUTH_TOKEN}`,
      },
      body: JSON.stringify({ redirect_uris: ['http://localhost:9999/cb'] }),
    });
    expect(res.status).toBe(201);
  });

  test('POST /register accepts http://127.0.0.1', async () => {
    const app = makeApp();
    const res = await app.request('/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_AUTH_TOKEN}`,
      },
      body: JSON.stringify({ redirect_uris: ['http://127.0.0.1/oauth/callback'] }),
    });
    expect(res.status).toBe(201);
  });
});

describe('hash-before-lookup token storage (#17.7)', () => {
  test('exchangeAuthorizationCode stores tokens under sha256(token), not raw', () => {
    const app = makeApp(); // initialise provider/routes (side-effect)
    void app;
    const provider = getOAuthProvider();

    // Drive full PKCE flow via the provider directly.
    const client = provider.registerClient({
      redirect_uris: ['http://127.0.0.1:9999/cb'],
      client_name: 'hash-test',
    });

    // Use an S256 challenge derived from a known verifier.
    const verifier = 'test-verifier-string-long-enough-abcdefghij1234567890';
    const challenge = createHash('sha256').update(verifier).digest('base64url');

    const authResult = provider.authorize({
      client_id: client.client_id,
      redirect_uri: 'http://127.0.0.1:9999/cb',
      code_challenge: challenge,
      code_challenge_method: 'S256',
    });
    const stateKey = new URL((authResult as { loginUrl: string }).loginUrl)
      .searchParams.get('state')!;

    const pinResult = provider.handleLoginCallback(stateKey, TEST_PIN);
    const code = new URL((pinResult as { redirectUri: string }).redirectUri)
      .searchParams.get('code')!;

    const tokenResult = provider.exchangeAuthorizationCode({
      client_id: client.client_id,
      code,
      code_verifier: verifier,
      redirect_uri: 'http://127.0.0.1:9999/cb',
    }) as { access_token: string };

    const raw = tokenResult.access_token;
    const providerAny = provider as unknown as {
      state: { tokens: Record<string, unknown>; tokenKeyVersion?: string };
    };

    // Storage must NOT contain the raw token as a key.
    expect(providerAny.state.tokens[raw]).toBeUndefined();
    // Storage MUST contain sha256(raw) as a key.
    expect(providerAny.state.tokens[hashToken(raw)]).toBeDefined();
    // Marker must be set.
    expect(providerAny.state.tokenKeyVersion).toBe('sha256');

    // And verifyAccessToken must still find the record via the raw token.
    const authInfo = provider.verifyAccessToken(raw);
    expect(authInfo).not.toBeNull();
    expect(authInfo!.client_id).toBe(client.client_id);
  });

  test('loadState migrates legacy raw-key state to sha256-key in place', () => {
    // Seed a state file with the LEGACY shape (raw token as key, no tokenKeyVersion).
    const stateFile = path.join(TEST_DATA_DIR, '.oauth-state.json');
    const rawToken = 'legacy-raw-token-abc123';
    const legacyState = {
      clients: {},
      tokens: {
        [rawToken]: {
          client_id: 'legacy-client',
          scopes: ['read'],
          expires_at: Date.now() + 60_000,
        },
      },
    };
    fs.writeFileSync(stateFile, JSON.stringify(legacyState), 'utf-8');

    // Spin up a fresh provider — loadState should migrate.
    resetOAuthProvider();
    const provider = getOAuthProvider();

    const providerAny = provider as unknown as {
      state: { tokens: Record<string, unknown>; tokenKeyVersion?: string };
    };
    expect(providerAny.state.tokenKeyVersion).toBe('sha256');
    expect(providerAny.state.tokens[rawToken]).toBeUndefined();
    expect(providerAny.state.tokens[hashToken(rawToken)]).toBeDefined();

    // The raw token must still verify (hash-before-lookup is transparent).
    const authInfo = provider.verifyAccessToken(rawToken);
    expect(authInfo).not.toBeNull();
    expect(authInfo!.client_id).toBe('legacy-client');

    // Persistence must have been saved with the new shape.
    const persisted = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
    expect(persisted.tokenKeyVersion).toBe('sha256');
    expect(persisted.tokens[rawToken]).toBeUndefined();
    expect(persisted.tokens[hashToken(rawToken)]).toBeDefined();
  });

  test('migration is idempotent — second load is a no-op', () => {
    const stateFile = path.join(TEST_DATA_DIR, '.oauth-state.json');
    // Pre-migrated state (tokenKeyVersion already set).
    const alreadyHashed = {
      clients: {},
      tokens: {
        [hashToken('t')]: {
          client_id: 'c',
          scopes: ['read'],
          expires_at: Date.now() + 60_000,
        },
      },
      tokenKeyVersion: 'sha256',
    };
    fs.writeFileSync(stateFile, JSON.stringify(alreadyHashed), 'utf-8');

    resetOAuthProvider();
    const provider = getOAuthProvider();
    expect(provider.getTokenCount()).toBe(1);
    // Verify still works via raw token.
    expect(provider.verifyAccessToken('t')).not.toBeNull();
  });

  test('tampered token (one char off) returns null via same code path', () => {
    const app = makeApp();
    void app;
    const provider = getOAuthProvider();

    const providerAny = provider as unknown as {
      state: { tokens: Record<string, unknown> };
    };
    providerAny.state.tokens[hashToken('good-token')] = {
      client_id: 'c',
      scopes: ['read'],
      expires_at: Date.now() + 60_000,
    };
    expect(provider.verifyAccessToken('good-token')).not.toBeNull();
    expect(provider.verifyAccessToken('good-tokeX')).toBeNull();
    expect(provider.verifyAccessToken('')).toBeNull();
  });
});

describe('validateRedirectUri unit (#17.4)', () => {
  test('module export rejects javascript: and data:', async () => {
    const { validateRedirectUri, RedirectUriValidationError } = await import('../provider.ts');
    expect(() => validateRedirectUri('javascript:alert(1)')).toThrow(RedirectUriValidationError);
    expect(() => validateRedirectUri('data:text/html,x')).toThrow(RedirectUriValidationError);
    expect(() => validateRedirectUri('ftp://files.example/cb')).toThrow(RedirectUriValidationError);
    expect(() => validateRedirectUri('file:///tmp/cb')).toThrow(RedirectUriValidationError);
    expect(() => validateRedirectUri('custom-app://callback')).toThrow(RedirectUriValidationError);
    expect(() => validateRedirectUri('http://evil.example/cb')).toThrow(RedirectUriValidationError);
    expect(() => validateRedirectUri('')).toThrow(RedirectUriValidationError);
    expect(() => validateRedirectUri('not a url')).toThrow(RedirectUriValidationError);
  });

  test('module export accepts https:// and loopback http://', async () => {
    const { validateRedirectUri } = await import('../provider.ts');
    expect(() => validateRedirectUri('https://ex.com/cb')).not.toThrow();
    expect(() => validateRedirectUri('https://ex.com:8443/cb?x=1')).not.toThrow();
    expect(() => validateRedirectUri('http://localhost/cb')).not.toThrow();
    expect(() => validateRedirectUri('http://localhost:9999/cb')).not.toThrow();
    expect(() => validateRedirectUri('http://127.0.0.1/cb')).not.toThrow();
    expect(() => validateRedirectUri('http://127.0.0.1:9999/cb')).not.toThrow();
    expect(() => validateRedirectUri('http://[::1]/cb')).not.toThrow();
  });

  test('module export resists hostname-bypass tricks', async () => {
    const { validateRedirectUri, RedirectUriValidationError } = await import('../provider.ts');
    // Subdomain attacks — host is NOT localhost/127.0.0.1, should reject.
    expect(() => validateRedirectUri('http://localhost.evil.com/cb')).toThrow(RedirectUriValidationError);
    expect(() => validateRedirectUri('http://127.0.0.1.evil.com/cb')).toThrow(RedirectUriValidationError);
    // Userinfo strip — WHATWG URL strips `evil@` so hostname becomes
    // `localhost` (the USER chose to include credentials in the URI, but
    // the redirect destination is still loopback, which is allowed). This
    // is documented behaviour — we explicitly assert it does NOT throw so
    // a future regression that "fixes" this by rejecting userinfo does
    // not break existing clients using http://user@localhost/cb.
    expect(() => validateRedirectUri('http://evil@localhost/cb')).not.toThrow();
    // Decimal IPv4 encoding — WHATWG URL normalises to dotted-quad.
    // `2130706433` is 127.0.0.1 in decimal; WHATWG should normalise to
    // `127.0.0.1` at parse time, which then passes the strict check.
    expect(() => validateRedirectUri('http://2130706433/cb')).not.toThrow();
    // Trailing dot on hostname — WHATWG preserves the dot; strict equality
    // against 'localhost' fails. Should reject.
    expect(() => validateRedirectUri('http://localhost./cb')).toThrow(RedirectUriValidationError);
  });
});
