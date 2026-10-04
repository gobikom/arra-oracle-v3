---
title: chela
type: wiki
status: active
updated: 2026-10-04
oracle_entries: 47
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

## Code Structure (manual — refreshed 2026-09-10 @ b001996)

```
chela/
├── crates/                  # Rust workspace — 11 crates
│   ├── chela-kernel/        # agentic loop + task state machine (budget 6.3K LOC)
│   ├── chela-tools/         # read/edit/bash/grep/done/content_*/agent_* (6.9K)
│   ├── chela-providers/     # claude-sub/codex-sub/GLM OAuth + SSE (6.7K)
│   ├── chela-context/       # session store, worker result, delegation (4.1K)
│   ├── chela-store/         # content store — blob I/O, SQLite, GC, ref_id (0.7K) [NEW v1.28.0]
│   ├── chela-orchestrate/   # --continue/--supervise/--orchestrate (1.7K)
│   ├── chela-policy/        # permission/guardrail engine (2.7K)
│   ├── chela-hooks/         # PreToolUse/PostToolUse hooks (0.3K)
│   ├── chela-transport/     # stream-json stdio emitter + text renderer (1.8K)
│   ├── chela-rpc/           # MCP client + JSON-RPC (1.5K)
│   └── chela/               # bin — single static binary (4.4K)
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

Status 2026-09-10: v1.28.0 — Content Store (#440, PR #456). New `chela-store`
crate (597/700 LOC): content-addressable blob store (SHA-256, SQLite WAL, 2-step
GC). 3 agent tools (content_store/content_peek/content_load with offset/max_bytes,
256KB cap). agent_send --ref for manifest delivery. chela store CLI subcommand.
Policy: content_store forbidden in plan profile. LOC ceiling 34600. Design
peer-reviewed R2 by devlead-claude. Before: v1.27.0 Session Orchestration epic
#412 complete (4 phases: WorkerResult, --continue/--supervise, --orchestrate,
--recall). Next: #457 L1 skill integration, #458 L2 agent awareness, #460
Phase 3 WorkerResult refs, #461 Phase 4 auto-store (deferred/data-driven);
Tracks 5-8 (#289-#292); #348 status line.

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

- **[SHIPPED 2026-09-29] #610 Monitor tool (v1.37.0, PR #618)**: `monitor_start`/`monitor_check`/`monitor_stop` — session-owned supervisor, autonomous reaper, two-stage redaction, 6-layer policy parity with other tools. +2846 LOC, 5-round review. Follow-up: #620 ac23 flaky test.
- **[SHIPPED 2026-10-02] chela-deploy builds and self-tests in a sandbox (agent-devops#1169, gobikom/ops#120 → e954daa).**
  - **What is sandboxed:** every cargo run and all code from the chela tree run only inside bwrap in a `systemd-run --user --scope` unit, for main and `--pr` alike. That covers cargo metadata and fetch, build.rs, proc-macros, and the new binary's `--version` and `--self-test`.
    - Fetch: network, but no host tree and no `~/.cargo/git`.
    - Build: no network, a fresh target dir each round.
    - Self-test: host network, and only the tested model's credential (Codex gets a private copy of the store, never copied back).
  - **Effect on a chela PR:** `build.rs` and the binary cannot touch `~/ops/bin`, `~/.cargo`, `~/.secrets` or `~/repos`, or leave a process running.
  - **Source rule:** the tree must name crates.io sources only, checked as TOML before cargo runs.
  - **Cost:** every deploy is a full build, about 4–5 min (นุด accepted this, AC3).
  - **Watch:** the self-test still has host network (agent-devops#1176); tmux-dash's kill token is unauthenticated on loopback (#1178); final review suggestions are in #1182.
- **[RESOLVED 2026-08-08] Pre-M7 sweep:** 28/28 issues closed. Last 3: #122 (compaction observability, PR #156), #123 (MessageStop, PR #169), #151 (agent_sdk auth classification, PR #171). Security model: L1=boundary (bash denial), L2=best-effort (documented #112), env credential detection (#125), agent/ delegates to subprocess policy (#129 by-design). Deferred to v2: #91 (SecretString), #93 (URL validation), #101 (credential broker).
- **[RESOLVED 2026-08-10] GLM URL path bug:** OpenAI client hardcoded `/v1/chat/completions` in path template — GLM base `/v4` produced `/v4/v1/chat/completions` (404). Fixed: moved `/v1` into DEFAULT_BASE_URL (PR #214). Also added `GLM_BASE_URL` env override (PR #215) for api.z.ai via headroom proxy. Note: bigmodel.cn account has zero balance — all GLM access goes via api.z.ai.
- **[RESOLVED 2026-08-11] vendor-audit MANIFEST:** 6 files from v1.1-v1.2 (openai.rs, provider.rs, jsonrpc.rs, mcp.rs, names.rs, registry.rs) missing from MANIFEST written-fresh section. Fixed PR #216. CI now green on main.
- **[RESOLVED 2026-08-12] chela#182 verbose flag:** `--verbose` / `-v` / `CHELA_VERBOSE=1` prints tool calls, results, text to stderr. PR #224 — review found UTF-8 byte-index slicing panics (all 3 agents), fixed with `.chars().take(n).collect()` + `catch_unwind` panic isolation. LOC baseline updated (chela prod 1154, test 831).
- **[RESOLVED 2026-08-14] chela#276 interactive exit:** `run_interactive()` exited after task completion (TurnEnd::Done), killing pool agent panes. Fixed in v1.7.0 (PR #278): reset-and-continue loop, 4 review rounds, 17 findings all fixed. Also fixed pre-existing BrokenPipe silent swallow + mutex poison crash cascade.
- **[RESOLVED 2026-08-14] chela#280 event log observability:** No agent identity, timestamps, or query tool for 84+ log files. Fixed in v1.8.0 (PR #281): EventEnvelope (ts+agent on every event), ProcessStart/End + TaskStart/End lifecycle, chela logs CLI, prompt opt-in. 4 review rounds, 11 findings fixed.
- **chela#282 panic lifecycle:** ProcessEnd/TaskEnd not emitted on panic. Tracked, requires catch_unwind around runtime.run_turn().
- **[RESOLVED 2026-08-16] chela infra gaps (#301/#302/#303):** Chela agents couldn't ping-reply (write_file workspace-confined, skill system read-only, no native ping tool). Fixed PR #304: ConfinementContext with trusted paths, PingContext-bound ping_reply tool, L2 SkillPreparer trait. Plan peer-reviewed R10 by devlead-codex (10 rounds, 26 findings). Also #305 vendor-audit pin skip fix (PR #306).
- **[RESOLVED 2026-08-18] chela#311/#312 agent observability:** PhaseChange event, report_phase tool (runtime-intercepted), PRP skill auto-phasing (8 skills → canonical phases), agent_status query tool (EventLog + tmux + segment state). 3-agent review, 6 findings fixed (substring matching → JSONL agent field, `?` in loop → continue+log, deny_unknown_fields, unconditional phase lookup, u64→u32 saturating cast). Subprocess/bridge mode wired (#336, PR #337) + MCP prefix handling (#338). E2E verified. Shipped v1.13.0.
- **[RESOLVED 2026-08-17] chela#313 model fallback chain:** FallbackApiClient with provider-group planning, --fallback CLI arg, auto-recovery on 429/500. E2E verified: GLM 429 → Codex fallback → task completed. Shipped v1.12.0-v1.12.1. **[GAP 2026-09-12 → RESOLVED same day, see next bullet]** agent-runner.sh GLM fallback chain `--fallback claude-sonnet-5,chatgpt-codex/gpt-5.5`: bare `claude-sonnet-5` = direct API path → `provider_auth` fail (no ANTHROPIC_API_KEY by design). SO#1187 switched it to `agent/claude-sonnet-5`, but SO#1189 (`51aab3a`, 30 min later) reverted to bare — chela `--fallback` rejects subprocess `agent/` models at startup (`main.rs:768`, crashed merger). Net: the sonnet hop is dead; only `chatgpt-codex/gpt-5.5` works. Subscription-auth sonnet in the chain needs chela#247 (direct subscription mode). Also: `chatgpt-codex/gpt-5.5` 404 from #442 was temporary upstream removal (Sep 9), model restored.
- **[RESOLVED 2026-08-19] chela#285 Task State Machine (v2 Track 1):** TaskState/TaskPhase in kernel (chela-context), 3 tools (set_task_goal, update_task_ac, task_phase) intercepted in run_turn, PhasePolicyLayer Plan/Act mode (read-only during Planning), verify-before-done gate (Done blocked unless all ACs passed). 3-agent review caught 2 critical bypass routes: (1) done tool bypassed gate entirely — fixed by requiring task_phase("done") first, (2) empty ACs passed gate vacuously — fixed by blocking Done with 0 ACs. Compaction survival via explicit rebuild_session copy. Also shipped #277 (max_iterations 50→200). PR #342, v1.14.0.
- **[RESOLVED 2026-08-22] chela#350 dynamic loop termination:** Static 200-iteration cap replaced with 10,000 safety backstop. Context exhaustion (compaction flow) is the operational terminator — the "context-aware termination" the issue asked for already existed; only the default cap was wrong. CI timeout bumped 10→15 min. PR #354, shipped v1.16.0.
- **[RESOLVED 2026-08-22] chela#346 bridge-mode delegation callback:** Agent/ ping_reply now satisfies the callback AC (scoped caller+reply_path match), closing the duplicate-auto-callback gap. PolicyAwareBridge::call_tool never credited bridge-mode ping_reply. PR #355 + defensive logging PR #357 (#356), shipped v1.16.0.
- **[RESOLVED 2026-08-22] agent-devops#1056 harness parity:** chela agents lacked `~/.claude/CLAUDE.md` global rules, serena MCP, and ck (binary missing). Fixed in v1.17.0: chela#360 (global CLAUDE.md discovery + `CLAUDE_CONFIG_HOME` env var), serena added to `~/.chela/config.json`, ck binary rebuilt. Model difference (GPT-5.5 vs Opus) is by design.
- **[SHIPPED 2026-09-10] chela#440 Content Store:** Reference-over-inline IPC. New `chela-store` crate: content-addressable blobs (SHA-256 keyed, filesystem + SQLite WAL metadata), random ref_id (10 hex), TTL on refs not blobs, 2-step GC (delete refs → delete orphan blobs, `<=` expiry), degraded mode (mirrors SessionStore::mark_degraded). 3 tools: content_store (confinement-gated via ConfinementContext), content_peek (manifest-only), content_load (offset/max_bytes, 256KB hard cap, ToolOutputBudgets NO_TRUNCATION). agent_send --ref delivers manifest with blob path + CLI command for mixed-harness receivers. chela store CLI (put/peek/get/list/gc/delete). Policy: content_store forbidden in plan profile. Store location: same resolver as sessions.db + CHELA_STORE_DIR override. Design doc R2 approved by devlead-claude (2 rounds). Integration pending: #457 L1 skills, #458 L2 awareness, #460 Phase 3 WorkerResult refs, #461 Phase 4 auto-store.
- **[SHIPPED 2026-09-19] chela#491 Secret Isolation (PR #501, merge 0ee2c75):** Prevents secret values from leaking into AI model context. 4-layer defense: (1) SecretLoader (`chela-kernel/secrets.rs`) — config-driven env injection from `~/.config/chela/secrets.yaml`, reserved-key validation (CLAUDE_*/ANTHROPIC_*/CHELA_*). (2) SecretRedactor (`chela-context/redactor.rs`) — exact-value matching, longest-first, suppression contract (replace→validate→suppress to empty + `was_suppressed` flag). (3) L2 policy expansion — configurable `secret_dirs`, default-deny. (4) Provider-specific content-field redaction at all output boundaries (Anthropic Messages, OpenAI Chat, Responses API, streaming, bridge). Plan peer-reviewed by devlead-codex: 6 rounds, 21 findings. Partially addresses deferred #91 (SecretString) and #101 (credential broker). 1234 tests, 36 new. Triggered by devlead-codex token leak incident.
- **[RESOLVED 2026-09-27] chela#606 GLM stuck in planning phase (PR #607, v1.36.1):** GLM-5.3 wastes ~$1.16/task failing to call `task_phase("executing")` — doesn't follow tool-call instructions in error messages. Fix: `auto_task_state_from_delegation` now starts delegated tasks in `Executing` phase (skip planning gate). Non-delegated tasks (interactive `set_task_goal`) still start in `Planning`. End-to-end `PhasePolicyLayer` test added. Follow-up #608 (untested invalid transition rejection).
- **v2 Smarter Core epic (#283):** 8 tracks closing DESIGN.md §4.2 gaps. Sub-issues: ~~#285 task state~~ (SHIPPED v1.14.0), #286 policy completion, #287 verify-before-done, #288 memory loop, #289 model routing (blocked), #290 tools gap (shipped v1.9.0), #291 context intelligence, #292 code intelligence A+B hybrid.
- **[RESOLVED 2026-09-12] CI gate LOC baselines (#223 → PR #462):** `ci/update-loc-baselines.sh` — no-arg/`--check` reports drift (exit 3, never writes; wired into the `check` job as "LOC baselines in sync"), `--apply` patches `expect_line` assertions + `[test_loc_baseline]` (section-scoped; `[budgets]` untouched), runs the self-test, restores on failure. Adding any `ci/*.sh` must also satisfy the meta-gates: gates-wired `run:` step, `ci-change` label for workflow edits, `NO_DEPS_ALLOWLIST` entry in `ci/test-gate-dependencies.sh` for stdlib-only gates. Diagnostic output (#161) remains.
- **[RESOLVED 2026-09-12] chela#442 sticky-model reset (F17 → PR #463, squash d24d1c5):** `FallbackApiClient` kept a *gone* sticky fallback model (gpt-5.5 404 on Sep 9) for the whole session. `is_model_gone()` + `MODEL_GONE_PHRASES` now reset to primary at the sticky arm only (other non-retryable errors keep sticky); eprintln surfaces the reset. Tests `non_retryable_resets_sticky_to_primary` / `_keeps_sticky` / `is_model_gone_classification`. Item 3 of #442 (fallback health monitoring) still open — devops-side.
- **[RESOLVED 2026-09-14] chela#472 context_length_exceeded kills merger (PR #480, squash 5260921):** Merger died at "36% context" — context spiked from 360K to >1M within a tool loop iteration. Three bugs: (1) `context_length_exceeded` wrapped in a 502 was misclassified as ProviderDown (`PROVIDER_PHRASES` matched "bad gateway" before checking the error body) — fixed with `REQUEST_ERROR_PHRASES` checked before `is_transient()` and provider classification; (2) context window not re-derived on fallback model switch — fixed with `active_model()` trait method on `ApiClient`, `FallbackApiClient` override, window re-derivation after each `record()`; (3) no compact+retry path — fixed with compact-once-and-retry arm in `run_turn()`. Shared `CONTEXT_OVERFLOW_PHRASES` constant in `chela-context` eliminates duplication between classify() and is_context_overflow(). Multi-agent review caught `compact_now()` boolean inversion (critical) and `is_transient()` precedence gap (high) — both fixed before merge. Investigation also closed 2 false hypotheses: Codex is 1M (not 258K), headroom-proxy is transparent for responses.
- **[RESOLVED 2026-09-12] bare `claude-sonnet-5` via Claude subscription (chela#474 `d75ad71` + soul-orchestra#1198 `8414fee`):** root cause was request SHAPE, not auth — Anthropic returns `429 rate_limit_error "Error"` to an OAuth (`sk-ant-oat…`) token unless `"You are Claude Code, Anthropic's official CLI for Claude."` is the FIRST `system` block (array form; concatenated string still 429; `anthropic-beta: oauth-2025-04-20` alone irrelevant). chela now: `SystemPrompt` Text|Blocks, `AuthSource::is_subscription_oauth()` (credential prefix), identity block + beta header in `build_raw_request` for OAuth tokens only; `--auth subscription` Anthropic-only (#473). agent-runner passes the flag for GLM agents, feature-detected on the help text; live on this host: GLM dead → `FALLBACK: glm-5.2 → claude-sonnet-5` → ok. Applies to each pool agent on its next restart. Decision นุด: send the Claude Code shape. Remaining in #247: route `agent/` models through the same direct path.
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

- **Prompt override cascade (thclaws port):** `.chela/prompt/<name>.md` (project) →
  `$CHELA_HOME/prompt/<name>.md` (user) → `include_str!` built-in default. Override
  files validated by `try_read_override`: distinguishes NotFound (expected) from
  permission/IO errors (logged), enforces 64KB size limit, logs every applied override.
  Template vars (`{model}`) resolved at builder level, not loader level (#577, PR #585).

- **web_search tool shipped (2026-09-27, PR #601, #587 PR-A)**: 3 backends (Tavily/Brave/DuckDuckGo fallback), 5s per-backend timeout, 15s total deadline, 256KB streamed response cap. Attribute-aware DDG HTML parser (parse_tag_attrs), HTTP 202 challenge detection, read_capped() extracted pub(crate) from http.rs. TAVILY/BRAVE keys scrubbed from bash child env. 54 tests in crates/chela-tools/src/web_search.rs.
- **v1.35.6 → v1.36.0 (2026-09-26/27)**: tool-array trim #578 complete (-17.7% bytes, 6 PRs), vendor/MANIFEST.md rule for new crates/* files (CI-enforced), system-prompt slim #577 (PR #585, 6 thclaws patterns ported, prompt override cascade).
- **Benchmark: chela vs Claude Code on GLM-5.3 (2026-09-26, #588)**: post-#577+#595, chela 4.7x cheaper ($0.23 vs $1.09), T1 speed equal, T2/T3 CC 2-3x faster (cargo compile dominates). read_files batch tool: T1 5 turns/$0.25 → 1 turn/$0.07. Measure-first: 3/5 proposed improvements disproved by ablation.

## See Also

- [multi-agents](multi-agents.md) — pool engine that will consume chela via the Agent
  Runtime Interface (design §7)
- [soul-orchestra](soul-orchestra.md) — identity/score layer above the harness
- [agent-psak](agent-psak.md) — orchestrator (L2) of the chela build
