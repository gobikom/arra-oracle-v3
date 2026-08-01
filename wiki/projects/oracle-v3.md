---
title: Oracle v3 (Arra)
type: wiki
status: active
updated: 2026-08-01
oracle_entries: 17
sources:
  - https://github.com/gobikom/arra-oracle-v3
project: github.com/gobikom/arra-oracle-v3
tags: [wiki, oracle-v3]
---





# Oracle v3 (Arra)

## Code Structure (auto — CK, refreshed 2026-08-01)

- frontend/src: 268 functions, 45 interfaces, 6 types
- src/vector: 9 classes, 98 functions, 7 interfaces, 2 types
- src: 3 classes, 62 functions, 15 interfaces, 1 type
- src/tools: 57 functions, 23 interfaces, 1 type
- src/server: 40 functions, 9 interfaces
- src/process-manager: 39 functions, 7 interfaces, 1 type
- src/oauth: 2 classes, 37 functions, 7 interfaces
- src/indexer: 1 class, 30 functions, 8 interfaces, 1 type, 3 variables
- src/trace: 16 functions, 12 interfaces
- src/forum: 13 functions, 10 interfaces, 2 types
- src/routes: 25 functions
- src/vault: 18 functions, 7 interfaces
- src/cli: 21 functions, 1 interface
- scripts: 16 functions, 1 interface
- src/integration: 15 functions, 2 interfaces

## Entry Points (auto — CK)

- printJson `function printJson(data: unknown): void` — src/cli/format.ts (14 connections)
- createLearning `function createLearning(deps: LearnDeps, input: LearnInput): LearnResult` — src/tools/learn.ts (14 connections)
- ensureServerRunning `async function ensureServerRunning(options: EnsureServerOptions = {}): Promise<boolean` — src/ensure-server.ts (13 connections)
- registerOAuthRoutes `function registerOAuthRoutes(app: Hono): void` — src/oauth/routes.ts (13 connections)
- oracleFetch `async function oracleFetch<T = any>(path: string, options?: FetchOptions): Promise<T` — src/cli/http.ts (12 connections)
- registerVault `function registerVault(program: Command): void` — src/cli/commands/vault.ts (11 connections)
- detectProject `function detectProject(cwd?: string): string | null` — src/server/project-detect.ts (11 connections)
- syncVault `function syncVault(opts: { dryRun?: boolean; repoRoot: string }): SyncResult` — src/vault/handler.ts (11 connections)
- getSetting `function getSetting(key: string): string | null` — src/db/index.ts (11 connections)
- createVectorStore `function createVectorStore(config: VectorStoreConfig = {}): VectorStoreAdapter` — src/vector/factory.ts (10 connections)

## Hotspots (auto — CK)

