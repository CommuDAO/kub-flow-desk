import { client, missingKey } from './_supabase.js'

export default async function handler(req, res) {
  if (missingKey(res)) return

  const db = client()
  const iso = (h) => new Date(Date.now() - h * 3600e3).toISOString()

  try {
    const [now, taker, netflow, slipNow, hourly, sweeps, dex, runs, watch, candles] =
      await Promise.all([
        db.get('kub_signal_now?select=*'),
        db.get('kub_signal_taker?select=*'),
        db.get('kub_signal_netflow?select=*'),
        db.get('kub_slippage_now?select=*'),
        db.get(
          `kub_hourly?select=hour,px_close,trade_kub,fills,taker_buy_pct,avg_spread_bps,bid_share_1pct,avg_bid_depth_1pct,avg_ask_depth_1pct,sweeps,netflow_out_kub,slip_sell_10k,slip_buy_10k,book_levels&hour=gte.${iso(
            36
          )}&order=hour.asc`
        ),
        db.get(
          `kub_sweep?select=ts,side,total_kub,total_thb,levels&ts=gte.${iso(
            30
          )}&total_kub=gt.200&order=ts.asc`
        ),
        db.get('kub_dex_best?select=*'),
        db.get(`kub_collector_run?select=job,ok&started_at=gte.${iso(24)}&limit=2000`),
        db.get(
          'kub_watch_balance?select=address,label,category,balance_kub,snapshot_at&order=snapshot_at.desc&limit=250'
        ),
        db.rpc('kub_candles', { p_tf: '15m', p_limit: 300 }),
      ])

    const health = {}
    for (const r of runs) {
      const h = (health[r.job] ||= { job: r.job, runs: 0, failed: 0 })
      h.runs++
      if (r.ok === false) h.failed++
    }

    const seen = new Set()
    const treasury = []
    for (const w of watch) {
      if (seen.has(w.address)) continue
      seen.add(w.address)
      treasury.push({ label: w.label, cat: w.category, kub: Number(w.balance_kub) })
    }
    treasury.sort((a, b) => b.kub - a.kub)

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    res.status(200).json({
      generated_at: new Date().toISOString(),
      now: now[0] || null,
      taker,
      netflow,
      slipNow,
      hourly,
      sweeps,
      dex,
      health: Object.values(health).sort((a, b) => a.job.localeCompare(b.job)),
      treasury,
      candles: {
        tf: '15m',
        bars: candles.length,
        candles: candles.map((r) => [r.t, +r.o, +r.h, +r.l, +r.c, +r.v, r.n]),
      },
    })
  } catch (e) {
    res.status(502).json({ error: String(e.message || e) })
  }
}
