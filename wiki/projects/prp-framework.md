---
title: PRP Framework
type: wiki
status: active
updated: 2026-07-09
oracle_entries: 24
sources:
  - https://github.com/gobikom/prp-framework
project: github.com/gobikom/prp-framework
tags: [wiki, prp-framework, workflow, cross-tool]
---



# PRP Framework

## Code Structure (auto — CK, refreshed 2026-06-30)

- scripts: 18 functions

## Entry Points (auto — CK)

- generate_adapter_file `def generate_adapter_file(adapter_name: str, cmd_name: str, config: dict) -> tuple[str, str]` — scripts/generate-adapters.py (11 connections)
- get_description `def get_description(adapter_name: str, cmd_cfg: dict) -> str` — scripts/generate-adapters.py (5 connections)
- generate_frontmatter_md `def generate_frontmatter_md(adapter_name: str, cmd_name: str, cmd_cfg: dict, adapter_cfg: dict) -> str` — scripts/generate-adapters.py (4 connections)
- generate_codex_frontmatter `def generate_codex_frontmatter(cmd_name: str, cmd_cfg: dict, adapter_cfg: dict) -> str` — scripts/generate-adapters.py (4 connections)
- generate_all `def generate_all(config: dict, adapter_filter: str | None = None, dry_run: bool = False, show_diff: bool = False) -> dict[str, int]` — scripts/generate-adapters.py (4 connections)
- yaml_quote `def yaml_quote(value: str) -> str` — scripts/generate-adapters.py (3 connections)
- generate_alias_content `def generate_alias_content(cmd_name: str, cmd_cfg: dict, adapter_name: str) -> str` — scripts/generate-adapters.py (3 connections)
- wrap_with_xml `def wrap_with_xml(content: str, overlay: dict | None) -> str` — scripts/generate-adapters.py (3 connections)
- generate_toml_content `def generate_toml_content(description: str, prompt_body: str) -> str` — scripts/generate-adapters.py (3 connections)
- main `def main()` — scripts/generate-adapters.py (3 connections)

## Hotspots (auto — CK)

- `scripts/generate-adapters.py` — 23 connections, change_freq=1
- `scripts/generate-adapters.py` — 11 connections, change_freq=0
- `scripts/generate-adapters.py` — 5 connections, change_freq=0
- `scripts/generate-adapters.py` — 4 connections, change_freq=0
- `scripts/generate-adapters.py` — 4 connections, change_freq=0

## Overview

**Prompt-Run-Perfect** — cross-tool AI workflow framework for development, marketing, and business operations. Works with Claude Code, Codex, OpenCode, Gemini CLI, Kimi, Cursor, and others. Every task follows the same loop: **Prompt** the AI with structured commands, **Run** the workflow through automated stages, **Perfect** the output via iterative review-fix cycles until quality gates pass.

32 commands across 6 adapters (22 core + 4 marketing + 5 bot + 1 meta), auto-generated from canonical prompts to guarantee zero drift. Used by all agents in the Oracle family. Installed globally across all repos via `prp-install-all`.

## Architecture

```
prp-framework/
├── prompts/                    # Canonical prompt files (source of truth)
│   ├── plan.md                # Implementation planning
│   ├── implement.md           # Plan execution with validation
│   ├── review.md              # Single-agent code review
│   ├── review-agents.md       # Multi-agent parallel review
│   ├── review-fix.md          # Auto-fix review findings (loop mode)
│   ├── run-all.md             # Full lifecycle orchestration
│   ├── ralph.md               # Autonomous execution loop
│   ├── commit.md              # Smart commit with context
│   ├── pr.md                  # Create PR from branch
│   ├── prd.md                 # PRD generator
│   ├── design.md              # Technical design doc
│   ├── debug.md               # Root cause analysis
│   ├── qa.md                  # QA verification via screenshots/API
│   ├── verify.md              # Requirements traceability
│   ├── done.md                # Issue closure gate
│   └── ...                    # +marketing, bot, cleanup commands
├── adapters/                   # 6 platform-specific formats (auto-generated)
│   ├── claude-code/           # .claude/commands/ (SKILL.md dir format)
│   ├── codex/                 # .codex/commands/ (SKILL.md dir format)
│   ├── gemini/                # .gemini/commands/ (.toml format)
│   ├── opencode/              # .opencode/commands/ (.md flat files)
│   ├── kimi/                  # .kimi/commands/ (.md flat files)
│   └── claude-code-plugin/    # Plugin marketplace format
├── adapters.yml                # Adapter generation config (most-changed file)
├── scripts/
│   ├── generate-adapters.py   # Single-source → 6 adapters generator
│   ├── install.sh             # Install adapters + symlink to target project
│   └── ...                    # prp-validate, prp-diff, prp-state (token optimization)
├── templates/                  # Plan/review/commit templates
├── tests/
│   └── e2e/                   # End-to-end test suite
├── results/                    # Test/benchmark results
└── docs/                       # USER-GUIDE.md, architecture
```

