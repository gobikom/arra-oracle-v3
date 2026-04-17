---
pr: 14
title: "fix(server): bind HTTP to 127.0.0.1 by default (#12, Stage 1)"
author: "gobikom"
reviewed: 2026-04-15T19:30:00+07:00
verdict: NEEDS FIXES
agents: [code-reviewer, security-reviewer, silent-failure-hunter]
---

## PR Review Summary (Multi-Agent)

3 core agents dispatched in parallel. Strong convergence on one operator-footgun issue; small set of polish items.

### Agents Dispatched

| Agent | Status | Findings |
|-------|--------|----------|
| code-reviewer | Completed | 2 issues + 1 dormant-code note |
| security-reviewer | Completed | 4 issues (0 critical, 0 high, 2 medium, 2 low) |
| silent-failure-hunter | Completed | 5 issues (1 critical, 2 high, 1 medium, 1 low) |

---

### Important Issues (1 — should fix before merge)

| Agent | Issue | Location |
|-------|-------|----------|
| security-reviewer, silent-failure-hunter | **No warning when `ORACLE_BIND_HOST` is set to non-loopback.** Setting `ORACLE_BIND_HOST=0.0.0.0` silently re-opens the exact P1 #12 vulnerability this PR is trying to fix — server starts cleanly, banner prints `Bind: 0.0.0.0:47778`, zero log signal that the security intent has been violated. The same file at `src/config.ts:57-59` already establishes the warning pattern for `MCP_EXTERNAL_URL` (warns when HTTP is used in production). The asymmetry is a clear oversight. **Operator can copy `ORACLE_BIND_HOST=0.0.0.0` from staging env, debug a container networking issue, or be told to "expose for LAN testing" — all routes to silently restoring the original disclosure (`?project=agent:psak` returns private memory because SQL filter is `OR project IS NULL`).** | `src/config.ts:50` |

**Recommended fix** (single-line bundle into the same commit):

