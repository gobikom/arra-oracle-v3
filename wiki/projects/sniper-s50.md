---
title: Sniper S50
type: wiki
status: active
updated: 2026-07-01
oracle_entries: 6
sources:
  - https://github.com/gobikom/sniper-s50
project: github.com/gobikom/sniper-s50
tags: [wiki, sniper-s50, trading, tfex]
---





# Sniper S50

## Code Structure (auto — CK, refreshed 2026-07-01)

- tests/strategy: 115 classes, 417 functions
- tests/options: 50 classes, 361 functions
- sniper/options: 39 classes, 154 functions
- sniper/strategy: 16 classes, 130 functions
- scripts: 137 functions
- tests/ai: 23 classes, 109 functions
- tests/broker: 27 classes, 82 functions
- tests/risk: 11 classes, 61 functions
- tests/features: 8 classes, 47 functions
- sniper/ai: 15 classes, 35 functions
- sniper/broker: 13 classes, 31 functions
- sniper/features: 4 classes, 20 functions
- tests/data: 2 classes, 19 functions
- tests/db: 4 classes, 12 functions
- sniper/risk: 2 classes, 12 functions

## Entry Points (auto — CK)

- ContextExtractor `class ContextExtractor` — sniper/features/context.py (35 connections)
- load_s50 `def load_s50( filepath: str | Path | None = None, clean_dir: str | Path | None = None, start_date: str | None = None, end_date: str | None = None, ) -> pd.DataFrame` — sniper/data/loader.py (30 connections)
- LiquidityAnalyzer `class LiquidityAnalyzer` — sniper/options/liquidity.py (21 connections)
- run_backtest `def run_backtest( df: pd.DataFrame, strategy_class: type[Strategy] | None = None, config: dict | None = None, risk_managed: bool = False, ) -> pd.Series` — sniper/strategy/backtest.py (20 connections)
- trigger_trading_agent `def trigger_trading_agent( context_path: str | Path = _DEFAULT_CONTEXT_PATH, confidence: int = 0, reason: str = "", agent_dir: str | Path = _DEFAULT_AGENT_DIR, timeout: int = _TIMEOUT_SECS, ) -> bool` — sniper/ai/trigger.py (19 connections)
- OptionsOrderManager `class OptionsOrderManager` — sniper/options/strategy/order_manager.py (18 connections)
- main `def main(argv: list[str] | None = None) -> None` — sniper/options/__main__.py (17 connections)
- notify `def notify(message: str) -> bool` — sniper/notify.py (17 connections)
- StrikeSelector `class StrikeSelector` — sniper/options/strategy/strike_selector.py (16 connections)
- get_active_s50_symbol `def get_active_s50_symbol(ref_date: date | datetime | None = None) -> str` — sniper/broker/symbols.py (16 connections)

## Hotspots (auto — CK)

- `tests/strategy/test_backtest.py` — 91 connections, change_freq=0
- `tests/strategy/test_ema3_rsi.py` — 78 connections, change_freq=0
- `tests/strategy/test_new_strategies.py` — 75 connections, change_freq=0
- `tests/risk/test_manager.py` — 75 connections, change_freq=0
- `tests/options/strategy/test_live.py` — 68 connections, change_freq=12

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
