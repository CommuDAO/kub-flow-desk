# Indicators: what is computed, and what is deliberately not

## Computed

All values come from `kub_candles` for the selected timeframe and are calculated
in the browser from the same bars the chart draws, so the number under the chart
always matches the chart.

| Indicator | Period | Reported as |
| --- | --- | --- |
| RSI | 14 (Wilder) | value, and whether it sits above 70 or below 30 |
| MACD | 12 / 26 / 9 | line, signal, histogram, and which side of the signal |
| Stochastic | %K 14, %D 3 | values, and whether above 80 or below 20 |
| CCI | 20 | value, and whether beyond ±100 |
| Williams %R | 14 | value, and whether above −20 or below −80 |
| ATR | 14 | value, in THB |
| Bollinger | 20, 2σ | upper, middle, lower, and where price sits |
| SMA / EMA | 10, 20, 50 | value, and whether price is above or below |

Each row also shows **how many bars were available**. An indicator whose period
exceeds the bars collected is shown as unavailable, never estimated.

## Deliberately not computed

No aggregated **Strong Buy / Buy / Neutral / Sell / Strong Sell** verdict.

That label is a trading recommendation, not a measurement. Listing what RSI
reads and where it sits against a conventional threshold is a statement of fact;
collapsing twelve indicators into one instruction to trade is not. This project
reports data — that rule is printed on every Telegram message it sends, and the
web page follows it too.

## Why daily candles are thin

Collection began 2026-09-19. A 14-period RSI on daily bars needs about a month of
history before it means anything. Timeframes without enough bars are disabled in
the UI with the date they become usable, rather than drawn from two candles.