```ts
// src/config.ts after the ORACLE_BIND_HOST export
if (ORACLE_BIND_HOST !== '127.0.0.1' && ORACLE_BIND_HOST !== 'localhost' && ORACLE_BIND_HOST !== '::1') {
  console.warn(`⚠️  SECURITY: ORACLE_BIND_HOST=${ORACLE_BIND_HOST} binds non-loopback. /api/* routes are still unauthenticated until #12 Stage 2 lands — server is exposed.`);
}
```

---

### Suggestions (4 — bundle if cheap, defer otherwise)

| Agent | Issue | Location | Note |
|-------|-------|----------|------|
| security-reviewer | **Misleading comment in config.ts** — phrasing *"only safe when auth is enforced on every /api/* route"* reads as a statement of current invariant. A reviewer or operator who trusts the comment will assume Stage 2 has already shipped and may flip the flag. | `src/config.ts:47-49` | Rewrite: `// WARNING: /api/* routes are currently UNAUTHENTICATED (issue #12 Stage 2 pending). Do NOT set to 0.0.0.0 until auth middleware lands. Reverse proxy (nginx basic_auth) is the only current edge gate.` |
| silent-failure-hunter | **Whitespace env value bypasses default guard** — `process.env.ORACLE_BIND_HOST = " "` evaluates `" " \|\| '127.0.0.1'` → `" "` (truthy), then Bun.serve fails with an opaque error. | `src/config.ts:50` | Change to `(process.env.ORACLE_BIND_HOST \|\| '').trim() \|\| '127.0.0.1'` |
| code-reviewer | **Banner loses `http://` prefix** — `Bind: ${ORACLE_BIND_HOST}:${PORT}` is harder to copy-paste as a URL than the previous `URL: http://localhost:${PORT}`. Cosmetic. | `src/server.ts:180` | `Bind: http://${ORACLE_BIND_HOST}:${PORT}` |
| silent-failure-hunter | **No test coverage for bind defaults or override** — could be silently reverted by a future refactor. | `src/integration/http.test.ts` | Add 1 unit test asserting `ORACLE_BIND_HOST` resolves to `127.0.0.1` when env is unset. Bundle in same PR or follow-up. |

---

### Disputed / Reviewed Down

| Agent | Original Severity | Issue | Verdict |
|-------|------------------|-------|---------|
| silent-failure-hunter | Critical | Unhandled Bun.serve bind exception (no try/catch wrap on default export) | **Downgraded to Low.** Standard Bun-as-entrypoint pattern lets the process die on bind failure; systemd journal captures the error and `Restart=on-failure` handles recovery. Wrapping in try/catch + `process.exit(1)` adds a custom error message but doesn't change behavior. Separate `process-manager/index.ts` already exists for graceful-shutdown handling — if a polished error message matters, it belongs there, not in a one-line wrap. **Not a merge blocker.** |

---

### Out of Scope (file as separate cleanup)

| Issue | Why separate |
|-------|--------------|
| `src/server-legacy.ts:485` calls `server.listen(PORT)` with no host arg — same bug class as the original P1. | **Confirmed dead code**: zero references in `package.json`, `src/`, `scripts/`. PSak grepped `grep -rn "server-legacy" src/ scripts/ package.json` → 0 hits. Recommend a separate PR to delete the file entirely (it's a pre-Bun migration relic). Not a security risk because nothing imports or runs it. |
| `src/integration/http.test.ts` test isolation — could connect to live production Oracle if test port collides | Pre-existing issue, unrelated to this PR. File as #16. |

---

### Strengths

- **Surgical scope.** +8/-2 across 2 files, exactly what's needed for Stage 1 — no scope creep, no incidental refactoring
- **Pattern compliance is clean.** `ORACLE_BIND_HOST` declared in `config.ts` alongside `MCP_AUTH_TOKEN`/`MCP_OAUTH_PIN`/`PORT`, follows the established naming and module convention. No raw `process.env` access outside the config module.
- **Secure default with documented escape hatch.** `|| '127.0.0.1'` is exactly right — secure by default, overridable when Stage 2 auth lands.
- **Single bind path.** Pattern sweep confirmed: only one `Bun.serve` invocation in the codebase (the `export default {}` object), no alternate bind paths, no HTTP/2 upgrade re-bind. The fix is structurally complete for what it claims.
- **Stage 2 gap unchanged.** Security review confirmed PR neither widens nor narrows the underlying Stage 2 work (`/api/*` middleware) — clean handoff.
- **No regressions in integration tests.** All 3 integration test files target `localhost` which still resolves to `127.0.0.1`, so the default flip is safe.

---

### Validation Status

Not run as part of this review — diff is too small for `npm test` to be informative against this change in isolation. Pre-existing typecheck errors in `src/server-legacy.ts` and `src/server/handlers.ts` already noted (verified during fix to be untouched by this PR).

---

### File Coverage Map

| File | Tier | Agents Run |
|------|------|------------|
| `src/config.ts` | 1 (Critical — config) | code, security, errors |
| `src/server.ts` | 1 (Critical — entrypoint) | code, security, errors |

---

### Verdict

**NEEDS FIXES** — 1 Important issue (operator-footgun warning omission). The fix is a 4-line addition to the same commit and matches an existing convention in the same file. Recommend bundling the fix + the suggested comment rewrite + the whitespace trim into a single follow-up commit, then re-review.

### Recommended Actions

1. **Add `ORACLE_BIND_HOST` non-loopback warning** in `src/config.ts` matching `MCP_EXTERNAL_URL` pattern (lines 57-59). Required.
2. **Rewrite the `ORACLE_BIND_HOST` comment** to be explicit that `/api/*` is currently unauthenticated and Stage 2 is pending. Required.
3. **Add `.trim()` to env handling** to handle whitespace-only values gracefully. Recommended (1-char fix).
4. **Banner cosmetic — add `http://` prefix back.** Optional.
5. **Test for default binding behavior.** Optional, can be follow-up.
6. **Separate cleanup PR**: delete `src/server-legacy.ts` (confirmed dead code, same bug class).
7. **Re-run `/prp-core:prp-review-agents 14` after fixes** to confirm 0 remaining issues.

After fixes land, this PR is ready to merge into gobikom/main and deploy.
