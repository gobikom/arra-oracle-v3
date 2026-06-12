---
title: Soul Skills
type: wiki
status: active
updated: 2026-06-12
oracle_entries: 8
sources:
  - https://github.com/gobikom/soul-skills
project: github.com/gobikom/soul-skills
tags: [wiki, soul-skills, cli, distribution]
---

# Soul Skills

## Overview

Unified skill distribution for AI coding agents. Single CLI (`soul`) installs skills across 18+ platforms: Claude Code, Codex, Cursor, OpenCode, Gemini CLI, Windsurf, Amazon Q, Antigravity, ChatGPT, Claude Desktop, Aider, and more. Previously split across 2 repos (arra-oracle-skills + my-ai-soul-mcp); merged for simplicity — one repo, one CLI, one installer.

29 active skills covering session management, orchestration, delegation, gate-keeping, project tracking, introspection, and operations. Skills are authored as `SKILL.md` files with YAML frontmatter, then compiled into platform-specific adapter formats.

## Architecture

```
soul-skills/
├── src/
│   ├── cli/
│   │   ├── index.ts           # Entry point — `soul` command (commander)
│   │   ├── installer.ts       # Core install/uninstall logic (20+ connections)
│   │   ├── skill-source.ts    # Skill discovery (filesystem + VFS for compiled binary)
│   │   ├── agents.ts          # 18 agent/platform configs + detectInstalledAgents()
│   │   ├── platforms.ts       # Tier 3 MCP config writers (Windsurf, Amazon Q, etc.)
│   │   ├── types.ts           # Interfaces (Skill, InstallOptions, etc.)
│   │   ├── fs-utils.ts        # Cross-platform file ops + shell mode detection
│   │   └── commands/          # CLI subcommands
│   │       ├── install.ts     # `soul install` — main install flow
│   │       ├── init.ts        # `soul init` — platform-specific MCP setup
│   │       ├── inject.ts      # `soul inject` — inject skills into existing repo
│   │       ├── select.ts      # `soul select` — interactive skill picker
│   │       ├── uninstall.ts   # `soul uninstall`
│   │       ├── contacts.ts    # `soul contacts` — agent contact book
│   │       ├── xray.ts        # `soul xray` — inspect memory/skills/sessions
│   │       ├── profiles.ts    # `soul profiles` — list available profiles
│   │       └── shortcut.ts    # `soul shortcut` — register shell shortcuts
│   ├── profiles.ts            # Profile definitions (seed/standard/full + features)
│   ├── skills/                # 29 active skills (SKILL.md per skill)
│   │   ├── gate/              # CI/CD gate keeper (check, execute, knowledge scripts)
│   │   ├── project/           # Project management (reunion, offload, resolve-slug)
│   │   ├── dig/               # Session mining (Python)
│   │   ├── e2e-results/       # Parse Playwright results from GitHub Actions
│   │   ├── _deprecated/       # 12 deprecated skills
│   │   └── _template/         # Template for new skills
│   ├── adapters/              # 18 platform-specific skill formats (auto-generated)
│   └── hooks/                 # Git hooks
├── scripts/
│   ├── compile.ts             # Generate command stubs from SKILL.md files
│   ├── generate-vfs.ts        # Virtual filesystem for compiled binary builds
│   ├── generate-table.ts      # README skill table generator
│   └── release.sh             # Version bump + release
├── __tests__/                 # Bun test suite (e2e, integration, unit)
├── install.sh                 # curl|bash installer
└── package.json               # name: soul-skills, v1.0.0, bin: soul
```

**Key concepts:**

| Concept | Description |
|---------|-------------|
| **Skill** | A `SKILL.md` file with YAML frontmatter — instructions for AI agents |
| **Profile** | Curated skill set: `seed` (11), `standard` (18), `full` (27) |
| **Feature** | Add-on skill group: `+soul`, `+memory`, `+network`, `+workspace` |
| **Adapter** | Platform-specific format of a skill (SKILL.md, .toml, .mdc, .md) |
| **Tier** | Platform capability level: Tier 1 (native dirs), Tier 2 (docs+MCP), Tier 3 (remote MCP), Tier 4 (read-only) |

**Global install:**
```bash
soul-install-all              # Update + install in all repos under ~/repos/
soul-install-all --dry-run    # Preview without executing
```

## Key Decisions

| Decision | Chosen | Rejected | Why |
|----------|--------|----------|-----|
| Runtime | Bun + TypeScript | Node.js / Python | Fast startup, native test runner, single-file compile support |
| Skill format | SKILL.md (YAML frontmatter) | JSON / TOML config | Human-readable, git-diffable, matches Claude Code native format |
| Distribution | Single CLI (`soul`) | Per-platform scripts | 18 platforms × N skills = centralized management is the only scalable approach |
| Profiles | Tiered (seed/standard/full) | Install-all-or-nothing | Different agents need different skill sets; seed is minimal, full is everything |
| Compiled binary | VFS for embedded skills | Require source checkout | `soul` can be distributed as single Bun binary with all skills embedded |

## Known Issues

- Skill discovery relies on filesystem walk — compiled binary uses VFS (virtual filesystem) which must be regenerated after adding skills
- `detectInstalledAgents()` checks for Claude Code, Codex, Gemini, etc. config dirs — may false-positive on empty dirs
- `initWindsurf` / `initAmazonQ` require mcp-remote bridge — extra dependency for Tier 3 platforms

## Patterns

- **SKILL.md convention**: Every skill is a directory with `SKILL.md` (instructions) + optional `scripts/` (helper scripts in TypeScript/Python). YAML frontmatter defines name, description, trigger patterns, tier.
- **Profile composition**: `standard = seed + [additional skills]`, `full = standard + [more]`. Features (`+soul`, `+memory`) are orthogonal add-ons.
- **Global installer**: `soul-install-all` iterates `~/repos/**` directories, runs `soul install --profile standard` in each. Idempotent — safe to re-run.

## See Also

- [my-ai-soul-mcp](my-ai-soul-mcp.md) — `soul init` configures MCP connection to this memory server
- [prp-framework](prp-framework.md) — PRP adapters complementary to soul skills; separate install via `prp-install-all`
- [soul-orchestra](soul-orchestra.md) — agent definitions reference skill profiles
