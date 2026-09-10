---
title: Sniper S50
type: wiki
status: active
updated: 2026-09-10
oracle_entries: 19
sources:
  - https://github.com/gobikom/sniper-s50
project: github.com/gobikom/sniper-s50
tags: [wiki, sniper-s50, trading, tfex]
---





# Sniper S50

## Code Structure (auto — CK, refreshed 2026-08-01)

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
| Futures SL (#133, PR #141) | Frozen per position at first sight (keyed symbol/avg/volume); provisional while ATR warms up | Recompute from live ATR every poll | Live ATR moved the stop every 10 s; a stop is a decision, not a signal |
| Futures trailing thresholds (#134, PR #144) | break_even_r 0.8 / trail_start_r 1.1, derived from the implied R the config can reach (≈1.35 at S50 1080; runner recomputes the minimum) — **configured but futures trailing stays `enabled: false`** until re-validated after #138 | Keep 2.0R | 2.0R was unreachable: implied R is fixed by tp_pct / reference_atr / sl.atr_mult |
| Structure TP gate (#135, PR #142) | `min_atr_distance` 0 — the wall always caps, `rr_filter` is the single gate (structure TP requires rr_filter on) | Ignore close walls | Ignoring close walls inverted the R:R filter |
| Exit after an exchange stop (#147, PR #148) | O001 / "Closable Position[0]" are TRIGGERS; reconcile only on evidence (own close matched → late_fill; tracked stop matched → exchange_stop; flat ×3 + age ≥120 s → closed_externally), else restore + re-arm | Restore every bar / trust the rejection text | Text-matching abandoned unsettled positions and re-recorded the same trade every bar |
| Tests vs production journal (PR #146) | `resolve_db_path()` + refusal under pytest + autouse tmp redirect + session tripwire | Trust callers to pass db_path | pytest truncated the live `data/trades.db` (2026-09-09 02:02); 127 rows recovered by page walk |
| Futures monitor over the lunch break (#138, PR #149) | Sleep 12:30–13:45 (bounds from `sniper.constants`), distrust ATR for atr_period bars after reopen (SL provisional, TP static), 60 s back-off after a rejected close | Keep polling / hardcode 14:30 | Flat lunch bars collapse the 4-bar ATR; the first hardcoded bound (14:30) was wrong — TFEX reopens 13:45 |
| Structure TP context (#140, PR #151) | Inject `ContextExtractor` into the runner; fail-closed on stale/missing snapshot spot or age (1 % + ½ strike, 120 min; `extract()` measures age against now) | Borrow the signal generator's private `_extractor` | In `--ai-shadow` the live generator is ORB → structure TP was inert for two trading days; snapshot age had always been 0.0 |
| Entry order not filled in 120 s (#139, PR #150) | Cancel; O001 → evidence → adopt the fill with SL/TP; unresolved → block new entries, retry every 60 s, sweep at EOD/stop; verified market close for orphan lots on exit | Keep the order live (Day validity) and re-enter | Five stacked entry orders on 09-08 filled hours later with no SL/TP |
| Entry re-attempt policy (#153, PR #154) | 2 attempts per direction (2nd at ask + 1 tick, cap +2 %), block until a real opposite order / new day, 6 attempts/day, quota 5 counted on fill, `entry_events` ledger re-seeded at start (counters, per-direction attempts/blocks and the attempt-1 retry anchor since PR #158) | Chase every bar / never re-enter | 3 fills vs 14 timeouts in a week; per-direction cap alone allowed 27 orders on a whipsaw day (found in review) |
| Restart vs warm-up replay (#157, PR #158) | Seed from the journal at `__init__` and **re-seed after warm-up**; day reset in `on_bar` is forward-only and a bar older than the tracked range day is dropped before it can touch range, counters or ATR; a retry with no attempt-1 anchor is skipped and counted (`no_anchor`), never bought at the ask; pages on a backwards bar date (non-blocking: exits still run on the bid, EOD force-close on the wall clock), on stale-bar streaks/daily totals and on recovery | Seed only after warm-up / let replay reset as before | First live day of the #153 code (2026-09-10): the 200-bar warm-up replay ran through `on_bar` and zeroed the seed, and `_warm_up` also reset trade_count — a mid-day restart would have got a fresh 6/5 budget; review then found the dropped stale bar still inflated ATR (SL/TP) and that a price-less attempt-1 row sent the retry to the raw ask |

## Known Issues

- Max 1 contract per trade — multi-contract support not yet implemented
- Options chain snapshots require systemd timer configured on server — not portable
- [RESOLVED 2026-08-26] Phase 5 futures live trading shipped: intraday TP monitor (PR #118), EOD sweep closes all positions (PR #116), ATR-based dynamic TP (PR #124)
- [RESOLVED 2026-09-09] Backlog burn-down: #133 SL freeze (PR #141), #135 structure TP gate (PR #142), #134 trailing thresholds 0.8R/1.1R (PR #144 — thresholds only; futures trailing itself remains `enabled: false`), #147 exit reconciliation (PR #148), trades.db incident + test isolation (PR #146; 127 rows recovered, deduped to 42 real positions), #138 intermission/ATR taint + floor 1.0 (PR #149), #140 structure TP wiring + staleness (PR #151), #139 entry-order orphans (PR #150), #153 attempt budget + ledger (PR #154). Code effective from the 2026-09-10 09:40 service start.
- Open residuals (details in the repo's PROJECT.md gotchas): pending-order/orphan state is in-memory across restarts (daily counters, per-direction attempts/blocks and the retry anchor are re-seeded from `entry_events` since PR #158 — under a single-writer assumption: another live strategy writing the same ledger would feed the counters conservatively but the anchor permissively; replay order is `ORDER BY id`, at worst one attempt off under a rare fill/timeout thread race, bounded by the daily cap); `_eod_verify_broker_flat` places its own closes outside the `_orphan_close_order_nos` bookkeeping (pre-existing — a duplicate close is possible if an earlier close has not filled); the deploy-day fill floor counts every non-`-dry` strategy in `trades`; snapshot CSV written in place (mtime-ordered reader can see a partial file); `ContextExtractor` reads the whole sentix log twice per signal; `extract_from()` (backtest path) defaults snapshot age to 0 — callers must pass `reference_time` for age guards to apply.

## Patterns

- **Strategy plugin**: Each strategy is a standalone module in `sniper/strategies/` with consistent interface (signal, entry, exit). Backtester dispatches by strategy name.
- **Walk-forward validation**: Train on N periods → test on N+1 → slide forward. Prevents overfitting to historical data.
- **THB-denominated reporting**: All P&L in Thai Baht (not ticks/points). Matches real trading account.
- **Futures TP monitor**: Daemon thread `_futures_monitor_loop()` polls `get_portfolio()` for futures positions, compares unrealized P&L against configurable threshold, auto-closes via market order when TP hit. Runs alongside options trading.
- **EOD sweep**: Config flag `sessions.eod_close_all_positions` (default True) closes ALL positions (options + futures) at EOD, not just options. Safety net for forgotten positions.
- **ATR-based dynamic TP**: Scales futures TP threshold with market volatility using ATR from daily OHLCV. High-vol days get wider TP (±0.7 ATR), low-vol days tighter (±0.3 ATR). Eliminates fixed-threshold whipsaws.
- **Evidence-based order reconciliation**: a broker rejection string is a trigger to look (portfolio first — it lags the order API — then order matchQty/status), never a conclusion; an order whose state cannot be confirmed is "unresolved" (block, retry, page), never assumed flat. Applies to exits (#147) and entries (#139).
- **Risk budget with a durable ledger**: every entry-order outcome is a row (`entry_events`: counted_attempt, dry_run); in-memory counters are re-seeded from it at start so a restart cannot reset the day's budget; a global daily cap backs any per-direction budget (opposite-side signals must not reset it). Any "restore state at startup" step must run AFTER every replay/warm-up that mutates the same state, and the test must pin the ordering, not just the call (#157); restore companion state together (an attempt count without its price anchor recreates a "cannot happen" branch — fail closed there: skip and count, never pay an unbounded price).
- **Everything that silences the bot pages**: blocked direction, daily cap, premium ran away, hook failures, ledger/seed failures, config guards effectively off — with alert-once keys per cause so a benign page cannot mask a severe one.
- **Review/test hygiene**: never run tests in the live checkout during market hours (scratchpad worktrees); a script-applied patch can silently re-scope code via indentation — keep an entrypoint smoke test; a scripted test insertion that replaces an anchor `def` line must re-append it — compare `def test_` counts against main after every insertion (learned during the #158 review, caught before commit); an early-return guard belongs before EVERY side effect in the function (the ATR update sat above the stale-bar guard for two rounds); tests must not be able to page Telegram (conftest guard blanks the notify module constants and mocks the transport); rtk rewrites `ruff`/`diff`/`pytest` output — use `rtk proxy` and compare multisets in Python for parity gates.

## See Also

- [btc-trend-hunter](btc-trend-hunter.md) — sister trading bot for BTC futures (archived)
