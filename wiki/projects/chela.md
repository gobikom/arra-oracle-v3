---
title: chela
type: wiki
status: active
updated: 2026-09-05
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
for pool agents. LOC-capped binary (ceiling 29 750, CI-enforced) vs thclaws' 177K; moves CLAUDE.md prose guardrails
(checkpointing, verify-before-done, never-push-main, budget caps) into kernel code.
Name: zoology "pincer claw" + Sanskrit "disciple/learner". Private repo
(`gobikom/chela` → `~/repos/agents/chela`), MIT/Apache-2.0 dual, open-source later.

Status 2026-09-05: v1.23.0 — **Session Orchestration Phase 1 SHIPPED** (#412, PR #420 →
520476d, tag v1.23.0, binary in ~/ops/bin): `chela -p … --result <path>` writes a schema-1
`WorkerResult` (atomic create_new/0600, size-capped) + `tasks.result_json`; exit-code contract
0/1/2/3/4/10 (panic 101 = no file); E2E on codex, GLM, claude subprocess. Post-Phase-1
hardening same day: #417 gate-rules guard (PR #425, `gate-rules-guard` required check +
`gate-rules-change` label), #418 hardened git shell-outs (PR #428, `chela_context::git_cmd`),
#421 item 2 random tmp suffix (PR #429). LOC ceiling 29 750, main 29 741 (9 free).
Next: #412 Phase 2 (`--continue`, `--supervise` zero-MCP chain, dirty detection; folds in
#421 item 1, #424, #423 if Claude workers) — new plan + LOC row from นุด first.
v1.22.0 (2026-09-04): **Policy Engine COMPLETE** (#286 Track 2 closed) — TierPolicy (3-tier tool classification: auto_allow/require_approval/
forbidden with default_tier whitelist posture + startup tool-name validation),
PolicyEvaluated (every tool call outcome in JSONL), OverridePolicy (git-verified
config-signed + human-token env var, thread-local audit, symlink rejection,
repo-root-relative git checks), BudgetPolicy bridge+fallback fix (#397),
AUTH-NEGATIVE CI fix (#402). Plan R5 peer-reviewed by devlead-codex (3 rounds).
v1.21.0: Verify-Before-Done (#287), PolicyChain+GitSafety+Budget (#396).
v1.15.0: Task Awareness + Built-in Skills (#347). Epic #283 ~28/31.
Still pending from v2: Tracks 5-8 (Model Routing, Context Intelligence, Code Intelligence),
#348 persistent status line.

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

- **[RESOLVED 2026-09-05] chela#412 Phase 1 worker protocol:** shipped v1.23.0 (PR #420). Gated end to end: plan R6 (plan-validate 35/35), devlead-codex APPROVE, Warden pre-implement r3 + dev-local PASS, 4 review rounds to 0/0/0, merger-bot approved, G2 headless smoke with a real codex call. LOC caps escalated once mid-implementation (29 503 vs frozen 29 500) → นุด approved new rows; estimate LOC post-`cargo fmt` on a scratch branch.
- **[RESOLVED 2026-09-05] chela#417 gate rules live in the gated repo:** `.github/workflows/gate-rules-guard.yml` on `pull_request_target` (workflow + script taken from the base branch, PR head fetched as objects only), `runs-on: ubuntu-latest` because self-hosted runners share `$HOME` with head-executing jobs, label read live via `gh pr view --json labels` with a strict `true|false` contract, `--no-renames --name-only -z` diff. Cannot run on its own PR — proven post-merge with throwaway PR #427 (unlabelled RED → labelled GREEN). Five review rounds; two redesigns forced by security review (`|| true` grep, rename-out, C-quoted names, label race).
- **[RESOLVED 2026-09-05] chela#418 hardened git shell-outs:** one helper (`hardened_git`/`hardened_git_diff`) for every harness git call: `-c core.fsmonitor=false -c core.hooksPath=/dev/null -c core.attributesfile=/dev/null`, `--attr-source=<empty tree per object format>` (git ≥ 2.40, else withhold the snapshot — fail closed), `--no-ext-diff`, `--no-optional-locks`, `safe.directory` only when the repo top is owned by the current uid. Verified facts: `git diff` refreshes the index even under `--no-optional-locks` and fires `post-index-change`; `--attr-source` does not cover `.git/info/attributes`; `-c diff.external=` is not a fix. File tools refuse `.git/**` and `.gitattributes` on every write path. Trap-fixture tests (planted fsmonitor/clean/external-diff/hook) with a plain-git control that must fire all four markers.
- **chela#421 item 1:** open, folds into Phase 2 (details stay on the private issue — this wiki is public). Item 2 (predictable tmp name) RESOLVED 2026-09-05 via PR #429: `<name>.<pid>.<8 random hex>.tmp`, one retry, never unlink a peer's entry.
- **Watch (opened 2026-09-05 BKK):** #423 agent/claude path reports `stopped` not `done` (`--result` status wrong for Claude-backed workers) · #424 test-hooks window override for exit-4 live test · #426 CI integrity guard · #430 flaky `tests/base_url_env.rs` env-var race · #431 SessionStore XDG vs CHELA_HOME · ops#99 safe-merge label assertion.
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
- **[RESOLVED 2026-08-22] chela#350 dynamic loop termination:** Static 200-iteration cap replaced with 10,000 safety backstop. Context exhaustion (compaction flow) is the operational terminator — the "context-aware termination" the issue asked for already existed; only the default cap was wrong. CI timeout bumped 10→15 min. PR #354, shipped v1.16.0.
- **[RESOLVED 2026-08-22] chela#346 bridge-mode delegation callback:** Agent/ ping_reply now satisfies the callback AC (scoped caller+reply_path match), closing the duplicate-auto-callback gap. PolicyAwareBridge::call_tool never credited bridge-mode ping_reply. PR #355 + defensive logging PR #357 (#356), shipped v1.16.0.
- **[RESOLVED 2026-08-22] agent-devops#1056 harness parity:** chela agents lacked `~/.claude/CLAUDE.md` global rules, serena MCP, and ck (binary missing). Fixed in v1.17.0: chela#360 (global CLAUDE.md discovery + `CLAUDE_CONFIG_HOME` env var), serena added to `~/.chela/config.json`, ck binary rebuilt. Model difference (GPT-5.5 vs Opus) is by design.
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

- **Mutation-test security flags:** a test that pins a hardening flag is accepted only after removing the flag (or reordering the input) turns it red. Four vacuous tests in one night passed review-by-reading (index-untouched assertion that never triggered a stat refresh, SHA-256 `--attr-source` test with nothing to diff, collision test whose first draw never collided, a "hooks untestable" claim that was false). Name the red case in the PR body's "Verified by".
- **Human approvals on GitHub at decision time:** merger-bot rejects approvals that exist only in a chat session. Post `<decision> — by นุด, session <id> transcript line <L>, <ISO ts>` on the issue the moment it is given and ask for a countersign; an estimated clock time ("~03:55" for 03:45) pointed the auditor at the wrong session.
- **Review sub-agents in mktemp clones:** never hand a review agent the shared worktree (one dirtied it with a stray branch). Record HEAD + branch before dispatch; verify findings with `git show <branch>:<file>`.
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
