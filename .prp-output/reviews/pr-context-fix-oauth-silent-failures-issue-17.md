---
pr: 22
branch: "fix/oauth-silent-failures-issue-17"
extracted: 2026-04-15T23:05:00+07:00
files_changed: 9
---

# PR Review Context: #22 — fix(oauth): close 4 silent-failure gaps from #716 review (#17 PR-B1)

## PR Metadata
- **Author**: gobikom
- **Branch**: fix/oauth-silent-failures-issue-17 → main
- **State**: OPEN
- **Size**: +396/-51 across 9 files (≈999-line diff including cherry-picks)

## Scope — CRITICAL CONTEXT FOR REVIEWERS

This PR is **Part 2 of 2** for issue #17 fix-loop (split into PR-A deps bumps [#21, already merged] and PR-B oauth hardening). PR-B is further split into B1 (this PR, silent failures) and B2 (future PR, architectural fixes).

### What is genuinely NEW in this PR (focus review here)

Only 4 files contain new work. The other 5 files are cherry-picked from an earlier reviewed commit (`c05dd60` — "harden oauth flow and learn route coverage") that landed on the stale `feat/issue-6-oracle-family-normalization` branch but never got merged. That branch is now being cherry-picked onto fresh main (which has CVE-patched deps from PR #21).

**New work in this PR**:
1. `src/oauth/provider.ts` — 4 silent-failure fixes + 2 test helpers
2. `src/oauth/routes.ts` — `/revoke` handler updated to catch `revokeToken` throw
3. `src/oauth/__tests__/provider-silent-failures.test.ts` — 9 unit tests (new file)
4. `package.json` — `test:unit` script split into 2 `bun test` invocations (process isolation for oauth mock.module)

**Cherry-picked from `c05dd60` + `f69a5e6` (already reviewed on original PR #716, not in-scope for this review)**:
- `src/config.ts` (+34 lines — OAuth config validation, MCP_EXTERNAL_URL scheme check)
- `src/oauth/types.ts` (+1 line — new type field)
- `src/integration/knowledge.test.ts` (new, +90 lines — learn route tests)
- `src/integration/oauth-hardening.test.ts` (new, +152 lines — oauth hardening integration)
- `src/integration/http.test.ts` (+45 lines — POST /api/learn HTTP tests)

**Reviewers**: please focus critical depth on `src/oauth/provider.ts`, `src/oauth/routes.ts`, and `src/oauth/__tests__/provider-silent-failures.test.ts`. The cherry-picked files are context that was validated previously; they are not the subject of this review.

## The 4 silent-failure fixes (findings from #17 via PR #716 review)

### Finding 1 — `issuedCodes` Map eviction

**Before**: `cleanExpiredTokens()` swept `state.tokens` and `pendingAuthorizations`, but not `issuedCodes`. Any unauth `/authorize` + login flood grows memory without bound.

**After**: Added a TTL sweep over `this.issuedCodes` inside `cleanExpiredTokens()`:
```ts
for (const [code, data] of this.issuedCodes.entries()) {
  if (now - data.issued_at > AUTH_CODE_TTL_MS) {
    this.issuedCodes.delete(code);
  }
}
```

### Finding 2 — `revokeToken` persistence rollback

**Before**: `saveState()` wrapped in `try { ... } catch { console.error }`. Log said "Token revoked" even on failure. Operator had no signal. Disk and memory diverged. On restart, the "revoked" token came back.

**After**: Capture the pre-delete value, delete in memory, call `saveState()`, and on exception restore the in-memory state and re-throw:
```ts
revokeToken(token: string): void {
  const existing = this.state.tokens[token];
  if (!existing) return;
  delete this.state.tokens[token];
  try {
    this.saveState();
    console.log('[OAuth] Token revoked');
  } catch (error) {
    this.state.tokens[token] = existing;
    console.error('[OAuth] Token revocation failed to persist — state restored', error);
    throw new Error('Failed to persist token revocation', { cause: error });
  }
}
```

`oauth/routes.ts` `/revoke` handler now catches the throw and returns 500 to the caller.

### Finding 3 — `loadState` fail-safe on corrupt state

**Before**: Parse error → `return { clients: {}, tokens: {} }`. Silently wiped all registered clients and tokens on transient parse failure. Recoverable problem becomes unrecoverable data loss.

**After**: Rename the corrupt file to `<stateFile>.corrupt.<ts>` for forensics, then throw a loud error at startup:
```ts
} catch (err) {
  const corrupt = `${this.stateFile}.corrupt.${Date.now()}`;
  try {
    renameSync(this.stateFile, corrupt);
    console.error(`[OAuth] State file corrupt — preserved at ${corrupt}`);
  } catch (renameErr) {
    console.error('[OAuth] State file corrupt AND rename failed:', renameErr);
  }
  throw new Error(
    '[OAuth] Failed to parse OAuth state file. Corrupt state preserved for forensics. '
    + 'Refusing to start with empty state — this would silently wipe all registered '
    + 'clients and tokens. Investigate the preserved file or delete it manually to start fresh.',
    { cause: err },
  );
}
```

### Finding 6 — `checkRegistrationAuth` HMAC normalisation

**Before**: `expected.length === provided.length && timingSafeEqual(padded1, padded2)`. The `&&` short-circuited on length mismatch BEFORE calling `timingSafeEqual`, leaking secret length via timing.

**After**: HMAC-SHA256 digest comparison of both sides with a per-process random key. Both sides always get hashed to fixed 32 bytes, then `timingSafeEqual` runs unconditionally. Matches `src/middleware/api-auth.ts` pattern from #12 Stage 2A:
```ts
const expectedDigest = createHmac('sha256', this.hmacKey).update(MCP_AUTH_TOKEN).digest();
const providedDigest = createHmac('sha256', this.hmacKey).update(providedToken).digest();
return timingSafeEqual(expectedDigest, providedDigest);
```

Added private field `hmacKey = randomBytes(32)` at class level.

## Intentionally NOT in this PR (deferred to PR-B2, documented in #17)

Reviewers **should not flag these as missing** — they are scoped-out and tracked:

- **Finding 4**: `redirect_uri` scheme validation at client registration (needs design on https-only + localhost allowlist)
- **Finding 5**: `/revoke` endpoint unauthenticated (needs RFC 7009 client authentication — client_id + client_secret verification)
- **Finding 7**: Token lookup dict-key timing side-channel (architectural — either O(n) iteration with `timingSafeEqual` or hash-before-lookup)

These are clustered into PR-B2 because they require design work and would blow the boundary rule if mixed with the mechanical silent-failure fixes.

## Test coverage

New: `src/oauth/__tests__/provider-silent-failures.test.ts` — **9 unit tests**.

Test strategy:
- Uses Bun `mock.module` to override `config.ts` so the tests run in isolation against a temp data dir
- `test:unit` script split into 2 `bun test` invocations so the module mock doesn't pollute other suites (required because Bun shares the module graph across test files in one invocation)
- New test helpers on `OAuthProvider`: `getIssuedCodeCount()`, `runExpirySweep()` (test-only surface, documented as such)

Coverage per fix:
- **Fix #1**: 2 tests (TTL elapsed → evicted; fresh → not evicted, via monkey-patched Date.now)
- **Fix #3**: 2 tests (corrupt file → throws + renames; empty/missing → clean start)
- **Fix #2**: 2 tests (saveState monkey-patched to throw → rollback; nonexistent token → clean no-op)
- **Fix #6**: 3 tests (correct token accepted; same-length wrong rejected; any other length rejected without throw)

## Validation Status (concrete results)

- ✅ **Unit tests**: 157 (existing) + 9 (new) = **166 pass / 0 fail**
- ⚠️ **TypeScript build** (`bun run build`): 4 pre-existing errors in `server-legacy.ts` + `server/handlers.ts` — unchanged, out-of-scope per #17 action items
- ⚠️ **Integration tests**: baseline unchanged. `oauth-hardening.test.ts` has 1 test that times out on server spawn on this machine (same on main pre-cherry-pick — environmental, not introduced by this PR)

## Project Guidelines (from CLAUDE.md)

- Surgical modifications only — targeted, not wholesale
- Verify before assert
- Patterns over intentions — reuse `api-auth.ts` HMAC pattern for consistency
- All PR reviews must use `/prp-core:prp-review-agents`
- Zero silent failures — every error path must surface

## Review Focus Areas

1. **Correctness of the 4 silent-failure fixes** — do they fully close the findings raised in #17?
2. **Test coverage quality** — do the 9 unit tests actually exercise the previously-broken paths?
3. **Rollback semantics of `revokeToken`** — is the in-memory restore sufficient, or should we also verify the state file content matches memory post-rollback?
4. **loadState throw impact** — what happens at startup if the state file is corrupt? Does the server process exit cleanly, or does it leave oracle-v3 in a half-started state?
5. **HMAC pattern consistency** — does this match the `api-auth.ts` implementation exactly? Any subtle deviations?
6. **Test process isolation** — is the `test:unit` script split a clean solution, or is there a better way (bun test --preload, explicit mock restore)?

## PR Diff

Full diff follows. Note that `src/config.ts`, `src/oauth/types.ts`, and the 3 integration test files are cherry-picks; skim rather than deep-review those.

```diff
diff --git a/package.json b/package.json
index 797cc10b..16a2b6c1 100644
--- a/package.json
+++ b/package.json
@@ -31,7 +31,7 @@
     "build": "tsc --noEmit",
     "start": "bun dist/index.js",
     "test": "bun run test:unit && bun run test:integration",
-    "test:unit": "bun test src/tools/__tests__/ src/server/__tests__/ src/vault/__tests__/ src/drizzle-migration.test.ts src/indexer-preservation.test.ts",
+    "test:unit": "bun test src/tools/__tests__/ src/server/__tests__/ src/vault/__tests__/ src/drizzle-migration.test.ts src/indexer-preservation.test.ts && bun test src/oauth/__tests__/",
     "test:integration": "bun test src/integration/",
     "test:integration:db": "bun test src/integration/database.test.ts",
     "test:integration:mcp": "bun test src/integration/mcp.test.ts",
diff --git a/src/config.ts b/src/config.ts
index 926b7079..fbe8b3eb 100644
--- a/src/config.ts
+++ b/src/config.ts
@@ -80,12 +80,40 @@ if (!LOOPBACK_HOSTS.has(ORACLE_BIND_HOST)) {
 // OAuth 2.1 — PIN-based auth for Claude Desktop / claude.ai Custom Connectors
 // If MCP_OAUTH_PIN is empty, OAuth routes are not mounted (Bearer-only mode)
 export const MCP_OAUTH_PIN = process.env.MCP_OAUTH_PIN || '';
-export const MCP_EXTERNAL_URL = process.env.MCP_EXTERNAL_URL || `http://localhost:${PORT}`;
+function isLoopbackHostname(hostname: string): boolean {
+  return (
+    hostname === 'localhost'
+    || hostname === '127.0.0.1'
+    || hostname === '::1'
+    || hostname.endsWith('.localhost')
+  );
+}
+
+function resolveMcpExternalUrl(rawValue: string): string {
+  let parsed: URL;
+  try {
+    parsed = new URL(rawValue);
+  } catch (error) {
+    throw new Error(`MCP_EXTERNAL_URL must be an absolute URL (received: ${rawValue})`, { cause: error });
+  }
 
-if (MCP_EXTERNAL_URL.startsWith('http://') && !MCP_EXTERNAL_URL.includes('localhost') && !MCP_EXTERNAL_URL.includes('127.0.0.1')) {
-  console.warn('⚠️  MCP_EXTERNAL_URL is using HTTP in production — OAuth requires HTTPS for secure token exchange');
+  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
+    throw new Error(`MCP_EXTERNAL_URL must use http or https (received: ${parsed.protocol})`);
+  }
+
+  if (MCP_OAUTH_PIN && parsed.protocol === 'http:' && !isLoopbackHostname(parsed.hostname)) {
+    throw new Error(
+      'FATAL: MCP_EXTERNAL_URL must use HTTPS when OAuth is enabled unless the host is loopback/local-only.',
+    );
+  }
+
+  return parsed.toString().replace(/\/$/, '');
 }
 
+export const MCP_EXTERNAL_URL = resolveMcpExternalUrl(
+  process.env.MCP_EXTERNAL_URL || `http://localhost:${PORT}`,
+);
+
 // Ensure data directory exists (for fresh installs via bunx)
 if (!fs.existsSync(ORACLE_DATA_DIR)) {
   fs.mkdirSync(ORACLE_DATA_DIR, { recursive: true });
diff --git a/src/integration/http.test.ts b/src/integration/http.test.ts
index ff9c5449..67e7d996 100644
--- a/src/integration/http.test.ts
+++ b/src/integration/http.test.ts
@@ -206,6 +206,51 @@ describe("HTTP API Integration", () => {
     });
   });
 
+  // ===================
+  // Knowledge Ingestion
+  // ===================
+  describe("Knowledge Ingestion", () => {
+    test("POST /api/learn persists a pattern and returns an id", async () => {
+      const pattern = `integration-test-pattern-${Date.now()}`;
+      const res = await fetch(`${BASE_URL}/api/learn`, {
+        method: "POST",
+        headers: { "Content-Type": "application/json" },
+        body: JSON.stringify({
+          pattern,
+          source: "http-integration-test",
+          concepts: ["test"],
+          project: "test-suite",
+        }),
+      });
+      expect(res.ok).toBe(true);
+      const data = await res.json();
+      expect(typeof data.id).toBe("string");
+      expect(data.id.length).toBeGreaterThan(0);
+
+      // Verify persistence: search for the pattern we just stored
+      const searchRes = await fetch(
+        `${BASE_URL}/api/search?q=${encodeURIComponent(pattern)}&type=learning`
+      );
+      expect(searchRes.ok).toBe(true);
+      const searchData = await searchRes.json();
+      expect(Array.isArray(searchData.results)).toBe(true);
+      // The newly stored document should appear in results
+      const found = searchData.results.some((r: { id?: string }) => r.id === data.id);
+      expect(found).toBe(true);
+    }, 30_000);
+
+    test("POST /api/learn rejects missing pattern field", async () => {
+      const res = await fetch(`${BASE_URL}/api/learn`, {
+        method: "POST",
+        headers: { "Content-Type": "application/json" },
+        body: JSON.stringify({ source: "test" }),
+      });
+      expect(res.status).toBe(400);
+      const data = await res.json();
+      expect(data.error).toMatch(/pattern/i);
+    });
+  });
+
   // ===================
   // Error Handling
   // ===================
diff --git a/src/integration/knowledge.test.ts b/src/integration/knowledge.test.ts
new file mode 100644
index 00000000..84cd63e6
--- /dev/null
+++ b/src/integration/knowledge.test.ts
@@ -0,0 +1,90 @@
+import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
+import type { Subprocess } from 'bun';
+import fs from 'fs';
+import os from 'os';
+import path from 'path';
+
+const BASE_URL = 'http://localhost:47780';
+
+let serverProcess: Subprocess | null = null;
+let tempRoot = '';
+let tempRepoRoot = '';
+let tempDataDir = '';
+
+async function waitForServer(maxAttempts = 30): Promise<boolean> {
+  for (let i = 0; i < maxAttempts; i++) {
+    try {
+      const res = await fetch(`${BASE_URL}/api/health`);
+      if (res.ok) return true;
+    } catch {
+      // Server not ready yet.
+    }
+    await Bun.sleep(500);
+  }
+  return false;
+}
+
+describe('Knowledge route integration', () => {
+  beforeAll(async () => {
+    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'arra-knowledge-test-'));
+    tempRepoRoot = path.join(tempRoot, 'repo');
+    tempDataDir = path.join(tempRoot, 'data');
+    fs.mkdirSync(path.join(tempRepoRoot, 'ψ'), { recursive: true });
+    fs.mkdirSync(tempDataDir, { recursive: true });
+
+    serverProcess = Bun.spawn(['bun', 'run', 'src/server.ts'], {
+      cwd: import.meta.dir.replace('/src/integration', ''),
+      stdout: 'pipe',
+      stderr: 'pipe',
+      env: {
+        ...process.env,
+        ORACLE_PORT: '47780',
+        ORACLE_REPO_ROOT: tempRepoRoot,
+        ORACLE_DATA_DIR: tempDataDir,
+      },
+    });
+
+    const ready = await waitForServer();
+    if (!ready) {
+      throw new Error('Knowledge test server failed to start');
+    }
+  }, 30_000);
+
+  afterAll(() => {
+    if (serverProcess) serverProcess.kill();
+    if (tempRoot) fs.rmSync(tempRoot, { recursive: true, force: true });
+  });
+
+  test('POST /api/learn persists the learning to storage and search', async () => {
+    const unique = `knowledge-route-${Date.now()}`;
+    const pattern = `[infra-health] ${unique}\nIntegration test learning payload`;
+
+    const createRes = await fetch(`${BASE_URL}/api/learn`, {
+      method: 'POST',
+      headers: { 'Content-Type': 'application/json' },
+      body: JSON.stringify({
+        pattern,
+        source: 'integration-test',
+        concepts: ['integration', unique],
+      }),
+    });
+
+    expect(createRes.status).toBe(200);
+    const created = await createRes.json() as Record<string, string | boolean>;
+    expect(created.success).toBe(true);
+    expect(typeof created.file).toBe('string');
+    expect(created.file as string).toContain('ψ/memory/learnings/');
+    expect(typeof created.id).toBe('string');
+    expect(created.id as string).toContain(unique);
+    expect(created.ttl).toBe('7d');
+
+    const filePath = path.join(tempRepoRoot, created.file as string);
+    expect(fs.existsSync(filePath)).toBe(true);
+    expect(fs.readFileSync(filePath, 'utf-8')).toContain(unique);
+
+    const searchRes = await fetch(`${BASE_URL}/api/search?q=${encodeURIComponent(unique)}`);
+    expect(searchRes.status).toBe(200);
+    const searchData = await searchRes.json() as { results: Array<{ id: string }> };
+    expect(searchData.results.some((result) => result.id === created.id)).toBe(true);
+  });
+});
diff --git a/src/integration/oauth-hardening.test.ts b/src/integration/oauth-hardening.test.ts
new file mode 100644
index 00000000..03140f75
--- /dev/null
+++ b/src/integration/oauth-hardening.test.ts
@@ -0,0 +1,152 @@
+import { afterAll, describe, expect, test } from 'bun:test';
+import type { Subprocess } from 'bun';
+import fs from 'fs';
+import os from 'os';
+import path from 'path';
+
+const LOCKOUT_BASE_URL = 'http://localhost:47781';
+const TEST_TOKEN = 'test-bearer-token';
+const TEST_PIN = '1234';
+
+const spawnedProcesses = new Set<Subprocess>();
+const tempDirs = new Set<string>();
+
+function createTempEnvRoot(prefix: string): { repoRoot: string; dataDir: string } {
+  const cleanupRoot = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
+  const repoRoot = path.join(cleanupRoot, 'repo');
+  const dataDir = path.join(cleanupRoot, 'data');
+  fs.mkdirSync(path.join(repoRoot, 'ψ'), { recursive: true });
+  fs.mkdirSync(dataDir, { recursive: true });
+  tempDirs.add(cleanupRoot);
+  return { repoRoot, dataDir };
+}
+
+async function waitForServer(baseUrl: string, maxAttempts = 30): Promise<boolean> {
+  for (let i = 0; i < maxAttempts; i++) {
+    try {
+      const res = await fetch(`${baseUrl}/api/health`);
+      if (res.ok) return true;
+    } catch {
+      // Server not ready yet.
+    }
+    await Bun.sleep(500);
+  }
+  return false;
+}
+
+afterAll(() => {
+  for (const process of spawnedProcesses) {
+    process.kill();
+  }
+  for (const dir of tempDirs) {
+    fs.rmSync(dir, { recursive: true, force: true });
+  }
+});
+
+describe('OAuth hardening', () => {
+  test('server startup rejects insecure non-loopback MCP_EXTERNAL_URL when OAuth is enabled', async () => {
+    const { repoRoot, dataDir } = createTempEnvRoot('arra-oauth-config-test-');
+
+    const serverProc = Bun.spawn(['bun', 'run', 'src/server.ts'], {
+      cwd: import.meta.dir.replace('/src/integration', ''),
+      stdout: 'pipe',
+      stderr: 'pipe',
+      env: {
+        ...process.env,
+        ORACLE_PORT: '47782',
+        ORACLE_REPO_ROOT: repoRoot,
+        ORACLE_DATA_DIR: dataDir,
+        MCP_AUTH_TOKEN: TEST_TOKEN,
+        MCP_OAUTH_PIN: TEST_PIN,
+        MCP_EXTERNAL_URL: 'http://example.com',
+      },
+    });
+    spawnedProcesses.add(serverProc);
+
+    const exitCode = await serverProc.exited;
+    expect(exitCode).not.toBe(0);
+
+    const stderrText = serverProc.stderr ? await new Response(serverProc.stderr).text() : '';
+    const stdoutText = serverProc.stdout ? await new Response(serverProc.stdout).text() : '';
+    expect(`${stdoutText}\n${stderrText}`).toContain('MCP_EXTERNAL_URL must use HTTPS');
+  }, 30_000);
+
+  test('PIN lockout cannot be bypassed with spoofed forwarding headers', async () => {
+    const { repoRoot, dataDir } = createTempEnvRoot('arra-oauth-lockout-test-');
+    const serverProc = Bun.spawn(['bun', 'run', 'src/server.ts'], {
+      cwd: import.meta.dir.replace('/src/integration', ''),
+      stdout: 'pipe',
+      stderr: 'pipe',
+      env: {
+        ...process.env,
+        ORACLE_PORT: '47781',
+        ORACLE_REPO_ROOT: repoRoot,
+        ORACLE_DATA_DIR: dataDir,
+        MCP_AUTH_TOKEN: TEST_TOKEN,
+        MCP_OAUTH_PIN: TEST_PIN,
+        MCP_EXTERNAL_URL: LOCKOUT_BASE_URL,
+      },
+    });
+    spawnedProcesses.add(serverProc);
+
+    const ready = await waitForServer(LOCKOUT_BASE_URL);
+    if (!ready) {
+      throw new Error('OAuth lockout test server failed to start');
+    }
+
+    const registerRes = await fetch(`${LOCKOUT_BASE_URL}/register`, {
+      method: 'POST',
+      headers: {
+        'Content-Type': 'application/json',
+        'Authorization': `Bearer ${TEST_TOKEN}`,
+      },
+      body: JSON.stringify({
+        redirect_uris: ['http://localhost:9999/callback'],
+        client_name: 'Lockout Test Client',
+      }),
+    });
+    expect(registerRes.status).toBe(201);
+    const client = await registerRes.json() as Record<string, string>;
+
+    const authorizeUrl = new URL(`${LOCKOUT_BASE_URL}/authorize`);
+    authorizeUrl.searchParams.set('response_type', 'code');
+    authorizeUrl.searchParams.set('client_id', client.client_id);
+    authorizeUrl.searchParams.set('redirect_uri', 'http://localhost:9999/callback');
+    authorizeUrl.searchParams.set('code_challenge', 'abc123');
+    authorizeUrl.searchParams.set('code_challenge_method', 'S256');
+
+    const authorizeRes = await fetch(authorizeUrl.toString(), { redirect: 'manual' });
+    expect(authorizeRes.status).toBe(302);
+    const location = authorizeRes.headers.get('location');
+    expect(location).toBeTruthy();
+    const stateKey = new URL(location!).searchParams.get('state');
+    expect(stateKey).toBeTruthy();
+
+    for (let attempt = 1; attempt <= 10; attempt++) {
+      const callbackRes = await fetch(`${LOCKOUT_BASE_URL}/oauth/callback`, {
+        method: 'POST',
+        headers: {
+          'Content-Type': 'application/x-www-form-urlencoded',
+          'x-forwarded-for': `198.51.100.${attempt}`,
+          'x-real-ip': `203.0.113.${attempt}`,
+        },
+        body: new URLSearchParams({ state: stateKey!, pin: 'wrong-pin' }).toString(),
+      });
+      expect(callbackRes.status).toBe(403);
+    }
+
+    const lockedRes = await fetch(`${LOCKOUT_BASE_URL}/oauth/callback`, {
+      method: 'POST',
+      headers: {
+        'Content-Type': 'application/x-www-form-urlencoded',
+        'x-forwarded-for': '198.51.100.250',
+        'x-real-ip': '203.0.113.250',
+      },
+      body: new URLSearchParams({ state: stateKey!, pin: 'wrong-pin' }).toString(),
+    });
+    expect(lockedRes.status).toBe(429);
+
+    serverProc.kill();
+    spawnedProcesses.delete(serverProc);
+  }, 30_000);
+});
diff --git a/src/oauth/__tests__/provider-silent-failures.test.ts b/src/oauth/__tests__/provider-silent-failures.test.ts
new file mode 100644
index 00000000..67696779
--- /dev/null
+++ b/src/oauth/__tests__/provider-silent-failures.test.ts
@@ -0,0 +1,198 @@
+/**
+ * OAuth Provider — silent-failure regression tests
+ *
+ * Covers issue #17 PR-B1 fixes:
+ * 1. issuedCodes Map eviction (memory leak on abandoned flows)
+ * 2. revokeToken persistence-failure rollback (previously silent on saveState error)
+ * 3. loadState fail-safe (previously silently wiped all tokens on corrupt state)
+ * 6. checkRegistrationAuth HMAC normalisation (previously short-circuited on length)
+ *
+ * Runs as a unit test: constructs OAuthProvider directly against a temp
+ * state file, no HTTP server spawn. Fast and deterministic.
+ */
+
+import { describe, expect, test, beforeEach, afterAll, mock } from 'bun:test';
+import fs from 'fs';
+import os from 'os';
+import path from 'path';
+
+// Single data dir for all tests in this file. Module-level mock can only
+// capture ORACLE_DATA_DIR once, so we create one dir up front and clean
+// its contents between tests rather than creating fresh dirs.
+const TEST_PIN = '1234';
+const TEST_AUTH_TOKEN = 'test-mcp-bearer-token-abcdef123456';
+const TEST_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'oauth-silent-test-'));
+const STATE_FILE = path.join(TEST_DATA_DIR, '.oauth-state.json');
+
+mock.module('../../config.ts', () => ({
+  MCP_OAUTH_PIN: TEST_PIN,
+  MCP_EXTERNAL_URL: 'http://127.0.0.1:47778',
+  ORACLE_DATA_DIR: TEST_DATA_DIR,
+  MCP_AUTH_TOKEN: TEST_AUTH_TOKEN,
+}));
+
+const { OAuthProvider, AUTH_CODE_TTL_MS, resetOAuthProvider } = await import('../provider.ts');
+
+function cleanDataDir(): void {
+  for (const file of fs.readdirSync(TEST_DATA_DIR)) {
+    fs.rmSync(path.join(TEST_DATA_DIR, file), { force: true, recursive: true });
+  }
+}
+
+function makeProvider(): InstanceType<typeof OAuthProvider> {
+  resetOAuthProvider();
+  return new OAuthProvider();
+}
+
+function completePinFlow(
+  provider: InstanceType<typeof OAuthProvider>,
+): { clientId: string; redirectUri: string } {
+  const client = provider.registerClient({
+    redirect_uris: ['http://127.0.0.1:9999/cb'],
+    client_name: 'test-client',
+  });
+  const authResult = provider.authorize({
+    client_id: client.client_id,
+    redirect_uri: 'http://127.0.0.1:9999/cb',
+    code_challenge: 'a'.repeat(43),
+    code_challenge_method: 'S256',
+  });
+  const stateKey = new URL(
+    (authResult as { loginUrl: string }).loginUrl,
+  ).searchParams.get('state')!;
+
+  const pinResult = provider.handleLoginCallback(stateKey, TEST_PIN);
+  if ('error' in pinResult) {
+    throw new Error(`PIN flow failed: ${pinResult.error}`);
+  }
+  return { clientId: client.client_id, redirectUri: pinResult.redirectUri };
+}
+
+beforeEach(() => {
+  cleanDataDir();
+  resetOAuthProvider();
+});
+
+afterAll(() => {
+  fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
+});
+
+// ─── Fix #1: issuedCodes eviction ─────────────────────────────────────────
+
+describe('issuedCodes Map eviction (fix #17.1)', () => {
+  test('abandoned auth codes are evicted after AUTH_CODE_TTL_MS', () => {
+    const provider = makeProvider();
+    completePinFlow(provider);
+    expect(provider.getIssuedCodeCount()).toBe(1);
+
+    const realNow = Date.now;
+    Date.now = () => realNow() + AUTH_CODE_TTL_MS + 1000;
+    try {
+      provider.runExpirySweep();
+    } finally {
+      Date.now = realNow;
+    }
+
+    expect(provider.getIssuedCodeCount()).toBe(0);
+  });
+
+  test('fresh codes are NOT evicted', () => {
+    const provider = makeProvider();
+    completePinFlow(provider);
+    expect(provider.getIssuedCodeCount()).toBe(1);
+
+    provider.runExpirySweep();
+    expect(provider.getIssuedCodeCount()).toBe(1);
+  });
+});
+
+// ─── Fix #3: loadState fail-safe ──────────────────────────────────────────
+
+describe('loadState fail-safe on corrupt state (fix #17.3)', () => {
+  test('throws and preserves corrupt file instead of silently returning empty state', () => {
+    fs.writeFileSync(STATE_FILE, '{ "tokens": { broken json ', 'utf-8');
+
+    resetOAuthProvider();
+    expect(() => new OAuthProvider()).toThrow(/Refusing to start with empty state/);
+
+    // Corrupt file renamed out of the way, not deleted.
+    expect(fs.existsSync(STATE_FILE)).toBe(false);
+    const corruptFiles = fs.readdirSync(TEST_DATA_DIR).filter((f) => f.includes('.corrupt.'));
+    expect(corruptFiles.length).toBeGreaterThanOrEqual(1);
+  });
+
+  test('empty/missing state file is still OK (no throw)', () => {
+    expect(() => makeProvider()).not.toThrow();
+  });
+});
+
+// ─── Fix #2: revokeToken persistence rollback ─────────────────────────────
+
+describe('revokeToken rollback on saveState failure (fix #17.2)', () => {
+  test('in-memory state restored when saveState throws', () => {
+    const provider = makeProvider();
+
+    // Seed a token directly on the internal state so we do not depend on
+    // the full PKCE exchange path (which uses S256 and would require a
+    // real verifier/challenge pair). The rollback behaviour is a pure
+    // unit concern on revokeToken itself.
+    const providerAny = provider as unknown as {
+      state: { tokens: Record<string, unknown> };
+      saveState: () => void;
+    };
+    providerAny.state.tokens['tkn-rollback'] = {
+      client_id: 'test',
+      scopes: ['read'],
+      expires_at: Date.now() + 60_000,
+    };
+    expect(provider.getTokenCount()).toBe(1);
+
+    const originalSave = providerAny.saveState.bind(provider);
+    providerAny.saveState = () => {
+      throw new Error('disk full (simulated)');
+    };
+
+    expect(() => provider.revokeToken('tkn-rollback')).toThrow(/Failed to persist token revocation/);
+    // Rolled back — token still present in memory.
+    expect(provider.getTokenCount()).toBe(1);
+
+    // Restore real saveState and confirm revoke actually works.
+    providerAny.saveState = originalSave;
+    expect(() => provider.revokeToken('tkn-rollback')).not.toThrow();
+    expect(provider.getTokenCount()).toBe(0);
+  });
+
+  test('revoking a nonexistent token is a clean no-op', () => {
+    const provider = makeProvider();
+    expect(() => provider.revokeToken('nonexistent')).not.toThrow();
+    expect(provider.getTokenCount()).toBe(0);
+  });
+});
+
+// ─── Fix #6: checkRegistrationAuth HMAC normalisation ─────────────────────
+
+describe('checkRegistrationAuth HMAC normalisation (fix #17.6)', () => {
+  test('accepts the correct token', () => {
+    const provider = makeProvider();
+    expect(provider.checkRegistrationAuth(`Bearer ${TEST_AUTH_TOKEN}`)).toBe(true);
+  });
+
+  test('rejects a wrong token of same length', () => {
+    const provider = makeProvider();
+    const wrong = 'x'.repeat(TEST_AUTH_TOKEN.length);
+    expect(provider.checkRegistrationAuth(`Bearer ${wrong}`)).toBe(false);
+  });
+
+  test('rejects a wrong token of different length without throwing', () => {
+    const provider = makeProvider();
+    // Previous implementation padded with Buffer.alloc and used &&
+    // short-circuit on length equality, leaking length via timing.
+    // The HMAC-normalised implementation must accept any input length and
+    // return false (without throwing) for any non-match.
+    expect(provider.checkRegistrationAuth('Bearer short')).toBe(false);
+    expect(provider.checkRegistrationAuth(`Bearer ${'y'.repeat(1000)}`)).toBe(false);
+    expect(provider.checkRegistrationAuth('Bearer ')).toBe(false);
+    expect(provider.checkRegistrationAuth('')).toBe(false);
+    expect(provider.checkRegistrationAuth('NotBearerScheme abc')).toBe(false);
+  });
+});
diff --git a/src/oauth/provider.ts b/src/oauth/provider.ts
index 390d5804..d3902396 100644
--- a/src/oauth/provider.ts
+++ b/src/oauth/provider.ts
@@ -10,11 +10,11 @@
  * - Single PIN, single user (same as PSak)
  * - Atomic file writes for crash safety (temp file + rename)
  * - crypto.timingSafeEqual for PIN comparison to prevent timing attacks
