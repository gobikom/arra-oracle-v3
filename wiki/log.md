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
- 2026-07-17: soul-orchestra — added plan-validate, kickoff protocol, session-end improvement scan, tmux respawn fix (PRs #1083-#1091)
