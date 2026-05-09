---
title: Oracle v3 (Arra)
type: wiki
status: active
updated: 2026-05-09
oracle_entries: 12
sources:
  - https://github.com/gobikom/arra-oracle-v3
project: github.com/gobikom/arra-oracle-v3
tags: [wiki, oracle-v3]
---

# Oracle v3 (Arra)

## Overview

TypeScript MCP server providing persistent semantic memory for AI agents. Offers 19 arra_* tools for knowledge management: search, learn, threads, traces, handoff, inbox. Uses hybrid search (SQLite FTS5 + Qdrant vector) with graceful degradation. Serves as the shared knowledge base for the entire Oracle AI family — PSak, Dora, DevOps, T-Rex, Reviewer, and Merger all read/write here.

Runs on port 47778 on the OpenClaw VPS. Accessible via MCP (stdio + Streamable HTTP) and HTTP REST API with Bearer auth. Claude Desktop connects via OAuth 2.1 + PKCE.

## Architecture

```
arra-oracle-v3/
├── src/
│   ├── index.ts          # MCP server entry (stdio)
│   ├── server.ts         # HTTP API + Streamable HTTP MCP transport
│   ├── tools/            # 19 arra_* tool implementations
│   ├── db/               # Drizzle ORM + SQLite schema
│   ├── indexer/          # FTS5 indexing + vector backfill
│   ├── routes/           # REST API (knowledge, forum, traces, settings)
│   ├── middleware/       # Bearer auth, rate limiting
│   ├── oauth/            # OAuth 2.1 + PKCE for Claude Desktop
│   └── vault/            # CLI for managing ψ/ knowledge vault
├── ψ/                    # Knowledge vault (learnings, retros, wiki, docs)
│   ├── memory/           # Learnings + retrospectives (primary storage)
│   ├── wiki/             # Structured wiki pages (this system)
│   ├── inbox/            # Handoffs, tracks
│   └── obsidian/         # Obsidian-compatible schema
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

## Patterns

- **Supersede chain**: When resolving an issue, create `[RESOLVED]` learning then `arra_supersede(old, new)`. One active learning per topic.
- **MCP-FAIL-SAFE**: All consumers (scores, agents) should handle Oracle unavailability gracefully — fail-open for reads, retry-once for writes.
- **3-tier vault**: Real ψ/ in home repos, symlinks in project repos. All learnings funnel through Oracle server's ψ/.

## See Also

- [soul-orchestra](soul-orchestra.md) — all agents consume Oracle knowledge via conductor protocol Phase 2 (RECALL)
- [auto-ops](auto-ops.md) — incident patterns stored in Oracle for cross-session learning