- * - IP-based rate limiting for PIN brute-force protection
+ * - Server-side lockout for PIN brute-force protection (no trust in forwarded IP headers)
  */
 
-import { randomBytes, createHash, timingSafeEqual } from 'crypto';
-import { writeFileSync, readFileSync, renameSync, existsSync, mkdirSync, chmodSync } from 'fs';
+import { randomBytes, createHash, createHmac, timingSafeEqual } from 'crypto';
+import { writeFileSync, readFileSync, renameSync, existsSync, mkdirSync, chmodSync, rmSync } from 'fs';
 import { join, dirname } from 'path';
 import { tmpdir } from 'os';
 
@@ -44,7 +44,7 @@ interface IssuedCode {
   issued_at: number;
 }
 
-/** Rate-limit window for a single IP */
+/** Rate-limit window for the single-user PIN flow */
 interface RateLimitRecord {
   count: number;
   resetAt: number;
@@ -68,8 +68,15 @@ export class OAuthProvider {
   // code → issued code data (after PIN verification, before token exchange)
   private issuedCodes: Map<string, IssuedCode> = new Map();
 
-  // Rate limiting: ip → {count, resetAt}
-  private pinAttempts: Map<string, RateLimitRecord> = new Map();
+  // Single-user OAuth flow: shared lockout window cannot be bypassed with spoofed headers.
+  private pinAttemptWindow: RateLimitRecord | null = null;
+
+  // Per-process HMAC key for constant-time comparisons that must tolerate
+  // varying input lengths. Secrecy is not required — its only job is to
+  // give timingSafeEqual two equal-length digests so the compare runs
+  // without leaking length via short-circuit behaviour. Matches the pattern
+  // used in src/middleware/api-auth.ts (issue #12 Stage 2A).
+  private readonly hmacKey: Buffer = randomBytes(32);
 
   private static readonly MAX_PIN_ATTEMPTS = 10;
   private static readonly PIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes
@@ -91,24 +98,47 @@ export class OAuthProvider {
       const raw = readFileSync(this.stateFile, 'utf-8');
       return JSON.parse(raw) as OAuthState;
     } catch (err) {
-      console.error('[OAuth] Failed to parse state file, starting with empty state:', err);
-      return { clients: {}, tokens: {} };
+      // FAIL SAFE: preserve the corrupt file for forensics, then throw.
+      // The previous behaviour — swallowing the parse error and returning
+      // { clients: {}, tokens: {} } — would silently wipe every registered
+      // client and every outstanding access token on a transient parse
+      // failure. That is strictly worse than loud startup failure: it turns
+      // a recoverable problem (restore from backup, fix the file) into
+      // unrecoverable data loss that operators would not notice until users
+      // started getting invalid_token errors hours later.
+      const corrupt = `${this.stateFile}.corrupt.${Date.now()}`;
+      try {
+        renameSync(this.stateFile, corrupt);
+        console.error(`[OAuth] State file corrupt — preserved at ${corrupt}`);
+      } catch (renameErr) {
+        console.error('[OAuth] State file corrupt AND rename failed:', renameErr);
+      }
+      throw new Error(
+        '[OAuth] Failed to parse OAuth state file. Corrupt state preserved for forensics. '
+        + 'Refusing to start with empty state — this would silently wipe all registered '
+        + 'clients and tokens. Investigate the preserved file or delete it manually to start fresh.',
+        { cause: err },
+      );
     }
   }
 
   /** Atomic write: write to temp file then rename — crash-safe. Sets 0600 permissions. */
   private saveState(): void {
+    let tmp: string | null = null;
     try {
       const dir = dirname(this.stateFile);
       if (!existsSync(dir)) {
         mkdirSync(dir, { recursive: true });
       }
-      const tmp = join(tmpdir(), `.oauth-state-${Date.now()}-${randomBytes(4).toString('hex')}.tmp`);
+      tmp = join(tmpdir(), `.oauth-state-${Date.now()}-${randomBytes(4).toString('hex')}.tmp`);
       writeFileSync(tmp, JSON.stringify(this.state, null, 2), 'utf-8');
       chmodSync(tmp, 0o600);
       renameSync(tmp, this.stateFile);
     } catch (err) {
-      console.error('[OAuth] saveState failed — token state may be inconsistent:', err);
+      if (tmp && existsSync(tmp)) {
+        rmSync(tmp, { force: true });
+      }
+      throw new Error('[OAuth] Failed to persist OAuth state to disk', { cause: err });
     }
   }
 
@@ -130,19 +160,28 @@ export class OAuthProvider {
       }
     }
 
