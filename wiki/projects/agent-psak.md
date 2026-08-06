---
title: Agent PSak
type: wiki
status: active
updated: 2026-08-02
oracle_entries: 12
sources:
  - https://github.com/gobikom/agent-psak
project: github.com/gobikom/agent-psak
tags: [wiki, agent-psak, identity, oracle-family]
---





# Agent PSak

## Code Structure (auto — CK, refreshed 2026-08-01)

- (no indexed symbols)

## Entry Points (auto — CK)

- (no exported functions/classes detected)

## Overview

PSak's home repo — loads PSak identity (Knowledge Analyst & System Architect) when running `claude` from this directory. Contains CLAUDE.md with full identity, philosophy, capabilities, budget, escalation rules, and the 7-phase conductor protocol. Cross-project work uses this as a stable base that doesn't get overridden by target project instructions.

PSak is the analytical/architectural agent in the Oracle family. Role: investigate, plan, review, gate-audit, delegate. Model: `claude-opus-4-6[1m]`. Communicates in Thai-English mix with technical terms in English.

## Architecture

```
agent-psak/
├── CLAUDE.md                  # Auto-generated identity (DO NOT EDIT DIRECTLY)
│                              # Source: soul-orchestra/agents/psak.yaml + conductor/protocol.md
│                              # Regenerate: cd soul-orchestra && python3 generator/generate-claude-md.py psak
├── PROJECT.md                 # Project context for AI tools
├── context/                   # Session context files
├── docs/                      # Agent documentation
├── patches/                   # Patch files for cross-project fixes
├── scripts/                   # Helper scripts
├── supabase/                  # Supabase config (if needed)
├── .claude/                   # Claude Code settings + commands
├── .codex/                    # Codex settings
├── .gemini/                   # Gemini settings
├── .serena/                   # Serena LSP config
└── .prp-output/               # PRP workflow artifacts (plans, reviews, reports)
```

**Identity system:**
- CLAUDE.md is auto-generated from `soul-orchestra/agents/psak.yaml` + `conductor/protocol.md`
- Direct edits are overwritten on next generation
- Changes flow: edit source → `generate-claude-md.py psak` → copy to home repo → commit

**Memory dual-system:**

| Store | Scope | Purpose |
|-------|-------|---------|
| Oracle v3 | `project="agent:psak"` | Reusable patterns, code knowledge, cross-agent sharing |
| Soul MCP | `project="psak"` | Session state, reflections, personal insights |

**Conductor protocol (7 phases):**
1. OBSERVE — check inbox, read task, note trigger type
2. RECALL — search Oracle + Soul for relevant knowledge
3. THINK — synthesize, identify gaps, plan approach
4. DECIDE — philosophy/capability/escalation/budget/confidence checks
   - 4.5 MONITOR — check segment state thresholds before acting
5. ACT — execute (PRP, delegation, code, API calls)
6. LEARN — save discoveries to Oracle/Soul
7. HANDOFF — save context for next session/agent

## Key Decisions

| Decision | Chosen | Rejected | Why |
|----------|--------|----------|-----|
| Identity anchor | Dedicated home repo | Shared monorepo | Isolated identity; no interference from project CLAUDE.md |
| Memory | Oracle v3 + Soul MCP | Single store | Oracle = topical/reusable, Soul = temporal/personal; different access patterns |
| Execution model | Self-Implementer (non-epic) + Gate-keeper (epic) | Pure orchestrator | Direct implementation is faster for small tasks; epics need DevLead ownership |
| CLAUDE.md | Auto-generated from soul-orchestra | Manual editing | Single source of truth; prevents drift across conductor/agent changes |

## Known Issues

- CLAUDE.md generation depends on soul-orchestra scripts — if generator changes format, must re-test identity loading
- Cross-project work via absolute paths sometimes confuses PRP skill (wrong-repo artifacts)
- Pool session detection relies on tmux session name — fails if tmux unavailable (defaults to pool/cron-triage-only mode)
- **[RESOLVED 2026-08-01] #982 — ψ was a real directory instead of a symlink.** agent-psak was the only agent with a real `ψ/` rather than a symlink into mono-ψ (`~/psi/agent-psak`), which produced 19+ consecutive infra-health CRITICALs. Those were TRUE POSITIVES, not a stuck alarm — misdiagnosed as noise for two days. Root cause: after the 2026-07-27 data-loss incident ψ was rebuilt as a real directory to guarantee git tracking; correct at the time, but it diverged from the mono-ψ layout `psi-daily-sync.sh` depends on. Fixed by reconciling 586 files (99 new + 487 updated) into mono-ψ, then replacing the directory with a symlink (PR #76, `80ad7d6`). **The symlink is local filesystem state, not git-tracked** — a fresh clone or a merge checkout will not recreate it.

## Patterns

- **Home repo pattern**: Agent identity lives in dedicated repo. Running `claude` from this directory loads full CLAUDE.md. Cross-project work uses absolute paths; identity stays stable.
- **Self-Implementer Protocol**: For non-epic work: worktree → branch → PR → formal review → fix-loop → safe-merge → Vera QA → close. Review agents serve as independent check.
- **Gate-keeper pattern**: For epics: investigate → plan → peer-review plan → delegate ENTIRE epic to DevLead. PSak only audits /gate compliance on merged PRs.
- **Session protocol**: `session_resume` at start → proactive memory saves mid-session → `reflect` then `session_handoff` at end.
- **Sub-agent parallelism at scale** (2026-08-01): 6 concurrent agents across 6 repos works when each gets a precise brief, worktree isolation, and explicit ACs. Compressed ~3h of sequential implementation into ~45min wall-clock for ~$1.50 in sub-agent tokens against ~$0.50 direct — the trade is time for budget, so reach for it when latency matters, not by default. Gotchas: tmpfs fills with transcript files past 5 agents, pre-commit hooks need their deps installed inside each worktree, and branch protection on the target repo blocks every agent equally.

## See Also

- [soul-orchestra](soul-orchestra.md) — agent definition source (`agents/psak.yaml`) + conductor protocol
- [my-ai-soul-mcp](my-ai-soul-mcp.md) — personal memory store (project="psak")
- [oracle-v3](oracle-v3.md) — knowledge store (project="agent:psak")
