---
pr: 25
branch: "fix/issue-23-mcp-bearer-hmac-key"
extracted: 2026-04-16T00:00:00Z
files_changed: 1
---

# PR Review Context: #25 — fix(security): replace Buffer.alloc(32) zero-key with randomBytes(32) for /mcp HMAC (#23)

## PR Metadata
- **Author**: gobikom
- **Branch**: fix/issue-23-mcp-bearer-hmac-key → main
- **State**: OPEN
- **Size**: +7/-2 across 1 file

## Project Guidelines (from CLAUDE.md)
- Runtime: Bun (>=1.2.0), HTTP Framework: Hono
- Database: SQLite + FTS5 (Drizzle ORM)
- Auth: OAuth 2.1 + PKCE, static Bearer token fallback
- Port: 47778
- MCP Transports: stdio (src/index.ts), Streamable HTTP (src/mcp-transport.ts)
- Pattern: Use Drizzle schema, never direct SQL
- Never merge PRs without explicit user permission
- Git commit format: [type]: [brief description]

## Changed Files
src/server.ts

## PR Diff
```diff
diff --git a/src/server.ts b/src/server.ts
index 6933c8b9..d29fea83 100644
--- a/src/server.ts
+++ b/src/server.ts
@@ -6,7 +6,7 @@
  */
 
 import { Hono } from 'hono';
-import { timingSafeEqual, createHmac } from 'crypto';
+import { timingSafeEqual, createHmac, randomBytes } from 'crypto';
 import { cors } from 'hono/cors';
 import { eq } from 'drizzle-orm';
 
@@ -39,6 +39,11 @@ import { createMcpHandler } from './mcp-transport.ts';
 import { registerOAuthRoutes } from './oauth/routes.ts';
 import { getOAuthProvider } from './oauth/provider.ts';
 
+// Per-process HMAC key for /mcp Bearer-only comparison.
+// Fixes issue #23: was Buffer.alloc(32) (zero key) — must be randomBytes(32)
+// so that offline precomputation of HMAC(known-key, guess) is not possible.
+const MCP_BEARER_HMAC_KEY = randomBytes(32);
+
 // Reset stale indexing status on startup using Drizzle
 try {
   db.update(indexingStatus)
@@ -162,7 +167,7 @@ app.all('/mcp', async (c) => {
   } else {
     // Bearer-only mode: constant-time HMAC comparison
     if (MCP_AUTH_TOKEN) {
-      const _hmacKey = Buffer.alloc(32);
+      const _hmacKey = MCP_BEARER_HMAC_KEY;
       const expectedHash = createHmac('sha256', _hmacKey).update(MCP_AUTH_TOKEN).digest();
       const providedHash = createHmac('sha256', _hmacKey).update(token).digest();
       authorized = timingSafeEqual(expectedHash, providedHash);
```

## Implementation Context
This is a targeted security fix for issue #23. The problem was that `Buffer.alloc(32)` creates a 32-byte zero-filled buffer as the HMAC key, which is a known, predictable key. This allows an attacker to precompute HMAC values offline and potentially mount timing attacks.

The fix moves to `randomBytes(32)` at module scope, so:
1. The key is cryptographically random
2. The key is generated once per process (not per-request)
3. This matches the pattern used in `src/middleware/api-auth.ts` and `src/oauth/provider.ts`

Related context:
- Issue #22 security-reviewer agent originally identified this vulnerability
- The HMAC pattern is used for constant-time Bearer token comparison in the /mcp endpoint
- The /mcp endpoint is feature-gated on `MCP_AUTH_TOKEN` env var
- OAuth 2.1 + PKCE is the primary auth method; Bearer is the fallback
