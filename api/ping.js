import { URL_BASE } from './_supabase.js'

/**
 * Diagnostic endpoint. Answers "is the key present, is it the right one, and
 * which query breaks" without exposing the key.
 */
export default async function handler(req, res) {
  const key = process.env.SUPABASE_SERVICE_KEY || ''
  const out = {
    supabase_url: URL_BASE,
    project_ref: (URL_BASE.match(/https:\/\/([a-z0-9]+)\./) || [])[1] || null,
    key_present: Boolean(key),
    key_length: key.length,
    key_tail: key ? key.slice(-4) : null,
    key_shape: key.startsWith('sb_secret_')
      ? 'new secret key'
      : key.startsWith('eyJ')
        ? 'legacy JWT (service_role or anon)'
        : key
          ? 'unrecognised'
          : 'missing',
    key_has_whitespace: key !== key.trim(),
    probes: {},
  }

  if (key) {
    // A JWT carries its own project ref — compare it with the URL we query.
    if (key.startsWith('eyJ')) {
      try {
        const claims = JSON.parse(Buffer.from(key.split('.')[1], 'base64').toString())
        out.key_project_ref = claims.ref || null
        out.key_role = claims.role || null
        out.key_matches_url = claims.ref === out.project_ref
      } catch {
        out.key_project_ref = 'unreadable'
      }
    }

    const headers = { apikey: key, Authorization: `Bearer ${key}` }
    const probe = async (label, path, init) => {
      try {
        const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers, ...(init || {}) })
        const body = await r.text()
        out.probes[label] = r.ok ? `ok (${body.length} bytes)` : `${r.status}: ${body.slice(0, 160)}`
      } catch (e) {
        out.probes[label] = `threw: ${String(e.message || e)}`
      }
    }

    await probe('kub_signal_now', 'kub_signal_now?select=*')
    await probe('kub_dex_best', 'kub_dex_best?select=*&limit=1')
    await probe('kub_hourly', 'kub_hourly?select=hour&limit=1')
    await probe('kub_candles (rpc)', 'rpc/kub_candles', {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_tf: '15m', p_limit: 5 }),
    })
  }

  res.status(200).json(out)
}
