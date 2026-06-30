---
title: Auto-Ops
type: wiki
status: active
updated: 2026-06-30
oracle_entries: 20
sources:
  - https://github.com/gobikom/auto-ops
project: github.com/gobikom/auto-ops
tags: [wiki, auto-ops]
---



# Auto-Ops

## Code Structure (auto — CK, refreshed 2026-06-30)

- tests: 32 classes, 156 functions
- .: 57 functions

## Entry Points (auto — CK)

- main `def main()` — watchdog.py (24 connections)
- load_state `def load_state(path: Path = STATE_FILE) -> dict` — watchdog.py (14 connections)
- save_state `def save_state( results: list[dict], path: Path = STATE_FILE, previous_state: dict | None = None ) -> dict` — watchdog.py (14 connections)
- save_incident `def save_incident(text: str, category: str = "code", project: str = "auto-ops") -> bool` — incident_memory.py (14 connections)
- detect_transitions `def detect_transitions( previous: dict, results: list[dict] ) -> list[dict]` — watchdog.py (13 connections)
- run_pre_restart_cmd `def run_pre_restart_cmd(svc_name: str, pre_restart_cmd: str, timeout: int = 10) -> str` — watchdog.py (11 connections)
- check_cron_heartbeat `def check_cron_heartbeat(svc: dict) -> dict` — watchdog.py (11 connections)
- check_service `def check_service(svc: dict, dry_run: bool = False) -> dict` — watchdog.py (11 connections)
- query_incidents `def query_incidents( query: str, limit: int = 5, category: str | None = None, project: str = "auto-ops", ) -> list[dict]` — incident_memory.py (11 connections)
- check_memory `def check_memory(svc: dict) -> dict` — watchdog.py (10 connections)

## Hotspots (auto — CK)

- `tests/test_watchdog.py` — 112 connections, change_freq=7
- `watchdog.py` — 55 connections, change_freq=21
- `tests/test_market_hours.py` — 44 connections, change_freq=1
- `tests/test_incident_memory.py` — 31 connections, change_freq=1
- `watchdog.py` — 24 connections, change_freq=0

## Overview

Autonomous server watchdog daemon for the OpenClaw VPS (103.245.164.27). Runs health checks every 60 seconds via cron, auto-restarts failed services via systemd, and sends Telegram alerts on failure/recovery. Includes Claude AI-powered auto-diagnosis for complex incidents. Monitors 24 services across systemd, Docker, HTTP, process, and cron-heartbeat check types. Includes memory (RAM + swap) monitoring via /proc/meminfo.

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
- checkpoint-watchdog.sh creates duplicate stale-checkpoint issues when segment state file has no last_checkpoint field (task never checkpointed). Root cause: script checks mtime instead of YAML last_checkpoint value. Fix: read last_checkpoint from inside current.yaml (2026-06-20)

## Patterns

- **CHECKERS pattern**: New service types plug into `services.yml` with a `type:` field — watchdog dispatches to the matching checker implementation. Used for docker-container and http types.
- **Cross-repo pattern consistency**: Telegram process detection regex shared between ops/ shell scripts and auto-ops/ Python — any change must update both.
- **Actuator loop**: Detection → diagnosis → action → verify. Disk auto-cleanup is the first actuator (PR #14).
- **Memory monitoring via /proc/meminfo**: `check_memory()` reads MemTotal, MemAvailable, SwapTotal, SwapFree from /proc/meminfo. Alerts on RAM usage above threshold and swap usage above threshold. Added via PR #39 (2026-05-21).

## See Also

- [soul-orchestra](soul-orchestra.md) — infra-health-check score runs watchdog as part of its DAG
- [oracle-v3](oracle-v3.md) — incident memory stored via Oracle for pattern learning
