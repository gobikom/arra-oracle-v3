---
title: My AI Soul MCP
type: wiki
status: active
updated: 2026-06-30
oracle_entries: 21
sources:
  - https://github.com/gobikom/my-ai-soul-mcp
project: github.com/gobikom/my-ai-soul-mcp
tags: [wiki, my-ai-soul-mcp, memory, mcp]
---



# My AI Soul MCP

## Code Structure (auto — CK, refreshed 2026-06-30)

- tests: 216 classes, 1438 functions
- src/psak_soul: 13 classes, 257 functions
- scripts: 10 classes, 155 functions

## Entry Points (auto — CK)

- make_provider `def make_provider(tmp_path, pin="123456", bearer_token="test-bearer-token")` — tests/test_oauth.py (51 connections)
- run `def run(coro)` — tests/test_oauth.py (49 connections)
- init_resources `def init_resources()` — src/psak_soul/tools.py (42 connections)
- search_memory `def search_memory(query: str, category: str = None, limit: int = 3, project: str = None) -> str` — src/psak_soul/tools.py (41 connections)
- add_memory `def add_memory(text: str, category: str = "general", project: str = "") -> str` — src/psak_soul/tools.py (36 connections)
- make_client_info `def make_client_info(client_id="test-client", redirect_uri="https://example.com/callback")` — tests/test_oauth.py (33 connections)
- classify `def classify( rule: DetectionRule, learning_id: str, learning_content: str, cache: sqlite3.Connection, *, model: str = LLM_MODEL, openai_client: Any | None = None, classifier_log_path: Path = CLASSIFIER_LOG_PATH, _diag: dict[str, int] | Non` — scripts/evolution_metrics.py (24 connections)
- load_applied `def load_applied(applied_dir: Path) -> tuple[list[AppliedEvolution], dict[str, str]]` — scripts/evolution_metrics.py (20 connections)
- LocalClient `class LocalClient` — src/psak_soul/cli_client.py (19 connections)
- compute_metric `def compute_metric( ev: AppliedEvolution, cache: sqlite3.Connection, *, window_days: int = WINDOW_DAYS, min_sample: int = MIN_SAMPLE, openai_client: Any | None = None, qdrant_client: Any | None = None, oracle_db_path: str = ORACLE_DB_PATH, ` — scripts/evolution_metrics.py (18 connections)

## Hotspots (auto — CK)

- `tests/test_tools_unit.py` — 367 connections, change_freq=14
- `tests/test_server.py` — 168 connections, change_freq=7
- `tests/test_daily_digest.py` — 154 connections, change_freq=6
- `tests/test_evolution_proposer.py` — 137 connections, change_freq=5
- `tests/test_cli.py` — 113 connections, change_freq=0

## Overview

Personal AI Memory Layer via MCP — gives 15+ AI platforms shared long-term memory through semantic search (Thai + English). Production as `psak-soul-mcp` (port 8000, systemd). V2 "คิดเองได้" adds autonomous thinking, self-reflection, and soul evolution with human approval gates.

Every AI session starts stateless. This server solves that by providing 18 MCP tools for read/write/search/reflect/handoff/evolve across sessions and platforms. Dual storage: `psi/memory/` files (source of truth) + Qdrant Cloud (vector search). Hybrid search merges FTS5 keyword + Qdrant cosine via Reciprocal Rank Fusion (RRF).

## Architecture

