---
title: Multi-Agents
type: wiki
status: active
updated: 2026-07-01
oracle_entries: 20
sources:
  - https://github.com/gobikom/multi-agents
project: github.com/gobikom/multi-agents
tags: [wiki, multi-agents, orchestration, dag]
---





# Multi-Agents

## Code Structure (auto — CK, refreshed 2026-07-01)

- tests/unit: 140 classes, 1925 functions
- core/dashboard-next: 212 functions, 31 interfaces, 38 types
- core/orchestrator: 83 classes, 178 functions
- tests/integration: 24 classes, 102 functions
- core/platform_adapters: 10 classes, 52 functions
- tests/contracts: 53 functions
- core/dashboard: 5 classes, 42 functions
- tests: 8 classes, 29 functions
- core/memory: 8 classes, 22 functions
- core/plugins: 4 classes, 20 functions
- core/queue: 3 classes, 19 functions
- core/cost_controller: 5 classes, 16 functions
- core/session_manager: 2 classes, 16 functions
- core/scheduler: 5 classes, 12 functions
- core/notifications: 5 classes, 11 functions

## Entry Points (auto — CK)

- load_config `def load_config(config_path: str = "config/default.yaml", project_dir: str | None = None) -> Config` — core/orchestrator/config.py (185 connections)
- DAGOrchestrator `class DAGOrchestrator` — core/orchestrator/dag.py (177 connections)
- ClaudeCodeAdapter `class ClaudeCodeAdapter(PlatformAdapter)` — core/platform_adapters/claude_code.py (92 connections)
- SessionManager `class SessionManager` — core/session_manager/manager.py (89 connections)
- cn `function cn(...inputs: ClassValue[])` — core/dashboard-next/src/lib/utils.ts (70 connections)
- CodexAdapter `class CodexAdapter(PlatformAdapter)` — core/platform_adapters/codex.py (65 connections)
- WorkspaceManager `class WorkspaceManager` — core/orchestrator/workspace.py (57 connections)
- SequentialOrchestrator `class SequentialOrchestrator` — core/orchestrator/sequential.py (40 connections)
- parse_review_verdict `def parse_review_verdict(artifact_path: Path) -> ReviewVerdict` — core/verdict_parser.py (33 connections)
- ConfigError `class ConfigError(MultiAgentsError)` — core/orchestrator/errors.py (32 connections)

## Hotspots (auto — CK)

- `core/orchestrator/types.py` — 217 connections, change_freq=0
- `tests/unit/test_dag_orchestrator.py` — 214 connections, change_freq=0
- `core/orchestrator/config.py` — 185 connections, change_freq=0
- `core/orchestrator/dag.py` — 177 connections, change_freq=0
- `core/queue/manager.py` — 139 connections, change_freq=0

## Overview

Local meta-orchestrator that coordinates multiple AI agents (Claude Code, Codex CLI) through file-based workspace communication. No direct LLM API calls — the orchestrator spawns CLI sessions, passes files between them, and enforces cost/approval gates. Primary consumer is soul-orchestra, which deploys score configs executed as DAG workflows.

Production since Phase 5. Runs on a single OpenClaw VPS with 17 agent types, persistent agent pool, FastAPI dashboard, and cron-based task scheduling.

## Architecture

```
multi-agents/
├── core/
│   ├── __main__.py               # CLI entry (python -m core run/demo/init/serve/version)
│   ├── orchestrator/
│   │   ├── dag.py                # DAG executor (wave-based parallel, checkpoint/resume)
│   │   ├── pool_executor.py      # Pool-first execution with subprocess fallback
│   │   ├── config.py             # YAML config parser + validation
│   │   ├── types.py              # DAGNodeConfig, AgentConfig (frozen dataclasses)
│   │   ├── errors.py             # StrictOutputValidationError, etc.
│   │   └── feature_loop.py       # PRD parser → multi-feature phase iteration
│   ├── session_manager/
│   │   └── manager.py            # Agent session lifecycle (spawn, check, collect)
│   ├── platform_adapters/
│   │   ├── base.py               # Abstract adapter (spawn, check_status)
│   │   ├── claude_code.py        # Claude Code CLI adapter
│   │   ├── codex.py              # Codex CLI adapter
│   │   └── stub.py               # Mock adapter for testing
│   ├── cost_controller/
│   │   └── controller.py         # Session budget + daily quota enforcement
│   ├── notification/
│   │   └── dispatcher.py         # Slack, LINE, Telegram, email notifications
│   ├── safety/
│   │   └── guardrails.py         # 3-tier action classification (auto/approve/forbidden)
│   └── plugins/                  # Plugin system with auto-discovery
├── config/                       # Generated runtime configs (per-tool YAML variants)
├── agents/                       # Agent definitions (prompt.md + config.yaml, no code)
├── workspace/                    # Runtime communication
│   ├── messages/                 # Inter-agent messages
│   ├── context/                  # Shared context files
│   ├── results/                  # Node output artifacts
│   └── state/                    # Checkpoint/resume state
├── core/dashboard-next/          # React 19 SPA (Next.js static export — WIP)
├── docs/                         # Architecture, safety guardrails, workflows
└── pyproject.toml                # name: multi-agents, v0.1.0
```

