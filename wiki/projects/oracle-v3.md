---
title: Oracle v3 (Arra)
type: wiki
status: active
updated: 2026-08-02
oracle_entries: 18
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

  **Update 2026-08-02 — the producer is fixed, the backlog is not.** Re-measured by
  knowledge-lint. New path-scheme (`learning_ψ/…`) rows by creation month:
  2026-05 → 1,503, 2026-06 → 2,567, **2026-07 → 71, 2026-08 → 0.** Whatever shipped in July
  stopped the double-write, so item 1/2 above is effectively closed for new documents.
  What was never done is the cleanup: **1,550 files still carry both schemes live**, so
  searches keep returning the same content two and three times today. Visible in this run's
  own results — one systemd query returned 4 chunks of a single file inside its top 10.
  The remaining work is a one-off dedupe of those 1,550, not a code change.
- [RESOLVED] Claude Code/Codex spawned stdio `bun index.ts` despite mcp-remote config — root cause: Codex had stale `~/.codex/config.toml` (fixed to HTTP url), Claude Code binary behavior unknown (mitigated by guard in `src/index.ts` PR #38)

- **P1 — 2,317 source files are gone from disk and nobody investigated.** Measured
  2026-08-02 (knowledge-lint). All 2,317 were marked superseded on a *single day*,
  2026-07-05, with `superseded_reason = "File missing from disk (arra_verify)"`. Their
  `superseded_by` points at document ids that do not exist — 2,317 dangling pointers.
  Spot-checked 40 paths against `~/psi/agent-psak/`: all 40 still absent. The vault holds
  5,012 files today; the DB knows 7,255 source paths. That is 32% of the corpus by file
  count, mostly 2026-03 → 2026-06.

  This is **not** the 2026-07-27 `rm -rf` incident (agent-devops#962) — it is three weeks
  earlier and a separate event. The content survives inside `oracle.db`; only the files are
  gone, and because the rows are marked superseded the content is excluded from every
  default read. Recoverable from the DB, invisible until someone does.

- **Only 129 of 7,980 live rows carry a TTL** (2026-08-02 census). 7,851 have
  `expires_at IS NULL`, so nothing ages out on its own — the store grows monotonically and
  staleness is a manual problem. Related to the duplicate-indexing entry above, but broader:
  even single-indexed `arra_learn` rows mostly ship without `ttl:`.

- **98% of aged documents are never read back.** `document_access` holds 487,635 search-hit
  rows covering just 640 distinct documents. Of 3,385 live documents older than 14 days,
  3,315 have never been returned by any logged search. The working set is ~640 documents;
  the rest is, in practice, write-only.

- **Five documents are superseded by themselves** (`superseded_by == id`). Each is excluded
  from search *and* names itself as its own replacement, so the content is unreachable by
  any path. All five came from LEARN-AND-SUPERSEDE calls passing the same id as both
  arguments — agent behaviour, not a server bug, but the server accepts it.

- **The supersede audit log covers 47 of 4,170 supersessions (1.1%).** `supersede_log` is
  written by explicit `arra_supersede` calls only; the 2,317 `arra_verify` sweep rows and
  the score-output rotations set `superseded_by` directly without logging. "Nothing deleted,
  only superseded" is the core rule, and the table that would evidence it is empty for 99%
  of the events.

- **Naming trap — `~/.arra-oracle-v2` is the LIVE Oracle *v3* data directory.** The path is
  legacy; v3 kept it. Both `package.json` and `dist/index.js` reference `arra-oracle-v2`.
  Anyone doing disk cleanup reads "v2" as "superseded, safe to remove" and deletes ~1.9G
  containing the entire cross-agent knowledge base. This nearly happened during the
  2026-08-02 disk cleanup — it was one approval away. What caught it was checking liveness
  rather than the name: a `-wal` file with a fresh mtime, and `lsof` showing an open `bun`
  handle. Check liveness, never infer from a version number in a path.

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
