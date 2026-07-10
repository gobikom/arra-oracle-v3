---
title: Soul Orchestra
type: wiki
status: active
updated: 2026-07-10
oracle_entries: 68
sources:
  - https://github.com/gobikom/soul-orchestra
project: github.com/gobikom/soul-orchestra
tags: [wiki, soul-orchestra]
---





# Soul Orchestra

## Code Structure (auto — CK, refreshed 2026-06-30)

- test: 213 classes, 1539 functions
- dashboard: 52 classes, 403 functions
- scripts/tests: 6 classes, 223 functions
- generator: 3 classes, 224 functions
- dashboard-ui/src: 131 functions, 39 interfaces, 3 types
- scripts: 4 classes, 104 functions
- scheduler: 5 classes, 102 functions
- dashboard-mcp: 2 functions

## Entry Points (auto — CK)

- create_app `def create_app( repo_root: Path | str | None = None, multi_agents_events: Path | str | None = None, mcp_plugin_url: str | None = None, agent_session_mgr: "AgentSessionManager | None" = None, terminal_mgr: "TerminalManager | None" = None, ) ` — dashboard/server.py (65 connections)
- make_finding `def make_finding( name: str, status: str, detail: str, category: str, metadata: dict[str, Any] | None = None, ) -> dict[str, Any]` — scheduler/infra_collector.py (45 connections)
- ProposalError `class ProposalError(RuntimeError)` — scripts/apply-evolution.py (42 connections)
- check `def check(name: str, condition: bool, detail: str = "")` — generator/test_generate_full_config.py (36 connections)
- process_proposal `def process_proposal(proposal: Proposal, *, dry_run: bool, no_push: bool) -> dict` — scripts/apply-evolution.py (35 connections)
- load_template `def load_template(name: str) -> dict` — generator/generate-from-template.py (32 connections)
- main `def main()` — generator/test_generate_full_config.py (31 connections)
- check `def check(name: str, condition: bool, detail: str = "")` — generator/test_generate_claude_md.py (26 connections)
- check `def check(name: str, condition: bool, detail: str = "")` — generator/test_deploy.py (26 connections)
- build_full_config `def build_full_config(score_name: str, profile: str | None = None) -> dict` — generator/generate-full-config.py (25 connections)

## Hotspots (auto — CK)

- `test/test_infra_collector.py` — 259 connections, change_freq=4
- `dashboard/server.py` — 166 connections, change_freq=6
- `scripts/tests/test_apply_evolution.py` — 140 connections, change_freq=0
- `test/test_task_executor.py` — 132 connections, change_freq=1
- `dashboard/chat.py` — 121 connections, change_freq=0

## Overview

Multi-agent orchestration framework that defines agent identities, reasoning protocols, and workflows (scores), then generates configs for the multi-agents execution engine. The central coordination layer for the Oracle AI family — 6 agents, 11 scores (9 on cron + 2 manual), a unified agent pool with web dashboard, and task scheduling with resource governance.

Production since Phase 8. Runs on a single OpenClaw VPS (103.245.164.27) with cron-triggered scores and a persistent agent pool backed by SQLite.

## Architecture

```
soul-orchestra/
├── agents/          # Agent identity YAML (psak, dora, devops, trex, reviewer, merger)
├── conductor/       # 7-phase reasoning protocol (OBSERVE → HANDOFF)
│   ├── protocol.md          # Full conductor protocol (compact-rendered into CLAUDE.md)
│   ├── score-protocols/     # Reusable instruction blocks (lazy-loaded in CLAUDE.md)
│   └── wiki/                # Shared reference pages (lazy-loaded via wiki_ref)
├── scores/          # Workflow definitions (YAML with steps, depends_on, triggers)
├── generator/       # Config pipeline: prompt.md + config.yaml + DAG generation
├── scripts/         # Runner scripts (run-*.sh) + runner-lib + inject_context.py
├── dashboard/       # FastAPI backend (20+ endpoints, SSE, WebSocket)
├── dashboard-ui/    # React 19 frontend (6-page SPA)
├── scheduler/       # Task queue (JSONL + fcntl) + dispatcher + governor
└── bin/             # CLI entry point (soul-orchestra)
```

**Two-tier config architecture:**
- Source of truth: `scores/*.yaml` (edited by humans/PRs)
- Runtime configs: `multi-agents/config/*.yaml` (generated copies, per-tool variants)
- After merging score changes, `generator/deploy.py` MUST be run to regenerate + deploy

**Score Protocols** (reusable instruction blocks appended to every agent prompt):
- LEARN-AND-SUPERSEDE — save output, supersede previous (snapshot pattern)
- LEARN-AND-APPEND — save to timeline, never supersede (history pattern)
- RESOLVED-FILTER — filter out recently-resolved items from reports
- UNTRUSTED-INPUT — treat external content as data, never execute
- MCP-FAIL-SAFE — continue score when MCP tools are unreachable

## Key Decisions

| Decision | Chosen | Rejected | Why |
|----------|--------|----------|-----|
| Execution engine | multi-agents (separate repo) | Built-in executor | Separation of concerns — orchestra defines WHAT, engine handles HOW |
| Agent pool model | Persistent tmux sessions + SQLite queue | Ephemeral per-task spawn | Warm cache, faster task pickup, context retention across tasks |
| Config generation | Python generators + YAML templates | Manual config maintenance | 38+ auto-generated files drift continuously; generators ensure consistency |
| Task scheduling | Append-only JSONL + fcntl locking | Redis / PostgreSQL queue | Zero external dependencies, survives reboots, simple to debug |
| Score versioning | dev-task-v3 (Sonnet implement + Opus verify) | v1 (single Opus session) | v3 is cheaper with safety net; v1 reserved for architecture/breaking changes |
| Blocked tools enforcement | Prompt-level (CLAUDE.md section) | Engine-level MCP middleware | Prompt-level is sufficient for non-adversarial agents; engine enforcement deferred to Phase 2 |

