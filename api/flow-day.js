import { client, missingKey } from './_supabase.js'

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/

export default async function handler(req, res) {
  if (missingKey(res)) return

  const day = String(req.query.day || '')
  if (!DAY_RE.test(day)) {
    res.status(200).json({ ok: false, error: 'day must be YYYY-MM-DD', rows: [] })
    return
  }

  try {
    const rows = await client().rpc('kub_top_flow_day', { p_day: day, p_limit: 10 })
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
    res.status(200).json({
      ok: true,
      day,
      rows: rows.map((r) => ({
        hash: r.tx_hash,
        ts: r.ts,
        from: r.from_addr,
        to: r.to_addr,
        kub: Number(r.value_kub),
        dir: r.direction,
        fromLabel: r.from_label,
        toLabel: r.to_label,
      })),
    })
  } catch (e) {
    res.status(200).json({ ok: false, day, rows: [], error: String(e.message || e) })
  }
}
