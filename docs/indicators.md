# Indicators: where they come from

## TradingView's widget, not our own maths

The technicals panel is TradingView's `embed-widget-technical-analysis` on
`BITKUB:KUBTHB`. RSI, MACD, Stochastic, CCI, Williams %R, ATR, Bollinger, the
moving averages and the aggregated **Strong Buy / Buy / Neutral / Sell /
Strong Sell** gauge are all computed by TradingView from Bitkub's own feed and
rendered by their script. The page passes three things: the symbol, the
interval (from the timeframe selector) and the locale.

### Why the widget rather than the page

Two reasons, and only one of them is about effort.

1. **History.** Collection began 2026-09-19. A 14-period RSI on daily bars needs
   roughly a month before it means anything, and a 50-period EMA considerably
   longer. Our own table spent most of its rows saying "not enough bars" and
   would have kept doing so for weeks. TradingView has years.
2. **Scraping `tradingview.com/symbols/KUBTHB/technicals/` is not an option.**
   The numbers there are rendered client-side from their private feed, and
   lifting them into our own table would strip the attribution off values that
   are theirs. The widget is the supported way to show them, it names them, and
   it refreshes itself.

### What the widget brings with it

The aggregated gauge is a trading recommendation, not a measurement. It stays
labelled as TradingView's rating, under their name, in its own panel. The page
does not compute one, restate one, or act as though the gauge is its own
reading — and the footer no longer claims the page reports data only, because
with this panel on it that would not be true. `Not investment advice` stays.

## What is still measured here

Everything below the technicals panel, and it is the part TradingView cannot
see: the live order book walked level by level for real execution cost, the
same cost tracked hour over hour, sweeps that cleared three or more levels,
which side crossed the spread, five-DEX on-chain quotes by direct `eth_call`,
41 treasury balances, and the collector's own health log.

## The Telegram alert is unchanged

`kub_alert_text()` still reports measured numbers only. No rating, no forecast.
The widget lives on the web page; it is not in the message.
