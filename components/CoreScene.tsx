'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';

/*
  The Hermes Core, v3.
  One persistent WebGL scene behind the whole page.
  - Opener: an inbox storm. Message, call, invoice and mail glyphs drift over the page, then get pulled into the heart. The core assembles from that.
  - Sculpture: four interlocking rounded loops (smoked glass, brushed titanium, dark metal) around a glass heart with a crimson signal.
  - Hero: the core opens (labels), the camera dives through the front loop into the circuit inside (three nodes, traces, pulses), pulls back,
    the solids dissolve into an orbital band, the band spells HANDLED., the word collapses into a travelling signal.
  - Incoming stream: messages flowing from the edges into the core while it is open.
  - One becomes six: in the employee section the core splits into six mini cores that fly into a slot on each employee card, and merge back after.
  - Scrolling light: the core's screen position and brightness are published as CSS variables, so cards and the page catch its light.
    The environment map rotates with scroll so reflections slide across the glass and metal.
  - Pointer: the core turns toward the cursor, the key light follows it, particles and glyphs part around it.
*/

const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;
const sstep = THREE.MathUtils.smoothstep;
const RED = 0xc1272d;

type Anchor = { docY: number; x: number; y: number; scale: number; id: string };

function roundedSquare(s: number, r: number) {
  const p = new THREE.Shape();
  p.moveTo(-s + r, -s);
  p.lineTo(s - r, -s);
  p.quadraticCurveTo(s, -s, s, -s + r);
  p.lineTo(s, s - r);
  p.quadraticCurveTo(s, s, s - r, s);
  p.lineTo(-s + r, s);
  p.quadraticCurveTo(-s, s, -s, s - r);
  p.lineTo(-s, -s + r);
  p.quadraticCurveTo(-s, -s, -s + r, -s);
  return p;
}

function loopGeometry(outer: number, inner: number, depth: number, radius: number) {
  const shape = roundedSquare(outer, radius);
  shape.holes.push(roundedSquare(inner, radius * 0.72));
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: depth * 0.16, bevelThickness: depth * 0.16, curveSegments: 12 });
  g.translate(0, 0, -depth / 2);
  g.computeVertexNormals();
  return g;
}

