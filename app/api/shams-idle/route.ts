import { SHAMS } from '../../../lib/shams/persona';

// Serves Shams' idle loop (the avatar breathing and blinking) for the hologram before a session starts.
// Anam's own video link is signed and expires, so we fetch a fresh one with the server key and stream it,
// with range support for Safari and a long CDN cache so Anam is rarely asked.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let cached: { id: string; at: number; buf: Buffer } | null = null;
const TTL = 6 * 60 * 60 * 1000;

async function load(): Promise<Buffer | null> {
  if (cached && cached.id === SHAMS.avatarId && Date.now() - cached.at < TTL) return cached.buf;
  const key = process.env.ANAM_API_KEY;
  if (!key) return null;
  const meta = await fetch(`https://api.anam.ai/v1/avatars/${SHAMS.avatarId}`, { headers: { Authorization: `Bearer ${key}` }, cache: 'no-store' });
  if (!meta.ok) return null;
  const a = (await meta.json()) as { idleVideoUrl?: string; videoUrl?: string };
  const url = a.idleVideoUrl || a.videoUrl;
  if (!url) return null;
  const v = await fetch(url, { cache: 'no-store' });
  if (!v.ok) return null;
  const buf = Buffer.from(await v.arrayBuffer());
  if (buf.length < 1000 || buf.length > 40 * 1024 * 1024) return null;
  cached = { id: SHAMS.avatarId, at: Date.now(), buf };
  return buf;
}

export async function GET(req: Request) {
  let buf: Buffer | null = null;
  try { buf = await load(); } catch { buf = null; }
  if (!buf) return new Response('Not available', { status: 503, headers: { 'Cache-Control': 'no-store' } });
  const total = buf.length;
  const base = {
    'Content-Type': 'video/mp4',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
  };
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') || '');
  if (m && (m[1] || m[2])) {
    let start = m[1] ? parseInt(m[1], 10) : total - parseInt(m[2], 10);
    let end = m[1] && m[2] ? parseInt(m[2], 10) : total - 1;
    start = Math.max(0, start); end = Math.min(total - 1, end);
    if (start > end) return new Response(null, { status: 416, headers: { ...base, 'Content-Range': `bytes */${total}` } });
    const part = buf.subarray(start, end + 1);
    return new Response(new Uint8Array(part), { status: 206, headers: { ...base, 'Content-Range': `bytes ${start}-${end}/${total}`, 'Content-Length': String(part.length) } });
  }
  return new Response(new Uint8Array(buf), { status: 200, headers: { ...base, 'Content-Length': String(total) } });
}
