---
title: chela
type: wiki
status: active
updated: 2026-08-19
oracle_entries: 31
sources:
  - https://github.com/gobikom/chela
project: github.com/gobikom/chela
tags: [wiki, chela, agent-harness, rust, benchmark]
---



# chela 🦞

## Code Structure (auto — CK, refreshed 2026-08-01)

- (no indexed symbols)

## Entry Points (auto — CK)

- (no exported functions/classes detected)

## Code Structure (manual — repo not ck-indexed yet; refreshed 2026-07-25 @ f4da4b6)

```
chela/
├── crates/                  # Rust workspace — 8 crates, all v0-empty stubs pre-Plan-B
│   ├── chela-kernel/        # agentic loop + task state machine (budget 6K LOC)
│   ├── chela-tools/         # read/edit/bash/grep/done built-ins (4K)
│   ├── chela-providers/     # claude-sub OAuth + Anthropic SSE client (4K)
│   ├── chela-context/       # session store; compaction lands v1 (3.5K)
│   ├── chela-policy/        # permission/guardrail engine — v1 (2.5K)
│   ├── chela-transport/     # stream-json stdio emitter (1.5K)
│   ├── chela-rpc/           # script-RPC tool server — v1 (1.5K)
│   └── chela/               # bin — single static binary (0.5K)
├── bench/                   # benchmark harness (the dev loop)
│   ├── run.py               # runner: 3 reps, no retry, stall detect 600s, bwrap
│   │                        #   per-harness profiles, edit_diff capture, JSONL out
│   ├── tasks/               # 15 source-pinned tasks (batch1-4 + smoke b1/b2)
│   ├── verify/check_*.py    # mechanical checkers, spoof-hardened (2-tier grading)
│   ├── fixtures/            # frozen repo snapshots + REDACTION-MANIFEST.md each
│   └── results/2026-07-25/  # REPORT.md + 3 baseline JSONL (LOCKED numbers)
├── docs/DESIGN.md           # R3 APPROVED design (5-layer, crates, ARI, roadmap)
├── docs/EVAL-STANDARDS.md   # checker standards + spoof batteries (append-only)
├── vendor/MANIFEST.md       # pinned SHAs: claw-code f77886a, thclaws d183022
├── loc-budget.toml          # per-crate LOC budgets, CI-enforced (tokei)
├── ci/test-loc-gate.sh      # gate self-test (proves gate fails on over-budget)
└── .github/workflows/ci.yml # cargo check + LOC gate + self-test
```

Entry points: `bench/run.py` (only executable surface pre-v0); `crates/chela/src/main.rs` (stub).

## Overview

Lean, learning agent harness — chela replaces Claude Code / Codex CLI as the runtime
for pool agents. ≤25K LOC binary vs thclaws' 177K; moves CLAUDE.md prose guardrails
(checkpointing, verify-before-done, never-push-main, budget caps) into kernel code.
Name: zoology "pincer claw" + Sanskrit "disciple/learner". Private repo
(`gobikom/chela` → `~/repos/agents/chela`), MIT/Apache-2.0 dual, open-source later.

