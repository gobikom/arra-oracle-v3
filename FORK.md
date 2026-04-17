# FORK.md — Fork Policy for `gobikom/arra-oracle-v3`

This repo is a **hard fork** of [`Soul-Brews-Studio/arra-oracle-v3`](https://github.com/Soul-Brews-Studio/arra-oracle-v3).
`gobikom/main` is the **canonical production source** for the PSak/OpenClaw agent ecosystem.

## Decision: Hybrid — pull selectively, never push back (Option C)

Decided 2026-04-18 (issue #15).

| Aspect | Policy |
|---|---|
| **Canonical branch** | `gobikom/main` |
| **Push to upstream** | **No** — do not open PRs against `Soul-Brews-Studio/arra-oracle-v3` |
| **Pull from upstream** | **Selectively** — cherry-pick or merge specific commits when genuinely useful for our use case |
| **Default PR base** | Always `gobikom/arra-oracle-v3:main` |

### Why hybrid, not full sync (Option A) or full divorce (Option B)

1. **Upstream is mid-refactor on files we own.** `server.ts` (1388 lines) was split into 12 route modules upstream; `indexer.ts` (895 lines) into 10 modules. Our Bearer auth middleware, `/mcp` Streamable HTTP transport, and startup token enforcement live in places that no longer exist upstream. A sync-back would be a massive rebase for low strategic value.
2. **Direction divergence.** Upstream is building an application layer (OracleNet social bar, wasm plugins, Events page, web UI). Our fork is hardening a production MCP server (security, reliability, transport). The two roadmaps don't rhyme — a patch valuable to us is usually out of scope there, and vice versa.
3. **Full divorce wastes the option.** Upstream still produces useful structural work (path centralization, test fixes). Keeping the `upstream` remote lets us read and opportunistically adopt without the PR-review overhead of pushing back.

## Agent rules

When working on this repo, AI coding agents MUST:

1. **Always target `gobikom/arra-oracle-v3`** when opening PRs.
   - `gh pr create --repo gobikom/arra-oracle-v3 --base main ...`
   - A local git config sets `gh.repo` = `gobikom/arra-oracle-v3` as the default (see Operational setup below).
2. **Never open issues or PRs on `Soul-Brews-Studio/arra-oracle-v3`.** We're not contributing back.
3. **Treat `upstream/main` as read-only.** Use `git fetch upstream` to check for interesting commits, then cherry-pick deliberately.

## Syncing from upstream (when you want to)

```bash
# fetch upstream latest
git fetch upstream

# see what's new upstream that we don't have
git log --oneline main..upstream/main

# see what we have that upstream doesn't (divergence scope)
git log --oneline upstream/main..main

# cherry-pick a specific commit if useful
git cherry-pick <sha>
```

Do **not** run `git merge upstream/main` without careful review — it will drag in refactors that conflict heavily with our server changes.

## Operational setup

One-time setup (already applied on openclaw ops server):

```bash
cd /home/openclaw/repos/memory/arra-oracle-v3
git config gh.repo gobikom/arra-oracle-v3
```

`.github/PULL_REQUEST_TEMPLATE.md` reminds every PR author to verify the base.

## What lives in this fork but not upstream

High-level; see `git log upstream/main..main` for the full list.

- **Security hardening** — /api/* Bearer auth middleware + required-enforce at startup, HMAC randomBytes key for /mcp, redirect_uri validation, loopback-bind default
- **MCP Streamable HTTP transport** at `/mcp` (feature #2)
- **Production reliability** — Qdrant retry on transient errors, supersede filter in HTTP search, FTS5 `%` sanitization, learn_log backfill, TTL/auto-expire for ephemeral learnings
- **Integration testing** — Bearer token wiring in http.test.ts

## Revisit triggers

Reopen this decision if any of the following change:

- Upstream stabilizes its refactor and plateaus for >3 months
- We decide to publish this as a distinct product (rename, relicense, split identity)
- Upstream adopts MCP transport or production-grade auth, making convergence attractive

## Refs

- Decision: issue #15
- Fork moment: PR #14 (`fix: bind HTTP to 127.0.0.1 by default (#12, Stage 1)`) surfaced the base-repo pitfall
- Closed wrong-target PR: `Soul-Brews-Studio/arra-oracle-v3#739`