**Adapter generation pipeline:**
1. Edit canonical prompt in `prompts/<command>.md`
2. Run `python3 scripts/generate-adapters.py` (or `--dry-run` to preview)
3. Generator reads `adapters.yml` config → produces 6 adapter variants
4. Each adapter: frontmatter (YAML/TOML) + prompt body + platform-specific wrapping (XML for Claude Code, TOML for Gemini, etc.)
5. Overlays (`adapters/<platform>/overlays/`) add per-platform customization without modifying canonical prompt

**Key commands:**

| Command | What it does |
|---------|-------------|
| `prp-plan` | Analyze codebase → create implementation plan with ACs |
| `prp-implement` | Execute plan with validation loops |
| `prp-review-agents` | 8 specialized agents review in parallel (security, deps, quality, tests, errors, types, docs, simplify) |
| `prp-review-fix` | Fix all review findings, re-review in loop until 0 issues |
| `prp-run-all` | Full lifecycle: branch → plan → implement → commit → PR → review loop → merge |
| `prp-ralph` | Autonomous loop: execute plan until all validations pass |
| `prp-qa` | QA via Playwright screenshots, API calls, E2E flows |
| `prp-verify` | Requirements traceability: issue/plan ACs → diff evidence |
| `prp-done` | Issue closure gate: checks PR merged, review, verify, Vera QA |

**Token optimization tools:**
- `prp-validate` / `prp-diff` / `prp-state` reduce ~99K tokens per run-all cycle via compact output, parallel execution, and structural diffs

## Key Decisions

| Decision | Chosen | Rejected | Why |
|----------|--------|----------|-----|
| Source of truth | `prompts/` canonical files | Per-adapter editing | Edit once, generate all 6 → zero drift guaranteed |
| Adapter format | Auto-generated via `generate-adapters.py` | Manual per-platform | 32 commands × 6 adapters = 192 files; manual = impossible to keep in sync |
| Installation | Git submodule or local clone + symlink | npm package / pip install | No dependency; works offline; target project stays clean |
| Review model | Multi-agent parallel (8 specialists) | Single reviewer | Each dimension (security, deps, quality) gets dedicated focus |
| Fix loop | Loop until 0 issues across all severities | Fix once and ship | Iterative perfection catches cascading issues from fixes |
| Monorepo | Auto-detect pnpm/Turborepo/Nx/Lerna + `--package` flag | Ignore monorepo structure | Real-world projects are often monorepos; scoping matters |

## Known Issues

- `prp-review-agents` agents read absolute paths that resolve to main worktree, not PR worktree — verify findings with `git show <branch>:<file>` (feedback_worktree_agent_path)
- Cross-repo invocation (`--project-dir`) not reliably parsed — use `cd` prefix + absolute path Edit as workaround
- Adapters.yml is the most-changed file (12 changes) — merge conflicts common when multiple PRs touch it

## Patterns

- **Canonical + overlay**: Single prompt file → platform-specific overlays add wrapping/frontmatter without modifying the source. Overlays support `wrap_before`, `wrap_after`, `skip_before` sections.
- **Review-fix loop**: `prp-review-agents` → `prp-review-fix` → re-run `prp-review-agents` → repeat until artifact shows 0 issues. Max 5 cycles with escalation.
- **Artifact-based verification**: Every review produces `.prp-output/reviews/pr-<N>-agents-review.md` — merge blocked without this artifact via `safe-merge`.
- **3-round review to 0 issues**: Standard workflow: round 1 finds issues → fix → round 2 catches cascading → fix → round 3 confirms 0. Established pattern across all projects.
- **prp-plan §Gate Compliance scaffold (2026-07-09, v2.13.0, agent-devops#799):** `prompts/plan.md` Phase 6 emits an always-present `## Gate Compliance` plan section (tiered: full new_feature/epic_kickoff/post_ship item→task mapping for user-facing changes; enumerated-`N/A` for internal-only, blanket-N/A rejected) so the pre-implement gate-audit (Layer 3) can mechanically verify operational compliance. Loose-coupling: prp scaffolds, `/gate audit` verifies — prp never hard-reads the gate rules YAML (stays tool-agnostic). Conditional `/gate` hint in the base prompt degrades gracefully for non-gate toolchains (no codex overlay — only claude-code has overlay support).
- **Plan artifacts committed to git (2026-07-09, #801):** prp-plan commits the plan artifact to the feature branch (`[ -n "$BR" ]` guards detached-HEAD; never main); prp-implement Phase 5.4 archives via `git mv` (not `mv`) so the completed/ move stays tracked (`.prp-output/**` is gitignored for NEW paths → a plain mv silently un-tracks it).

## See Also

- [soul-orchestra](soul-orchestra.md) — scores reference PRP commands; dev-task uses prp-run-all internally
- [multi-agents](multi-agents.md) — execution engine for PRP-based DAG workflows
- [soul-skills](soul-skills.md) — `soul install` distributes PRP adapters to agent repos
