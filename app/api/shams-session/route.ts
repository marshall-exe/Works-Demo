import { NextResponse } from 'next/server';
import { SHAMS, SYSTEM_PROMPT, TOOLS, INITIAL_MESSAGE } from '../../../lib/shams/persona';

// Exchanges the server-side Anam API key for a short-lived session token.
// The key never reaches the browser. Guards: same-site origin, a per-IP limit, and Anam's own concurrency pre-check.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ANAM = 'https://api.anam.ai/v1';
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = Number(process.env.SHAMS_MAX_SESSIONS_PER_IP || 5);
const hits = new Map<string, number[]>();

function allowedOrigin(origin: string | null, host: string | null) {
  if (!origin) return false;
  try {
    const o = new URL(origin);
    if (host && o.host === host) return true;
    if (o.hostname === 'localhost' || o.hostname === '127.0.0.1') return true;
    const extra = (process.env.SHAMS_ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
    return extra.includes(o.origin);
  } catch {
    return false;
  }
}

function limited(ip: string) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (list.length >= MAX_PER_WINDOW) { hits.set(ip, list); return true; }
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return false;
}

const json = (body: object, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(req: Request) {
  const key = process.env.ANAM_API_KEY;
  if (!key) return json({ error: 'not_configured' }, 503);
  if (!allowedOrigin(req.headers.get('origin'), req.headers.get('host'))) return json({ error: 'forbidden' }, 403);

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  if (limited(ip)) return json({ error: 'rate_limited' }, 429);

  const auth = { Authorization: `Bearer ${key}` };
  try {
    const c = await fetch(`${ANAM}/sessions/concurrency`, { headers: auth, cache: 'no-store' });
    if (c.ok) {
      const s = await c.json();
      if (s && s.canStartSession === false) return json({ error: 'busy', wait: s.estimatedWaitSeconds ?? null }, 503);
    }
  } catch { /* advisory only */ }

  const res = await fetch(`${ANAM}/auth/session-token`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      clientLabel: 'oca-shams',
      personaConfig: {
        name: 'Shams',
        avatarId: SHAMS.avatarId,
        avatarModel: 'cara-4',
        voiceId: SHAMS.voiceId,
        llmId: SHAMS.llmId,
        systemPrompt: SYSTEM_PROMPT,
        initialMessage: INITIAL_MESSAGE,
        maxSessionLengthSeconds: SHAMS.maxSessionLengthSeconds,
        tools: TOOLS,
      },
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.error('shams: session token failed', res.status, detail.slice(0, 500));
    return json({ error: res.status === 429 ? 'busy' : 'upstream' }, res.status === 429 ? 503 : 502);
  }
  const data = await res.json();
  return json({ sessionToken: data.sessionToken, maxSeconds: SHAMS.maxSessionLengthSeconds });
}
