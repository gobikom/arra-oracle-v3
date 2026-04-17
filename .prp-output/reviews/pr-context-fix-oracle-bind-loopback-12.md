---
pr: 14
branch: "fix/oracle-bind-loopback-12"
extracted: 2026-04-15T19:15:00+07:00
files_changed: 2
---

# PR Review Context: #14 — fix(server): bind HTTP to 127.0.0.1 by default (#12, Stage 1)

## PR Metadata
- **Author**: gobikom
- **Branch**: fix/oracle-bind-loopback-12 → main
- **State**: OPEN
- **Size**: +8 / -2 across 2 files
- **Repo**: gobikom/arra-oracle-v3 (production fork)

## Why This PR Exists
Partial fix for #12 — Stage 1 of coordinated containment for an unauthenticated `/api/*` knowledge base exposure. Bun.serve was binding `0.0.0.0` by default; combined with missing auth on `/api/*` this exposed per-agent private scopes (`agent:psak`, etc.) to any network peer that could reach port 47778.

Stage 0 (nginx basic_auth + bcrypt rotation) is already live in production. This PR is the code-side companion so Oracle no longer listens on external interfaces even if nginx is bypassed/misconfigured. Stage 2 (auth middleware on `/api/*` + bearer token clients) follows in a separate PR after this lands and is verified.

## Project Guidelines (relevant)
- TypeScript strict mode (per `tsconfig.json`)
- Bun.serve as the HTTP runtime (not Node)
- Config via env vars exported from `src/config.ts`, never read `process.env` outside that module
- All loopback callers in the ecosystem already use `127.0.0.1` or `localhost` (verified: my-ai-soul-mcp `_fetch_oracle_results`, auto-ops `watchdog.py::probe_oracle_vector`, soul-orchestra `infra_collector.py`, oracle-skills `schedule/query.ts`, nginx `oracle.goko.digital` proxy_pass)

## Changed Files
- `src/config.ts` (+5 / -0)
- `src/server.ts` (+3 / -2)

## PR Diff

```diff
diff --git a/src/config.ts b/src/config.ts
index 659c93e0..7f6885d4 100644
--- a/src/config.ts
+++ b/src/config.ts
@@ -44,6 +44,11 @@ export const CHROMADB_DIR = path.join(HOME_DIR, C.CHROMADB_DIR_NAME);
 // If empty, /mcp will reject all requests with 401 (fail-safe)
 export const MCP_AUTH_TOKEN = process.env.MCP_AUTH_TOKEN || '';

+// HTTP bind host. Defaults to 127.0.0.1 so the server is reachable only via
+// localhost / a reverse proxy; set ORACLE_BIND_HOST=0.0.0.0 to bind all
+// interfaces (only safe when auth is enforced on every /api/* route).
+export const ORACLE_BIND_HOST = process.env.ORACLE_BIND_HOST || '127.0.0.1';
+
 // OAuth 2.1 — PIN-based auth for Claude Desktop / claude.ai Custom Connectors
 // If MCP_OAUTH_PIN is empty, OAuth routes are not mounted (Bearer-only mode)
 export const MCP_OAUTH_PIN = process.env.MCP_OAUTH_PIN || '';

diff --git a/src/server.ts b/src/server.ts
index 5b433b06..7c8e7b65 100644
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
+   Bind: ${ORACLE_BIND_HOST}:${PORT}

    Endpoints:
    - GET  /api/health          Health check
@@ -214,5 +214,6 @@ if (MCP_OAUTH_PIN) {

 export default {
   port: Number(PORT),
+  hostname: ORACLE_BIND_HOST,
   fetch: app.fetch,
 };
```

## Implementation Context
- No formal implementation report (this was a quick surgical fix during incident response, not a planned PRP)
- Linked issue: #12 (P1 security — `/api/search` no auth + Bun bind 0.0.0.0)
- Linked issue: #15 (P3 fork drift, filed during this work)
- Original wrong-target PR: Soul-Brews-Studio/arra-oracle-v3#739 (closed)

## Stage 0 Verification (already live in prod, not part of this PR)
- nginx vhost `oracle.goko.digital` now has `auth_basic` + `htpasswd_dashboard`
- Password rotated apr1 MD5 → bcrypt, stored at `~/.secrets/dashboard-basic-auth.env` mode 600
- Verified: `curl https://oracle.goko.digital/api/health` → 401 unauth, 200 with creds
