---
title: BTC Trend Hunter
type: wiki
status: archived
updated: 2026-06-12
oracle_entries: 4
sources:
  - https://github.com/gobikom/btc-trend-hunter
project: github.com/gobikom/btc-trend-hunter
tags: [wiki, btc-trend-hunter, trading, crypto]
---

# BTC Trend Hunter

## Overview

BTC Futures scalping bot for Binance (5x leverage, configurable via `LEVERAGE` env var). Uses Order Book Imbalance + Technical Indicators (EMA, Stochastic, Bollinger Bands) for automated 24/7 scalping. **Status: archived** after an offline circuit-breaker incident with no explicit active owner. Recovery requires a new named owner and SLA acceptance.

Includes backtesting framework with parameter sweep + walk-forward, web dashboard (FastAPI) for real-time monitoring, and trade analytics via SQLite.

## Architecture

```
btc-trend-hunter/
├── main.py                    # Entry point — live trading loop
├── backtest.py                # Backtest engine (param sweep, walk-forward)
├── strategies/
│   ├── scalper.py            # Order Book Imbalance + EMA/Stochastic/BB
│   └── trend_filter.py       # Multi-timeframe trend filter (4H/1H)
├── dashboard/
│   ├── app.py                # FastAPI web dashboard
│   ├── templates/            # Jinja2 real-time monitoring UI
│   └── static/               # Chart.js visualizations
├── scripts/
│   ├── optimize.py           # Parameter sweep automation
│   └── analytics.py          # Trade history analysis
├── tests/                     # Test suite (backtest tests present, main.py tests missing)
├── data/                      # Historical OHLCV data
├── logs/                      # Trade logs
├── docs/
│   └── operations/
│       ├── bot-lifecycle-status.md  # Current operational disposition
│       ├── re-enable-runbook.md     # Recovery procedure (owner + SLA required)
│       └── archive-runbook.md       # Archive procedure + host verification
└── .env.example               # Config template (API keys, leverage, thresholds)
```

**Signal pipeline:**
1. Fetch order book → compute bid/ask imbalance ratio
2. Apply EMA crossover + Stochastic + Bollinger Band filters
3. Multi-timeframe trend confirmation (4H/1H)
4. ATR-based Stop Loss + Take Profit calculation
5. Execute trade → Telegram notification → SQLite log

**Trade protection:**
- Cooldown period between trades
- Circuit breaker: consecutive losses → auto-pause
- Daily loss limit: hard stop on cumulative loss
- Graceful shutdown: optional position closing on SIGTERM

## Key Decisions

| Decision | Chosen | Rejected | Why |
|----------|--------|----------|-----|
| Exchange | Binance Futures | FTX / Bybit | Liquidity, API stability, lowest fees at volume |
| Strategy | Order Book Imbalance + TA | Pure TA / Pure ML | OBI captures real-time supply/demand; TA filters noise |
| Dashboard | FastAPI + Jinja2 | Grafana / React | Lightweight, same-process, no separate build step |
| Analytics | SQLite | PostgreSQL / InfluxDB | Single-file, zero config, adequate for single-bot trades |
| Risk | Circuit breaker + daily limit | Position sizing only | Leverage amplifies drawdown; hard limits essential |

## Known Issues

- **ARCHIVED**: No active owner — recovery requires named owner accepting SLA
- `main.py` has no unit tests — only backtest tests exist
- Tick-level backtesting not available (bar-level only) — may miss micro-structure signals
- Trailing stop, dynamic leverage, partial TP available but disabled by default

## Patterns

- **Lifecycle management**: `docs/operations/bot-lifecycle-status.md` tracks state transitions (active → paused → archived). Re-enable runbook requires explicit owner acceptance.
- **Circuit breaker**: Consecutive loss counter → threshold → auto-pause + Telegram escalation. Prevents tilt-trading in volatile markets.

## See Also

- [sniper-s50](sniper-s50.md) — sister trading bot for TFEX S50 (active, options focus)
