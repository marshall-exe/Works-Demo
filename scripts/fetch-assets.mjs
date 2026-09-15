// Fetches the existing, already-approved-for-use assets at build time and derives the WebP set.
// No new generation happens here: the three Higgsfield images are fetched by their original job URLs,
// and the fonts are OCA's own brand fonts served by the live site. Existing files are never re-fetched.
import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const CDN = 'https://d8j0ntlcm91z4.cloudfront.net/user_2yL0kM874eMHYrfONaqBJJhKLjW/hf_20260914_213654_';
const IMAGES = {
  core: '0112c794-1056-4e2a-9f4a-eaa7a916cd45',     // interlocking core
  prism: 'ba5cc6e0-9f8e-4f45-8f0d-93eeb7e624a2',    // layered routing prism
  exploded: 'ff0a18f0-1fd7-4b21-b39f-177856016172', // exploded ring assembly
};
const FONT_BASE = 'https://oneclickaway.io/_next/static/media/';
const FONTS = {
  'just_sans_light.woff2': 'just_sans_light-s.p.ebb3d149.woff2',
  'just_sans_regular.woff2': 'just_sans_regular-s.p.e331fac0.woff2',
  'just_sans_medium.woff2': 'just_sans_medium-s.p.3ad0a59f.woff2',
  'just_sans_semibold.woff2': 'just_sans_semibold-s.p.c6ac3e38.woff2',
  'kross_neue_grotesk_light.woff2': 'kross_neue_grotesk_light-s.p.4cea33fe.woff2',
  'kross_neue_grotesk_regular.woff2': 'kross_neue_grotesk_regular-s.p.4397cd0d.woff2',
  'kross_neue_grotesk_bold.woff2': 'kross_neue_grotesk_bold-s.p.8f028d65.woff2',
};

const root = path.resolve(new URL('..', import.meta.url).pathname);
const imgDir = path.join(root, 'public/images');
const fontDir = path.join(root, 'public/fonts');
const exists = (p) => access(p).then(() => true, () => false);

async function fetchBuffer(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (asset fetch for OCA build)' } });
  if (!res.ok) throw new Error(`Fetch failed ${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

// Favicon set drawn from the brand mark (red dot on charcoal). Deterministic, no generation service involved.
function markSvg(size, radius, glow = true) {
  const c = size / 2, r = size * 0.19;
  const halos = glow ? [5, 4, 3, 2, 1].map((i) => `<circle cx="${c}" cy="${c}" r="${(r * (1 + i * 0.25)).toFixed(1)}" fill="#c1272d" fill-opacity="${(0.07 * i / 5).toFixed(3)}"/>`).join('') : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="#1b1a17"/>${halos}<circle cx="${c}" cy="${c}" r="${r.toFixed(1)}" fill="#c1272d"/></svg>`;
}
function icoFromPngs(pngs) {
  // ICO container with PNG-compressed entries (supported by every current browser).
  const header = Buffer.alloc(6); header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(pngs.length, 4);
  const dir = []; let offset = 6 + 16 * pngs.length; const bodies = [];
  for (const { size, buf } of pngs) {
    const e = Buffer.alloc(16); e.writeUInt8(size >= 256 ? 0 : size, 0); e.writeUInt8(size >= 256 ? 0 : size, 1); e.writeUInt8(0, 2); e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6); e.writeUInt32LE(buf.length, 8); e.writeUInt32LE(offset, 12);
    dir.push(e); bodies.push(buf); offset += buf.length;
  }
  return Buffer.concat([header, ...dir, ...bodies]);
}
async function icons() {
  const appDir = path.join(root, 'app'), pub = path.join(root, 'public');
  if (await exists(path.join(appDir, 'favicon.ico'))) return;
  const png = (size, radius, glow) => sharp(Buffer.from(markSvg(size, radius, glow))).png().toBuffer();
  await writeFile(path.join(appDir, 'icon.png'), await png(512, 112));
  await writeFile(path.join(appDir, 'apple-icon.png'), await png(180, 0));
  await writeFile(path.join(pub, 'icon-512.png'), await png(512, 112));
  await writeFile(path.join(pub, 'icon-192.png'), await png(192, 42));
  await writeFile(path.join(pub, 'icon-maskable.png'), await png(512, 0));
  await writeFile(path.join(appDir, 'favicon.ico'), icoFromPngs([{ size: 16, buf: await png(16, 3, false) }, { size: 32, buf: await png(32, 6, false) }, { size: 48, buf: await png(48, 10, false) }]));
  console.log('icons drawn');
}

async function main() {
  await mkdir(imgDir, { recursive: true });
  await mkdir(fontDir, { recursive: true });
  await icons();

  for (const [name, remote] of Object.entries(FONTS)) {
    const out = path.join(fontDir, name);
    if (await exists(out)) continue;
    await writeFile(out, await fetchBuffer(FONT_BASE + remote));
    console.log('font', name);
  }

  const needImages = !(await exists(path.join(imgDir, 'employee-6.webp'))) || !(await exists(path.join(imgDir, 'og.jpg')));
  if (!needImages) { console.log('images present, skipping'); return; }

  const src = {};
  for (const [key, id] of Object.entries(IMAGES)) {
    src[key] = await fetchBuffer(`${CDN}${id}.png`);
    console.log('image', key, src[key].length, 'bytes');
  }
  const save = async (buf, name, width, quality = 82) => {
    await sharp(buf).resize({ width }).webp({ quality, effort: 6 }).toFile(path.join(imgDir, name));
  };
  await save(src.core, 'hermes-core.webp', 2200);
  await save(src.core, 'hermes-core-1200.webp', 1200);
  await save(src.prism, 'hermes-prism.webp', 2200);
  await save(src.prism, 'hermes-prism-1200.webp', 1200);
  await save(src.exploded, 'hermes-exploded.webp', 2200);
  await save(src.exploded, 'hermes-exploded-1200.webp', 1200);

  // Six macro crops (4:5) from the three images.
  const crop = async (buf, cx, cy, w, name) => {
    const meta = await sharp(buf).metadata();
    const h = Math.round(w * 1.25);
    const left = Math.max(0, Math.min(meta.width - w, Math.round(cx * meta.width - w / 2)));
    const top = Math.max(0, Math.min(meta.height - h, Math.round(cy * meta.height - h / 2)));
    await sharp(buf).extract({ left, top, width: w, height: h }).resize(800, 1000).webp({ quality: 80, effort: 6 }).toFile(path.join(imgDir, name));
  };
  await crop(src.core, 0.62, 0.42, 900, 'employee-1.webp');
  await crop(src.prism, 0.6, 0.55, 1000, 'employee-2.webp');
  await crop(src.exploded, 0.52, 0.6, 900, 'employee-3.webp');
  await crop(src.core, 0.74, 0.62, 800, 'employee-4.webp');
  await crop(src.prism, 0.72, 0.4, 850, 'employee-5.webp');
  await crop(src.exploded, 0.7, 0.35, 900, 'employee-6.webp');

  // Open Graph 1200x630
  await sharp(src.core).resize({ width: 1200 }).resize(1200, 630, { fit: 'cover', position: 'centre' }).jpeg({ quality: 85 }).toFile(path.join(imgDir, 'og.jpg'));
  console.log('assets ready');
}

main().catch((e) => { console.error(e); process.exit(1); });
