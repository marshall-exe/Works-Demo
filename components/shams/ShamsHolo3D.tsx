'use client';
import { useEffect, useRef, type RefObject } from 'react';
import * as THREE from 'three';
import { BODY_VERT, BODY_FRAG, DUST_VERT, DUST_FRAG, PAD_VERT, PAD_FRAG, BEAM_VERT, BEAM_FRAG, MOTE_VERT, MOTE_FRAG } from './holo3d-shaders';

type Props = {
  live: RefObject<HTMLVideoElement | null>;
  stage: RefObject<HTMLElement | null>;
  isLive: boolean;
  connecting: boolean;
  speaking: boolean;
  reduced: boolean;
  onFail: () => void;
};

// Scene units: her video plane is 1.5 x 1.0 (the 3:2 frame), centred on her.
const PLANE_W = 1.5;
const PLANE_H = 1.0;
const SUBJECT_CX = 0.515;   // her centre in the frame
const FLOOR_Y = -0.47;      // projector height (her waist fades into it)
const PAD_R = 0.36;
const Z_DEPTH = 0.3;        // how far her volume pushes the surface
const TARGET = new THREE.Vector3(0, -0.04, 0);
// Gaze clip: before anyone talks to her she follows the cursor with her head and eyes.
// The clip is a grid of poses rendered from her own frame: GAZE_COLS across (her gaze from screen left to right)
// by GAZE_ROWS down (from up to down), one frame per pose, row by row. The centre pose looks straight at you.
// Served straight from the media CDN (CORS enabled), every frame a keyframe so a seek decodes a single frame.
const GAZE_SRC = 'https://d2ol7oe51mr4n9.cloudfront.net/user_2yL0kM874eMHYrfONaqBJJhKLjW/4a078922-3e24-460b-ac58-36006bad142f.mp4';
const GAZE_COLS = 25;
const GAZE_ROWS = 17;
const GAZE_FADE = 0.03; // seconds to crossfade from the previous pose frame to the new one
const GAZE_IDLE_MS = 2600; // no pointer movement for this long: she settles back into her idle loop

// On the dark page the projector is dimmer and no light is added at her outline, so no white fringe shows.
const THEMES = {
  dark: { rim: new THREE.Color(1.0, 0.92, 0.84), accent: new THREE.Color(0.86, 0.2, 0.22), pad: new THREE.Color(0.62, 0.36, 0.33), light: 0, rimK: 0.0, beam: 0.035 },
  light: { rim: new THREE.Color(0.72, 0.16, 0.18), accent: new THREE.Color(0.76, 0.15, 0.18), pad: new THREE.Color(0.76, 0.15, 0.18), light: 1, rimK: 1.0, beam: 0.04 },
};

