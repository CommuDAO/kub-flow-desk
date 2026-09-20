export const URL_BASE = process.env.SUPABASE_URL || 'https://zgqtqegneycythnfhpky.supabase.co'

export function missingKey(res) {
  const key = process.env.SUPABASE_SERVICE_KEY
  if (key) return null
  res.status(503).json({
    error: 'SUPABASE_SERVICE_KEY is not set',
    hint: 'Vercel -> Project -> Settings -> Environment Variables, then redeploy.',
  })
  return true
}

export function client() {
  const key = process.env.SUPABASE_SERVICE_KEY
  const headers = { apikey: key, Authorization: `Bearer ${key}` }

  return {
    async get(path) {
      const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers })
      if (!r.ok) throw new Error(`${path.split('?')[0]} -> ${r.status}`)
      return r.json()
    },
    async rpc(fn, body) {
      const r = await fetch(`${URL_BASE}/rest/v1/rpc/${fn}`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {}),
      })
      if (!r.ok) throw new Error(`${fn} -> ${r.status}`)
      return r.json()
    },
  }
}

export const TF = ['1m', '5m', '15m', '30m', '1h', '4h', '1d']
