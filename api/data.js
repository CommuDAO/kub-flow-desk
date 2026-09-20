import { client, missingKey, settleAll } from './_supabase.js'

const iso = (v) => (v == null ? null : new Date(v).toISOString())
const maxOf = (rows, field) => {
  let best = null
  for (const r of rows || []) {
    const t = r && r[field] ? Date.parse(r[field]) : NaN
    if (!isNaN(t) && (best === null || t > best)) best = t
  }
  return best === null ? null : new Date(best).toISOString()
}
// A day, not an instant. Anchor it to Bangkok midnight so a bare date is not
// read as UTC and shown seven hours out.
const day = (d) => (d == null ? null : new Date(`${d}T00:00:00+07:00`).toISOString())

export default async function handler(req, res) {
  if (missingKey(res)) return

  const db = client()
  const ago = (h) => new Date(Date.now() - h * 3600e3).toISOString()

  const { out, errors } = await settleAll({
    now: () => db.get('kub_signal_now?select=*'),
    taker: () => db.get('kub_signal_taker?select=*'),
    netflow: () => db.get('kub_signal_netflow?select=*'),
    slipNow: () => db.get('kub_slippage_now?select=*'),
    hourly: () =>
      db.get(
        `kub_hourly?select=hour,px_close,trade_kub,fills,taker_buy_pct,avg_spread_bps,bid_share_1pct,avg_bid_depth_1pct,avg_ask_depth_1pct,sweeps,netflow_out_kub,slip_sell_10k,slip_buy_10k,book_levels&hour=gte.${ago(36)}&order=hour.asc`
      ),
    sweeps: () =>
      db.get(
        `kub_sweep?select=ts,side,total_kub,total_thb,levels&ts=gte.${ago(30)}&total_kub=gt.200&order=ts.asc`
      ),
    dex: () => db.get('kub_dex_best?select=*'),
    runs: () => db.get(`kub_collector_run?select=job,ok&started_at=gte.${ago(24)}&limit=2000`),
    watch: () =>
      db.get(
        'kub_watch_balance?select=address,label,category,balance_kub,snapshot_at&order=snapshot_at.desc&limit=250'
      ),
    supply: () => db.get('kub_supply_now?select=*'),
    other: () => db.get('kub_top_unwatched?select=*'),
    exFlow: () => db.get('kub_exchange_flow_daily?select=*'),
    exBal: () => db.get('kub_exchange_balance?select=*'),
    chain: () => db.get('kub_chain_activity?select=*&order=day.asc'),
    chainTypes: () => db.get('kub_chain_tx_types?select=*&order=day.asc'),
    dailyOhlc: () => db.get('kub_daily_ohlc?select=day,open,high,low,close&order=day.asc'),
    candles: () => db.rpc('kub_candles', { p_tf: '15m', p_limit: 300 }),
  })

  const health = {}
  for (const r of out.runs || []) {
    const h = (health[r.job] ||= { job: r.job, runs: 0, failed: 0 })
    h.runs++
    if (r.ok === false) h.failed++
  }

  const seen = new Set()
  const treasury = []
  for (const w of out.watch || []) {
    if (seen.has(w.address)) continue
    seen.add(w.address)
    treasury.push({ label: w.label, cat: w.category, kub: Number(w.balance_kub) })
  }
  treasury.sort((a, b) => b.kub - a.kub)

  const candles = out.candles || []
  const sup = (out.supply && out.supply[0]) || null
  const exBal = (out.exBal && out.exBal[0]) || null
  const exFlow = out.exFlow || []
  // A day with neither a transaction count nor a fee total is a day the
  // backfill has not reached, not a quiet day. Drop it rather than draw a zero.
  const chain = (out.chain || []).filter((r) => r.tx_count != null || r.fees_kub != null)

  const generated = new Date().toISOString()

  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
  res.status(200).json({
    ok: errors.length === 0,
    errors,
    generated_at: generated,
    now: (out.now && out.now[0]) || null,
    taker: out.taker || [],
    netflow: out.netflow || [],
    slipNow: out.slipNow || [],
    hourly: out.hourly || [],
    sweeps: out.sweeps || [],
    dex: out.dex || [],
    health: Object.values(health).sort((a, b) => a.job.localeCompare(b.job)),
    treasury,
    supply: sup
      ? {
          as_of: iso(sup.as_of),
          total: Number(sup.total_supply_kub),
          watched: Number(sup.watched_kub),
          wallets: Number(sup.watched_wallets),
          kkub: sup.kkub_wrapper_kub == null ? null : Number(sup.kkub_wrapper_kub),
        }
      : null,
    other: (out.other || []).map((r) => ({
      rank: r.rank,
      address: r.address,
      label: r.label,
      cat: r.category,
      kub: Number(r.balance_kub),
      kkub: r.is_kkub_wrapper === true,
    })),
    exchange: {
      balance: exBal ? Number(exBal.kub) : null,
      wallets: exBal ? Number(exBal.wallets) : null,
      flow: exFlow.map((r) => ({
        day: r.day,
        in: Number(r.in_kub),
        out: Number(r.out_kub),
        net: Number(r.net_out_kub),
        in_tx: Number(r.in_tx),
        out_tx: Number(r.out_tx),
        // How far the history walk has reached, per day. A day it has not
        // reached is uncollected, not a day without flow.
        covered: r.covered === true,
      })),
      collecting_since: iso(exFlow.length ? exFlow[0].collecting_since : null),
    },
    chain: chain.map((r) => ({
      day: r.day,
      tx: r.tx_count == null ? null : Number(r.tx_count),
      fees: r.fees_kub == null ? null : Number(r.fees_kub),
      gas: r.gas_used == null ? null : Number(r.gas_used),
    })),
    // A rolling sample of validated transactions, classified by kubscan's own
    // tx_types. Not exhaustive — the page says so.
    chainTypes: (out.chainTypes || []).map((r) => ({
      day: r.day,
      native: Number(r.native_n),
      token: Number(r.token_n),
      contract: Number(r.contract_n),
      other: Number(r.other_n),
      n: Number(r.sampled_n),
    })),
    // Bitkub's own daily price history, for indicator ranges longer than the
    // on-chain tape this site has collected itself.
    dailyOhlc: (out.dailyOhlc || []).map((r) => [r.day, +r.open, +r.high, +r.low, +r.close]),
    // When each panel's data was actually read, so one stale panel beside a
    // fresh one is visible rather than assumed.
    asOf: {
      page: generated,
      price: iso(out.now && out.now[0] && out.now[0].as_of),
      book: maxOf(out.slipNow, 'snapshot_ts'),
      hourly: maxOf(out.hourly, 'hour'),
      sweeps: maxOf(out.sweeps, 'ts'),
      dex: iso(out.dex && out.dex[0] && out.dex[0].as_of),
      treasury: maxOf(out.watch, 'snapshot_at'),
      supply: iso(sup && sup.as_of),
      exchange: iso(exBal && exBal.as_of),
      chain: day(chain.length ? chain[chain.length - 1].day : null),
    },
    candles: {
      tf: '15m',
      bars: candles.length,
      candles: candles.map((r) => [r.t, +r.o, +r.h, +r.l, +r.c, +r.v, r.n]),
    },
  })
}