Status 2026-08-19: v1.15.0 — 3-tier Task Awareness + Built-in Skills (#347).
Auto TaskState from delegation (Tier 1 mandatory), turn-based nudge + edit-
before-plan warning (Tier 2 proactive), 4 built-in skills (plan/implement/
review-agents/review-fix with filesystem > built-in priority), durable
delegation callback with traversal-safe path validation + symlink rejection,
first-writer-wins reply preservation, tmux pane title updates. 8 review
rounds (most in project history), 13 findings fixed. v1.14.0: Task State
Machine (#285). v1.13.x: observability, fallback. Next: #348 persistent
status line, #350 dynamic loop termination, v2 tracks #286-#292.

## Architecture (DESIGN.md §3 — 5 layers)

```
Channels/Ingress ── openclaw gateway (existing — never rebuilt)
Orchestration ───── soul-orchestra + multi-agents pool (existing)
Harness kernel ──── chela ← replaces exactly this one box
Providers ───────── claude-sub (v0) / codex-sub, GLM (v3)
Learning loop ───── Oracle/Soul MCP + hermes-style auto-skills (v2+)
```

Key kernel mechanics (design §4.2 — CLAUDE.md rules promoted to code): task state
machine first-class, policy engine intercepting tool calls (3-tier), verify-before-done
in the loop, memory as a loop phase, per-step model routing. Transport = stream-json
over stdio, superset-compatible with `claude -p --output-format stream-json` (ARI event
schema + exit codes in design §7). Roadmap: v0 prove-the-loop → v1 smarter core (state
machine, policy, compaction, REPL) → v2 ecosystem (MCP, hooks, skills) → v3 fleet
(multi-provider, pool migration) → v4 TUI (committed-deferred).

## Key Decisions (LOCKED — นุด)

| Decision | Chosen | Notes |
|----------|--------|-------|
| Consume claw-code/thclaws | vendor-pin (fork-freeze) | SHAs in vendor/MANIFEST.md; crates renamed `chela-*` immediately; PATCHES.md logs every divergence; monthly upstream review |
| v0 provider | claude-sub | enables same-model parity benchmark; ToS 1a accepted (same mechanism as prod dev-thclaws) |
| License / visibility | MIT OR Apache-2.0 dual; private first | open-source when ready |
| CLI tiers | headless (v0) / plain REPL (v1) / rich TUI (v4 committed-deferred) | TUI is a client over stream-json, not a kernel change |
| Executor | fresh Opus session in chela repo; restart AT Plan B approval (2b) | L1 executor / L2 PSak verify / devlead-codex peer-review |
| Suite | 15 tasks + 3 adjudicated STOPs (I1/F3/R3) | b4 kept as hard-diagnostic (prompt under-determines root cause, fair across arms) |
| GLM baseline arm | deferred to v1 | arm must map to the model-routing calibration decision |
| v0/v1 exit bars | v0 ≥60% (≥27/45); v1 ≥73.3% + 0 unrecovered stalls/45 + p95 ≤345s; parity 80.0% | corrected-mechanical grading, protocol §8.1 |

## Baselines (2026-07-25 — LOCKED, do not re-measure)

| Arm | Corrected | p95 | median | stalls | timeouts |
|---|---|---|---|---|---|
| claude-code (sonnet-5) | **36/45 (80.0%)** | 230s | 46s | 0 | 0 |
| thclaws (sonnet-5) | **33/45 (73.3%)** | 179s | 52s | 0 | 0 |
| codex (gpt-5.5, reference) | 26/45 (57.8%) | 130s | 65s | 0 | 0 |

135 runs, 0 stalls, 0 timeouts. Same-model harness gap claude-code↔thclaws = 6.7pp —
the harness matters; claude-code ergonomics is the bar. thclaws stall folklore
FALSIFIED (0/45 under bench conditions). Model contribution dominates harness at this
difficulty (codex arm −20pp on a different model). Full matrix + re-grade methodology:
`bench/results/2026-07-25/REPORT.md`.

## Known Issues / Watch-items

- **[RESOLVED 2026-08-08] Pre-M7 sweep:** 28/28 issues closed. Last 3: #122 (compaction observability, PR #156), #123 (MessageStop, PR #169), #151 (agent_sdk auth classification, PR #171). Security model: L1=boundary (bash denial), L2=best-effort (documented #112), env credential detection (#125), agent/ delegates to subprocess policy (#129 by-design). Deferred to v2: #91 (SecretString), #93 (URL validation), #101 (credential broker).
- **[RESOLVED 2026-08-10] GLM URL path bug:** OpenAI client hardcoded `/v1/chat/completions` in path template — GLM base `/v4` produced `/v4/v1/chat/completions` (404). Fixed: moved `/v1` into DEFAULT_BASE_URL (PR #214). Also added `GLM_BASE_URL` env override (PR #215) for api.z.ai via headroom proxy. Note: bigmodel.cn account has zero balance — all GLM access goes via api.z.ai.
- **[RESOLVED 2026-08-11] vendor-audit MANIFEST:** 6 files from v1.1-v1.2 (openai.rs, provider.rs, jsonrpc.rs, mcp.rs, names.rs, registry.rs) missing from MANIFEST written-fresh section. Fixed PR #216. CI now green on main.
- **[RESOLVED 2026-08-12] chela#182 verbose flag:** `--verbose` / `-v` / `CHELA_VERBOSE=1` prints tool calls, results, text to stderr. PR #224 — review found UTF-8 byte-index slicing panics (all 3 agents), fixed with `.chars().take(n).collect()` + `catch_unwind` panic isolation. LOC baseline updated (chela prod 1154, test 831).
- **[RESOLVED 2026-08-14] chela#276 interactive exit:** `run_interactive()` exited after task completion (TurnEnd::Done), killing pool agent panes. Fixed in v1.7.0 (PR #278): reset-and-continue loop, 4 review rounds, 17 findings all fixed. Also fixed pre-existing BrokenPipe silent swallow + mutex poison crash cascade.
- **[RESOLVED 2026-08-14] chela#280 event log observability:** No agent identity, timestamps, or query tool for 84+ log files. Fixed in v1.8.0 (PR #281): EventEnvelope (ts+agent on every event), ProcessStart/End + TaskStart/End lifecycle, chela logs CLI, prompt opt-in. 4 review rounds, 11 findings fixed.
- **chela#282 panic lifecycle:** ProcessEnd/TaskEnd not emitted on panic. Tracked, requires catch_unwind around runtime.run_turn().
- **[RESOLVED 2026-08-16] chela infra gaps (#301/#302/#303):** Chela agents couldn't ping-reply (write_file workspace-confined, skill system read-only, no native ping tool). Fixed PR #304: ConfinementContext with trusted paths, PingContext-bound ping_reply tool, L2 SkillPreparer trait. Plan peer-reviewed R10 by devlead-codex (10 rounds, 26 findings). Also #305 vendor-audit pin skip fix (PR #306).
- **[RESOLVED 2026-08-18] chela#311/#312 agent observability:** PhaseChange event, report_phase tool (runtime-intercepted), PRP skill auto-phasing (8 skills → canonical phases), agent_status query tool (EventLog + tmux + segment state). 3-agent review, 6 findings fixed (substring matching → JSONL agent field, `?` in loop → continue+log, deny_unknown_fields, unconditional phase lookup, u64→u32 saturating cast). Subprocess/bridge mode wired (#336, PR #337) + MCP prefix handling (#338). E2E verified. Shipped v1.13.0.
- **[RESOLVED 2026-08-17] chela#313 model fallback chain:** FallbackApiClient with provider-group planning, --fallback CLI arg, auto-recovery on 429/500. E2E verified: GLM 429 → Codex fallback → task completed. Shipped v1.12.0-v1.12.1.
- **[RESOLVED 2026-08-19] chela#285 Task State Machine (v2 Track 1):** TaskState/TaskPhase in kernel (chela-context), 3 tools (set_task_goal, update_task_ac, task_phase) intercepted in run_turn, PhasePolicyLayer Plan/Act mode (read-only during Planning), verify-before-done gate (Done blocked unless all ACs passed). 3-agent review caught 2 critical bypass routes: (1) done tool bypassed gate entirely — fixed by requiring task_phase("done") first, (2) empty ACs passed gate vacuously — fixed by blocking Done with 0 ACs. Compaction survival via explicit rebuild_session copy. Also shipped #277 (max_iterations 50→200). PR #342, v1.14.0.
- **v2 Smarter Core epic (#283):** 8 tracks closing DESIGN.md §4.2 gaps. Sub-issues: ~~#285 task state~~ (SHIPPED v1.14.0), #286 policy completion, #287 verify-before-done, #288 memory loop, #289 model routing (blocked), #290 tools gap (shipped v1.9.0), #291 context intelligence, #292 code intelligence A+B hybrid.
- **CI gate:** LOC baselines require manual update in 14+ places when budget changes. Diagnostic output added (#161).
- **F1 (Plan B):** thclaws has NO native claude-sub auth — its `agent_sdk.rs` spawns
  Claude Code as a subprocess (vendoring it = circular benchmark). Native OAuth comes
  from claw-code (`runtime/oauth.rs` + `api/client.rs`, bootstrap @ CLI main.rs:452).
- **[RESOLVED 2026-08-08] agent-devops#949**: temp-copy rule closed (2/3 occurrences, no 3rd in 13 days). Write-tool rule already adopted as soul evolution 2026-07-25.
- **[RESOLVED 2026-08-08] agent-devops#951**: chela-dev promoted from ephemeral executor to registered agent (soul-orchestra#1130). Pool auto-enabled, ping routing fixed.
- chela#3 (closed) thread notes: sandbox hardening required before running UNTRUSTED
  third-party fixtures; our own fixtures are fine under current bwrap profiles.
- AST-grade checkers follow-up: documented lexer residuals (one-hop tracing misses some
  correct shapes — cc 1, th 1, codex 3 adjudicated false-negatives on b3); b3 shapes
  itemized in REPORT.md; upgrade path is AST-based matching.
- `__pycache__/` is a universal recorded scope exemption in run.py (agents executing
  their fixed script produced SCOPE_VIOLATIONs — infra gap fixed post-campaign).
- push-main hook false-positives on `git push --delete` while on main (workaround:
  `gh api` to delete remote branches).

## Patterns

- **Eval integrity (spoof-proofing):** every checker ships a spoof battery
  (fake-object, unlinked-ingredient, dead-code, constant-env) that must stay RED;
  batteries are append-only; checkers changed only via adversarial review. Two-tier
  grading: MECHANICAL (citable) vs MANUAL adjudication (diagnostic).
- **Offline re-grade:** bench JSONL records `edit_diff` per run — checker fixes are
  validated by re-applying recorded diffs to fixtures offline, zero agent re-runs,
  identical treatment across arms.
- **Multi-wallet delegation economy:** under Claude quota pressure — dev-glm executes,
  devlead-codex reviews, Claude audits only (นุด Option A, quota crisis 2026-07-25).
  Direct dev-glm delegation is a chela-only exception.
- **Campaign digest monitoring:** high-volume runs watched via batch digests + instant
  anomaly passthrough (conductor/wiki/campaign-monitoring.md; born from this campaign,
  agent-devops#948).
- **Review loop:** warm reviewer agents across rounds; every finding reproduced before
  accepted; max-5-cycle escalation exercised once (PR#12/S2 → นุด option A → surgical
  fix).

## See Also

- [multi-agents](multi-agents.md) — pool engine that will consume chela via the Agent
  Runtime Interface (design §7)
- [soul-orchestra](soul-orchestra.md) — identity/score layer above the harness
- [agent-psak](agent-psak.md) — orchestrator (L2) of the chela build