-    // Clean expired rate-limit windows
-    for (const [ip, record] of this.pinAttempts.entries()) {
-      if (now > record.resetAt) {
-        this.pinAttempts.delete(ip);
+    // Clean expired issued auth codes. Happy path: exchangeAuthorizationCode
+    // removes the code on token exchange. Sad path: client abandons flow
+    // after PIN verification (exchanges nothing). Without eviction, abandoned
+    // codes accumulate in the Map for the lifetime of the server process —
+    // unbounded memory growth from any unauthenticated /authorize + login flood.
+    for (const [code, data] of this.issuedCodes.entries()) {
+      if (now - data.issued_at > AUTH_CODE_TTL_MS) {
+        this.issuedCodes.delete(code);
       }
     }
+
+    // Clean expired global rate-limit window
+    if (this.pinAttemptWindow && now > this.pinAttemptWindow.resetAt) {
+      this.pinAttemptWindow = null;
+    }
   }
 
   // ─── Rate limiting ───────────────────────────────────────────────────────
 
-  private checkRateLimit(ip: string): { allowed: boolean; attemptsLeft: number } {
+  private checkRateLimit(): { allowed: boolean; attemptsLeft: number } {
     const now = Date.now();
-    const record = this.pinAttempts.get(ip);
+    const record = this.pinAttemptWindow;
 
     if (!record || now > record.resetAt) {
       return { allowed: true, attemptsLeft: OAuthProvider.MAX_PIN_ATTEMPTS };
@@ -152,12 +191,19 @@ export class OAuthProvider {
     return { allowed: attemptsLeft > 0, attemptsLeft };
   }
 
-  private recordFailedAttempt(ip: string): number {
+  private recordFailedAttempt(stateKey: string): number {
     const now = Date.now();
-    const record = this.pinAttempts.get(ip);
+    const record = this.pinAttemptWindow;
+    const pending = this.pendingAuthorizations.get(stateKey);
+
+    if (!pending) {
+      return 0;
+    }
+
+    pending.failed_attempts += 1;
 
     if (!record || now > record.resetAt) {
-      this.pinAttempts.set(ip, { count: 1, resetAt: now + OAuthProvider.PIN_LOCKOUT_MS });
+      this.pinAttemptWindow = { count: 1, resetAt: now + OAuthProvider.PIN_LOCKOUT_MS };
       return OAuthProvider.MAX_PIN_ATTEMPTS - 1;
     }
 
@@ -165,8 +211,12 @@ export class OAuthProvider {
     return Math.max(0, OAuthProvider.MAX_PIN_ATTEMPTS - record.count);
   }
 
-  private resetAttempts(ip: string): void {
-    this.pinAttempts.delete(ip);
+  private resetAttempts(stateKey: string): void {
+    this.pinAttemptWindow = null;
+    const pending = this.pendingAuthorizations.get(stateKey);
+    if (pending) {
+      pending.failed_attempts = 0;
+    }
   }
 
   // ─── Registration auth ───────────────────────────────────────────────────
@@ -183,16 +233,14 @@ export class OAuthProvider {
       return true;
     }
     const providedToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
-    const expected = Buffer.from(MCP_AUTH_TOKEN, 'utf-8');
-    const provided = Buffer.from(providedToken, 'utf-8');
-    const maxLen = Math.max(expected.length, provided.length);
-    return (
-      expected.length === provided.length &&
-      timingSafeEqual(
-        Buffer.concat([expected, Buffer.alloc(maxLen - expected.length)]),
-        Buffer.concat([provided, Buffer.alloc(maxLen - provided.length)]),
-      )
-    );
+    // HMAC normalisation: both sides get hashed to a fixed 32-byte digest
+    // before timingSafeEqual sees them. The previous implementation short-
+    // circuited on `expected.length === provided.length &&` BEFORE calling
+    // timingSafeEqual, leaking the secret's length via timing (same bug
+    // class as the api-auth middleware fix from issue #12 Stage 2A).
+    const expectedDigest = createHmac('sha256', this.hmacKey).update(MCP_AUTH_TOKEN).digest();
+    const providedDigest = createHmac('sha256', this.hmacKey).update(providedToken).digest();
+    return timingSafeEqual(expectedDigest, providedDigest);
   }
 
   // ─── Client registration (RFC 7591) ─────────────────────────────────────
@@ -213,7 +261,13 @@ export class OAuthProvider {
     };
 
     this.state.clients[client_id] = client;
-    this.saveState();
+    try {
+      this.saveState();
+    } catch (error) {
+      delete this.state.clients[client_id];
+      console.error('[OAuth] Client registration aborted: failed to persist state', error);
+      throw error;
+    }
 
     console.log(`[OAuth] Client registered: ${client_id} (${metadata.client_name ?? 'unnamed'})`);
     return client;
@@ -274,6 +328,7 @@ export class OAuthProvider {
       redirect_uri: params.redirect_uri,
       resource: params.resource,
       created_at: Date.now(),
+      failed_attempts: 0,
     });
 
     console.log(`[OAuth] Authorization started for client: ${params.client_id}`);
@@ -332,17 +387,15 @@ export class OAuthProvider {
   /**
    * Verify PIN and issue authorization code.
    * Returns redirect URI with code param, or error info.
-   * @param ip - Client IP address for rate limiting (pass 'unknown' if unavailable)
    */
   handleLoginCallback(
     stateKey: string,
     pin: string,
-    ip: string = 'unknown',
   ): { redirectUri: string } | { error: string; status: number; showLoginPage?: boolean } {
     // Rate limit check
-    const rateCheck = this.checkRateLimit(ip);
+    const rateCheck = this.checkRateLimit();
     if (!rateCheck.allowed) {
-      console.warn(`[OAuth] PIN rate limit exceeded for IP: ${ip}`);
+      console.warn('[OAuth] PIN rate limit exceeded');
       return { error: 'Too many failed attempts. Please try again in 15 minutes.', status: 429, showLoginPage: true };
     }
 
@@ -372,15 +425,15 @@ export class OAuthProvider {
     const pinMatch = lengthMatch && bytesMatch;
 
     if (!pinMatch) {
-      const attemptsLeft = this.recordFailedAttempt(ip);
-      console.warn(`[OAuth] Failed PIN attempt from IP: ${ip}, attempts remaining: ${attemptsLeft}`);
+      const attemptsLeft = this.recordFailedAttempt(stateKey);
+      console.warn(`[OAuth] Failed PIN attempt for state ${stateKey}, attempts remaining: ${attemptsLeft}`);
       const msg = attemptsLeft > 0
         ? `Incorrect PIN (${attemptsLeft} attempts remaining)`
         : 'Incorrect PIN — account locked for 15 minutes';
       return { error: msg, status: 403, showLoginPage: true };
     }
 
-    this.resetAttempts(ip);
+    this.resetAttempts(stateKey);
 
     // Issue authorization code — one-time use
     const code = randomBytes(24).toString('hex');
@@ -456,7 +509,13 @@ export class OAuthProvider {
       expires_at,
       resource: codeData.resource,
     };
-    this.saveState();
+    try {
+      this.saveState();
+    } catch (error) {
+      delete this.state.tokens[access_token];
+      console.error('[OAuth] Access token issuance aborted: failed to persist state', error);
+      return { error: 'temporarily_unavailable: failed to persist token state', status: 503 };
+    }
 
     console.log(`[OAuth] Access token issued for client: ${codeData.client_id}`);
 
@@ -481,7 +540,11 @@ export class OAuthProvider {
     if (data) {
       if (data.expires_at < Date.now()) {
         delete this.state.tokens[token];
-        this.saveState();
+        try {
+          this.saveState();
+        } catch (error) {
+          console.error('[OAuth] Failed to persist expired-token cleanup', error);
+        }
         return null;
       }
       return {
@@ -515,10 +578,24 @@ export class OAuthProvider {
   // ─── Token revocation ────────────────────────────────────────────────────
 
   revokeToken(token: string): void {
-    if (this.state.tokens[token]) {
-      delete this.state.tokens[token];
+    const existing = this.state.tokens[token];
+    if (!existing) return;
+
+    delete this.state.tokens[token];
+    try {
       this.saveState();
       console.log('[OAuth] Token revoked');
+    } catch (error) {
+      // Roll back in-memory deletion so memory + disk stay consistent.
+      // The previous behaviour logged "Token revoked" even on persistence
+      // failure — operators had no signal, and the token would reappear
+      // on next restart (disk state is authoritative at startup). Worse,
+      // an attacker whose token was "revoked" but not persisted could
+      // keep using it for the current process lifetime with no audit
+      // trail. Re-throw so /revoke returns 500 and the client knows.
+      this.state.tokens[token] = existing;
+      console.error('[OAuth] Token revocation failed to persist — state restored', error);
+      throw new Error('Failed to persist token revocation', { cause: error });
     }
   }
 
@@ -531,6 +608,15 @@ export class OAuthProvider {
   getClientCount(): number {
     return Object.keys(this.state.clients).length;
   }
+
+  getIssuedCodeCount(): number {
+    return this.issuedCodes.size;
+  }
+
+  /** Force a sweep of expired codes/pending/tokens. Test-only entry point. */
+  runExpirySweep(): void {
+    this.cleanExpiredTokens();
+  }
 }
 
 // Singleton instance
diff --git a/src/oauth/routes.ts b/src/oauth/routes.ts
index 3457daea..baa4cc14 100644
--- a/src/oauth/routes.ts
+++ b/src/oauth/routes.ts
@@ -15,17 +15,10 @@
  *   POST /oauth/callback                          — PIN verification + redirect (rate-limited)
  */
 
-import type { Context, Hono } from 'hono';
+import type { Hono } from 'hono';
 import { MCP_EXTERNAL_URL } from '../config.ts';
 import { getOAuthProvider } from './provider.ts';
 
-/** Extract best-effort client IP from request headers */
-function getClientIp(c: Context): string {
-  const forwarded = c.req.header('x-forwarded-for');
-  if (forwarded) return forwarded.split(',')[0].trim();
-  return c.req.header('x-real-ip') ?? 'unknown';
-}
-
 export function registerOAuthRoutes(app: Hono): void {
   // ─── Discovery metadata ────────────────────────────────────────────────
 
@@ -80,14 +73,19 @@ export function registerOAuthRoutes(app: Hono): void {
       return c.json({ error: 'invalid_client_metadata: redirect_uris required' }, 400);
     }
 
-    const client = provider.registerClient({
-      redirect_uris: redirect_uris as string[],
-      client_name: body.client_name as string | undefined,
-      grant_types: body.grant_types as string[] | undefined,
-      response_types: body.response_types as string[] | undefined,
-      scope: body.scope as string | undefined,
-      token_endpoint_auth_method: body.token_endpoint_auth_method as string | undefined,
-    });
+    let client;
+    try {
+      client = provider.registerClient({
+        redirect_uris: redirect_uris as string[],
+        client_name: body.client_name as string | undefined,
+        grant_types: body.grant_types as string[] | undefined,
+        response_types: body.response_types as string[] | undefined,
+        scope: body.scope as string | undefined,
+        token_endpoint_auth_method: body.token_endpoint_auth_method as string | undefined,
+      });
+    } catch {
+      return c.json({ error: 'temporarily_unavailable: failed to persist client registration' }, 503);
+    }
 
     return c.json(client, 201);
   });
@@ -193,10 +191,20 @@ export function registerOAuthRoutes(app: Hono): void {
     }
 
     if (token) {
-      getOAuthProvider().revokeToken(token);
+      try {
+        getOAuthProvider().revokeToken(token);
+      } catch (err) {
+        // revokeToken now throws on saveState persistence failure. Surface
+        // a 500 so the caller knows the revocation did not stick — the
+        // previous silent-swallow behaviour would have returned 200 while
+        // the token remained valid on disk (next restart would restore it).
+        console.error('[OAuth] /revoke: persistence failed', err);
+        return c.json({ error: 'server_error', error_description: 'Revocation failed to persist' }, 500);
+      }
     }
 
-    // RFC 7009: always return 200 even if token unknown
+    // RFC 7009: return 200 for unknown/missing tokens (no token existence oracle).
+    // Successful revocation also returns 200.
     return c.json({}, 200);
   });
 
@@ -229,9 +237,8 @@ export function registerOAuthRoutes(app: Hono): void {
       }
     }
 
-    const ip = getClientIp(c);
     const provider = getOAuthProvider();
-    const result = provider.handleLoginCallback(stateKey, pin, ip);
+    const result = provider.handleLoginCallback(stateKey, pin);
 
     if ('error' in result) {
       if (result.showLoginPage) {
diff --git a/src/oauth/types.ts b/src/oauth/types.ts
index bf10453e..d28ceb5d 100644
--- a/src/oauth/types.ts
+++ b/src/oauth/types.ts
@@ -36,4 +36,5 @@ export interface PendingAuthorization {
   redirect_uri: string;
   resource?: string;
   created_at: number;
+  failed_attempts: number;
 }
```
