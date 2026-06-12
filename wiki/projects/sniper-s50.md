---
title: Sniper S50
type: wiki
status: active
updated: 2026-06-12
oracle_entries: 6
sources:
  - https://github.com/gobikom/sniper-s50
project: github.com/gobikom/sniper-s50
tags: [wiki, sniper-s50, trading, tfex]
---

# Sniper S50

## Overview

Full-auto TFEX S50 day trade bot — backtesting engine + options trading via Settrade API. Target: +400 THB/contract/day. Production bot runs Monday-Friday 09:40-16:50 BKK via systemd timer (configured on server, not in repo). 7+ strategies including ORB-ATR, 3EMA+RSI, BOL, VRB, and ORB+BOL Combo.

Two modules: **futures backtesting** (data pipeline + strategy engine + walk-forward validation) and **options live trading** (ATM/OTM strike selection, MQTT real-time feeds, Black-Scholes pricing).

## Architecture

```
sniper-s50/
├── sniper/
│   ├── strategies/           # Strategy implementations
│   │   ├── orb_atr.py       # Opening Range Breakout + ATR
│   │   ├── ema3_rsi.py      # 3-EMA crossover + RSI filter
│   │   ├── bollinger.py     # Bollinger Bands
│   │   ├── vrb.py           # Volume Range Breakout
│   │   └── orb_bol_combo.py # ORB + BOL composite
│   ├── backtesting.py        # Backtest engine (run, optimize, walk-forward)
│   ├── risk_manager.py       # Daily loss limit, max trades, circuit breaker
│   ├── data_pipeline.py      # Download S50 OHLCV from TradingView + clean/validate
│   └── broker/
│       └── settrade.py       # Settrade broker integration (orders, MQTT, options)
├── scripts/
│   ├── backtest_*.py         # Strategy-specific backtest runners (7+ scripts)
│   ├── options_live.py       # Live options trading (AUTO mode)
│   ├── options_scraper.py    # Options chain snapshot collector
│   ├── liquidity_analyzer.py # Liquidity scoring for tradability assessment
│   └── download_s50.py       # CLI entry point for data download
├── config/
│   ├── strategies.yml        # Strategy parameters + risk thresholds
│   └── broker.yml            # Settrade API credentials reference
├── data/                     # OHLCV data files, options chain snapshots
├── logs/                     # Rotating log file (10 MB × 5 backups)
├── docs/                     # Strategy documentation, performance reports
└── pyproject.toml            # name: sniper-s50, v0.1.0
```

**Data flow:**
1. `data_pipeline.py` → download S50 OHLCV from TradingView → clean/validate → `data/`
2. `backtesting.py` → load data → apply strategy → walk-forward validation → THB-denominated P&L
3. `options_live.py` → Settrade MQTT subscribe → strategy signal → ATM/OTM strike select → place order → Telegram alert

**Options module:**
- Scraper: collects options chain snapshots (systemd timer on server)
- Pricing: Black-Scholes model for fair value
- Live trading: AUTO mode with ATM/OTM strike selection
- Liquidity analyzer: tradability scoring before order placement

## Key Decisions

| Decision | Chosen | Rejected | Why |
|----------|--------|----------|-----|
| Data source | TradingView OHLCV | Settrade API direct | TradingView has clean historical data; Settrade API is for live |
| Backtesting | Walk-forward validation | Simple train/test split | Walk-forward prevents overfitting; validates on unseen periods |
| Risk mgmt | Circuit breaker + daily loss limit | Position sizing only | Day trading needs hard stops; circuit breaker prevents tilt trading |
| Notifications | Telegram | Email / LINE | Real-time alerts on mobile; team already uses Telegram |
| Logging | Persistent rotating files | journald only | 10 MB × 5 backups supplements journald for cross-session debugging |

## Known Issues

- Max 1 contract per trade — multi-contract support not yet implemented
- Phase 5 (Bot Controller for futures) pending — currently options-only for live trading
- Options chain snapshots require systemd timer configured on server — not portable

## Patterns

- **Strategy plugin**: Each strategy is a standalone module in `sniper/strategies/` with consistent interface (signal, entry, exit). Backtester dispatches by strategy name.
- **Walk-forward validation**: Train on N periods → test on N+1 → slide forward. Prevents overfitting to historical data.
- **THB-denominated reporting**: All P&L in Thai Baht (not ticks/points). Matches real trading account.

## See Also

- [btc-trend-hunter](btc-trend-hunter.md) — sister trading bot for BTC futures (archived)
