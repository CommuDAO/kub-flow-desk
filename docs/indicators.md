# Indicators and quotes: what is computed, and what is not

## Indicators — computed here

All values come from `kub_candles` for the selected timeframe and are calculated
in the browser from the same bars the rest of the page uses, so an indicator
reading reconciles with the slippage, sweep and taker panels rather than with a
third-party feed.

| Indicator | Period | Reported as |
| --- | --- | --- |
| RSI | 14 (Wilder) | value, and whether it sits above 70 or below 30 |
| MACD | 12 / 26 / 9 | line, and which side of the signal |
| Stochastic | %K 14, %D 3 | value, and whether above 80 or below 20 |
| CCI | 20 | value, and whether beyond ±100 |
| Williams %R | 14 | value, and whether above −20 or below −80 |
| ATR | 14 | value, in THB |
| Bollinger | 20, 2σ | upper, lower, and where price sits |
| SMA / EMA | 10, 20, 50 | value, and whether price is above or below |

Each row shows **how many bars were available**. An indicator whose period
exceeds the bars collected reads "not enough bars" and is never estimated.
Collection began 2026-09-19, so the long periods and the 4h / 1d timeframes stay
unavailable for a while yet. That is the honest state, not a bug.

There is no single buy / sell score. Reporting that RSI reads 72 and sits above
the conventional 70 line is a measurement; compressing a dozen indicators into
one number is a different kind of claim, and this table does not make it.

A TradingView technicals widget was tried here briefly and removed. Its values
have years of history behind them, but it carries their aggregated gauge, and
the page reads better with numbers it can account for itself.

## The DEX table quotes single pools

Each venue is priced with one direct `eth_call`: `getAmountsOut` for the V2
forks, `quoteExactInputSingle` on QuoterV2 for the V3 ones, which tries all four
fee tiers and keeps the best. No third-party API is involved.

**Junoswap's row is a floor, not its best price.** Junoswap on Bitkub Chain is a
standard Uniswap V3 deployment:

| | |
| --- | --- |
| Factory | `0x090C6E5fF29251B1eF9EC31605Bdd13351eA316C` |
| QuoterV2 | `0xCB0c6E78519f6B4c1b9623e602E831dEf0f5ff7f` |
| SwapRouter02 | `0x3F7582E36843FF79F173c7DC19f517832496f2D8` |

(from `junoswap-labs/v3-deploy`, `state/bkc-state.json`)

There is **no aggregator contract** in that set. Route selection and splitting a
trade across several pools happen off-chain in their router code, and the result
is executed through SwapRouter02. So no single `eth_call` returns the number
their UI shows.

QuoterV2 does expose `quoteExactInput(bytes path, uint256 amountIn)`, which
prices a multi-hop path, so the quoting primitive exists. What does not exist
on-chain is the part that decides *which* pools and *what fraction* to each —
reproducing that means reproducing their routing algorithm, and a home-grown
approximation of it would disagree with their UI and be worse than admitting the
gap. The route set should come from the SDK instead.

Kublerx returns nothing because it has no KKUB/KUSDT pool at all — all four fee
tiers revert. That blank is a finding, not a missing measurement.

## The Telegram alert

`kub_alert_text()` reports measured numbers only — no rating, no forecast. It is
unaffected by anything on this page.
