---
title: Oracle v3 (Arra)
type: wiki
status: active
updated: 2026-06-30
oracle_entries: 14
sources:
  - https://github.com/gobikom/arra-oracle-v3
project: github.com/gobikom/arra-oracle-v3
tags: [wiki, oracle-v3]
---



# Oracle v3 (Arra)

## Code Structure (auto — CK, refreshed 2026-06-30)

- frontend/src: 268 functions, 45 interfaces, 6 types
- src/vector: 9 classes, 98 functions, 7 interfaces, 2 types
- src: 3 classes, 61 functions, 15 interfaces, 1 type
- src/tools: 55 functions, 22 interfaces
- src/server: 40 functions, 9 interfaces
- src/process-manager: 39 functions, 7 interfaces, 1 type
- src/oauth: 2 classes, 37 functions, 7 interfaces
- src/indexer: 1 class, 29 functions, 7 interfaces, 1 type, 3 variables
- src/trace: 15 functions, 12 interfaces
- src/routes: 25 functions
- src/vault: 18 functions, 7 interfaces
- src/forum: 12 functions, 10 interfaces, 2 types
- src/cli: 21 functions, 1 interface
- src/integration: 15 functions, 2 interfaces
- src/scripts: 7 functions

## Entry Points (auto — CK)

- printJson `function printJson(data: unknown): void` — src/cli/format.ts (14 connections)
- ensureServerRunning `async function ensureServerRunning(options: EnsureServerOptions = {}): Promise<boolean` — src/ensure-server.ts (13 connections)
- registerOAuthRoutes `function registerOAuthRoutes(app: Hono): void` — src/oauth/routes.ts (13 connections)
- oracleFetch `async function oracleFetch<T = any>(path: string, options?: FetchOptions): Promise<T` — src/cli/http.ts (12 connections)
- createLearning `function createLearning(deps: LearnDeps, input: LearnInput): LearnResult` — src/tools/learn.ts (12 connections)
- registerVault `function registerVault(program: Command): void` — src/cli/commands/vault.ts (11 connections)
- detectProject `function detectProject(cwd?: string): string | null` — src/server/project-detect.ts (11 connections)
- syncVault `function syncVault(opts: { dryRun?: boolean; repoRoot: string }): SyncResult` — src/vault/handler.ts (11 connections)
- getSetting `function getSetting(key: string): string | null` — src/db/index.ts (11 connections)
- createVectorStore `function createVectorStore(config: VectorStoreConfig = {}): VectorStoreAdapter` — src/vector/factory.ts (10 connections)

## Hotspots (auto — CK)

- `src/routes/supersede.ts` — 75 connections, change_freq=0
- `src/process-manager/logger.ts` — 74 connections, change_freq=0
- `src/vector/factory.ts` — 72 connections, change_freq=0
- `frontend/src/pages/Graph.tsx` — 54 connections, change_freq=3
- `dependencies` — 46 connections, change_freq=0

## Overview

TypeScript MCP server providing persistent semantic memory for AI agents. Offers 23 arra_* tools for knowledge management: search, learn, threads, traces, handoff, inbox, verify, and more. Uses hybrid search (SQLite FTS5 + Qdrant vector) with graceful degradation. Serves as the shared knowledge base for the entire Oracle AI family — PSak, Dora, DevOps, T-Rex, Reviewer, and Merger all read/write here.

Runs on port 47778 on the OpenClaw VPS. Accessible via MCP (Streamable HTTP preferred, stdio kept for backwards compat with guard) and HTTP REST API with Bearer auth. Claude Desktop connects via OAuth 2.1 + PKCE.

## Architecture

```
arra-oracle-v3/
├── src/
│   ├── index.ts          # MCP server entry (stdio)
│   ├── server.ts         # HTTP API + Streamable HTTP MCP transport
│   ├── tools/            # 23 arra_* tool implementations
│   ├── db/               # Drizzle ORM + SQLite schema
│   ├── indexer/          # FTS5 indexing + vector backfill
│   ├── routes/           # REST API (knowledge, forum, traces, settings)
│   ├── middleware/       # Bearer auth, rate limiting
│   ├── oauth/            # OAuth 2.1 + PKCE for Claude Desktop
│   └── vault/            # CLI for managing ψ/ knowledge vault
├── ψ/                    # Knowledge vault (learnings, retros, docs — symlinked)
│   ├── memory/           # Learnings + retrospectives (primary storage)
│   ├── inbox/            # Handoffs, tracks
│   └── obsidian/         # Obsidian-compatible schema
├── wiki/                 # Structured wiki pages (repo root — git can't track through ψ/ symlink)
│   ├── projects/         # Per-project knowledge pages
│   ├── systems/          # Infrastructure pages (future)
│   └── patterns/         # Cross-project patterns (future)
└── scripts/              # Backfill, migration, maintenance
```