```
my-ai-soul-mcp/
├── src/
│   ├── server.py           # FastAPI + MCP server entry point (port 8000)
│   ├── tools/              # 18 MCP tool implementations
│   ├── services/           # Business logic (memory, search, evolution, handoff)
│   ├── models/             # Pydantic models (Memory, Session, Evolution)
│   └── dashboard/          # HTMX browser UI (4 tabs: Memories, Sessions, Analytics, Soul)
├── psi/
│   └── memory/             # File-based source of truth
│       ├── sessions/       # Session handoff/resume state
│       ├── reflections/    # AI diary entries with extracted lessons
│       └── evolutions/     # Soul evolution proposals + applied changes
├── scripts/
│   ├── daily_digest.py     # Cron: synthesize daily memories into patterns (LLM)
│   ├── weekly_digest.py    # Cron: weekly pattern extraction
│   ├── evolution_proposer.py  # Auto-propose soul evolutions from patterns
│   ├── evolution_metrics.py   # Track evolution acceptance rate
│   ├── migrate.py          # Schema/data migration scripts
│   ├── sync_from_mcp.py    # Pull from Qdrant → local files
│   └── sync_to_mcp.py      # Push local files → Qdrant
├── prompts/                # LLM prompt templates for digest/evolution
├── docs/                   # API docs, architecture decisions
└── pyproject.toml          # name: psak-soul-mcp, v1.0.0
```

**MCP tools (18):**

| Tool | Purpose |
|------|---------|
| `session_resume` | Restore last session context for a project |
| `session_handoff` | Save session state for next session |
| `write_memory` | Save a memory with category + project |
| `read_memory` | Retrieve memories by category/project |
| `unified_search` | Hybrid search (FTS5 + Qdrant cosine, RRF merge) |
| `reflect` | Write AI diary + extract lessons |
| `proactive_save` | Auto-save important patterns mid-session |
| `evolve_soul` | Propose a soul identity evolution |
| `apply_soul_evolution` | Human-approve/reject evolution proposal |
| `list_soul_evolutions` | Browse pending/applied evolutions |
| `learn_repo` | Save structured codebase learning |
| `health_check` | Verify storage + search health |

**Transport:** Streamable HTTP (production, port 8000 behind nginx at mysoul.goko.digital). Clients connect via `mcp-remote` for thin JSON-RPC proxy. One shared instance serves all concurrent agent sessions (MCP Shared Instance Pattern — replaces N×M stdio processes with 1 HTTP service).

**Dedup:** Cosine similarity threshold 0.90 prevents near-duplicate memories.

## Key Decisions

| Decision | Chosen | Rejected | Why |
|----------|--------|----------|-----|
| Storage | Dual: files + Qdrant Cloud | Qdrant only / SQLite only | Files = human-readable, git-tracked; Qdrant = fast vector search |
| Search | Hybrid FTS5 + vector (RRF) | Vector-only / keyword-only | Thai+English needs both approaches; RRF merge balances precision/recall |
| Transport | Streamable HTTP (shared) | stdio per-session | 1 service vs N×M processes; shared instance pattern saves server load |
| Evolution | Human approval required | Auto-apply | Identity changes are sensitive — human must review before applying |
| Platform init | `soul` CLI from soul-skills | Per-platform scripts | 15 platforms × 4 config formats = centralized CLI is the only sane approach |

## Known Issues

- OAuth 2.1 browser flow can stall if Qdrant Cloud is slow (tokens timeout before handshake completes)
- Daily/weekly digest quality depends on LLM prompt — Thai content occasionally mis-categorized
- `sync_from_mcp.py` / `sync_to_mcp.py` are one-directional — no conflict resolution for diverged state

## Patterns

- **Dual-storage sync**: Files are source of truth; Qdrant is rebuilt from files via sync scripts. Never modify Qdrant directly.
- **MCP Shared Instance**: Single HTTP server + mcp-remote proxies. Eliminates per-session process spawning on multi-agent servers.
- **Session continuity**: `session_handoff` at end → `session_resume` at start = zero-cost context transfer between sessions.
- **Evolution lifecycle**: Pattern detected → `evolve_soul` proposal → human review → `apply_soul_evolution` → reflected in agent behavior.

## See Also

- [oracle-v3](oracle-v3.md) — complementary knowledge store (topical/reusable vs temporal/personal)
- [soul-orchestra](soul-orchestra.md) — scores trigger digest/evolution crons
- [soul-skills](soul-skills.md) — `soul` CLI installs MCP config across 15 platforms