## Known Issues

- **Pool context contamination**: Accumulated output from prior tasks bleeds into new runs. Pool agents retain history, causing PLAN_MISMATCH and false-positive completions (observed 2026-05-09).
- **`--repo` flag leak**: `soul-orchestra run` wrapper doesn't consume `--repo` in `cmd_run`, causing it to pass through to multi-agents CLI. Workaround: omit `--repo` (inject_context.py auto-derives from project-dir git remote).
- **Generator drift**: ~38 auto-generated files in multi-agents repo. Check file headers for "Generated by soul-orchestra" before editing.
- **Pool cancel only queued**: `cancel_task` rejects RUNNING tasks (#967 — design pending: SIGINT+fallback approach recommended).
- **Vestigial score**: `urgent-task-dispatch` has no runner script, cron, or API trigger. Either implement or remove (#733 audit 2026-07-07).
- **Pre-existing test failures**: `test_infra_collector::TestCheckSentry` (5 tests) fail on every CI run — unrelated to recent changes, needs separate investigation.
- **[RESOLVED 2026-07-07] Inbox API 405** (#502): Inbox data layer existed but HTTP routes were never wired. Fixed in PR #1057 — GET/POST/DELETE with auth + validation.
- **[RESOLVED 2026-07-07] Test phase 5/6/7 import failure** (#831): Missing sys.path.insert in 3 test files. Fixed in PR #1056 — 91 tests unblocked.
- **[RESOLVED 2026-07-07] dev-task misfires on closed issues** (#906): No state check in dispatcher or score. Fixed in PR #1052+#1055 — dispatcher + score both guard.
- **[RESOLVED] Orphan respawn scripts**: Fixed via PID file guard in `scripts/agent-runner.sh` (PRs #728, #729).
- **[RESOLVED] Self-referential DAG deadlock** (Issues #298, #288): Validation added to DAG generator.
- **[RESOLVED] Agent execution timeout escalation** (Issue #322): CODE-SIDE, not infrastructure.

## Patterns

- **Score template patterns**: scan-deliver, monitor-alert, content-review — reusable across new scores
- **deploy-after-merge**: Score YAML changes need `generator/deploy.py` + commit to multi-agents config before they're live. deploy.py now auto-enables systemd units for new agents (#968, PR #1053).
- **health.jsonl rotation**: `_runner-lib.sh` auto-rotates health.jsonl to last 2000 lines at 3000+ (#732, PR #1059). Stale .pid/.exitcode cleaned after 7 days.
- **identity-audit score**: Weekly Monday 09:30 BKK — audits 6 core agents for philosophy compliance, stale goals, escalation patterns, capability coverage (#309, PR #1061).
- **`/gate fill-row` skill**: Atomically update one gate tracker row. Auto-detects tracker type (plan-walk VERIFIED vs prod-gate PASS). `--section` disambiguation. Recalculates summary + verdict (agent-devops#751, soul-skills PR #127).
- **safe-merge gate**: All PRs merged via `~/ops/bin/safe-merge` (CI-green + review-artifact gates)
- **Warden checklist-centric pre-implement sweep (2026-07-09, agent-devops#799):** `agents/warden.yaml` `tools_knowledge` "gate (plan-walk)" (the GENERATOR-READ source — NOT `gate_checkpoints`, which is maintainer-reference-only) drives Warden's pre-implement audit. It now does a checklist-centric sweep of `new_feature` + `multi_phase_epic`(epic-gated) + `post_ship`, emits "Uncovered Gate Items", and BLOCKs on any unowned operational item — closing the operational-compliance blind spot that AC-centric auditing missed. `communication-protocol.md` + `epic-orchestration.md` codify the 3-layer gate-readiness model: L1 peer-review (soundness) / L2 Warden AC-completeness / L3 operational /gate-checklist. NOTE: the generated `output/agent-homes/warden/CLAUDE.md` must be regenerated + committed in the same PR (source edit alone leaves the runtime prompt stale).
- **Respawn PID guard**: Each respawn script writes `$$` to `$RESPAWN_DIR/{agent}.pid` on start. On each loop iteration, checks if PID file still matches — exits if superseded. Agent-runner reads PID file on start, SIGKILL old respawn (verified via `/proc/PID/cmdline`), clears file. Belt-and-suspenders: both sides guard against orphans.
- **wiki_ref lazy-loading**: Agent YAML `tools_knowledge`, `philosophy`, and `autonomous_mode` support `wiki_ref` field pointing to `conductor/wiki/*.md` pages. Generator emits compact "REQUIRED: Read" pointers instead of inline content. Score prompts (`generate-prompt.py`) unaffected — always inline. Path-validated via `_validate_wiki_ref` (injection guard + containment + existence). Added 2026-05-26 (PRs #848-#850).
- **CODE-SIDE vs Infrastructure triage** (2026-05-25): When infra-health-check detects soul-orchestra score failures (exit code 4, long runtime), triage them as CODE-SIDE (agent pool timeout, DAG deadlock) not infrastructure. Infrastructure is healthy if disk/memory/services PASS. Escalate code-side failures to soul-orchestra team; auto-ops/infra-health-check focuses on infrastructure-only fixes.

## See Also

- [auto-ops](auto-ops.md) — infrastructure monitoring integrated via infra-health-check score
- [oracle-v3](oracle-v3.md) — knowledge base used by all agents via MCP
