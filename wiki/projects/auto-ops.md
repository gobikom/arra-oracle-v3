---
title: Auto-Ops
type: wiki
status: active
updated: 2026-05-09
oracle_entries: 18
sources:
  - https://github.com/gobikom/auto-ops
project: github.com/gobikom/auto-ops
tags: [wiki, auto-ops]
---

# Auto-Ops

## Overview

Autonomous server watchdog daemon for the OpenClaw VPS (103.245.164.27). Runs health checks every 60 seconds via cron, auto-restarts failed services via systemd, and sends Telegram alerts on failure/recovery. Includes Claude AI-powered auto-diagnosis for complex incidents. Monitors 24 services across systemd, Docker, HTTP, process, and cron-heartbeat check types.

All 7 implementation phases complete: from basic systemd hardening through SaaS monitoring and incident memory integration.

## Architecture

```
auto-ops/
├── watchdog.py          # Main health check daemon (cron every 60s)
├── services.yml         # Service registry (critical flag, checker type, thresholds)
├── .state/              # Persistent state (JSON, atomic os.replace() writes)
├── scripts/
│   ├── deploy.sh       # Deploy services.yml changes
│   └── diagnose.sh     # Claude AI auto-diagnosis entry point
├── bin/
│   ├── ops             # Service management CLI (status, logs, restart)
│   ├── auto-ops        # Health check entry point
│   └── safe-merge      # CI-gated PR merge wrapper
└── tests/
```

**Checker types:**

| Type | How | Example |
|------|-----|---------|
| `systemd-user` | `systemctl --user status` | psak-soul-mcp, claude-telegram-bot |
| `systemd-system` | `systemctl status` (root) | nginx |
| `http` | HTTP GET + expected_status | Supabase, Railway, clienta.ai endpoints |
| `process` | `pgrep` pattern match | bun processes |
| `docker-container` | `docker inspect` (Running + Health) | compose-managed containers |
| `cron-heartbeat` | Timestamp file freshness check | soul-orchestra scores |

**Safety features:**
- Crash loop detection: repeated failures → stop restart attempts + escalate
- Telegram dedup: same alert not re-sent within cooldown window
- State persistence: `.state/` directory survives reboots (not /tmp)
- Atomic writes: `os.replace()` for state files (last-writer-wins under concurrent cron)

## Key Decisions

| Decision | Chosen | Rejected | Why |
|----------|--------|----------|-----|
| Runtime | Python 3.11 + cron | Go binary / systemd timer | Python writes fast, libraries available, no compile step |
| Config | YAML (services.yml) | JSON / TOML | Human-readable, supports comments, Python yaml module |
| State | JSON files (.state/) | SQLite / Redis | Simple, no dependency, 60s interval doesn't need high perf |
| Notification | Telegram Bot API | Slack / PagerDuty | Team uses Telegram, bot already exists (@gobikom_bot) |
| Docker check | `docker inspect` | HTTP probe / process grep | Direct State.Running + Health.Status, covers compose containers |
| URL probe | `expected_status: 401` | basic-auth bypass | Proves full stack (DNS+TLS+nginx+upstream) without storing creds |

## Known Issues

- Concurrent cron writes use atomic `os.replace()` but are still last-writer-wins — no locking
- `systemctl --user` requires `XDG_RUNTIME_DIR` when running as root for openclaw user
- Telegram plugin path pattern (`bun.*\.claude/plugins/.*telegram`) must stay in sync across ops repo and auto-ops (tagged `claude-plugin-path` concept)
- Log fallback: any best-effort logger that catches OSError must fall back to stderr, not pass silently

## Patterns

- **CHECKERS pattern**: New service types plug into `services.yml` with a `type:` field — watchdog dispatches to the matching checker implementation. Used for docker-container and http types.
- **Cross-repo pattern consistency**: Telegram process detection regex shared between ops/ shell scripts and auto-ops/ Python — any change must update both.
- **Actuator loop**: Detection → diagnosis → action → verify. Disk auto-cleanup is the first actuator (PR #14).

## See Also

- [soul-orchestra](soul-orchestra.md) — infra-health-check score runs watchdog as part of its DAG
- [oracle-v3](oracle-v3.md) — incident memory stored via Oracle for pattern learning
