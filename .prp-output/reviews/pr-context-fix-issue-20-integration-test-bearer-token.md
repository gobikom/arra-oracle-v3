---
pr: 26
branch: "fix/issue-20-integration-test-bearer-token"
extracted: 2026-04-16T00:00:00Z
files_changed: 1
---

# PR Review Context: #26 — fix(test): wire Bearer auth into http.test.ts integration suite (#20)

## PR Metadata
- **Author**: gobikom
- **Branch**: fix/issue-20-integration-test-bearer-token → main
- **State**: OPEN
- **Size**: +43/-20 across 1 file

## Project Guidelines (from CLAUDE.md)
- Runtime: Bun (>=1.2.0), HTTP Framework: Hono
- Database: SQLite + FTS5 (Drizzle ORM)
- Auth: OAuth 2.1 + PKCE, static Bearer token fallback
- Port: 47778
- Never merge PRs without explicit user permission
- No force flags, safe operations only

## Changed Files
- `src/integration/http.test.ts`

## PR Description
Wires Bearer auth into http.test.ts integration suite to fix issue #20.

Root cause: PR #19 (issue #12 Stage 2C) flipped /api/* to required-enforce Bearer auth. Integration tests were still issuing unauthenticated fetch() calls, returning 401.

Fix applied:
1. `authFetch()` helper — single seam for Authorization: Bearer header (Option B from issue)
2. `TEST_TOKEN` reads `process.env.ORACLE_API_TOKEN ?? 'integration-test-token'` — works with existing server (real token) and CI (fresh server with fallback token)
3. Server spawn passes `ORACLE_API_TOKEN: TEST_TOKEN` so token always matches
4. 17 call sites replaced: all non-/api/health fetch( → authFetch(
5. /api/health kept as bare fetch — middleware always exempts it

Test results:
- `bun test:unit` — 157 pass, 0 fail (unchanged)
- `bun test src/integration/http.test.ts` — 19 pass, 0 fail (was 4 pass / 15 fail)

## PR Diff
```diff
diff --git a/src/integration/http.test.ts b/src/integration/http.test.ts
index 67e7d996..d5d74207 100644
--- a/src/integration/http.test.ts
+++ b/src/integration/http.test.ts
@@ -6,8 +6,31 @@ import { describe, test, expect, beforeAll, afterAll } from "bun:test";
 import type { Subprocess } from "bun";
 
 const BASE_URL = "http://localhost:47778";
+
+// Use the real token if already provisioned in the environment; fall back to a
+// fixed test value when the test suite spawns its own fresh server (CI / local
+// dev without oracle-v3 running).  Either way, the spawned server receives the
+// same value via the `env` block in beforeAll, so token and server always agree.
+const TEST_TOKEN = process.env.ORACLE_API_TOKEN ?? "integration-test-token";
+process.env.ORACLE_API_TOKEN = TEST_TOKEN;
+
 let serverProcess: Subprocess | null = null;
 
+/**
+ * All /api/* endpoints except /api/health require Bearer auth (issue #12 Stage 2C).
+ * This helper is a single seam for adding the header — easier to grep and maintain
+ * than sprinkling headers at every call site.
+ */
+async function authFetch(url: string, init?: RequestInit): Promise<Response> {
+  return fetch(url, {
+    ...init,
+    headers: {
+      ...init?.headers,
+      Authorization: `Bearer ${TEST_TOKEN}`,
+    },
+  });
+}
+
 async function waitForServer(maxAttempts = 30): Promise<boolean> {
   for (let i = 0; i < maxAttempts; i++) {
     try {
@@ -44,7 +67,7 @@ describe("HTTP API Integration", () => {
       cwd: import.meta.dir.replace("/src/integration", ""),
       stdout: "pipe",
       stderr: "pipe",
-      env: { ...process.env, ORACLE_CHROMA_TIMEOUT: "3000" },
+      env: { ...process.env, ORACLE_CHROMA_TIMEOUT: "3000", ORACLE_API_TOKEN: TEST_TOKEN },
     });
 
     const ready = await waitForServer();
@@ -82,7 +105,7 @@ describe("HTTP API Integration", () => {
     });
 
     test("GET /api/stats returns statistics", async () => {
-      const res = await fetch(`${BASE_URL}/api/stats`);
+      const res = await authFetch(`${BASE_URL}/api/stats`);
       expect(res.ok).toBe(true);
...
[full diff as shown above — all 17 call sites replaced with authFetch()]
```

## Implementation Context
This is a focused test-only fix. Only `src/integration/http.test.ts` was changed.
No production code changes. Issue was that integration tests didn't send auth headers
after Bearer auth was made mandatory for /api/* in PR #19.
