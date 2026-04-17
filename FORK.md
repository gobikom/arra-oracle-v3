# FORK.md — Fork Policy for `gobikom/arra-oracle-v3`

This repo is a **hard fork** of [`Soul-Brews-Studio/arra-oracle-v3`](https://github.com/Soul-Brews-Studio/arra-oracle-v3).
`gobikom/main` is the **canonical production source** for the PSak/OpenClaw agent ecosystem.

## Decision: Hybrid — pull selectively, never push back (Option C)

Decided 2026-04-18 (issue #15).

| Aspect                    | Policy                                                                                        |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| **Canonical branch**      | `gobikom/main`                                                                                |
| **Push to upstream**      | **No** — do not open PRs against `Soul-Brews-Studio/arra-oracle-v3`                           |
| **Pull from upstream**    | **Selectively** — cherry-pick specific commits when genuinely useful for our use case         |
| **Default PR base**       | Always `gobikom/arra-oracle-v3:main`                                                          |

### Why hybrid, not full sync (Option A) or full divorce (Option B)

1. **Upstream's `server.ts` refactor makes sync-back costly.** Upstream split the old 1388-line `server.ts` into 13 route modules under `src/routes/`. Our fork's Bearer auth middleware, `/mcp` Streamable HTTP transport, and startup token enforcement all live in a single `server.ts` that no longer exists upstream — these would need to be re-homed into upstream's new module layout. (The `src/indexer/` split into 10 modules already landed before our fork, so both trees have it — that refactor is NOT a blocker; only the `server.ts` split is.)
2. **Direction divergence.** Upstream is building an application layer (OracleNet social bar, wasm plugin endpoints (`/api/plugins`), Events page, web UI). Our fork is hardening a production MCP server (security, reliability, transport). The two roadmaps don't rhyme — a patch valuable to us is usually out of scope there, and vice versa.
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
# prerequisite: ensure the upstream remote exists (a clone from gobikom won't have it)
git remote get-url upstream >/dev/null 2>&1 \
  || git remote add upstream https://github.com/Soul-Brews-Studio/arra-oracle-v3.git

# fetch upstream latest
git fetch upstream

# see what's new upstream that we don't have
git log --oneline main..upstream/main

# see what we have that upstream doesn't (divergence scope)
git log --oneline upstream/main..main

# cherry-pick a specific commit if useful
git cherry-pick <sha>

# verify what actually landed before pushing (catches typo'd SHA / wrong-branch mistakes)
git show HEAD --stat
```

Do **not** run `git merge upstream/main` without careful review — it will drag in refactors that conflict heavily with our server changes.

### Monitoring upstream for security advisories

The fork does not auto-pull upstream. To avoid silently missing upstream security fixes for code shared between trees:

```bash
# check published advisories (run periodically, e.g. weekly).
# returns an empty array when none are published — this does NOT surface
# draft or privately-reported advisories the upstream maintainer hasn't published yet.
gh api repos/Soul-Brews-Studio/arra-oracle-v3/security-advisories

# or grep upstream commit messages after each fetch.
# no '^' anchor — conventional-commit messages like "fix(auth): CVE-..." or
# "chore: bump dep for vuln" don't start the line with those keywords.
git log upstream/main --grep='security\|CVE\|vuln' --since='1 month ago'
```

Evaluate applicability against our diverged auth/transport layer before cherry-picking — some upstream security fixes won't be load-bearing on our tree, and some will be.

## Operational setup

One-time per clone (run from the repo root):

```bash
git config gh.repo gobikom/arra-oracle-v3

# verify the config took effect (expect: gobikom/arra-oracle-v3)
gh repo view --json nameWithOwner -q .nameWithOwner
```

Note: `git config` writes to `.git/config` of the current clone. New clones, new machines, and new `git worktree` checkouts need this applied separately — do NOT assume the default `gh pr create` will target gobikom without running the verify command above.

`.github/PULL_REQUEST_TEMPLATE.md` reminds every PR author to verify the base via a visible fork-notice callout.

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
- **License or attribution drift** — currently both repos share the same upstream license; revisit if upstream changes its license, or if we ship the fork as a distinct product (in which case add a `NOTICE` / "forked from" attribution)

## Refs

| Ref                | Pointer                                                                                             |
| ------------------ | --------------------------------------------------------------------------------------------------- |
| Decision           | Issue #15                                                                                           |
| Fork moment        | PR #14 (`fix: bind HTTP to 127.0.0.1 by default (#12, Stage 1)`) — surfaced the base-repo pitfall   |
| Wrong-target PR    | `Soul-Brews-Studio/arra-oracle-v3#739` (closed — the mistake this doc now prevents)                 |
| PR template        | `.github/PULL_REQUEST_TEMPLATE.md`                                                                  |
| In-repo rules      | `CLAUDE.md` → Critical Safety Rules → Repository Usage                                              |
