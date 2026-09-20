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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Worth trying again rather than reporting.
 *
 * PGRST303 ("JWT issued at future") is the interesting one: a secret key is
 * exchanged for a short-lived token per request, so a fraction of a second of
 * clock skew between the issuing node and the database makes PostgREST treat a
 * valid token as not yet valid. It lands on a different query each time and
 * clears on its own, so a retry is the correct response, not a banner.
 */
function retriable(status, body) {
  if (status >= 500 || status === 429) return true
  if (status === 401 && /PGRST303|issued at future/i.test(body)) return true
  return false
}

export function client() {
  const key = process.env.SUPABASE_SERVICE_KEY
  const headers = { apikey: key, Authorization: `Bearer ${key}` }

  async function call(url, init) {
    let last
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt) await sleep(attempt * 400)
      let r, text
      try {
        r = await fetch(url, init)
        text = await r.text()
      } catch (e) {
        last = e
        continue // network blip: same treatment
      }
      if (!r.ok) {
        last = new Error(text.slice(0, 300))
        last.status = r.status
        if (retriable(r.status, text)) continue
        throw last
      }
      try {
        return JSON.parse(text)
      } catch {
        throw new Error(`non-JSON response: ${text.slice(0, 200)}`)
      }
    }
    throw last
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
