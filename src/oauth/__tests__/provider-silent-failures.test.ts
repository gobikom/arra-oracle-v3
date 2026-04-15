/**
 * OAuth Provider — silent-failure regression tests
 *
 * Covers issue #17 PR-B1 fixes:
 * 1. issuedCodes Map eviction (memory leak on abandoned flows)
 * 2. revokeToken persistence-failure rollback (previously silent on saveState error)
 * 3. loadState fail-safe (previously silently wiped all tokens on corrupt state)
 * 6. checkRegistrationAuth HMAC normalisation (previously short-circuited on length)
 *
 * Runs as a unit test: constructs OAuthProvider directly against a temp
 * state file, no HTTP server spawn. Fast and deterministic.
 */

import { describe, expect, test, beforeEach, afterAll, mock } from 'bun:test';
import fs from 'fs';
import os from 'os';
import path from 'path';

// Single data dir for all tests in this file. Module-level mock can only
// capture ORACLE_DATA_DIR once, so we create one dir up front and clean
// its contents between tests rather than creating fresh dirs.
const TEST_PIN = '1234';
const TEST_AUTH_TOKEN = 'test-mcp-bearer-token-abcdef123456';
const TEST_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'oauth-silent-test-'));
const STATE_FILE = path.join(TEST_DATA_DIR, '.oauth-state.json');

mock.module('../../config.ts', () => ({
  MCP_OAUTH_PIN: TEST_PIN,
  MCP_EXTERNAL_URL: 'http://127.0.0.1:47778',
  ORACLE_DATA_DIR: TEST_DATA_DIR,
  MCP_AUTH_TOKEN: TEST_AUTH_TOKEN,
}));

const { OAuthProvider, AUTH_CODE_TTL_MS, resetOAuthProvider } = await import('../provider.ts');

function cleanDataDir(): void {
  for (const file of fs.readdirSync(TEST_DATA_DIR)) {
    fs.rmSync(path.join(TEST_DATA_DIR, file), { force: true, recursive: true });
  }
}

function makeProvider(): InstanceType<typeof OAuthProvider> {
  resetOAuthProvider();
  return new OAuthProvider();
}

function completePinFlow(
  provider: InstanceType<typeof OAuthProvider>,
): { clientId: string; redirectUri: string } {
  const client = provider.registerClient({
    redirect_uris: ['http://127.0.0.1:9999/cb'],
    client_name: 'test-client',
  });
  const authResult = provider.authorize({
    client_id: client.client_id,
    redirect_uri: 'http://127.0.0.1:9999/cb',
    code_challenge: 'a'.repeat(43),
    code_challenge_method: 'S256',
  });
  const stateKey = new URL(
    (authResult as { loginUrl: string }).loginUrl,
  ).searchParams.get('state')!;

  const pinResult = provider.handleLoginCallback(stateKey, TEST_PIN);
  if ('error' in pinResult) {
    throw new Error(`PIN flow failed: ${pinResult.error}`);
  }
  return { clientId: client.client_id, redirectUri: pinResult.redirectUri };
}

beforeEach(() => {
  cleanDataDir();
  resetOAuthProvider();
});

afterAll(() => {
  fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
});

// ─── Fix #1: issuedCodes eviction ─────────────────────────────────────────

describe('issuedCodes Map eviction (fix #17.1)', () => {
  test('abandoned auth codes are evicted after AUTH_CODE_TTL_MS', () => {
    const provider = makeProvider();
    completePinFlow(provider);
    expect(provider.getIssuedCodeCount()).toBe(1);

    const realNow = Date.now;
    Date.now = () => realNow() + AUTH_CODE_TTL_MS + 1000;
    try {
      provider.runExpirySweep();
    } finally {
      Date.now = realNow;
    }

    expect(provider.getIssuedCodeCount()).toBe(0);
  });

  test('fresh codes are NOT evicted', () => {
    const provider = makeProvider();
    completePinFlow(provider);
    expect(provider.getIssuedCodeCount()).toBe(1);

    provider.runExpirySweep();
    expect(provider.getIssuedCodeCount()).toBe(1);
  });
});

// ─── Fix #3: loadState fail-safe ──────────────────────────────────────────

describe('loadState fail-safe on corrupt state (fix #17.3)', () => {
  test('throws and preserves corrupt file instead of silently returning empty state', () => {
    fs.writeFileSync(STATE_FILE, '{ "tokens": { broken json ', 'utf-8');

    resetOAuthProvider();
    expect(() => new OAuthProvider()).toThrow(/Refusing to start silently with empty state/);

    // Corrupt file renamed out of the way, not deleted.
    expect(fs.existsSync(STATE_FILE)).toBe(false);
    const corruptFiles = fs.readdirSync(TEST_DATA_DIR).filter((f) => f.includes('.corrupt.'));
    expect(corruptFiles.length).toBeGreaterThanOrEqual(1);
  });

  test('empty/missing state file is still OK (no throw)', () => {
    expect(() => makeProvider()).not.toThrow();
  });

  test('still throws even when rename of corrupt file also fails', () => {
    fs.writeFileSync(STATE_FILE, '{ broken json', 'utf-8');

    // Make renameSync fail by chmod'ing the data dir read-only so the
    // rename operation cannot write the new `.corrupt.<ts>` name. The
    // fallback path must still delete the corrupt file and still throw
    // so the operator notices.
    fs.chmodSync(TEST_DATA_DIR, 0o555);
    try {
      resetOAuthProvider();
      // Must throw — the second-line-of-defense is to still refuse to
      // start silently even when rename failed.
      expect(() => new OAuthProvider()).toThrow(/Failed to parse OAuth state file/);
    } finally {
      fs.chmodSync(TEST_DATA_DIR, 0o755);
    }
  });
});

