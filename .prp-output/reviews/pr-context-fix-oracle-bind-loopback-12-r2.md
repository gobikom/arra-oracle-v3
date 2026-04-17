---
pr: 14
branch: "fix/oracle-bind-loopback-12"
extracted: 2026-04-15T19:50:00+07:00
files_changed: 2
review_round: 2
---

# PR Review Context (Round 2): #14 — fix(server): bind HTTP to 127.0.0.1 by default + harden env handling

## Round 1 → Round 2 Delta

Round 1 verdict was **NEEDS FIXES** with 1 Important issue (operator-footgun warning omission) and 4 Suggestions. Round 2 commit `13c0ad8` bundles ALL of round 1's actionable items:

1. ✅ **Warning when non-loopback** — added `console.warn` matching the `MCP_EXTERNAL_URL` pattern
2. ✅ **Misleading comment rewritten** — explicit that `/api/*` is unauthenticated and Stage 2 is pending
3. ✅ **`.trim()` guard** — handles whitespace-only env value
4. ✅ **`http://` prefix restored in banner**
5. ⏸ Test coverage for default — deferred to follow-up (small, can be done after merge)
6. ⏸ Delete `server-legacy.ts` dead code — separate cleanup PR

## PR Metadata
- **Author**: gobikom
- **Branch**: fix/oracle-bind-loopback-12 → main
- **State**: OPEN
- **Size**: +19 / -4 across 2 files (round 2)
- **Repo**: gobikom/arra-oracle-v3 (production fork)
- **HEAD**: 13c0ad8

## Changed Files
- `src/config.ts` (+22 / -2)
- `src/server.ts` (+3 / -2)

## PR Diff (Round 2)

```diff
diff --git a/src/config.ts b/src/config.ts
index 659c93e0..e2b4f204 100644
--- a/src/config.ts
+++ b/src/config.ts
@@ -44,6 +44,26 @@ export const CHROMADB_DIR = path.join(HOME_DIR, C.CHROMADB_DIR_NAME);
 // If empty, /mcp will reject all requests with 401 (fail-safe)
 export const MCP_AUTH_TOKEN = process.env.MCP_AUTH_TOKEN || '';

+// HTTP bind host. Defaults to 127.0.0.1 so the server is reachable only via
+// localhost / a reverse proxy.
+//
+// WARNING: /api/* routes are currently UNAUTHENTICATED (issue #12 Stage 2
+// pending — auth middleware not yet shipped). Do NOT set ORACLE_BIND_HOST to
+// 0.0.0.0 until that lands. The reverse proxy (nginx basic_auth) is the only
+// current edge gate; binding non-loopback bypasses it entirely.
+export const ORACLE_BIND_HOST = (process.env.ORACLE_BIND_HOST || '').trim() || '127.0.0.1';
+
+if (
+  ORACLE_BIND_HOST !== '127.0.0.1'
+  && ORACLE_BIND_HOST !== 'localhost'
+  && ORACLE_BIND_HOST !== '::1'
+) {
+  console.warn(
+    `⚠️  SECURITY: ORACLE_BIND_HOST=${ORACLE_BIND_HOST} binds non-loopback. `
+    + `/api/* routes are still unauthenticated until issue #12 Stage 2 lands — server is exposed.`,
+  );
+}
+
 // OAuth 2.1 — PIN-based auth for Claude Desktop / claude.ai Custom Connectors
 // If MCP_OAUTH_PIN is empty, OAuth routes are not mounted (Bearer-only mode)
 export const MCP_OAUTH_PIN = process.env.MCP_OAUTH_PIN || '';

diff --git a/src/server.ts b/src/server.ts
index 5b433b06..c9442fdc 100644
--- a/src/server.ts
+++ b/src/server.ts
@@ -18,7 +18,7 @@ import {
   performGracefulShutdown,
 } from './process-manager/index.ts';

-import { PORT, ORACLE_DATA_DIR, MCP_AUTH_TOKEN, MCP_OAUTH_PIN, MCP_EXTERNAL_URL } from './config.ts';
+import { PORT, ORACLE_BIND_HOST, ORACLE_DATA_DIR, MCP_AUTH_TOKEN, MCP_OAUTH_PIN, MCP_EXTERNAL_URL } from './config.ts';
 import { db, closeDb, indexingStatus } from './db/index.ts';

 // Route modules
@@ -177,7 +177,7 @@ app.all('/mcp', async (c) => {
 console.log(`
 🔮 Arra Oracle HTTP Server running! (Hono.js)

-   URL: http://localhost:${PORT}
+   Bind: http://${ORACLE_BIND_HOST}:${PORT}

    Endpoints:
    - GET  /api/health          Health check
@@ -214,5 +214,6 @@ if (MCP_OAUTH_PIN) {

 export default {
   port: Number(PORT),
+  hostname: ORACLE_BIND_HOST,
   fetch: app.fetch,
 };
```

## Round 1 Review Reference

Full round 1 review at `.prp-output/reviews/pr-14-agents-review.md` and posted to PR #14 as comment.

Round 1 reviewers were code-reviewer, security-reviewer, silent-failure-hunter. Same agents are running for round 2 to verify all addressed feedback is properly resolved and to catch any new issues introduced by the fixes themselves.

## Pattern Boundary Rule

Per the lesson from soul-orchestra PR #167: review fix-loop pattern expansion needs an explicit boundary. For round 2, agents should restrict pattern sweeps to:
- **Same file** (`src/config.ts`, `src/server.ts`) only
- **Same class of issue** as round 1 found
- **Do NOT expand sweep** into untouched modules looking for new bug classes — that scope is for a fresh review session, not a fix-verification round
