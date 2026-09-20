# KUB Flow Desk

Market microstructure and treasury dashboard for KUB on Bitkub, plus a five-DEX
quote comparison on KUB Chain (chainId 96).

## Architecture

```
Bitkub public API v3  ─┐
kubscan v2             ├─> pg_cron + http extension ──> Postgres (Supabase)
KUB Chain JSON-RPC    ─┘                                      │
                                                              v
                                   api/data.js, api/candles.js  (server-side, holds the key)
                                                              v
                                                        index.html
```

The browser never touches Supabase. The API routes run on Vercel, read with the
`service_role` key from an environment variable, and return aggregated JSON.
The database is never exposed publicly and RLS stays closed.

## Environment variables

| Key | Required | Where to get it |
| --- | --- | --- |
| `SUPABASE_SERVICE_KEY` | yes | Supabase → Project Settings → API → `service_role` |
| `SUPABASE_URL` | no | defaults to the `kub-whale-flow` project URL |

Until the key is set, the page renders a built-in snapshot and shows a notice.
It never renders blank.

## Collection schedule (pg_cron, UTC)

| Job | Schedule | What it does |
| --- | --- | --- |
| `kub-cex-5min` | `*/5 * * * *` | ticker, order book 60 levels, trade tape |
| `kub-chain-5min` | `*/5 * * * *` | Bitkub hot wallet transactions |
| `kub-chain-hourly` | `7 * * * *` | cold wallets, funds, stake vault |
| `kub-watch-balance-5min` | `*/5 * * * *` | 41 treasury balances, instant alert on movement |
| `kub-dex-quotes-15min` | `*/15 * * * *` | KKUB → KUSDT across 5 DEXes via batched `eth_call` |
| `kub-rollup-hourly` | `3 * * * *` | hourly OHLC, volume, taker, depth rollup |
| `kub-rollup-slippage` | `4 * * * *` | execution-cost time series |
| `kub-whales-daily` | `10 1 * * *` | top-holder snapshot |
| `kub-alert-4x` | `0 1,5,11,17 * * *` | Telegram report, 4× daily |

## Data surfaces

- `kub_candles(tf, limit)` — OHLCV from the raw tape; 1m/5m/15m/30m/1h/4h/1d,
  4h and 1d bucketed to Bangkok time
- `kub_slippage(size, side)` — walks 60 book levels for a real average fill price
- `kub_dex_best` — best quote per venue per size
- `kub_hourly` — hourly rollup including the slippage series
- `kub_watch_balance` — 41 labelled wallets
- `kub_collector_run` — every round logged, success and failure

## Notes on honesty

Windows longer than what has actually been collected are labelled or disabled,
never back-filled or approximated. Collection started 2026-09-19, so daily
candles and 7-day chain windows only become meaningful as history accumulates.

The page reports measured values. It carries no buy/sell verdict and no price
forecast.

## Languages

TH / EN / ZH, switched in the header, remembered per browser.