function studioEnvironment(renderer: THREE.WebGLRenderer) {
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(40, 40, 40), new THREE.MeshBasicMaterial({ color: 0x0a0a0b, side: THREE.BackSide })));
  const panel = (w: number, h: number, color: number, k: number, pos: [number, number, number]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    m.material.color.multiplyScalar(k);
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };
  panel(14, 6, 0xfff1e2, 9, [-9, 10, 8]);
  panel(4, 16, 0xe6ecff, 3.2, [12, 2, 4]);
  panel(18, 1.2, 0xffffff, 2.2, [0, -9, 9]);
  panel(6, 6, RED, 2.4, [4, -6, -12]);
  panel(3, 12, 0xffffff, 1.4, [-12, 0, -6]);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(scene, 0.02);
  pmrem.dispose();
  scene.traverse((o) => { const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose(); if (m.material) (m.material as THREE.Material).dispose(); });
  return env;
}

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Four line glyphs (message, call, invoice, mail) drawn into one atlas for the inbox storm.
function glyphAtlas() {
  const size = 96, n = 4;
  const c = document.createElement('canvas');
  c.width = size * n; c.height = size;
  const g = c.getContext('2d')!;
  const glyphs = [
    ['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'],
    ['M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z'],
    ['M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z', 'M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8', 'M12 17.5v-11'],
    ['M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z', 'm22 6-10 7L2 6'],
  ];
  glyphs.forEach((paths, i) => {
    g.save();
    g.translate(i * size + size * 0.2, size * 0.2);
    g.scale((size * 0.6) / 24, (size * 0.6) / 24);
    g.strokeStyle = '#fff';
    g.lineWidth = 1.9;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    paths.forEach((d) => g.stroke(new Path2D(d)));
    g.restore();
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

// Samples the pixels of a word into `count` points in world units (width ~ 4.8), for the text morph target.
function sampleWord(word: string, count: number, rand: () => number) {
  const c = document.createElement('canvas');
  c.width = 1400; c.height = 360;
  const g = c.getContext('2d')!;
  const family = getComputedStyle(document.documentElement).getPropertyValue('--font-display').trim() || 'sans-serif';
  g.fillStyle = '#fff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  let size = 250;
  do { g.font = `500 ${size}px ${family}`; size -= 10; } while (g.measureText(word).width > 1300 && size > 60);
  g.fillText(word, 700, 190);
  const data = g.getImageData(0, 0, c.width, c.height).data;
  const cand: number[] = [];
  for (let y = 0; y < c.height; y += 2) for (let x = 0; x < c.width; x += 2) if (data[(y * c.width + x) * 4 + 3] > 120) cand.push(x, y);
  const out = new Float32Array(count * 3);
  const scale = 4.8 / c.width;
  if (cand.length < 2) return out;
  for (let i = 0; i < count; i++) {
    const k = Math.floor(rand() * (cand.length / 2)) * 2;
    out[i * 3] = (cand[k] - c.width / 2) * scale + (rand() - 0.5) * 0.008;
    out[i * 3 + 1] = -(cand[k + 1] - c.height / 2) * scale + (rand() - 0.5) * 0.008;
    out[i * 3 + 2] = (rand() - 0.5) * 0.14;
  }
  return out;
}

export default function CoreScene({ onReady }: { onReady?: (ok: boolean) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    const labelWrap = labelsRef.current;
    if (!el || !labelWrap) return;
    const coarse = matchMedia('(pointer: coarse)').matches;
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    // On touch devices the scene starts after the first paint so the copy is readable immediately.
    const timer = setTimeout(() => { if (!cancelled) cleanup = init(); }, coarse ? 320 : 0);

    function init(): (() => void) | undefined {
      let disposed = false;
      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
      } catch {
        onReady?.(false);
        return;
      }
      const mobile = () => innerWidth < 900 && innerHeight > innerWidth;
      const dpr = Math.min(devicePixelRatio || 1, coarse ? 1.25 : 1.5);
      renderer.setPixelRatio(dpr);
      renderer.setSize(innerWidth, innerHeight);
      renderer.setClearColor(0x000000, 0);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      el!.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.1, 60);
      camera.position.set(0, 0, 10);
      const env = studioEnvironment(renderer);
      scene.environment = env.texture;

      const key = new THREE.DirectionalLight(0xfff4e8, 2.6);
      key.position.set(-5, 6, 7);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xdfe6ff, 1.6);
      rim.position.set(6, 2, -4);
      scene.add(rim);
      scene.add(new THREE.AmbientLight(0xffffff, 0.12));
      const heartLight = new THREE.PointLight(RED, 0, 6, 2);
      scene.add(heartLight);

      // ---------- Sculpture ----------
      const root = new THREE.Group();
      const assembly = new THREE.Group();
      root.add(assembly);
      scene.add(root);

      const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x1a1a1c, metalness: 0, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.05, transparent: true, opacity: 0.62, ior: 1.5, specularIntensity: 1, envMapIntensity: 1.2, side: THREE.DoubleSide, depthWrite: false });
      const titaniumMat = new THREE.MeshPhysicalMaterial({ color: 0x9a9c9f, metalness: 1, roughness: 0.32, anisotropy: 0.7, anisotropyRotation: Math.PI / 2, clearcoat: 0.2, clearcoatRoughness: 0.35, envMapIntensity: 1.1, transparent: true });
      const darkMetalMat = new THREE.MeshPhysicalMaterial({ color: 0x55575b, metalness: 1, roughness: 0.28, anisotropy: 0.6, envMapIntensity: 1.1, transparent: true });

      type Part = { mesh: THREE.Mesh; base: THREE.Vector3; rot: THREE.Euler; axis: THREE.Vector3; label: number };
      const parts: Part[] = [];
      const add = (geo: THREE.BufferGeometry, mat: THREE.Material, pos: [number, number, number], rot: [number, number, number], axis: [number, number, number], label: number) => {
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(...pos);
        mesh.rotation.set(...rot);
        assembly.add(mesh);
        parts.push({ mesh, base: new THREE.Vector3(...pos), rot: new THREE.Euler(...rot), axis: new THREE.Vector3(...axis), label });
      };
      const bigLoop = loopGeometry(1.0, 0.66, 0.24, 0.3);
      const midLoop = loopGeometry(0.62, 0.36, 0.26, 0.19);
      const wrapLoop = loopGeometry(0.98, 0.76, 0.2, 0.32);
      add(bigLoop, glassMat, [0, 0, 0.4], [0, 0, 0], [0, 0, 1], 0);
      add(bigLoop, glassMat.clone(), [0, 0, -0.4], [0, 0, 0], [0, 0, -1], 2);
      add(midLoop, titaniumMat, [0, 0.14, 0], [Math.PI / 2, 0, 0], [0, 1, 0], 1);
      add(wrapLoop, darkMetalMat, [-0.12, 0, 0], [0, Math.PI / 2, 0], [-1, 0, 0], 3);

      const heartGlass = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), new THREE.MeshPhysicalMaterial({ color: 0x2a1c1a, metalness: 0, roughness: 0.04, clearcoat: 1, transparent: true, opacity: 0.55, ior: 1.6, envMapIntensity: 1.4, depthWrite: false }));
      const heartCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 1), new THREE.MeshPhysicalMaterial({ color: RED, emissive: RED, emissiveIntensity: 1.1, metalness: 0.2, roughness: 0.3, transparent: true }));
      const glowMap = glowTexture();
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowMap, color: RED, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
      glow.scale.setScalar(0.5);
      const heart = new THREE.Group();
      heart.add(heartGlass, heartCore, glow);
      assembly.add(heart);
      const seamColor = new THREE.Color(RED).multiplyScalar(2.4);
      const seam = new THREE.Mesh(loopGeometry(0.82, 0.8, 0.02, 0.24), new THREE.MeshBasicMaterial({ color: seamColor, transparent: true, opacity: 0.9 }));
      seam.position.z = 0.4;
      assembly.add(seam);
      const seam2 = seam.clone();
      seam2.position.z = -0.4;
      assembly.add(seam2);

      // ---------- The circuit inside the heart (seen during the dive) ----------
      const circuit = new THREE.Group();
      const nodeMat = new THREE.MeshPhysicalMaterial({ color: 0xd8d5cf, metalness: 1, roughness: 0.25, envMapIntensity: 1.2, transparent: true });
      const nodeCoreMat = new THREE.MeshBasicMaterial({ color: seamColor, transparent: true });
      const traceMat = new THREE.LineBasicMaterial({ color: RED, transparent: true, opacity: 0.8 });
      const nodes: THREE.Mesh[] = [];
      const pulses: THREE.Sprite[] = [];
      const nodeDirs = [new THREE.Vector3(0.34, 0.18, 0.08), new THREE.Vector3(-0.3, 0.24, -0.1), new THREE.Vector3(0.05, -0.36, 0.12)];
      nodeDirs.forEach((d) => {
        const n = new THREE.Mesh(new THREE.SphereGeometry(0.048, 20, 16), nodeMat);
        n.position.copy(d);
        const c = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), nodeCoreMat);
        n.add(c);
        circuit.add(n);
        nodes.push(n);
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), d]), traceMat);
        circuit.add(line);
        const p = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowMap, color: seamColor, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
        p.scale.setScalar(0.07);
        circuit.add(p);
        pulses.push(p);
      });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.004, 6, 80), new THREE.MeshBasicMaterial({ color: 0xf5f2eb, transparent: true, opacity: 0.35 }));
      circuit.add(ring);
      circuit.visible = false;
      heart.add(circuit);
      assembly.updateMatrixWorld(true);

      // ---------- Particles sampled from the real surfaces ----------
      const count = coarse || mobile() ? 18000 : 40000;
      const positions = new Float32Array(count * 3);
      const normals = new Float32Array(count * 3);
      const targets = new Float32Array(count * 3);
      const seeds = new Float32Array(count);
      const partIdx = new Float32Array(count);
      let s = 24601;
      const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
      const samplers = parts.map((p) => new MeshSurfaceSampler(p.mesh).build());
      const v = new THREE.Vector3(), n = new THREE.Vector3();
      const nm = new THREE.Matrix3();
      for (let i = 0; i < count; i++) {
        const k = i % parts.length;
        const m = parts[k].mesh;
        samplers[k].sample(v, n);
        v.applyMatrix4(m.matrixWorld);
        nm.getNormalMatrix(m.matrixWorld);
        n.applyMatrix3(nm).normalize();
        v.toArray(positions, i * 3);
        n.toArray(normals, i * 3);
        const a = rand() * Math.PI * 2, b = rand() * Math.PI * 2, r = 1.75 + 0.3 * Math.cos(b);
        targets.set([Math.cos(a) * r, Math.sin(a) * r * 0.66 + 0.15 * Math.sin(b), 0.3 * Math.sin(b) + Math.sin(a) * 0.6], i * 3);
        seeds[i] = rand();
        partIdx[i] = k;
      }
      for (let i = count - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        for (let c = 0; c < 3; c++) {
          [positions[i * 3 + c], positions[j * 3 + c]] = [positions[j * 3 + c], positions[i * 3 + c]];
          [normals[i * 3 + c], normals[j * 3 + c]] = [normals[j * 3 + c], normals[i * 3 + c]];
          [targets[i * 3 + c], targets[j * 3 + c]] = [targets[j * 3 + c], targets[i * 3 + c]];
        }
        [seeds[i], seeds[j]] = [seeds[j], seeds[i]];
        [partIdx[i], partIdx[j]] = [partIdx[j], partIdx[i]];
      }
      const textPts = sampleWord('HANDLED.', count, rand);
      const pg = new THREE.BufferGeometry();
      pg.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      pg.setAttribute('aNormal', new THREE.BufferAttribute(normals, 3));
      pg.setAttribute('aTarget', new THREE.BufferAttribute(targets, 3));
      pg.setAttribute('aText', new THREE.BufferAttribute(textPts, 3));
      pg.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
      pg.setAttribute('aPart', new THREE.BufferAttribute(partIdx, 1));
      const uniforms = {
        uTime: { value: 0 }, uMorph: { value: 0 }, uText: { value: 0 }, uSignal: { value: 0 }, uOpacity: { value: 0 }, uSize: { value: dpr }, uSpin: { value: 0 },
        uPointer: { value: new THREE.Vector2(9, 9) }, uPush: { value: 0 }, uLightTheme: { value: 0 }, uVel: { value: new THREE.Vector2(0, 0) }, uIntro: { value: 0 },
      };
      const shader = new THREE.ShaderMaterial({
        uniforms, transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending,
        vertexShader: `
          attribute vec3 aTarget; attribute vec3 aText; attribute vec3 aNormal; attribute float aSeed; attribute float aPart;
          uniform float uTime, uMorph, uText, uSignal, uSize, uSpin, uPush, uIntro;
          uniform vec2 uPointer, uVel;
          varying float vSeed; varying float vLight;
          mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }
          void main(){
            vSeed = aSeed;
            float order = 0.62 * aSeed + 0.38 * (aPart / 3.0);
            float m = smoothstep(order * 0.6, order * 0.6 + 0.4, uMorph);
            vec3 tgt = aTarget;
            tgt.xz = rot(uSpin + aSeed * 0.35) * tgt.xz;
            vec3 p = mix(position, tgt, m);
            p += aNormal * sin(uTime * 0.7 + aSeed * 6.2831) * 0.014 * (1.0 - m);
            p += vec3(sin(uTime*0.5+aSeed*9.0), cos(uTime*0.4+aSeed*7.0), sin(uTime*0.6+aSeed*5.0)) * 0.05 * m;
            float tm = smoothstep(aSeed * 0.5, aSeed * 0.5 + 0.5, uText);
            vec3 txt = aText + vec3(0.0, sin(uTime * 0.9 + aSeed * 12.0) * 0.006, 0.0);
            p = mix(p, txt, tm);
            vec3 scatter = normalize(aTarget + vec3(0.01)) * (0.05 + aSeed * 0.25);
            p = mix(scatter, p, uIntro);
            vec3 sig = normalize(tgt) * (0.22 + aSeed * 0.16) + vec3(0.0, sin(uTime*1.3+aSeed*6.28)*0.02, 0.0);
            p = mix(p, sig, uSignal);
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            mv.xy -= uVel * aSeed * uSignal * 0.45;
            vec3 nrm = normalize(normalMatrix * aNormal);
            float keyL = max(dot(nrm, normalize(vec3(-0.5, 0.75, 0.6))), 0.0);
            float rimL = pow(1.0 - max(dot(nrm, vec3(0.0, 0.0, 1.0)), 0.0), 2.0);
            float facing = mix(smoothstep(-0.55, 0.25, nrm.z), 1.0, max(m, tm));
            vLight = (0.22 + keyL * 0.75 + rimL * 0.55) * facing;
            gl_Position = projectionMatrix * mv;
            vec2 ndc = gl_Position.xy / gl_Position.w;
            vec2 away = ndc - uPointer;
            float dist = length(away);
            float push = smoothstep(0.42, 0.0, dist) * uPush * (0.35 + aSeed * 0.65);
            gl_Position.xy += normalize(away + vec2(0.0001)) * push * 0.16 * gl_Position.w;
            float size = (0.9 + aSeed * 1.6) * uSize * (15.0 / -mv.z);
            size *= mix(1.0, 0.8, m) * mix(1.0, 1.1, tm) * mix(1.0, 1.15, uSignal) * mix(2.2, 1.0, uIntro);
            gl_PointSize = clamp(size, 1.0, 7.0);
          }`,
        fragmentShader: `
          uniform float uOpacity, uSignal, uLightTheme; varying float vSeed; varying float vLight;
          void main(){
            vec2 q = gl_PointCoord - 0.5; float d = length(q); if (d > 0.5) discard;
            float red = max(step(0.93, vSeed), uSignal * step(0.6, vSeed));
            vec3 silver = mix(vec3(0.82, 0.78, 0.74), vec3(0.16, 0.15, 0.14), uLightTheme);
            vec3 c = mix(silver, vec3(0.757, 0.153, 0.176), red);
            float a = (1.0 - smoothstep(0.12, 0.5, d)) * uOpacity * mix(vLight, 0.35 + vLight * 0.65, uLightTheme) * mix(1.0, 1.6, red);
            gl_FragColor = mix(vec4(c * a, a), vec4(c, a), uLightTheme);
          }`,
      });
      const particles = new THREE.Points(pg, shader);
      particles.frustumCulled = false;
      root.add(particles);

      // ---------- Incoming stream: messages flowing into the core ----------
      const sCount = coarse ? 900 : 2400;
      const sT = new Float32Array(sCount), sSeed = new Float32Array(sCount), sLane = new Float32Array(sCount);
      for (let i = 0; i < sCount; i++) { sT[i] = rand(); sSeed[i] = rand(); sLane[i] = i % 3; }
      const sg = new THREE.BufferGeometry();
      sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(sCount * 3), 3));
      sg.setAttribute('aT', new THREE.BufferAttribute(sT, 1));
      sg.setAttribute('aSeed', new THREE.BufferAttribute(sSeed, 1));
      sg.setAttribute('aLane', new THREE.BufferAttribute(sLane, 1));
      const sUniforms = {
        uTime: { value: 0 }, uOpacity: { value: 0 }, uSize: { value: dpr }, uEnd: { value: new THREE.Vector3() }, uLightTheme: { value: 0 },
        uStart: { value: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] }, uCtrl: { value: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] },
      };
      const streamMat = new THREE.ShaderMaterial({
        uniforms: sUniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        vertexShader: `
          attribute float aT, aSeed, aLane; uniform float uTime, uSize; uniform vec3 uEnd; uniform vec3 uStart[3]; uniform vec3 uCtrl[3];
          varying float vT; varying float vSeed;
          void main(){
            int lane = int(aLane + 0.5);
            vec3 a = uStart[lane], c = uCtrl[lane];
            float t = fract(aT + uTime * (0.16 + aSeed * 0.1));
            vT = t; vSeed = aSeed;
            float u = 1.0 - t;
            vec3 p = u*u*a + 2.0*u*t*c + t*t*uEnd;
            p += vec3(sin(aSeed*40.0 + t*6.0), cos(aSeed*30.0 + t*5.0), sin(aSeed*20.0)) * 0.12 * (1.0 - t);
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = clamp((1.2 + aSeed * 1.8) * uSize * (12.0 / -mv.z) * (0.5 + t), 1.0, 5.0);
          }`,
        fragmentShader: `
          uniform float uOpacity, uLightTheme; varying float vT; varying float vSeed;
          void main(){
            vec2 q = gl_PointCoord - 0.5; float d = length(q); if (d > 0.5) discard;
            float fade = smoothstep(0.0, 0.15, vT) * (1.0 - smoothstep(0.85, 1.0, vT));
            vec3 c = mix(mix(vec3(0.8,0.76,0.72), vec3(0.2,0.19,0.18), uLightTheme), vec3(0.757,0.153,0.176), step(0.88, vSeed));
            float a = (1.0 - smoothstep(0.1, 0.5, d)) * uOpacity * fade;
            gl_FragColor = mix(vec4(c * a, a), vec4(c, a), uLightTheme);
          }`,
      });
      const stream = new THREE.Points(sg, streamMat);
      stream.frustumCulled = false;
      scene.add(stream);

      // ---------- Inbox storm: the opener ----------
      const gCount = coarse ? 900 : 2600;
      const gHome = new Float32Array(gCount * 3), gSeed = new Float32Array(gCount), gKind = new Float32Array(gCount);
      const worldH0 = 2 * Math.tan(THREE.MathUtils.degToRad(15)) * 10;
      const worldW0 = worldH0 * (innerWidth / innerHeight);
      for (let i = 0; i < gCount; i++) {
        gHome.set([(rand() - 0.5) * worldW0 * 1.25, (rand() - 0.5) * worldH0 * 1.25, (rand() - 0.5) * 3.2], i * 3);
        gSeed[i] = rand();
        gKind[i] = i % 4;
      }
      const gg = new THREE.BufferGeometry();
      gg.setAttribute('position', new THREE.BufferAttribute(gHome, 3));
      gg.setAttribute('aSeed', new THREE.BufferAttribute(gSeed, 1));
      gg.setAttribute('aKind', new THREE.BufferAttribute(gKind, 1));
      const gUniforms = {
        uTime: { value: 0 }, uGather: { value: 0 }, uOpacity: { value: 0 }, uSize: { value: dpr }, uPush: { value: 0 }, uLightTheme: { value: 0 },
        uEnd: { value: new THREE.Vector3() }, uPointer: { value: uniforms.uPointer.value }, uAtlas: { value: glyphAtlas() },
      };
      const stormMat = new THREE.ShaderMaterial({
        uniforms: gUniforms, transparent: true, depthWrite: false, depthTest: false, blending: THREE.NormalBlending,
        vertexShader: `
          attribute float aSeed, aKind;
          uniform float uTime, uGather, uSize, uOpacity, uPush; uniform vec3 uEnd; uniform vec2 uPointer;
          varying float vKind, vAlpha, vRot, vRed;
          void main(){
            vKind = aKind; vRed = step(0.9, aSeed);
            float g = smoothstep(aSeed * 0.55, aSeed * 0.55 + 0.45, uGather);
            vec3 drift = vec3(sin(uTime*0.6 + aSeed*20.0), cos(uTime*0.5 + aSeed*13.0), sin(uTime*0.4 + aSeed*7.0)) * 0.22 + vec3(uTime * 0.12 * (aSeed - 0.5), 0.0, 0.0);
            vec3 home = position + drift;
            vec3 toEnd = uEnd - home;
            vec3 ctrl = home + toEnd * 0.45 + vec3(-toEnd.y, toEnd.x, 0.0) * (0.7 * (aSeed - 0.5)) + vec3(0.0, 0.0, 1.4);
            float u = 1.0 - g;
            vec3 p = u*u*home + 2.0*u*g*ctrl + g*g*uEnd;
            vRot = (aSeed - 0.5) * 0.8 + g * 7.0 * (aSeed - 0.5);
            vAlpha = uOpacity * (0.55 + aSeed * 0.45) * (1.0 - smoothstep(0.86, 1.0, g));
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;
            vec2 ndc = gl_Position.xy / gl_Position.w;
            vec2 away = ndc - uPointer; float d = length(away);
            gl_Position.xy += normalize(away + vec2(0.0001)) * smoothstep(0.4, 0.0, d) * uPush * 0.14 * gl_Position.w;
            float size = (16.0 + aSeed * 18.0) * uSize * (10.0 / -mv.z) * (1.0 - g * 0.75);
            gl_PointSize = clamp(size, 2.0, 72.0);
          }`,
        fragmentShader: `
          uniform sampler2D uAtlas; uniform float uLightTheme; varying float vKind, vAlpha, vRot, vRed;
          void main(){
            vec2 q = gl_PointCoord - 0.5; float c = cos(vRot), s = sin(vRot); q = mat2(c, -s, s, c) * q + 0.5;
            if (q.x < 0.0 || q.x > 1.0 || q.y < 0.0 || q.y > 1.0) discard;
            float a = texture2D(uAtlas, vec2((q.x + vKind) / 4.0, 1.0 - q.y)).a;
            vec3 col = mix(mix(vec3(0.92, 0.9, 0.86), vec3(0.14, 0.13, 0.12), uLightTheme), vec3(0.757, 0.153, 0.176), vRed);
            gl_FragColor = vec4(col, a * vAlpha);
          }`,
      });
      const storm = new THREE.Points(gg, stormMat);
      storm.frustumCulled = false;
      storm.renderOrder = 5;
      scene.add(storm);

      // ---------- Six mini cores for the employee cards ----------
      type Clone = { g: THREE.Group; mats: THREE.Material[]; core: THREE.Mesh; glow: THREE.Sprite; hover: number; e: number };
      const clones: Clone[] = [];
      for (let i = 0; i < 6; i++) {
        const g = new THREE.Group();
        const mats: THREE.Material[] = [];
        parts.forEach((p) => {
          const m = (p.mesh.material as THREE.Material).clone();
          mats.push(m);
          const mesh = new THREE.Mesh(p.mesh.geometry, m);
          mesh.position.copy(p.base);
          mesh.rotation.copy(p.rot);
          g.add(mesh);
        });
        const core = new THREE.Mesh(heartCore.geometry, (heartCore.material as THREE.Material).clone());
        core.scale.setScalar(1.3);
        const gl = new THREE.Sprite((glow.material as THREE.SpriteMaterial).clone());
        gl.scale.setScalar(0.7);
        const sm = new THREE.Mesh(seam.geometry, (seam.material as THREE.Material).clone());
        sm.position.z = 0.4;
        const sm2 = sm.clone();
        sm2.position.z = -0.4;
        g.add(core, gl, sm, sm2);
        g.visible = false;
        scene.add(g);
        clones.push({ g, mats, core, glow: gl, hover: 0, e: 0 });
      }

      // ---------- Labels ----------
      const labels = Array.from(labelWrap!.querySelectorAll<HTMLElement>('[data-core-label]'));
      const nodeLabels = Array.from(labelWrap!.querySelectorAll<HTMLElement>('[data-node-label]'));
      const labelPos = new THREE.Vector3();

      // ---------- State ----------
      let anchors: Anchor[] = [];
      let slots: HTMLElement[] = [], lit: HTMLElement[] = [];
      let gridTop = 0, gridBottom = 0;
      let width = 0, height = 0;
      let targetScroll = scrollY, scroll = scrollY, px = 0, py = 0, tpx = 0, tpy = 0, last = 0, running = false, raf = 0;
      let idleFrames = 0, pointerActive = 0, spinBoost = 0, intro = 0, pulse = 0, flared = false, front = false;
      const skipOpener = scrollY > innerHeight * 0.25; // reloaded mid-page: no storm, no assembly
      if (skipOpener) { intro = 1; flared = true; }
      const startedAt = performance.now();
      const prevPos = new THREE.Vector3(), vel = new THREE.Vector3();
      const lightVars = { x: -1e9, y: -1e9, p: -1 };
      let lightTheme = document.documentElement.dataset.theme === 'light';
      const themeObserver = new MutationObserver(() => { lightTheme = document.documentElement.dataset.theme === 'light'; wake(); });
      themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      const hero = document.getElementById('hero');
      const heroRunway = () => Math.max(1, (hero?.offsetHeight ?? height) - height);

      function measure() {
        if (width !== innerWidth || height !== innerHeight) {
          width = innerWidth; height = innerHeight;
          renderer.setSize(width, height);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        }
        const m = mobile();
        anchors = Array.from(document.querySelectorAll<HTMLElement>('[data-core-anchor]')).map((e) => {
          const r = e.getBoundingClientRect();
          const y = Number(m ? e.dataset.mobileY ?? e.dataset.y ?? 0.5 : e.dataset.y ?? 0.5);
          return { docY: r.top + window.scrollY - height * y, x: Number(m ? e.dataset.mobileX ?? e.dataset.x ?? 0.5 : e.dataset.x ?? 0.5), y, scale: Number(m ? e.dataset.mobileScale ?? e.dataset.scale ?? 1 : e.dataset.scale ?? 1), id: e.id };
        }).sort((a, b) => a.docY - b.docY);
        if (anchors.length) anchors[0].docY = Math.min(anchors[0].docY, 0);
        slots = Array.from(document.querySelectorAll<HTMLElement>('[data-core-clone]')).slice(0, 6);
        lit = Array.from(document.querySelectorAll<HTMLElement>('[data-lit]'));
        const grid = document.querySelector<HTMLElement>('.employee-grid');
        if (grid) { const r = grid.getBoundingClientRect(); gridTop = r.top + window.scrollY; gridBottom = r.bottom + window.scrollY; }
      }

      const worldH = () => 2 * Math.tan(THREE.MathUtils.degToRad(15)) * 10;
      const toWorld = (fx: number, fy: number) => new THREE.Vector3((fx - 0.5) * worldH() * (width / height), (0.5 - fy) * worldH(), 0);
      const curve = new THREE.CubicBezierCurve3();
      const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tmpC = new THREE.Vector3(), tmpD = new THREE.Vector3();
      const setVar = (name: string, value: string) => document.documentElement.style.setProperty(name, value);

      function pose(t: number, dt: number) {
        const prevScroll = scroll;
        scroll += (targetScroll - scroll) * (1 - Math.exp(-10 * dt));
        const scrollV = (scroll - prevScroll) / Math.max(dt, 0.001);
        spinBoost += (clamp(scrollV / 4000, -1, 1) * 0.5 - spinBoost) * (1 - Math.exp(-4 * dt));
        const age = (performance.now() - startedAt) / 1000;
        // Opener timeline: storm drifts 0.1-1.5s, gathers 1.5-2.7s, the heart flares, the core assembles 2.3-4.2s.
        if (!skipOpener) {
          intro = clamp((age - 2.3) / 1.9, 0, 1);
          if (!flared && age > 2.45) { flared = true; pulse = 1; }
        }
        const introE = 1 - Math.pow(1 - intro, 3);
        pulse = Math.max(0, pulse - dt * 1.6);
        const k = 1 - Math.exp(-7 * dt);
        px += (tpx - px) * k; py += (tpy - py) * k;
        pointerActive += ((tpx || tpy ? 1 : 0) - pointerActive) * k;
        key.position.set(-5 + px * 10, 6 - py * 12, 7);
        uniforms.uPush.value = gUniforms.uPush.value = pointerActive;
        uniforms.uLightTheme.value = sUniforms.uLightTheme.value = gUniforms.uLightTheme.value = lightTheme ? 1 : 0;
        shader.blending = streamMat.blending = lightTheme ? THREE.NormalBlending : THREE.AdditiveBlending;
        renderer.toneMappingExposure = lightTheme ? 1.0 : 1.15;

        const runway = heroRunway();
        const progress = clamp(scroll / runway, 0, 1);
        const reform = sstep(scroll, runway, runway + height * 0.85);
        const explode = sstep(progress, 0.06, 0.24) * (1 - reform);
        const dive = sstep(progress, 0.27, 0.41) * (1 - sstep(progress, 0.5, 0.58));
        const dissolve = sstep(progress, 0.58, 0.68);
        const text = sstep(progress, 0.68, 0.76) * (1 - sstep(progress, 0.84, 0.88));
        const collapse = sstep(progress, 0.86, 0.96);
        const streamOn = sstep(progress, 0.04, 0.12) * (1 - sstep(progress, 0.46, 0.54));
        const split = sstep(scroll, gridTop - height * 0.7, gridTop - height * 0.2) * (1 - sstep(scroll, gridBottom - height * 0.55, gridBottom - height * 0.05));

        let a = anchors[0], b = anchors[0];
        for (let i = 0; i < anchors.length - 1; i++) if (scroll >= anchors[i].docY) { a = anchors[i]; b = anchors[i + 1]; }
        if (!a) return;
        const local = clamp((scroll - a.docY) / Math.max(1, b.docY - a.docY), 0, 1);
        const mix = local * local * (3 - 2 * local);
        tmpA.copy(toWorld(a.x, a.y));
        tmpB.copy(toWorld(b.x, b.y));
        const dir = Math.sign(tmpB.x - tmpA.x) || 1;
        curve.v0.copy(tmpA);
        curve.v1.set(tmpA.x + dir * 0.4, tmpA.y - 0.9, 0.6);
        curve.v2.set(tmpB.x - dir * 0.4, tmpB.y + 0.9, -0.4);
        curve.v3.copy(tmpB);
        root.position.copy(curve.getPoint(mix));
        const centre = toWorld(0.5, mobile() ? 0.36 : 0.5);
        root.position.lerp(centre, text);
        root.position.x += px * 0.9 * (1 - progress * 0.5);
        root.position.y -= py * 0.9 * (1 - progress * 0.5);
        const scale = lerp(a.scale, b.scale, mix) * clamp(height / 820, 0.55, 1) * lerp(0.9, 1, introE) * (1 - sstep(split, 0, 0.55));
        root.scale.setScalar(scale * lerp(1, mobile() ? 0.62 : 1, text));
        vel.copy(root.position).sub(prevPos).multiplyScalar(1 / Math.max(dt, 0.001));
        prevPos.copy(root.position);
        uniforms.uVel.value.set(clamp(vel.x * 0.12, -1.2, 1.2), clamp(vel.y * 0.12, -1.2, 1.2));

        const idle = t;
        const straight = Math.max(text, dive);
        const rx = 0.34 + py * 1.6 + Math.sin(idle * 0.21) * 0.03 + explode * 0.12;
        const ry = -0.62 + px * 2.2 + Math.sin(idle * 0.13) * 0.09 + progress * 1.1 + spinBoost + (scroll > runway ? (scroll - runway) * 0.0006 : 0);
        const rz = -0.08 + px * py * 0.8 + Math.sin(idle * 0.17) * 0.02;
        root.rotation.set(lerp(rx, py * 0.3, straight), lerp(ry, px * 0.4, straight), lerp(rz, 0, straight));

        // Camera: the dive goes through the front loop into the heart, with a little pointer parallax.
        camera.position.set(root.position.x * dive + px * 0.8 * dive, root.position.y * dive - py * 0.8 * dive, 10 - dive * 8.35);
        camera.lookAt(root.position.x * dive, root.position.y * dive, root.position.z * dive);
        camera.updateMatrixWorld();
        camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
        scene.environmentRotation.y = scroll * 0.0009 + px * 0.6;

        const solidOpacity = clamp((1 - dissolve + reform) * introE, 0, 1);
        parts.forEach((p) => {
          p.mesh.position.copy(p.base).addScaledVector(p.axis, explode * 0.62);
          p.mesh.rotation.copy(p.rot);
          p.mesh.rotation.z += explode * (p.label % 2 ? 0.18 : -0.18);
          const mat = p.mesh.material as THREE.MeshPhysicalMaterial;
          const baseOpacity = mat === glassMat || p.label === 2 ? 0.62 : 1;
          mat.opacity = baseOpacity * solidOpacity;
          p.mesh.visible = mat.opacity > 0.01;
        });
        (seam.material as THREE.MeshBasicMaterial).opacity = 0.9 * solidOpacity * (0.5 + explode * 0.5);
        seam.visible = seam2.visible = (seam.material as THREE.MeshBasicMaterial).opacity > 0.02;
        seam.position.z = 0.4 + explode * 0.62;
        seam2.position.z = -0.4 - explode * 0.62;
        heart.scale.setScalar((1 + explode * 1.15 - dissolve * 0.7 + reform * 0.6 + pulse * 0.35) * lerp(0.2, 1, introE) * (1 - text * 0.999));
        heart.rotation.y = idle * 0.35 * (1 - dive);
        heart.rotation.x = idle * 0.2 * (1 - dive);
        heartGlass.scale.setScalar(1 - dive * 0.999);
        heartCore.scale.setScalar(1 - dive * 0.6);
        (heartCore.material as THREE.MeshPhysicalMaterial).emissiveIntensity = 1.1 + explode * 1.6 + pulse * 3 + Math.sin(idle * 1.8) * 0.25;
        (heartGlass.material as THREE.MeshPhysicalMaterial).opacity = 0.55 * clamp(solidOpacity + 0.3, 0, 1);
        (heartCore.material as THREE.MeshPhysicalMaterial).opacity = clamp(solidOpacity + 0.4, 0, 1) * introE;
        // While the storm gathers, the heart is the only thing lit: a growing ember the glyphs fall into.
        const ember = skipOpener ? 0 : sstep(age, 1.3, 2.4) * (1 - sstep(age, 2.6, 3.4));
        (glow.material as THREE.SpriteMaterial).opacity = Math.max((lightTheme ? 0.12 : 0.28) * clamp(solidOpacity + collapse * 0.6, 0, 1) * (0.5 + explode * 0.5 + pulse) * introE * (1 - text) * (1 - dive * 0.7), ember * (lightTheme ? 0.25 : 0.55));
        glow.scale.setScalar(0.5 + explode * 0.4 + pulse * 0.3 + ember * 4);
        (heartCore.material as THREE.MeshPhysicalMaterial).opacity = Math.max((heartCore.material as THREE.MeshPhysicalMaterial).opacity, ember);
        heartLight.position.copy(root.position);
        heartLight.intensity = (2 + explode * 12 + pulse * 10 + ember * 8) * scale * scale * clamp(solidOpacity + collapse + ember, 0, 1);

        // The circuit inside: nodes orbit, pulses travel the traces.
        circuit.visible = dive > 0.01;
        if (circuit.visible) {
          circuit.scale.setScalar(lerp(0.4, 1, dive) / Math.max(heart.scale.x, 0.001));
          circuit.rotation.z = idle * 0.18;
          circuit.rotation.y = px * 0.5;
          nodeMat.opacity = dive;
          nodeCoreMat.opacity = dive;
          traceMat.opacity = 0.8 * dive;
          (ring.material as THREE.MeshBasicMaterial).opacity = 0.35 * dive;
          pulses.forEach((p, i) => {
            const f = (idle * 0.55 + i / 3) % 1;
            p.position.copy(nodeDirs[i]).multiplyScalar(f);
            (p.material as THREE.SpriteMaterial).opacity = dive * (0.4 + 0.6 * Math.sin(f * Math.PI));
          });
        }

        uniforms.uTime.value = idle;
        uniforms.uIntro.value = introE;
        uniforms.uMorph.value = dissolve * (1 - reform);
        uniforms.uText.value = text;
        uniforms.uSignal.value = collapse;
        uniforms.uSpin.value = idle * 0.12 + progress * 1.4;
        uniforms.uOpacity.value = Math.max(clamp(dissolve * 1.1 - reform * 0.9, 0, 1) * 0.95 + (scroll > runway ? 0.1 : 0), (1 - introE) * 0.9 * sstep(intro, 0, 0.08));
        particles.visible = uniforms.uOpacity.value > 0.01 && dive < 0.5;

        const ww = worldH() * (width / height), wh = worldH();
        sUniforms.uEnd.value.copy(root.position);
        sUniforms.uStart.value[0].set(-ww * 0.62, wh * 0.25, -1.5);
        sUniforms.uStart.value[1].set(-ww * 0.2, wh * 0.68, -1.0);
        sUniforms.uStart.value[2].set(-ww * 0.55, -wh * 0.6, -0.5);
        sUniforms.uCtrl.value[0].set(-ww * 0.2, wh * 0.05, 0.4);
        sUniforms.uCtrl.value[1].set(root.position.x - 1.5, wh * 0.5, 0.2);
        sUniforms.uCtrl.value[2].set(root.position.x - 2.5, -wh * 0.3, 0.6);
        sUniforms.uTime.value = idle;
        sUniforms.uOpacity.value = streamOn * 0.9;
        stream.visible = sUniforms.uOpacity.value > 0.01;

        // Storm
        const stormOn = skipOpener ? 0 : sstep(age, 0.1, 0.6) * (1 - sstep(age, 3.3, 3.6));
        storm.visible = stormOn > 0.01;
        gUniforms.uTime.value = idle;
        gUniforms.uOpacity.value = stormOn * (lightTheme ? 0.9 : 0.8);
        gUniforms.uGather.value = sstep(age, 1.5, 2.7);
        gUniforms.uEnd.value.copy(root.position);

        root.visible = scale > 0.012;

        // Six mini cores
        const sixOn = split > 0.001 && slots.length === 6;
        // While the six are out, the canvas sits in front of the page so they fly over the cards.
        if (sixOn !== front) { front = sixOn; el!.classList.toggle('front', front); }
        const slotScale = (30 * wh / height) / 1.02;
        clones.forEach((c, i) => {
          if (!sixOn) { c.g.visible = false; c.e = 0; return; }
          const slot = slots[i];
          const r = slot.getBoundingClientRect();
          const e = sstep(split, i * 0.07, i * 0.07 + 0.58);
          c.e = e;
          if (e < 0.001 || r.bottom < -80 || r.top > height + 80) { c.g.visible = false; return; }
          tmpC.copy(toWorld((r.left + r.width / 2) / width, (r.top + r.height / 2) / height));
          const hov = slot.closest('.employee')?.matches(':hover') ? 1 : 0;
          c.hover += (hov - c.hover) * k;
          tmpD.copy(root.position).lerp(tmpC, 0.5).add(new THREE.Vector3((i % 2 ? 1 : -1) * 0.6, 0.8, 1.6));
          const u = 1 - e;
          c.g.position.set(
            u * u * root.position.x + 2 * u * e * tmpD.x + e * e * tmpC.x,
            u * u * root.position.y + 2 * u * e * tmpD.y + e * e * tmpC.y,
            u * u * root.position.z + 2 * u * e * tmpD.z + e * e * tmpC.z,
          );
          c.g.scale.setScalar(lerp(scale * 0.35 + 0.02, slotScale, e) * (1 + c.hover * 0.12));
          c.g.rotation.set(0.42 + u * 2.2 + py * 0.3, idle * (0.35 + c.hover * 1.6) + i * 1.1 + u * 4.5 + px * 0.5, -0.1);
          c.mats.forEach((m, j) => { (m as THREE.MeshPhysicalMaterial).opacity = (j < 2 ? 0.62 : 1) * sstep(e, 0, 0.3); });
          (c.core.material as THREE.MeshPhysicalMaterial).emissiveIntensity = 1.4 + c.hover * 2.5 + Math.sin(idle * 2 + i) * 0.3;
          (c.glow.material as THREE.SpriteMaterial).opacity = (lightTheme ? 0.1 : 0.3) * (0.7 + c.hover * 0.8);
          c.g.visible = true;
        });

        // Scrolling light: publish the core's screen position and brightness for the DOM.
        tmpC.copy(root.position).project(camera);
        const lx = (tmpC.x * 0.5 + 0.5) * width, ly = (-tmpC.y * 0.5 + 0.5) * height;
        const lp = root.visible ? clamp((heartLight.intensity / 6) * (0.6 + 0.4 * introE), 0, 1) * (1 - dive) : 0;
        if (Math.abs(lx - lightVars.x) > 0.5 || Math.abs(ly - lightVars.y) > 0.5 || Math.abs(lp - lightVars.p) > 0.01) {
          lightVars.x = lx; lightVars.y = ly; lightVars.p = lp;
          setVar('--lx', `${lx.toFixed(1)}px`); setVar('--ly', `${ly.toFixed(1)}px`); setVar('--lp', lp.toFixed(3));
        }
        lit.forEach((el2) => {
          const r = el2.getBoundingClientRect();
          if (r.bottom < -120 || r.top > height + 120) { if (el2.dataset.litOn) { el2.style.setProperty('--cp', '0'); delete el2.dataset.litOn; } return; }
          const cx = lx - r.left, cy = ly - r.top;
          const d = Math.hypot(cx - r.width / 2, cy - r.height / 2);
          const p = lp * clamp(1 - d / 1100, 0, 1);
          el2.style.setProperty('--cx', `${cx.toFixed(0)}px`);
          el2.style.setProperty('--cy', `${cy.toFixed(0)}px`);
          el2.style.setProperty('--cp', p.toFixed(3));
          el2.dataset.litOn = '1';
        });

        const labelAlpha = sstep(explode, 0.35, 0.9) * (1 - sstep(progress, 0.2, 0.27));
        root.updateMatrixWorld();
        labels.forEach((lab, i) => {
          const part = parts.find((p) => p.label === i);
          if (!part) return;
          part.mesh.getWorldPosition(labelPos);
          labelPos.project(camera);
          const sx = (labelPos.x * 0.5 + 0.5) * width, sy = (-labelPos.y * 0.5 + 0.5) * height;
          lab.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px)`;
          lab.style.opacity = String(labelAlpha);
        });
        const nodeAlpha = sstep(dive, 0.6, 1);
        nodeLabels.forEach((lab, i) => {
          const node = nodes[i];
          if (!node) return;
          node.getWorldPosition(labelPos);
          labelPos.project(camera);
          const sx = (labelPos.x * 0.5 + 0.5) * width, sy = (-labelPos.y * 0.5 + 0.5) * height;
          lab.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px)`;
          lab.style.opacity = String(nodeAlpha);
        });
      }

      function animate(ms: number) {
        if (disposed) return;
        const dt = Math.min((ms - last) / 1000 || 0.016, 0.06);
        last = ms;
        pose(ms / 1000, dt);
        const anyClone = clones.some((c) => c.g.visible);
        if (!document.hidden && (root.visible || stream.visible || storm.visible || anyClone)) { renderer.render(scene, camera); idleFrames = 0; } else { renderer.clear(); idleFrames++; }
        const settled = Math.abs(targetScroll - scroll) < 0.4 && Math.abs(tpx - px) < 0.002 && Math.abs(tpy - py) < 0.002 && intro >= 1 && pulse <= 0;
        if (idleFrames > 60 && settled) { running = false; return; }
        raf = requestAnimationFrame(animate);
      }
      function wake() { if (running || disposed) return; running = true; last = performance.now(); raf = requestAnimationFrame(animate); }
      function onScroll() { targetScroll = window.scrollY; wake(); }
      function onPointer(e: PointerEvent) {
        const strength = coarse ? 0.5 : 1;
        tpx = (e.clientX / width - 0.5) * 0.36 * strength;
        tpy = (e.clientY / height - 0.5) * 0.24 * strength;
        uniforms.uPointer.value.set((e.clientX / width) * 2 - 1, -(e.clientY / height) * 2 + 1);
        wake();
      }
      function onPointerLeave() { tpx = 0; tpy = 0; uniforms.uPointer.value.set(9, 9); wake(); }
      function onVisibility() { if (!document.hidden) { targetScroll = window.scrollY; wake(); } }
      function onPulse() { pulse = 1; wake(); }

      measure();
      let measureRaf = 0;
      const observer = new ResizeObserver(() => { cancelAnimationFrame(measureRaf); measureRaf = requestAnimationFrame(() => { measure(); wake(); }); });
      observer.observe(document.body);
      document.fonts.ready.then(() => { if (!disposed) measure(); });
      window.addEventListener('load', measure);
      window.addEventListener('resize', measure);
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('pointermove', onPointer, { passive: true });
      document.documentElement.addEventListener('pointerleave', onPointerLeave);
      document.addEventListener('visibilitychange', onVisibility);
      window.addEventListener('oca:pulse', onPulse);
      renderer.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); onReady?.(false); });

      wake();
      el!.classList.add('ready');
      onReady?.(true);

      return () => {
        disposed = true;
        running = false;
        cancelAnimationFrame(raf);
        cancelAnimationFrame(measureRaf);
        observer.disconnect();
        themeObserver.disconnect();
        window.removeEventListener('load', measure);
        window.removeEventListener('resize', measure);
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('pointermove', onPointer);
        document.documentElement.removeEventListener('pointerleave', onPointerLeave);
        document.removeEventListener('visibilitychange', onVisibility);
        window.removeEventListener('oca:pulse', onPulse);
        scene.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.geometry) m.geometry.dispose();
          if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => x.dispose());
        });
        env.dispose();
        renderer.dispose();
        renderer.domElement.remove();
        el!.classList.remove('ready');
        ['--lx', '--ly', '--lp'].forEach((n2) => document.documentElement.style.removeProperty(n2));
      };
    }

    return () => { cancelled = true; clearTimeout(timer); cleanup?.(); };
  }, [onReady]);

  return (
    <div ref={host} className="core-canvas" aria-hidden="true">
      <div ref={labelsRef} className="core-labels">
        {['Front desk', 'Sales', 'Content', 'Operations'].map((n, i) => (
          <span key={n} data-core-label className="core-label"><i /><b>0{i + 1}</b>{n}</span>
        ))}
        {['Reads it', 'Routes it', 'Confirms it'].map((n) => (
          <span key={n} data-node-label className="core-label node-label"><i /><b>·</b>{n}</span>
        ))}
      </div>
    </div>
  );
}
