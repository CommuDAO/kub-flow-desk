export const URL_BASE = process.env.SUPABASE_URL || 'https://zgqtqegneycythnfhpky.supabase.co'

export function missingKey(res) {
  const key = process.env.SUPABASE_SERVICE_KEY
  if (key) return null
  res.status(200).json({
    ok: false,
    error: 'SUPABASE_SERVICE_KEY is not set',
    hint: 'Vercel -> Project -> Settings -> Environment Variables, then redeploy.',
  })
  return true
}

export function client() {
  const key = process.env.SUPABASE_SERVICE_KEY
  const headers = { apikey: key, Authorization: `Bearer ${key}` }

  async function call(url, init) {
    const r = await fetch(url, init)
    const text = await r.text()
    if (!r.ok) {
      const e = new Error(text.slice(0, 300))
      e.status = r.status
      throw e
    }
    try {
      return JSON.parse(text)
    } catch {
      throw new Error(`non-JSON response: ${text.slice(0, 200)}`)
    }
  }

  return {
    get: (path) => call(`${URL_BASE}/rest/v1/${path}`, { headers }),
    rpc: (fn, body) =>
      call(`${URL_BASE}/rest/v1/rpc/${fn}`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {}),
      }),
  }
}

/** Runs every task, keeps what worked, and reports what did not. */
export async function settleAll(tasks) {
  const keys = Object.keys(tasks)
  const results = await Promise.allSettled(keys.map((k) => tasks[k]()))
  const out = {}
  const errors = []
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') out[keys[i]] = r.value
    else {
      out[keys[i]] = null
      errors.push(`${keys[i]}: ${String(r.reason && r.reason.message ? r.reason.message : r.reason)}`)
    }
  })
  return { out, errors }
}

export const TF = ['1m', '5m', '15m', '30m', '1h', '4h', '1d']
