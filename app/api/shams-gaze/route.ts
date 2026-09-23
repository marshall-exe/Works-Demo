// Serves the gaze clip (Shams looking in 8 directions) that the hologram scrubs to follow the cursor.
// The file lives on our media CDN; streaming it through the site keeps it same-origin for WebGL,
// adds range support for Safari and lets the Vercel CDN cache it.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SOURCE = process.env.SHAMS_GAZE_URL || 'https://d2ol7oe51mr4n9.cloudfront.net/user_2yL0kM874eMHYrfONaqBJJhKLjW/1bf9c521-044e-4dba-ac7f-5b9f074cfd8d.mp4';

let cached: { at: number; buf: Buffer } | null = null;
const TTL = 12 * 60 * 60 * 1000;

async function load(): Promise<Buffer | null> {
  if (cached && Date.now() - cached.at < TTL) return cached.buf;
  const r = await fetch(SOURCE, { cache: 'no-store' });
  if (!r.ok) return null;
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 1000 || buf.length > 40 * 1024 * 1024) return null;
  cached = { at: Date.now(), buf };
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
    'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800',
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
