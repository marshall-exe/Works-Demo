// Shaders for the 3D Shams hologram. Her live video is keyed off its white background and wrapped onto a mesh
// shaped by her own moving silhouette, so the camera sees volume as it moves without warping her face.

const KEY = /* glsl */ `
const vec3 BG = vec3(0.988, 0.980, 0.973);
const vec3 LW = vec3(0.2126, 0.7152, 0.0722);
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float rawA(vec3 c) {
  float ld = max(dot(BG - c, LW), 0.0);
  float sat = max(max(c.r, c.g), c.b) - min(min(c.r, c.g), c.b);
  return max(ld / 0.55, sat / 0.16);
}
`;

const KEYED = /* glsl */ `
float rawAt(sampler2D t, vec2 uv) { return rawA(texture2D(t, uv).rgb); }
vec4 keyed(sampler2D t, vec2 uv, vec2 tx, out float edge) {
  vec3 c = texture2D(t, uv).rgb;
  float r0 = rawA(c);
  float rm = min(r0, min(min(rawAt(t, uv + vec2(tx.x, 0.0)), rawAt(t, uv - vec2(tx.x, 0.0))),
                         min(rawAt(t, uv + vec2(0.0, tx.y)), rawAt(t, uv - vec2(0.0, tx.y)))));
  float a = smoothstep(0.12, 0.9, mix(r0, rm, 0.85));
  vec2 d = tx * 5.0;
  float far = min(min(min(rawAt(t, uv + vec2(d.x, 0.0)), rawAt(t, uv - vec2(d.x, 0.0))),
                      min(rawAt(t, uv + vec2(0.0, d.y)), rawAt(t, uv - vec2(0.0, d.y)))),
                  min(min(rawAt(t, uv + d), rawAt(t, uv - d)),
                      min(rawAt(t, uv + vec2(d.x, -d.y)), rawAt(t, uv + vec2(-d.x, d.y)))));
  float nearBg = 1.0 - smoothstep(0.15, 0.5, far);
  float lum = dot(c, LW);
  float sat = max(max(c.r, c.g), c.b) - min(min(c.r, c.g), c.b);
  a *= 1.0 - smoothstep(0.27, 0.42, lum) * (1.0 - smoothstep(0.10, 0.20, sat)) * nearBg; // grey haze in the hair
  vec2 eb = (uv - vec2(0.5, 0.33)) / vec2(0.17, 0.09);
  float prot = 0.0;
  if (dot(eb, eb) < 1.0) {
    vec2 q = tx * 14.0;
    float ring = min(min(min(rawAt(t, uv + vec2(q.x, 0.0)), rawAt(t, uv - vec2(q.x, 0.0))),
                         min(rawAt(t, uv + vec2(0.0, q.y)), rawAt(t, uv - vec2(0.0, q.y)))),
                     min(min(rawAt(t, uv + q), rawAt(t, uv - q)),
                         min(rawAt(t, uv + vec2(q.x, -q.y)), rawAt(t, uv + vec2(-q.x, q.y)))));
    prot = smoothstep(0.35, 0.6, ring);
    a = max(a, prot); // eye whites and catchlights inside her face
  }
  vec2 pe = (uv - vec2(0.51, 1.0)) / vec2(0.11, 0.12);
  a = max(a, 1.0 - smoothstep(0.8, 1.0, length(pe))); // cream blouse inside the jacket
  edge = a * (1.0 - smoothstep(0.3, 0.9, far)) * (1.0 - prot);
  vec3 fg = clamp((c - (1.0 - a) * BG) / max(a, 0.001), 0.0, 1.0);
  // the outer hair still carries light from the old white background: pull it to hair tone and thin it
  vec3 hair = vec3(0.16, 0.11, 0.10);
  fg = mix(fg, min(fg, hair + 0.08), edge);
  a *= 1.0 - 0.35 * edge * smoothstep(0.2, 0.45, dot(c, LW));
  return vec4(fg, a);
}
`;