- `src/routes/supersede.ts` — 76 connections, change_freq=0
- `src/vector/factory.ts` — 75 connections, change_freq=0
- `src/process-manager/logger.ts` — 75 connections, change_freq=0
- `frontend/src/pages/Graph.tsx` — 54 connections, change_freq=0
- `dependencies` — 50 connections, change_freq=0

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
- **P1 — every learning is indexed TWICE, and the duplicate never expires.** Expired
  documents keep being served by `arra_list` and `arra_search`. The read-path TTL filter is
  *not* the problem — `src/tools/list.ts:55,73,81` and `src/tools/search.ts:338` both apply
  `(expires_at IS NULL OR expires_at > ?)`, shipped in `6d5adcc` (2026-04-07) and live in the
  running service. The problem is upstream of it.

  Measured 2026-07-26 against `~/.arra-oracle-v2/oracle.db`:

  All figures re-queried 2026-07-26 ~22:5x BKK. **Read this table as a snapshot, not an
  identity.** The DB is written continuously — `arra_learn` was observed incrementing mid-review
  — and the rows below were captured across several queries seconds apart, so the three
  `created_by` buckets will not necessarily sum to the printed total (they were 6,587 + 4,141 +
  2,471 = 13,199 against a total captured moments earlier as 13,198). Counts involving "already
  past" additionally drift by the hour, ~28 rows/day crossing the threshold. To re-derive a
  self-consistent set, take the total and the `GROUP BY created_by` in a single query on one
  connection. The *ratios* are the point; the last digit is not.

  | probe | result |
  |---|---|
  | rows total / distinct `source_file` | 13,198 / 7,094 |
  | `source_file` values with more than one row | 3,001 (rows per file range **2–15**, not uniformly 2) |
  | — of those, files with **no** `arra_learn` row at all | 442 (~15%) — legitimate multi-chunk retro indexing, **not this bug** |
  | — leaving the arra_learn-paired subset this bug affects | **~2,559** |
  | `created_by='arra_learn'`, ids `learning_<date>_…` | 6,587 |
  | `created_by='indexer'`, ids `learning_ψ/…` | **4,141 — every one has `expires_at IS NULL`** |
  | `created_by='indexer'`, ids `retro_HH.MM_…` | 2,471 (third scheme — do not fold into either bucket above) |
  | rows with `expires_at` set and already past | 3,756 |

  There are **three** ID schemes, not two — `13,198 − 4,141 = 9,057` is *not* the arra_learn
  population; that arithmetic silently absorbs the 2,471 `retro_*` rows and overcounts by ~38%.

  `arra_learn` writes `expires_at` and `ttl_days`; the bulk file-scanner in
  `src/indexer/storage.ts` `storeDocuments()` never parses either from frontmatter (its Drizzle
  `.values()` / `.onConflictDoUpdate()` payloads omit both fields), so its row is `NULL` — and
  `NULL` reads as *never expires*. One concrete pair, both rows for the identical `source_file`:

  ```
  ψ/…/2026-05-19_daily-goal-w22d3-…-priority-3-p2.md   expires_at=1779813774662  ttl_days=7
  ψ/…/2026-05-19_daily-goal-w22d3-…-priority-3-p2.md   expires_at=NULL           ttl_days=NULL
  ```

  So the TTL-bearing twin expires on schedule and the indexer twin is served forever. That is
  why the `expired=3756` figure never reconciles with what search returns: it counts only
  column-expired rows, while the copy actually being served is the `NULL` twin it does not
  count. Note that figure comes from **`arra_list`** (`src/tools/list.ts:62-63,103`), not
  `arra_stats` — `src/tools/stats.ts` has no `expired` field at all, so anyone chasing the
  mismatch there is reading the wrong file. It is also the likely source of knowledge-lint's
  `orphaned=2317` / `drifted=998`.

  Consequence: LEARN-AND-SUPERSEDE is structurally ineffective for snapshot classes
  (`[score-output]`, `[infra-health]`, `[daily-goal]`, `[goal-carryover]`) — superseding keeps
  one logical entry current while the immortal duplicate stays searchable, so stale CRITICAL /
  WARNING snapshots outrank current data. Downstream effect proven in soul-orchestra#1107:
  `arra_search("goal-complete", category=goal)` returns nothing newer than 2026-05-02 even
  though 2026-07-24 entries exist and are indexed, because the old immortal twins carry
  `tags:[goal-complete]` and outrank them.

  **Fix is in the indexer, not the read path.** Neither adding a read-path filter (already
  there) nor cron-ing `bun run expire` (`scripts/expire-learnings.ts` only supersedes rows whose
  `expires_at` is already non-NULL — it cannot backfill NULLs) closes this. Needed:

  1. `storeDocuments()` parses `ttl:`/`expires:` frontmatter and writes `expiresAt`/`ttlDays`
  2. Dedupe the ID schemes so one file is one row
  3. **`src/scripts/backfill-ttl.ts` must be extended before it is run.** It exists, but it
     cannot touch these rows as written: line 38 derives its slug via
     `row.id.replace(/^learning_\d{4}-\d{2}-\d{2}_/, '')`, and an indexer id
     (`learning_ψ/memory/learnings/…`) never matches `\d{4}` — so slugPart stays as the full
     path and none of the anchored patterns (`/^score-output/i`, `/^daily-goal/i`, …) can fire.
     Running it as-is updates ~0 of the 4,141 rows. It needs to match on `source_file`, or to
     handle the `learning_ψ/%` scheme explicitly.

  No oracle expire job exists in
  `~/ops/cron-registry.yaml` or `crontab -l` — verified, so the 2026-04-07 retro's proposed cron
  entry never shipped, though scheduling it alone would not have helped.
- [RESOLVED] Claude Code/Codex spawned stdio `bun index.ts` despite mcp-remote config — root cause: Codex had stale `~/.codex/config.toml` (fixed to HTTP url), Claude Code binary behavior unknown (mitigated by guard in `src/index.ts` PR #38)

## Patterns

- **Supersede chain**: When resolving an issue, create `[RESOLVED]` learning then `arra_supersede(old, new)`. One active learning per topic.
- **MCP-FAIL-SAFE**: All consumers (scores, agents) should handle Oracle unavailability gracefully — fail-open for reads, retry-once for writes.
- **3-tier vault**: Real ψ/ in home repos, symlinks in project repos. All learnings funnel through Oracle server's ψ/.
- **Stdio guard**: `src/index.ts` checks if HTTP server (port 47778) is reachable via fetch on startup. If yes → exits immediately (redundant instance). Saves ~80-100MB RAM per session. Guard is a defense-in-depth layer — primary fix is correct MCP config.
- **MCP config locations** (all must point to HTTP, not stdio): `~/.claude/settings.json`, `~/.claude-account-b/settings.json`, `~/.codex/config.toml`, `multi-agents/config/mcp/oracle-*.json`
- **Threat scanning (2026-07-10, E1)**: Write-path `scanContent()` on all 4 durable write points (createLearning, handleHandoff, createLearningFile, addMessage). Read-path `sanitizeOutput()` on arra_search + arra_read. Shared `threat-patterns.json` (16 patterns). Critical patterns (LLM control tokens) always scan including inside code blocks; non-critical exempted. Audit log via `logThreatBlock()`. PR #64, 37 tests.

## See Also

- [soul-orchestra](soul-orchestra.md) — all agents consume Oracle knowledge via conductor protocol Phase 2 (RECALL)
- [auto-ops](auto-ops.md) — incident patterns stored in Oracle for cross-session learning
