import { client, missingKey, TF } from './_supabase.js'

export default async function handler(req, res) {
  if (missingKey(res)) return

  const tf = TF.includes(String(req.query.tf)) ? String(req.query.tf) : '15m'
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 300, 20), 1000)

  try {
    const rows = await client().rpc('kub_candles', { p_tf: tf, p_limit: limit })
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    res.status(200).json({
      ok: true,
      tf,
      bars: rows.length,
      candles: rows.map((r) => [r.t, +r.o, +r.h, +r.l, +r.c, +r.v, r.n]),
    })
  } catch (e) {
    res.status(200).json({ ok: false, tf, bars: 0, candles: [], error: String(e.message || e) })
  }
}
