---
title: OpenClaw Services
type: wiki
status: active
updated: 2026-05-26
tags: [wiki, services, infrastructure]
---

# OpenClaw Services

## Core Services

| Service | Port | Path | Status |
|---------|------|------|--------|
| **openclaw** | 18789 | `/usr/bin/openclaw` | Active |
| **openclaw-gateway** | 18789/18791/18792 | user systemd | Active |
| **nginx** | 80/443 | system systemd — reverse proxy | Active |

## Memory & Knowledge

| Service | Port | Path | Status |
|---------|------|------|--------|
| **psak-soul-mcp** | 8000 | `~/repos/memory/my-ai-soul-mcp` | Active |
| **oracle-v3** | 47778 | `~/repos/memory/arra-oracle-v3` — MCP via `mysoul.goko.digital/oracle-mcp` | Active |

## Agent Infrastructure

| Service | Port | Path | Status |
|---------|------|------|--------|
| **soul-orchestra** | — | `~/repos/agents/soul-orchestra` — 10 scores on cron | Active |
| **soul-orchestra-dashboard** | 8086 | https://orchestra.goko.digital (basic auth) | Active |
| **tmux-dash** | 8088 | https://tmux-dash.goko.digital (basic auth) | Active |
| **claude-telegram-bot** | — | systemd user service, Restart=always | Active |
| **dora-telegram-bot** | — | `~/repos/bots/cat-dance-teacher` | Active |

## Web Terminals

| Service | Port | Path | Status |
|---------|------|------|--------|
| **ttyd** | 7681 | user systemd — web terminal | Active |
| **codewebway** | 8090 | `~/CodeWebway` | Active |

## Observability

| Service | Scope | Status |
|---------|-------|--------|
| **Sentry** | clienta.ai API + Web | Active |
| **Grafana Cloud** | App metrics (15s) + VPS metrics (60s) | Active |
| **Grafana Alerts** | 7 VPS + 4 App rules → Telegram | Active |
| **Grafana Alloy** | VPS resource metrics push 60s | Active |
| **UptimeRobot** | 5 monitors (api/web/landing) | Active |
| **auto-ops** | 31 services health check | Active |
| **infra-health-check** | Sentry + Grafana + UptimeRobot (4h) | Active |

## Trading & Automation

| Service | Port | Path | Status |
|---------|------|------|--------|
| **tv-webhook-settrade** | 8700 | `~/tv-webhook-settrade` | Active |
| **sniper-options** | — | `~/repos/trading/sniper-s50` | Inactive |

## Access Methods

1. **SSH Direct**: `ssh -i id_ed25519 openclaw@103.245.164.27`
2. **SSH via Root**: `ssh -i id_ed25519 root@103.245.164.27` then `su - openclaw`
3. **CodeWebway**: `http://103.245.164.27:8090`