const COMMON_UNIFORMS = /* glsl */ `
uniform sampler2D uA;
uniform sampler2D uB;
uniform sampler2D uG;
uniform sampler2D uG2;      // previous gaze pose, faded out over uGm
uniform float uGm;
uniform sampler2D uDepth;
uniform vec2 uTexA;
uniform vec2 uTexB;
uniform vec2 uTexG;
uniform vec3 uW;       // weights: idle loop, gaze clip, live stream (sum to 1)
uniform float uTime;
uniform float uReveal;
uniform float uGlitch;
uniform float uSpeak;
uniform float uFx;
uniform float uZ;
uniform vec3 uRim;
uniform vec3 uAccent;
uniform float uRimK;
uniform float uUp;      // 1 on the dark page: faint warm light from the projector below
`;

// Her shape follows her outline live: the keyed silhouette, blurred, gives a rounded volume that moves with her,
// plus a very soft prior for head vs shoulders. No facial relief, so moving features never warp.
export const BODY_VERT = /* glsl */ `
${COMMON_UNIFORMS}
${KEY}
varying vec2 vUv;
varying vec3 vN;
float hash1(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float kA(sampler2D t, vec2 uv) { return smoothstep(0.1, 0.9, rawA(texture2D(t, uv).rgb)); }
float silhouette(sampler2D t, vec2 uv) {
  float s = kA(t, uv), w = 1.0;
  for (int ring = 1; ring <= 3; ring++) {
    float r = float(ring) * 0.03;
    for (int k = 0; k < 8; k++) {
      float a = float(k) * 0.7854 + float(ring) * 0.39;
      s += kA(t, uv + vec2(cos(a) / 1.5, sin(a)) * r);
      w += 1.0;
    }
  }
  return s / w;
}
float prior(vec2 uv) { return texture2D(uDepth, uv).r; }
void main() {
  vUv = vec2(uv.x, 1.0 - uv.y);
  float sil = 0.0;
  if (uW.x > 0.001) sil += silhouette(uA, vUv) * uW.x;
  if (uW.y > 0.001) sil += silhouette(uG, vUv) * uW.y;
  if (uW.z > 0.001) sil += silhouette(uB, vUv) * uW.z;
  float pillow = sqrt(clamp(sil, 0.0, 1.0));
  float d = mix(pillow, prior(vUv), 0.35);
  vec3 p = position;
  p.z += (d - 0.5) * uZ;
  // signal instability while connecting: slices jump sideways
  float slice = floor(vUv.y * 46.0);
  float tk = floor(uTime * 18.0);
  p.x += step(0.86, hash1(vec2(slice, tk))) * (hash1(vec2(slice * 3.1, tk)) - 0.5) * 0.08 * uGlitch;
  // soft shading normal from the prior only
  vec2 e = vec2(4.0 / 150.0, 4.0 / 100.0);
  float dx = prior(vUv + vec2(e.x, 0.0)) - prior(vUv - vec2(e.x, 0.0));
  float dy = prior(vUv + vec2(0.0, e.y)) - prior(vUv - vec2(0.0, e.y));
  vec3 n = normalize(vec3(-dx * uZ / (2.0 * e.x * 1.5), dy * uZ / (2.0 * e.y), 1.0));
  vN = normalize(normalMatrix * n);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

export const BODY_FRAG = /* glsl */ `
${COMMON_UNIFORMS}
varying vec2 vUv;
varying vec3 vN;
${KEY}
${KEYED}
void main() {
  vec2 vuv = vUv;
  float eA = 0.0, eG = 0.0, eB = 0.0;
  vec4 her = vec4(0.0);
  if (uW.x > 0.001) her += keyed(uA, vuv, uTexA, eA) * uW.x;
  if (uW.y > 0.001) {
    her += keyed(uG, vuv, uTexG, eG) * uW.y * uGm;
    if (uGm < 0.999) { float e2 = 0.0; her += keyed(uG2, vuv, uTexG, e2) * uW.y * (1.0 - uGm); eG = mix(e2, eG, uGm); }
  }
  if (uW.z > 0.001) her += keyed(uB, vuv, uTexB, eB) * uW.z;
  float edge = eA * uW.x + eG * uW.y + eB * uW.z;

  float fade = 1.0 - smoothstep(0.62, 0.93, vuv.y);
  fade *= smoothstep(0.0, 0.025, vuv.y) * smoothstep(0.0, 0.02, vuv.x) * smoothstep(1.0, 0.98, vuv.x);
  float lines = step(0.45, fract(gl_FragCoord.y / 3.0));
  her.a *= fade * mix(1.0, lines, smoothstep(0.66, 0.92, vuv.y) * 0.85 * uFx);

  float line = mix(1.08, -0.08, uReveal);
  float e = vuv.y - line + (noise(vuv * vec2(60.0, 30.0) + uTime * 2.0) - 0.5) * 0.08;
  float seam = exp(-abs(e) * 70.0) * step(0.001, uReveal) * step(uReveal, 0.999);
  her.a *= smoothstep(0.0, 0.025, e);
  if (her.a < 0.012) discard;

  vec3 n = normalize(vN);
  vec3 key = normalize(vec3(-0.45, 0.35, 0.8));
  float shade = 0.9 + 0.14 * dot(n, key);
  float scan = 1.0 - 0.04 * uFx * (0.5 + 0.5 * sin(gl_FragCoord.y * 2.094));
  float sweepPos = fract(uTime / 7.5) * 1.5 - 0.25;
  float sweep = exp(-pow((vuv.y - sweepPos) * 24.0, 2.0)) * uFx;
  float flicker = 1.0 - uGlitch * 0.35 * step(0.7, hash(vec2(floor(uTime * 24.0), 3.0)));

  vec3 col = her.rgb * shade * scan;
  col += uRim * (sweep * 0.06 + edge * 0.06 * uSpeak * uRimK);
  col += uAccent * seam * 1.6;
  col += col * vec3(0.10, 0.04, 0.03) * smoothstep(0.3, 0.75, vuv.y) * uUp;
  col = mix(col, col * vec3(0.96, 1.0, 1.04), 0.5 * uFx);
  float alpha = clamp(her.a * flicker + seam * 0.9 * her.a, 0.0, 1.0);
  gl_FragColor = vec4(col, alpha);
}`;

// Her lower body and outline break into points; the same points assemble her on reveal.
export const DUST_VERT = /* glsl */ `
${COMMON_UNIFORMS}
${KEY}
attribute vec3 aRand;
uniform float uSize;
varying vec4 vCol;
vec4 sampleKey(sampler2D t, vec2 uv) {
  vec3 c = texture2D(t, uv).rgb;
  float a = smoothstep(0.1, 0.9, rawA(c));
  return vec4(clamp((c - (1.0 - a) * BG) / max(a, 0.001), 0.0, 1.0), a);
}
void main() {
  vec2 vuv = vec2(uv.x, 1.0 - uv.y);
  vec4 k = vec4(0.0);
  if (uW.x > 0.001) k += sampleKey(uA, vuv) * uW.x;
  if (uW.y > 0.001) k += sampleKey(uG, vuv) * uW.y;
  if (uW.z > 0.001) k += sampleKey(uB, vuv) * uW.z;
  float d = mix(sqrt(k.a), texture2D(uDepth, vuv).r, 0.35);
  vec3 p = position;
  p.z += (d - 0.5) * uZ;

  // below the waist line: drift down into the projector and thin out
  float band = smoothstep(0.6, 0.8, vuv.y);
  float life = fract(uTime * (0.08 + aRand.x * 0.12) + aRand.y);
  p.y -= band * life * 0.12 * uFx;
  p.x += band * (aRand.z - 0.5) * 0.03 * life * uFx;
  float keep = step(aRand.z, 0.55 - band * 0.25) * band * (1.0 - life) * (1.0 - smoothstep(0.9, 1.0, vuv.y));

  // reveal: points fly in and settle just ahead of the solid surface
  float line = mix(1.08, -0.08, uReveal);
  float ahead = vuv.y - line;
  float settle = smoothstep(-0.18, 0.02, ahead);
  vec3 scatter = (aRand - 0.5) * vec3(0.9, 0.5, 0.9);
  p += scatter * (1.0 - settle) * step(0.001, 1.0 - uReveal);
  float front = (1.0 - smoothstep(0.0, 0.2, abs(ahead + 0.06))) * step(0.001, 1.0 - uReveal) * step(aRand.x, 0.45);

  // connecting: a few points shake loose
  p += (aRand - 0.5) * 0.05 * uGlitch;

  float alpha = k.a * max(keep * 0.9, front);
  vCol = vec4(mix(k.rgb, uRim, 0.12), alpha);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = uSize * (0.6 + aRand.y * 0.8) / -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

export const DUST_FRAG = /* glsl */ `
varying vec4 vCol;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = dot(c, c);
  if (r > 0.25 || vCol.a < 0.01) discard;
  gl_FragColor = vec4(vCol.rgb, vCol.a * (1.0 - r * 4.0));
}`;

export const PAD_VERT = /* glsl */ `
varying vec2 vP;
void main() {
  vP = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

export const PAD_FRAG = /* glsl */ `
uniform float uTime;
uniform float uReveal;
uniform float uSpeak;
uniform float uFx;
uniform float uR;
uniform vec3 uCol;
uniform float uLight;
varying vec2 vP;
void main() {
  float d = length(vP) / uR;
  float ang = atan(vP.y, vP.x);
  float ring = exp(-pow((d - 1.0) * 26.0, 2.0)) * 0.9;
  float inner = exp(-pow((d - 0.66) * 36.0, 2.0)) * 0.3;
  float disc = (1.0 - smoothstep(0.0, 1.0, d)) * 0.12;
  float halo = exp(-max(d - 1.0, 0.0) * 4.0) * 0.12 * step(1.0, d);
  float ticks = step(0.6, fract(ang / 6.2832 * 90.0 + uTime * 0.02 * uFx)) * exp(-pow((d - 1.12) * 50.0, 2.0)) * 0.45;
  float arc = smoothstep(0.2, 0.0, abs(fract(ang / 6.2832 - uTime * 0.07 * uFx) - 0.5) - 0.3) * exp(-pow((d - 1.2) * 60.0, 2.0)) * 0.5;
  float r2 = fract(uTime * 0.55);
  float ripple = exp(-pow((d - (1.0 + r2 * 0.8)) * 18.0, 2.0)) * (1.0 - r2) * 0.8 * uSpeak * uFx;
  float pulse = 0.85 + 0.15 * sin(uTime * 2.2) * uFx + 0.25 * uSpeak;
  float a = (ring + inner + disc + halo + ticks + arc + ripple) * pulse * uReveal;
  a *= 1.0 - smoothstep(1.4, 1.9, d);
  gl_FragColor = vec4(uCol * a, a * mix(1.0, 0.8, uLight));
}`;

export const BEAM_VERT = /* glsl */ `
varying vec2 vUv;
varying float vFres;
void main() {
  vUv = uv;
  vec3 n = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vFres = 1.0 - abs(dot(n, normalize(-mv.xyz)));
  gl_Position = projectionMatrix * mv;
}`;

export const BEAM_FRAG = /* glsl */ `
uniform float uTime;
uniform float uReveal;
uniform float uSpeak;
uniform float uFx;
uniform vec3 uCol;
uniform float uStrength;
varying vec2 vUv;
varying float vFres;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  float h = vUv.y; // 0 at the projector
  float streak = 0.6 + 0.4 * hash(vec2(floor(vUv.x * 90.0), 1.0));
  float drift = 0.75 + 0.25 * sin(vUv.x * 40.0 + uTime * 0.6 * uFx);
  float a = pow(1.0 - h, 3.0) * (0.08 + vFres * 1.1) * streak * drift * uStrength * (0.9 + 0.3 * uSpeak) * uReveal;
  gl_FragColor = vec4(uCol * a, a);
}`;

export const MOTE_VERT = /* glsl */ `
attribute vec3 aRand;
uniform float uTime;
uniform float uFx;
uniform float uSize;
uniform float uH;
uniform float uR;
varying float vA;
void main() {
  float life = fract(uTime * (0.04 + aRand.x * 0.06) + aRand.y);
  float ang = aRand.z * 6.2832 + uTime * 0.1 * uFx;
  float rad = uR * (0.25 + 0.75 * sqrt(fract(aRand.x * 7.13)));
  vec3 p = vec3(cos(ang) * rad, life * uH, sin(ang) * rad);
  vA = sin(life * 3.1416) * uFx;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = uSize * (0.5 + aRand.y) / -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

export const MOTE_FRAG = /* glsl */ `
uniform vec3 uCol;
uniform float uReveal;
varying float vA;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = dot(c, c);
  if (r > 0.25) discard;
  float a = vA * (1.0 - r * 4.0) * 0.7 * uReveal;
  gl_FragColor = vec4(uCol * a, a);
}`;
