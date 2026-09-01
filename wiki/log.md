# Wiki Change Log

Append-only record of wiki page updates.

| Date | Action | File | Notes |
|------|--------|------|-------|
| 2026-05-09 | created | index.md | Initial catalog with 4 pilot pages |
| 2026-05-09 | created | projects/soul-orchestra.md | Initial synthesis from Oracle entries |
| 2026-05-09 | created | projects/clienta-ai.md | Initial synthesis from Oracle entries |
| 2026-05-09 | created | projects/auto-ops.md | Initial synthesis from Oracle entries |
| 2026-05-09 | created | projects/oracle-v3.md | Initial synthesis from Oracle entries |
| 2026-05-22 | updated | projects/soul-orchestra.md | Added orphan respawn guard pattern + resolved known issue |
| 2026-05-22 | updated | projects/oracle-v3.md | Added stdio guard pattern, MCP config locations, resolved stdio bypass issue |
| 2026-05-24 | updated | projects/clienta-ai.md | +8 learnings: Docker base image, UAT manual trigger, a11y WCAG, QA waves, Stripe DOM change, batch orchestration |
| 2026-05-24 | updated | projects/auto-ops.md | +1 learning: swap/memory monitoring via /proc/meminfo (PR #39) |
| 2026-05-26 | created | systems/services.md | OpenClaw VPS service inventory — ports, paths, status |
| 2026-05-27 | updated | projects/soul-orchestra.md | +wiki_ref lazy-loading pattern, conductor/wiki/ in architecture tree |
| 2026-05-27 | note | — | PRP token optimization tools merged (prp-framework#96). 4 tools: prp-explore, prp-validate, prp-diff, prp-state. Tracking via agent-devops#340 |
| 2026-06-01 | updated | projects/soul-orchestra.md | +2 resolved issues (#298/#288 DAG deadlock, #322 timeout); +1 pattern (CODE-SIDE vs infra triage); oracle_entries: 57→62 |
| 2026-06-01 | updated | wiki/index.md | soul-orchestra entry count updated (54→62), index refreshed |
| 2026-06-07 | updated | projects/clienta-ai.md | v1.3.5/v1.3.6 shipped, v1.3.7 in progress, gate-keeper + reseller patterns |
- 2026-06-08: clienta-ai.md — v1.3.7 shipped milestone (was 'in progress')
| 2026-06-12 | created | projects/my-ai-soul-mcp.md | Initial synthesis — 18 MCP tools, dual storage, hybrid search, soul evolution |
| 2026-06-12 | created | projects/multi-agents.md | Initial synthesis — DAG executor, pool executor, platform adapters, workspace comms |
| 2026-06-12 | created | projects/prp-framework.md | Initial synthesis — 32 commands, 6 adapters, review-fix loop, token optimization |
| 2026-06-12 | created | projects/soul-skills.md | Initial synthesis — soul CLI, 18 platforms, profiles, skill discovery |
| 2026-06-12 | created | projects/sniper-s50.md | Initial synthesis — S50 backtesting, options trading, walk-forward validation |
| 2026-06-12 | created | projects/btc-trend-hunter.md | Initial synthesis — BTC scalping bot, archived status, lifecycle docs |
| 2026-06-12 | created | projects/agent-psak.md | Initial synthesis — home repo pattern, conductor protocol, memory dual-system |
| 2026-06-12 | updated | wiki/index.md | +7 project pages (4→11), total_pages: 5→12 |
- 2026-06-30 wiki-refresh: CK enrichment — soul-orchestra
- 2026-06-30 wiki-refresh: CK enrichment — agent-psak, auto-ops, btc-trend-hunter, clienta.ai, multi-agents, my-ai-soul-mcp, arra-oracle-v3, prp-framework, sniper-s50, soul-orchestra, soul-skills
- 2026-07-01 clienta-ai: 3 resolved issues (UAT OOM, runner phantom-busy, WS typing feedback)
2026-07-07 | soul-orchestra | Updated Known Issues (3 new active, 3 newly resolved), Patterns (deploy systemd auto-enable, health.jsonl rotation). Batch cleanup: 14 issues closed, 11 PRs.
2026-07-08 | soul-orchestra | Added identity-audit score + /gate fill-row skill patterns. Updated oracle_entries 63→65. 5 carryovers superseded.
2026-07-08 | agent-psak | clienta-ai: prod infra health audit — added billing webhook-only architecture, Stripe webhook fix (#1860), migration auto-resolve, backup→R2, Production Infra Health Audit pattern. oracle_entries 64→66. 1 learning superseded (stripe-live-price-IDs). Issues #1858/#1859/#1860/#1868.
2026-07-09 | agent-psak | Gate-mechanical + tooling batch (#799/#800/#801/#797/#131). soul-skills: adapter-parity known-issue + /gate checklist-centric pre-implement sweep pattern (oracle_entries 8→10). soul-orchestra: Warden checklist-centric sweep + 3-layer gate-readiness pattern (65→66). prp-framework: §Gate Compliance scaffold + commit-plan-artifacts patterns (22→24). 5 PRs merged across 4 repos; behavior-proven (AC5 BLOCK 14 / AC6 PASS 0). No supersede — new learnings extend existing checklist-driven/plan-walk rules.
2026-07-10 | soul-orchestra | +1 key decision (blocked_tools enforcement approach) | PSak
2026-07-10 | soul-skills | +1 pattern (skill usage tracking hook) | PSak
2026-07-10 | oracle-v3 | +1 pattern (E1 threat scanning write+read paths) | PSak
2026-07-10 | my-ai-soul-mcp | +1 pattern (E1 threat scanning _save_to_storage+read paths) | PSak
- 2026-07-15: clienta-ai — v1.12.0 Prepaid Credits shipped, 17/17 ACs, Stripe webhook lesson, widget bundle lesson
2026-07-17 | clienta-ai | PSak | +3 [RESOLVED] entries (post-v1.13 GA fixes: #2043 publicAuth guard, ci-web e2e-smoke, #2035 idempotency lease-lost)
- 2026-07-17: clienta-ai — v1.14.0 Trust Center Phase 2 shipped, 4 new API endpoints, follow-ups #2067/#2069/#2070
- 2026-07-17: Added login token field name + staging account mapping to Known Issues (agent-devops#876)
- 2026-07-17: soul-orchestra — added plan-validate, kickoff protocol, session-end improvement scan, tmux respawn fix (PRs #1083-#1091)
2026-07-19 | psak | Added: v1.15.2 schema drift resolution, CI self-hosted migration, updated oracle_entries 74→77
2026-07-20 | psak | Added: re-embed script fixes resolved (#2153/#2154), oracle_entries 77→78
2026-07-25 | psak | Added: wiki/projects/chela.md — new page (นุด-approved): Phase 0 + locked baselines + Plan B context, oracle_entries 3
2026-07-26 | psak | Added: oracle-v3 P1 known issue — duplicate indexing (~2,559 arra_learn-paired files carry an indexer twin; all 4,141 indexer-scheme rows have NULL expires_at so they never expire) is why expired entries stay searchable; corrects an earlier "read path never filters" diagnosis. Refs agent-devops#960, soul-orchestra#1107. oracle_entries 16→17
- 2026-08-01 wiki-refresh: CK enrichment — agent-psak, auto-ops, btc-trend-hunter, chela, clienta.ai, multi-agents, my-ai-soul-mcp, arra-oracle-v3, prp-framework, sniper-s50, soul-orchestra, soul-skills
2026-08-07 | psak | oracle-v3: Updated known issues with 2026-08-07 health-check data (2,317 orphans, 1,168 drifted, arra_learn skip root cause). oracle_entries 17→18
2026-08-07 | psak | oracle-v3: +2 [RESOLVED] entries (#1010 supersede twin-row, #1012 arra_learn drift). oracle_entries 18→20. soul-orchestra: +1 [RESOLVED] #1006 AGENTS.md drift. 70→71. my-ai-soul-mcp: +1 [RESOLVED] #1011 FTS project column. 22→23
2026-08-07 | psak | auto-ops: +1 [RESOLVED] hook lockout+orphans (#1004/#1005). 20→21. soul-skills: +1 [RESOLVED] ping-reply insurance (#1003). 11→12
2026-08-07 | psak | soul-orchestra: +2 [RESOLVED] Phase 7 HANDOFF truncation (#883, PR#1125) + triage classification (#1009, PR#1124). 71→73
2026-08-08 | psak | clienta-ai: +2 [RESOLVED] Prisma raw SQL (#931, PR#2218) + runner concurrency (#796, PR#2219). 78→80. auto-ops: +1 [RESOLVED] secret staleness check (#932, ops#89). 21→22
2026-08-08 | psak | chela: +2 [RESOLVED] chela-dev promoted (#951) + soul-evolution candidate closed (#949). 3→5
2026-08-08 | psak | soul-orchestra: +2 [RESOLVED] post-implement step 7 (#1022, PR#1131) + auto-deploy CI (#1024, PR#1132). 73→75. auto-ops: +1 [RESOLVED] docs-only safe-merge (#1023, ops#90). 22→23
2026-08-08 | psak | soul-orchestra: +1 [RESOLVED] retro goal-emit (#1107, PR#1133). 75→76. ops: +2 [RESOLVED] cleanup squash (#86) + bypass class-split (#56), both PR#91
- 2026-08-08: chela.md — pre-M7 sweep 28/28 complete (#151 PR #171 merged), oracle_entries 8→9
- 2026-08-08: soul-orchestra.md — [RESOLVED] agent YAML parse error silent drop, oracle_entries 76→77
- 2026-08-08: clienta-ai.md — added 3 [RESOLVED] entries (gitleaks baseline #2211/#2223, i18n #2230, WebSocket pub/sub #2229), updated test-accounts source path, bumped oracle_entries 80→83
- 2026-08-09: clienta-ai.md — 3 [RESOLVED] + 1 [CLOSED] entries (#2212 gitleaks action, #2182/#2183 flaky E2E, #2059 KB re-index duplicate), oracle_entries 83→85
- 2026-08-10 | chela | v1.3.0-v1.3.1: interactive mode (#212, 10 ACs verified), GLM URL fix (#214), GLM_BASE_URL env (#215). D6 trial 4/4 pass. | psak
- 2026-08-11 | chela | #188 AGENTS.md fallback (PR #219), #187 skill/slash support (PR #220), #217 shared setup refactor (PR #218), #216 vendor-audit MANIFEST fix. 8 PRs this session (#213-#220). CI green. | psak
- 2026-08-11 | chela | #221 dynamic model name (removed hardcoded Opus 4.6 from system prompt). Interactive respawn + subscription auth for pool agents. chela_interactive default=true. | psak
- 2026-08-12 | chela | #182 --verbose flag (PR #224): VerboseObserver prints tool/text/result to stderr. Review found UTF-8 byte-slice panics — fixed with char-boundary-safe truncation + catch_unwind isolation. LOC baseline updated. | psak
- 2026-08-12: agent-psak — [RESOLVED] verification scripts (PR #81), stale Oracle goals cleanup (7 entries), duplicate dispatch root cause (soul-orchestra#1150)
- 2026-08-12: soul-orchestra — [RESOLVED] deploy-time timeout validation (#1151 merged, multi-agents#232 closed), runner retry issue filed (#1150)
- 2026-08-14: chela — v1.7.0 shipped (#276/#278): interactive persistence for pool agents, 4-round review, 17 findings fixed
- 2026-08-14: chela — v1.8.0 shipped (#280/#281): structured event log, agent identity, lifecycle events, chela logs CLI
- 2026-08-14: chela — v2 Smarter Core epic (#283): 8 tracks, 3 Oracle learnings (design-gaps, competitor-landscape, code-intelligence-a-b), 4 new tools planned (#290)
- 2026-08-15: chela — v1.9.0 shipped (#290/#299): 3 new tools (write_file, glob_search, http_fetch), 4 review rounds, 24 findings fixed. Binary deployed.
- 2026-08-16 | chela | PSak | [RESOLVED] infra gaps #301/#302/#303 (PR #304), vendor-audit #305 (PR #306). Wiki: status+known-issues updated, oracle_entries 24→25.
- 2026-08-17 | chela | PSak | v1.11.1: agent_send+agent_list (#309/#310) merged+reviewed, post-review fixes. Plans approved: #311/#312 observability (R4), #313 fallback (R6). oracle_entries 25→26.
- 2026-08-17 | chela | PSak | v1.12.1: CLI wiring #325 (--fallback arg). Fallback chain fully usable. #313 complete. oracle_entries 26→27.
- 2026-08-18 chela: v1.13.0 shipped — agent observability (#311/#312), subprocess fix (#336/#338), E2E verified. Status + Known Issues updated.
- 2026-08-18 chela: v1.13.1 — fallback follow-up fixes (#328). Status updated.
- 2026-08-19 chela: v1.14.0 — Task State Machine shipped (#285), max_iterations fix (#277). 3-agent review caught 2 critical gate bypasses. v2 Track 1 complete.
- 2026-08-19 chela: v1.15.0 — 3-tier Task Awareness + Built-in Skills (#347). 8 review rounds, 13 findings. Auto delegation TaskState, built-in skills, durable callback, done-gate hardened.
- 2026-08-22 chela: v1.16.0 — Dynamic loop termination (#350, 10K safety backstop), bridge-mode delegation callback credit (#346, closes duplicate-auto-callback gap), defensive logging (#356). 4 PRs, 10 review agents, CI timeout 10→15 min. oracle_entries 31→33.
- 2026-08-22 | soul-orchestra | [RESOLVED] #1167 identity_mismatch spawn race (PR #1169), #1150 scope corrected (exit 3 = WorkspaceError) | psak
- 2026-08-22 | chela | [RESOLVED] agent-devops#1056 harness parity — v1.17.0 global CLAUDE.md discovery + MCP fixes (PSak)
- 2026-08-26 chela: epic reconciliation — 9 epics verified (27/68 ACs done), all issue checklists updated, #196 closed, Oracle learning superseded
- 2026-08-26 | soul-orchestra | [RESOLVED] infra-collector false disk (#1064) + billing gate test-mode (#1062) — PR #1175 merged
- 2026-08-27 chela: epic #382 Continuous Conversation COMPLETE — 3 layers shipped (PRs #383/#385/#386), v1.19.0 deployed, 20 review fixes, E2E verified. Follow-ups: #387, #388.
- 2026-08-30 chela: #389 --continue flag + #390 hook system Phase 1 shipped (PRs #391/#392). Plans peer-reviewed 5 rounds (13 findings). E2E verified.
- 2026-08-30 chela: v1.20.0 shipped — panic-path hardening #366-#370 (PR #394), version bump (PR #393). PR #371 closed, cherry-picked fresh. Repo fully clean: 0 PRs, 0 branches.
| 2026-08-30 | updated | projects/sniper-s50.md | 3 new learnings: futures TP monitor, EOD sweep, ATR dynamic TP (2026-08-26) |
| 2026-08-30 | updated | projects/agent-psak.md | Bumped entry count for friction-report learning |
| 2026-09-01 | updated | projects/auto-ops.md | +2 Oracle entries: real-infra auth validation and consumer-sweep operational rollout patterns |