// ─── Fix #2: revokeToken persistence rollback ─────────────────────────────

describe('revokeToken rollback on saveState failure (fix #17.2)', () => {
  test('in-memory state restored when saveState throws', () => {
    const provider = makeProvider();

    // Seed a token directly on the internal state so we do not depend on
    // the full PKCE exchange path (which uses S256 and would require a
    // real verifier/challenge pair). The rollback behaviour is a pure
    // unit concern on revokeToken itself.
    const providerAny = provider as unknown as {
      state: { tokens: Record<string, unknown> };
      saveState: () => void;
    };
    providerAny.state.tokens['tkn-rollback'] = {
      client_id: 'test',
      scopes: ['read'],
      expires_at: Date.now() + 60_000,
    };
    expect(provider.getTokenCount()).toBe(1);

    const originalSave = providerAny.saveState.bind(provider);
    providerAny.saveState = () => {
      throw new Error('disk full (simulated)');
    };

    try {
      expect(() => provider.revokeToken('tkn-rollback')).toThrow(/Failed to persist token revocation/);
      // Rolled back — token still present in memory.
      expect(provider.getTokenCount()).toBe(1);
    } finally {
      // Always restore real saveState so a failed assertion above doesn't
      // leave the patched saveState active for the next assertion below.
      providerAny.saveState = originalSave;
    }

    // Confirm revoke actually works with the real saveState after rollback.
    expect(() => provider.revokeToken('tkn-rollback')).not.toThrow();
    expect(provider.getTokenCount()).toBe(0);
  });

  test('rollback restores a snapshot, not a reference — protects against mid-flight mutation', () => {
    const provider = makeProvider();
    const providerAny = provider as unknown as {
      state: { tokens: Record<string, { client_id: string; scopes: string[]; expires_at: number }> };
      saveState: () => void;
    };

    const original = {
      client_id: 'test',
      scopes: ['read', 'write'],
      expires_at: Date.now() + 60_000,
    };
    providerAny.state.tokens['tkn-snap'] = original;

    const originalSave = providerAny.saveState.bind(provider);
    providerAny.saveState = () => {
      // Simulate a concurrent mutation that happens while the save is
      // failing (e.g., another code path updating expires_at before the
      // rollback completes). If revokeToken captures by reference, the
      // rollback would restore the mutated value. With a snapshot it
      // restores the original.
      original.scopes = ['MUTATED'];
      original.expires_at = 1;
      throw new Error('disk full (simulated)');
    };

    try {
      expect(() => provider.revokeToken('tkn-snap')).toThrow();
      // The restored record must have the ORIGINAL scopes and expires_at,
      // not the mutated ones — because we snapshotted via spread before delete.
      const restored = providerAny.state.tokens['tkn-snap'];
      expect(restored).toBeDefined();
      expect(restored.scopes).toEqual(['read', 'write']);
      expect(restored.expires_at).toBeGreaterThan(1);
    } finally {
      providerAny.saveState = originalSave;
    }
  });

  test('revoking a nonexistent token is a clean no-op', () => {
    const provider = makeProvider();
    expect(() => provider.revokeToken('nonexistent')).not.toThrow();
    expect(provider.getTokenCount()).toBe(0);
  });
});

// ─── Fix #6: checkRegistrationAuth HMAC normalisation ─────────────────────

describe('checkRegistrationAuth HMAC normalisation (fix #17.6)', () => {
  test('accepts the correct token', () => {
    const provider = makeProvider();
    expect(provider.checkRegistrationAuth(`Bearer ${TEST_AUTH_TOKEN}`)).toBe(true);
  });

  test('rejects a wrong token of same length', () => {
    const provider = makeProvider();
    const wrong = 'x'.repeat(TEST_AUTH_TOKEN.length);
    expect(provider.checkRegistrationAuth(`Bearer ${wrong}`)).toBe(false);
  });

  test('rejects a wrong token of different length without throwing', () => {
    const provider = makeProvider();
    // Previous implementation padded with Buffer.alloc and used &&
    // short-circuit on length equality, leaking length via timing.
    // The HMAC-normalised implementation must accept any input length and
    // return false (without throwing) for any non-match.
    expect(provider.checkRegistrationAuth('Bearer short')).toBe(false);
    expect(provider.checkRegistrationAuth(`Bearer ${'y'.repeat(1000)}`)).toBe(false);
    expect(provider.checkRegistrationAuth('Bearer ')).toBe(false);
    expect(provider.checkRegistrationAuth('')).toBe(false);
    expect(provider.checkRegistrationAuth('NotBearerScheme abc')).toBe(false);
  });
});