export default function ShamsHolo3D({ live, stage, isLive, connecting, speaking, reduced, onFail }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const idle = useRef<HTMLVideoElement>(null);
  const gaze = useRef<HTMLVideoElement>(null);
  const state = useRef({ isLive, connecting, speaking, reduced });
  state.current = { isLive, connecting, speaking, reduced };

  useEffect(() => {
    const el = host.current, iv = idle.current, gv = gaze.current;
    if (!el || !iv || !gv) return;
    iv.muted = true; // React does not always set the attribute, and autoplay needs it
    gv.muted = true;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
    } catch { onFail(); return; }
    if (!renderer.capabilities.isWebGL2 && renderer.capabilities.maxVertexTextures < 2) { renderer.dispose(); onFail(); return; }
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // the video is already display-ready; keep it untouched
    const cv = renderer.domElement;
    cv.className = 'shams-holo';
    cv.setAttribute('aria-hidden', 'true');
    el.appendChild(cv);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(26, 1, 0.05, 20);

    // Textures: idle loop, live stream, depth map.
    const mkVideoTex = (v: HTMLVideoElement) => {
      const t = new THREE.VideoTexture(v);
      t.colorSpace = THREE.NoColorSpace;
      t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = false;
      t.flipY = false; // shaders read the frame top-down
      return t;
    };
    const texA = mkVideoTex(iv);
    // The gaze clip is scrubbed, not played. Each landed seek is copied into one of two textures in turn and the
    // shader crossfades from the previous pose to the new one, so she moves continuously between grid poses.
    const mkStillTex = () => {
      // A VideoTexture (three sizes these from the video itself) with its per-frame auto update switched off:
      // it only refreshes when a seek lands and we flag it.
      const t = new THREE.VideoTexture(gv);
      const hook = t as unknown as { _requestVideoFrameCallbackId: number };
      if (hook._requestVideoFrameCallbackId && 'cancelVideoFrameCallback' in gv) gv.cancelVideoFrameCallback(hook._requestVideoFrameCallbackId);
      hook._requestVideoFrameCallbackId = 0;
      t.update = () => {};
      t.colorSpace = THREE.NoColorSpace;
      t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = false;
      t.flipY = false;
      return t;
    };
    const gTex = [mkStillTex(), mkStillTex()];
    let gi = 0, gmix = 1;
    // Only mouse users get the gaze clip (it follows a cursor); touch screens never download it.
    const fine = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: fine)').matches;
    if (fine && !state.current.reduced) { gv.crossOrigin = 'anonymous'; gv.src = GAZE_SRC; gv.load(); }
    // gazeFrame latches once a frame has decoded. A seek drops readyState to 1 until it lands; the texture keeps
    // the last frame meanwhile, so the gaze stays on screen instead of flashing back to the idle loop.
    let gazeFrame = false, seeking = false, seekAt = 0, shownFrame = -1;
    const onGazeFrame = () => {
      seeking = false;
      if (gv.readyState < 2 || !gv.videoWidth) return; // a texture first uploaded at 0 x 0 can never be resized
      if (!gazeFrame) { gTex[0].needsUpdate = true; gTex[1].needsUpdate = true; gmix = 1; }
      else { gi ^= 1; gTex[gi].needsUpdate = true; gmix = 0; }
      shared.uG.value = gTex[gi]; shared.uG2.value = gTex[gi ^ 1];
      gazeFrame = true;
    };
    gv.addEventListener('seeked', onGazeFrame);
    gv.addEventListener('loadeddata', onGazeFrame);
    // a paused video only loads metadata; asking for a time makes it decode its first frame
    const primeGaze = () => {
      // decode the centre pose first (looking at you), so the first blend in never shows a corner pose
      const mid = ((GAZE_ROWS - 1) / 2) * GAZE_COLS + (GAZE_COLS - 1) / 2;
      try { seeking = true; seekAt = performance.now(); shownFrame = mid; gv.currentTime = (mid + 0.5) * (gv.duration || 1) / (GAZE_COLS * GAZE_ROWS); } catch { seeking = false; }
    };
    if (gv.readyState >= 1) primeGaze(); else gv.addEventListener('loadedmetadata', primeGaze, { once: true });
    const blank = document.createElement('video');
    let texB: THREE.VideoTexture = mkVideoTex(blank);
    let texBSource: HTMLVideoElement | null = null;
    const depth = new THREE.TextureLoader().load('/shams/depth.jpg');
    depth.colorSpace = THREE.NoColorSpace;
    depth.minFilter = THREE.LinearFilter; depth.generateMipmaps = false; depth.flipY = false;

    const t0 = THEMES[document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'];
    const shared = {
      uA: { value: texA }, uB: { value: texB }, uDepth: { value: depth },
      uTexA: { value: new THREE.Vector2(1 / 960, 1 / 640) }, uTexB: { value: new THREE.Vector2(1 / 1152, 1 / 768) },
      uG: { value: gTex[0] }, uG2: { value: gTex[1] }, uGm: { value: 1 }, uTexG: { value: new THREE.Vector2(1 / 960, 1 / 640) }, uW: { value: new THREE.Vector3(1, 0, 0) },
      uTime: { value: 0 }, uReveal: { value: 0 }, uGlitch: { value: 0 }, uSpeak: { value: 0 }, uFx: { value: 1 },
      uZ: { value: Z_DEPTH }, uRim: { value: t0.rim.clone() }, uAccent: { value: t0.accent.clone() }, uRimK: { value: t0.rimK }, uUp: { value: 1 - t0.light },
    };

    const offsetX = -(SUBJECT_CX - 0.5) * PLANE_W;
    const bodyY = FLOOR_Y + PLANE_H * 0.5 - 0.03;

    // Her surface
    const bodyGeo = new THREE.PlaneGeometry(PLANE_W, PLANE_H, 240, 160);
    const bodyMat = new THREE.ShaderMaterial({ uniforms: shared, vertexShader: BODY_VERT, fragmentShader: BODY_FRAG, transparent: true, depthWrite: true });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(offsetX, bodyY, 0);
    body.renderOrder = 2;
    scene.add(body);

    // Particles: same grid, sparser
    const dustGeo = new THREE.PlaneGeometry(PLANE_W, PLANE_H, 199, 133);
    const n = dustGeo.attributes.position.count;
    const rnd = new Float32Array(n * 3);
    for (let i = 0; i < rnd.length; i++) rnd[i] = Math.random();
    dustGeo.setAttribute('aRand', new THREE.BufferAttribute(rnd, 3));
    dustGeo.setIndex(null);
    const dustMat = new THREE.ShaderMaterial({ uniforms: { ...shared, uSize: { value: 5 } }, vertexShader: DUST_VERT, fragmentShader: DUST_FRAG, transparent: true, depthWrite: false });
    const dust = new THREE.Points(dustGeo, dustMat);
    dust.position.copy(body.position);
    dust.renderOrder = 3;
    scene.add(dust);

    // Projector pad on the floor
    const padUniforms = { uTime: shared.uTime, uReveal: shared.uReveal, uSpeak: shared.uSpeak, uFx: shared.uFx, uR: { value: PAD_R }, uCol: { value: t0.pad.clone() }, uLight: { value: t0.light } };
    const padMat = new THREE.ShaderMaterial({ uniforms: padUniforms, vertexShader: PAD_VERT, fragmentShader: PAD_FRAG, transparent: true, depthWrite: false, premultipliedAlpha: true, blending: t0.light ? THREE.NormalBlending : THREE.AdditiveBlending });
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(PAD_R * 4, PAD_R * 4), padMat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(0, FLOOR_Y, 0);
    pad.renderOrder = 0;
    scene.add(pad);

    // Beam: an open cone of light rising from the pad
    const beamH = 0.95;
    const beamUniforms = { uTime: shared.uTime, uReveal: shared.uReveal, uSpeak: shared.uSpeak, uFx: shared.uFx, uCol: { value: t0.rim.clone() }, uStrength: { value: t0.beam } };
    const beamMat = new THREE.ShaderMaterial({ uniforms: beamUniforms, vertexShader: BEAM_VERT, fragmentShader: BEAM_FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide, premultipliedAlpha: true, blending: t0.light ? THREE.NormalBlending : THREE.AdditiveBlending });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(PAD_R * 0.86, PAD_R, beamH, 64, 1, true), beamMat);
    beam.position.set(0, FLOOR_Y + beamH / 2, 0);
    beam.renderOrder = 1;
    // the cylinder's uv.y runs bottom to top already
    scene.add(beam);

    // Motes rising in the beam
    const moteGeo = new THREE.BufferGeometry();
    const MOTES = 70;
    moteGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MOTES * 3), 3));
    const mr = new Float32Array(MOTES * 3);
    for (let i = 0; i < mr.length; i++) mr[i] = Math.random();
    moteGeo.setAttribute('aRand', new THREE.BufferAttribute(mr, 3));
    const moteUniforms = { uTime: shared.uTime, uFx: shared.uFx, uReveal: shared.uReveal, uSize: { value: 5 }, uH: { value: 0.9 }, uR: { value: PAD_R * 0.95 }, uCol: { value: t0.rim.clone() } };
    const moteMat = new THREE.ShaderMaterial({ uniforms: moteUniforms, vertexShader: MOTE_VERT, fragmentShader: MOTE_FRAG, transparent: true, depthWrite: false, premultipliedAlpha: true, blending: t0.light ? THREE.NormalBlending : THREE.AdditiveBlending });
    const motes = new THREE.Points(moteGeo, moteMat);
    motes.position.set(0, FLOOR_Y, 0);
    motes.frustumCulled = false;
    motes.renderOrder = 1;
    scene.add(motes);

    const theme = () => {
      const t = THEMES[document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'];
      shared.uRim.value.copy(t.rim); shared.uAccent.value.copy(t.accent);
      padUniforms.uCol.value.copy(t.pad); padUniforms.uLight.value = t.light;
      beamUniforms.uCol.value.copy(t.rim); beamUniforms.uStrength.value = t.beam; shared.uRimK.value = t.rimK; shared.uUp.value = 1 - t.light;
      moteUniforms.uCol.value.copy(t.rim);
      const blend = t.light ? THREE.NormalBlending : THREE.AdditiveBlending;
      [padMat, beamMat, moteMat].forEach((m) => { m.blending = blend; m.needsUpdate = true; });
    };
    const mo = new MutationObserver(theme);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    // Size and framing
    let dist = 3;
    const resize = () => {
      const w = Math.max(2, el.clientWidth), h = Math.max(2, el.clientHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, w < 700 ? 1.75 : 1.5);
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const needH = 1.2, needW = 1.25;
      dist = Math.max(needH / 2 / tan, needW / 2 / tan / camera.aspect);
      const px = h * dpr;
      (dustMat.uniforms.uSize as { value: number }).value = px * 0.0042 * dist;
      moteUniforms.uSize.value = px * 0.006 * dist;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    // Pointer and scroll drive the camera around her.
    const ptr = { x: 0, y: 0, tx: 0, ty: 0, moved: 0, cx: 0, cy: 0 };
    const st = stage.current;
    // Anywhere on the page counts, measured from her centre, so the whole section feels like looking around her.
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || !inView) return;
      const r = (st || el).getBoundingClientRect();
      ptr.tx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width * 0.75)));
      ptr.cx = e.clientX; ptr.cy = e.clientY; ptr.moved = performance.now();
      ptr.ty = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height * 0.4)) / (r.height * 0.75)));
    };
    const onLeave = () => { ptr.tx = 0; ptr.ty = 0; };
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);

    let inView = false;
    const io = new IntersectionObserver(([e]) => {
      inView = e.isIntersecting;
      if (inView) { if (!state.current.reduced && !state.current.isLive) iv.play().catch(() => {}); kick(); }
      else iv.pause();
    }, { rootMargin: '120px 0px' });
    io.observe(el);

    if (state.current.reduced) {
      const still = () => { try { iv.pause(); iv.currentTime = 2.4; } catch { /* not seekable yet */ } };
      if (iv.readyState >= 1) still(); else iv.addEventListener('loadedmetadata', still, { once: true });
    }

    let raf = 0, last = performance.now();
    const start = last;
    let mix = 0, gazeW = 0, gzx = 0, gzy = 0, reveal = 0, glitch = 0, speak = 0, wasLive = false, revealing = false, yaw = 0, pitch = 0;
    const ease = (cur: number, target: number, k: number, dt: number) => cur + (target - cur) * (1 - Math.exp(-k * dt));

    const frame = (now: number) => {
      raf = 0;
      if (!inView || document.hidden) return;
      const real = Math.min(0.25, (now - last) / 1000);
      const dt = Math.min(0.05, real); last = now;
      const s = state.current;
      const lv = live.current;

      const hasA = iv.readyState >= 2 && iv.videoWidth > 0;
      if (hasA) shared.uTexA.value.set(1 / iv.videoWidth, 1 / iv.videoHeight);
      const liveReady = !!lv && s.isLive && lv.readyState >= 2 && lv.videoWidth > 0;
      if (liveReady && texBSource !== lv) {
        texB.dispose(); texB = mkVideoTex(lv!); texBSource = lv; shared.uB.value = texB;
      }
      if (liveReady) shared.uTexB.value.set(1 / lv!.videoWidth, 1 / lv!.videoHeight);

      if (liveReady && !wasLive) { glitch = 1; if (!s.reduced) reveal = Math.min(reveal, 0.25); }
      wasLive = liveReady;
      mix = ease(mix, liveReady ? 1 : 0, 5, dt);

      // Gaze: the cursor's offset from her face sets a target on the pose grid; the pose glides toward it,
      // so her head and eyes sweep through every angle in between instead of jumping.
      const r0 = el.getBoundingClientRect();
      const fx = r0.left + r0.width / 2, fy = r0.top + r0.height * 0.36;
      const hasG = gazeFrame && gv.duration > 0 && gv.videoWidth > 0;
      let want = false, tx = 0, ty = 0;
      if (ptr.moved && now - ptr.moved < GAZE_IDLE_MS) {
        // normalised offset; soft limit so she keeps turning a little further as the cursor goes further out
        const nx = (ptr.cx - fx) / (r0.height * 0.9), ny = (ptr.cy - fy) / (r0.height * 0.7);
        const len = Math.hypot(nx, ny), soft = len > 0 ? Math.tanh(len * 1.4) / len : 0;
        tx = nx * soft; ty = ny * soft;
        want = true;
      }
      want = want && hasG && !s.isLive && !s.reduced;
      gzx = ease(gzx, want ? tx : 0, want ? 32 : 5, dt); gzy = ease(gzy, want ? ty : 0, want ? 32 : 5, dt); // tight on the cursor, gentle on the way back
      const off = Math.hypot(gzx, gzy);
      gazeW = ease(gazeW, want || off > 0.03 ? 1 : 0, want ? 7 : 2.5, dt);
      if (hasG && gazeW > 0.01) {
        const col = Math.round((Math.max(-1, Math.min(1, gzx)) + 1) / 2 * (GAZE_COLS - 1));
        const row = Math.round((Math.max(-1, Math.min(1, gzy)) + 1) / 2 * (GAZE_ROWS - 1));
        const f = row * GAZE_COLS + col;
        if (seeking && now - seekAt > 600) seeking = false; // a seek that never lands must not freeze her
        if (!seeking && f !== shownFrame) {
          // one seek at a time, to the middle of the wanted frame
          seeking = true; seekAt = now; shownFrame = f;
          gv.currentTime = (f + 0.5) * gv.duration / (GAZE_COLS * GAZE_ROWS);
        }
      }
      if (hasG) shared.uTexG.value.set(1 / gv.videoWidth, 1 / gv.videoHeight);
      gmix = Math.min(1, gmix + real / GAZE_FADE);
      shared.uGm.value = gmix;
      if (mix > 0.995 && !iv.paused) iv.pause();
      if (mix < 0.5 && !s.isLive && iv.paused && !s.reduced) iv.play().catch(() => {});

      if (hasA || liveReady || hasG) revealing = true;
      if (revealing) reveal = s.reduced ? 1 : Math.min(1, reveal + real / 2.2);
      glitch = Math.max(s.connecting ? 0.3 + 0.2 * Math.sin(now / 90) : 0, glitch - dt * 1.6);
      speak = ease(speak, s.speaking ? 1 : 0, 4, dt);

      // Camera: pointer, scroll position and a slow idle sway all move it around her.
      const r = el.getBoundingClientRect();
      const scrollP = Math.max(-1, Math.min(1, (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight));
      const tsec = (now - start) / 1000;
      ptr.x = ease(ptr.x, ptr.tx, 3, dt); ptr.y = ease(ptr.y, ptr.ty, 3, dt);
      const yawT = s.reduced ? 0 : ptr.x * 0.11 + scrollP * 0.16 + Math.sin(tsec * 0.23) * 0.04;
      const pitchT = s.reduced ? 0.05 : 0.05 - ptr.y * 0.03 + scrollP * 0.04;
      yaw = ease(yaw, yawT, 4, dt); pitch = ease(pitch, pitchT, 4, dt);
      camera.position.set(
        TARGET.x + Math.sin(yaw) * Math.cos(pitch) * dist,
        TARGET.y + Math.sin(pitch) * dist,
        TARGET.z + Math.cos(yaw) * Math.cos(pitch) * dist,
      );
      camera.lookAt(TARGET);

      shared.uTime.value = tsec;
      // Blend weights for idle loop, gaze clip and live stream; a source that has no frame yet hands its share on.
      let wB = liveReady ? mix : 0;
      let wG = hasG ? (1 - wB) * gazeW : 0;
      let wA = hasA ? 1 - wB - wG : 0;
      if (!hasA && !liveReady && hasG) wG = 1 - wB;
      const sum = wA + wG + wB || 1;
      wA /= sum; wG /= sum; wB /= sum;
      shared.uW.value.set(wA, wG, wB);
      shared.uReveal.value = reveal < 1 ? 1 - Math.pow(1 - reveal, 2.2) : 1;
      shared.uGlitch.value = s.reduced ? 0 : glitch;
      shared.uSpeak.value = speak;
      shared.uFx.value = s.reduced ? 0 : 1;

      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    };
    const kick = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } };
    const vis = () => { if (!document.hidden) kick(); };
    document.addEventListener('visibilitychange', vis);
    const lost = (e: Event) => { e.preventDefault(); onFail(); };
    cv.addEventListener('webglcontextlost', lost);
    iv.addEventListener('seeked', kick);
    gv.addEventListener('seeked', kick);
    kick();

    return () => {
      cancelAnimationFrame(raf); raf = -1;
      ro.disconnect(); mo.disconnect(); io.disconnect();
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', vis);
      cv.removeEventListener('webglcontextlost', lost);
      iv.removeEventListener('seeked', kick);
      gv.removeEventListener('seeked', kick);
      gv.removeEventListener('seeked', onGazeFrame);
      gv.removeEventListener('loadeddata', onGazeFrame);
      [bodyGeo, dustGeo, moteGeo, pad.geometry, beam.geometry].forEach((g) => g.dispose());
      [bodyMat, dustMat, padMat, beamMat, moteMat].forEach((m) => m.dispose());
      [texA, texB, gTex[0], gTex[1], depth].forEach((t) => t.dispose());
      renderer.dispose();
      cv.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={host} className="shams-holo-host">
      <video ref={idle} className="shams-idle-src" muted loop playsInline preload="auto" aria-hidden="true" tabIndex={-1}>
        <source src="/api/shams-idle/" type="video/mp4" />
      </video>
      <video ref={gaze} className="shams-idle-src" muted playsInline preload="auto" aria-hidden="true" tabIndex={-1} />
    </div>
  );
}