**Search architecture (hybrid, 3 modes):**
```
Query → FTS5 (keyword, exact match)    ──┐
     → Qdrant (semantic, bge-m3 1024d) ──┼── RRF merge → ranked results
     → hybrid (both, default)           ──┘

Embedding models:
  bge-m3   — default, multilingual Thai↔EN, 1024-dim
  nomic    — fast, 768-dim
  qwen3    — cross-language, 4096-dim
```

**ψ vault architecture (3-tier):**
- Home repos (agent-psak, agent-dora, agent-devops) have real ψ/ directories
- Project repos symlink ψ/ to their agent's home repo via VAULT_MAP
- `arra_learn` always writes to Oracle server's CWD (arra-oracle-v3/ψ/), not the calling session's CWD
- `/rrr` writes retrospectives relative to session CWD (hence project repos need symlinks too)

**Project scoping:**
- `project="agent:psak"` — private to PSak, only PSak's searches return these
- `project=null` — shared, all agents can find
- Search with agent scope returns both private AND shared results

## Key Decisions

| Decision | Chosen | Rejected | Why |
|----------|--------|----------|-----|
| Vector backend | Qdrant Cloud | ChromaDB (original), LanceDB | ChromaDB unstable (hangs, timeouts); Qdrant reliable + managed |
| Primary search | Hybrid FTS5 + vector | Vector-only | Thai keyword matching needs FTS5; semantics need vectors |
| Embedding model | bge-m3 (1024d) | nomic, OpenAI | Multilingual Thai↔EN, self-hosted, good quality |
| Storage format | Markdown files in ψ/ + SQLite index | Database-only | Files are git-trackable, human-readable, Obsidian-compatible |
| Auth | Bearer token (MCP/HTTP) + OAuth 2.1 (Claude Desktop) | API key only | Claude Desktop can't send custom headers; OAuth solves this |
| Supersede model | Soft-delete via supersede chain | Hard delete | "Nothing deleted, only superseded" — audit trail preserved |

## Known Issues

- `arra_learn` writes to SQLite but vector sync to Qdrant can fail silently — fixed with retry + vectorStatus guard (PR #30)
- Vault indexing is manual (`oracle-vault reindex`) — no automated trigger on file changes yet
- Knowledge-lint score (Sunday 20:00) detects contradictions, stale entries, orphans, and cross-store duplicates
- Oracle DB had 1,339 orphan entries flagged during 2026-05-09 reindex; auto-archive >90d in knowledge-lint
- Dual allTools arrays in codebase — no single source of truth (tech debt)
- [RESOLVED] Claude Code/Codex spawned stdio `bun index.ts` despite mcp-remote config — root cause: Codex had stale `~/.codex/config.toml` (fixed to HTTP url), Claude Code binary behavior unknown (mitigated by guard in `src/index.ts` PR #38)

## Patterns

- **Supersede chain**: When resolving an issue, create `[RESOLVED]` learning then `arra_supersede(old, new)`. One active learning per topic.
- **MCP-FAIL-SAFE**: All consumers (scores, agents) should handle Oracle unavailability gracefully — fail-open for reads, retry-once for writes.
- **3-tier vault**: Real ψ/ in home repos, symlinks in project repos. All learnings funnel through Oracle server's ψ/.
- **Stdio guard**: `src/index.ts` checks if HTTP server (port 47778) is reachable via fetch on startup. If yes → exits immediately (redundant instance). Saves ~80-100MB RAM per session. Guard is a defense-in-depth layer — primary fix is correct MCP config.
- **MCP config locations** (all must point to HTTP, not stdio): `~/.claude/settings.json`, `~/.claude-account-b/settings.json`, `~/.codex/config.toml`, `multi-agents/config/mcp/oracle-*.json`

## See Also

- [soul-orchestra](soul-orchestra.md) — all agents consume Oracle knowledge via conductor protocol Phase 2 (RECALL)
- [auto-ops](auto-ops.md) — incident patterns stored in Oracle for cross-session learning