**DAG Orchestrator (`dag.py`):**
- **Wave execution**: Topological sort → nodes grouped into waves by dependency satisfaction → parallel execution within each wave via `ThreadPoolExecutor`
- **Output chaining**: Each node's output saved to `workspace/results/`; downstream nodes receive dependency outputs as `[FILE: path]` sections prepended to their instruction
- **Checkpoint/resume**: State persisted to `workspace/state/` after each wave; `--resume WORKFLOW_ID` restarts from last checkpoint
- **Fix-loop**: Review nodes can trigger re-execution of upstream nodes (plan → execute → review → fix cycle)

**Pool Executor (`pool_executor.py`):**
- `execution_mode: pool` routes to soul-orchestra's persistent agent pool instead of spawning subprocesses
- `_build_input_context()` collects upstream outputs as `[FILE: path]` blocks
- `_extract_structured_result()` parses output with 10MB size guard

**Two-tier config architecture:**
- Source of truth: `soul-orchestra/scores/*.yaml` (edited by humans/PRs)
- Runtime configs: `config/*.yaml` (generated by `soul-orchestra/generator/deploy.py`)

## Key Decisions

| Decision | Chosen | Rejected | Why |
|----------|--------|----------|-----|
| Orchestration | File-based workspace | Direct LLM API calls | Meta-orchestrator coordinates CLI sessions; no API keys in orchestrator |
| Execution | DAG waves (parallel within wave) | Sequential / async event loop | Dependency-aware parallelism; ThreadPoolExecutor simple enough for CLI spawning |
| Config format | YAML agent definitions | Python code / JSON | No-code agent definitions; soul-orchestra generates from scores |
| Platform adapters | Abstract base + per-CLI | Single unified adapter | Claude Code and Codex have different spawn/status/collect patterns |
| State | Filesystem (workspace/) | Database / Redis | Simple, debuggable, git-diffable; no external dependency |
| Pool routing | Pool-first, subprocess fallback | Subprocess-only / pool-only | Pool saves startup overhead; fallback handles pool-down scenarios |

## Known Issues

- `agents run --prd <file>` requires specific PRD format with Implementation Phases table — NOT compatible with arbitrary markdown
- Pool task "completed" means delivered to agent, not executed — verify worktree/branch/PR existence
- `feature_loop.py` doesn't forward `plan_path` to DAG planner node (line 141)
- Dashboard-next (React 19) is WIP — API endpoints ready, frontend incomplete
- No multi-repo coordinated workflows yet

## Patterns

- **Per-node config override**: New per-step control fields follow the `DAGNodeConfig` pattern — add field to `types.py` → parse in `config.py` → thread through `dag.py` → pass to adapter in `manager.py`. Use `object.__setattr__` for frozen dataclass mutations in `__post_init__`.
- **3-layer validation**: Config parser type check → `__post_init__` invariant → call-site `try/except`. Established across `mcp_config`, `output_assertions`, and newer fields.
- **File-based inter-agent communication**: PRP's `.prp-output/` filesystem for state passing between agents. Each PRP skill auto-detects artifacts from the directory.
- **Input enrichment**: `_build_input_context()` prepends upstream outputs as `[FILE: path]` blocks — gives downstream agents full context without needing shared memory.

## See Also

- [soul-orchestra](soul-orchestra.md) — score configs deployed as runtime YAMLs for this engine
- [auto-ops](auto-ops.md) — health monitoring; `agents` CLI wrapper in ops/bin/
