/**
 * PLV — Coaches page 3D scenes (Three.js, self-hosted in js/vendor).
 * Both scenes are purely illustrative: a floating volleyball and a tactical court with sample paths. No match data.
 * Each init function returns { setActive(bool), destroy() }; the caller pauses them when off-screen.
 */
import * as THREE from '../vendor/three.module.min.js?v=25';

const ORANGE = 0xff850b, BLUE = 0x3fa7ff;

function makeRenderer(stage, lite) {
  const canvas = stage.querySelector('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !lite, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, lite ? 1 : 1.6));
  renderer.setClearColor(0x000000, 0);
  return renderer;
}

/** Runs `frame(dt, t)` only while active, and resizes with the stage. */
function createLoop(stage, renderer, camera, frame) {
  let raf = 0, active = false, last = 0, time = 0;
  const resize = () => {
    const w = stage.clientWidth || 1, h = stage.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize); ro.observe(stage); resize();
  const tick = (now) => {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now; time += dt;
    frame(dt, time);
  };
  return {
    setActive(on) {
      if (on === active) return; active = on;
      if (on) { last = performance.now(); raf = requestAnimationFrame(tick); } else cancelAnimationFrame(raf);
    },
    destroy() { active = false; cancelAnimationFrame(raf); ro.disconnect(); },
  };
}

function disposeScene(scene, renderer) {
  scene.traverse((o) => {
    o.geometry?.dispose();
    const m = o.material; (Array.isArray(m) ? m : m ? [m] : []).forEach((x) => { x.map?.dispose(); x.dispose(); });
  });
  renderer.dispose();
}

/* ------------------------------------------------------------------ */
/* Hero ball                                                           */
/* ------------------------------------------------------------------ */
function ballTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#f2f5f9'; g.fillRect(0, 0, 1024, 512);
  const bands = 6;
  for (let i = 0; i < bands; i++) {
    const x0 = (i / bands) * 1024, w = 1024 / bands;
    g.fillStyle = i % 2 ? '#ff850b' : '#dfe6ee';
    g.beginPath(); g.moveTo(x0, 0);
    g.bezierCurveTo(x0 + w * 0.9, 150, x0 - w * 0.2, 360, x0 + w * 0.4, 512);
    g.lineTo(x0 + w * 0.4 + w * 0.46, 512);
    g.bezierCurveTo(x0 - w * 0.2 + w * 0.46, 360, x0 + w * 0.9 + w * 0.46, 150, x0 + w * 0.46, 0);
    g.closePath(); g.fill();
  }
  g.strokeStyle = 'rgba(7,29,51,.55)'; g.lineWidth = 3;
  for (let i = 0; i < bands * 2; i++) {
    const x0 = (i / (bands * 2)) * 1024;
    g.beginPath(); g.moveTo(x0, 0); g.bezierCurveTo(x0 + 60, 150, x0 - 30, 360, x0 + 36, 512); g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}

export function initBall(stage, { lite = false } = {}) {
  const renderer = makeRenderer(stage, lite);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(0, 0, 7.6);

  const group = new THREE.Group(); scene.add(group);
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(1.5, lite ? 32 : 64, lite ? 24 : 48),
    new THREE.MeshStandardMaterial({ map: ballTexture(), roughness: 0.5, metalness: 0.05 }),
  );
  group.add(ball);
  // thin orbit rings = tracking overlay
  const ringMat = new THREE.MeshBasicMaterial({ color: ORANGE, transparent: true, opacity: 0.55 });
  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.012, 8, 120), ringMat); ring1.rotation.x = 1.2; group.add(ring1);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.45, 0.008, 8, 120), new THREE.MeshBasicMaterial({ color: BLUE, transparent: true, opacity: 0.35 })); ring2.rotation.set(0.5, 0.4, 0.9); group.add(ring2);

  scene.add(new THREE.AmbientLight(0xbcd2ee, 0.75));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(-3, 3, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(ORANGE, 2.6); rim.position.set(4, -1, -2); scene.add(rim);
  const fill = new THREE.PointLight(BLUE, 8, 12); fill.position.set(-4, -2, 3); scene.add(fill);

  let tx = 0, ty = 0;
  const onMove = (e) => { tx = (e.clientX / innerWidth - 0.5) * 2; ty = (e.clientY / innerHeight - 0.5) * 2; };
  addEventListener('pointermove', onMove, { passive: true });

  const loop = createLoop(stage, renderer, camera, (dt, t) => {
    ball.rotation.y += dt * 0.35; ball.rotation.x = Math.sin(t * 0.4) * 0.12;
    group.rotation.y += (tx * 0.35 - group.rotation.y) * Math.min(1, dt * 3);
    group.rotation.x += (ty * 0.2 - group.rotation.x) * Math.min(1, dt * 3);
    group.position.y = Math.sin(t * 0.9) * 0.1;
    ring1.rotation.z += dt * 0.25; ring2.rotation.z -= dt * 0.18;
    renderer.render(scene, camera);
  });
  stage.classList.add('is-3d');
  renderer.render(scene, camera);
  return {
    setActive: loop.setActive,
    destroy() { loop.destroy(); removeEventListener('pointermove', onMove); disposeScene(scene, renderer); stage.classList.remove('is-3d'); },
  };
}

/* ------------------------------------------------------------------ */
/* Tactical court                                                      */
/* ------------------------------------------------------------------ */
function courtTexture() {
  const W = 1800, H = 900, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, W, H); grad.addColorStop(0, '#0d3357'); grad.addColorStop(1, '#071d33');
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 6;
  g.strokeRect(3, 3, W - 6, H - 6);
  g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2, H); g.stroke(); // centre line
  g.lineWidth = 4; g.strokeStyle = 'rgba(255,255,255,.55)';
  g.beginPath(); g.moveTo(W / 2 - W / 6, 0); g.lineTo(W / 2 - W / 6, H); g.moveTo(W / 2 + W / 6, 0); g.lineTo(W / 2 + W / 6, H); g.stroke(); // 3 m lines
  g.strokeStyle = 'rgba(63,167,255,.12)'; g.lineWidth = 2;
  for (let x = 0; x <= W; x += 100) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  for (let y = 0; y <= H; y += 100) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return tex;
}

export function initCourt(stage, { lite = false } = {}) {
  const renderer = makeRenderer(stage, lite);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x040b16, 16, 34);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);
  const L = 18, Wd = 9; // metres: a regulation court is 18 x 9

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(L, Wd), new THREE.MeshStandardMaterial({ map: courtTexture(), roughness: 0.75 }));
  floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(L + 8, Wd + 8), new THREE.MeshBasicMaterial({ color: 0x040b16 }));
  apron.rotation.x = -Math.PI / 2; apron.position.y = -0.02; scene.add(apron);

  // net: translucent mesh + white top band
  const netCanvas = document.createElement('canvas'); netCanvas.width = netCanvas.height = 128;
  const ng = netCanvas.getContext('2d'); ng.strokeStyle = 'rgba(255,255,255,.75)'; ng.lineWidth = 3;
  for (let i = 0; i <= 128; i += 16) { ng.beginPath(); ng.moveTo(i, 0); ng.lineTo(i, 128); ng.moveTo(0, i); ng.lineTo(128, i); ng.stroke(); }
  const netTex = new THREE.CanvasTexture(netCanvas); netTex.wrapS = netTex.wrapT = THREE.RepeatWrapping; netTex.repeat.set(18, 2);
  const net = new THREE.Mesh(new THREE.PlaneGeometry(Wd + 1, 1), new THREE.MeshBasicMaterial({ map: netTex, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
  net.rotation.y = Math.PI / 2; net.position.y = 2.0; scene.add(net);
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, Wd + 1), new THREE.MeshBasicMaterial({ color: 0xffffff })); band.position.y = 2.43; scene.add(band);
  [-1, 1].forEach((s) => { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.5, 10), new THREE.MeshStandardMaterial({ color: 0xc9d3df })); post.position.set(0, 1.25, s * (Wd / 2 + 0.5)); scene.add(post); });

  // players (sample 6 v 6 formation, markers only)
  const rows = [[-7.2, -3, 0, 3], [-2.8, -3.2, 0, 3.2]];
  const markers = [];
  const addTeam = (sign, color) => rows.forEach(([x, ...zs]) => zs.forEach((z) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.1, 24), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.55 }));
    m.position.set(x * sign, 0.06, z);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(x * sign, 0.03, z);
    scene.add(m, ring); markers.push({ m, ring, base: 0.06, ph: Math.random() * 6 });
  }));
  addTeam(1, BLUE); addTeam(-1, ORANGE);

  // attack path (sample): left-side set -> hit across the net, plus movement lines
  const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-2.8, 0.1, 3.2), new THREE.Vector3(1.8, 6.4, 0.6), new THREE.Vector3(6.2, 0.1, -1.6));
  const pts = curve.getPoints(80);
  const pathGeo = new THREE.BufferGeometry().setFromPoints(pts);
  const path = new THREE.Line(pathGeo, new THREE.LineBasicMaterial({ color: ORANGE })); scene.add(path);
  const ghost = new THREE.Line(pathGeo, new THREE.LineBasicMaterial({ color: ORANGE, transparent: true, opacity: 0.18 })); scene.add(ghost);
  const dash = (a, b, color) => {
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a), new THREE.Vector3(...b)]), new THREE.LineDashedMaterial({ color, dashSize: 0.3, gapSize: 0.22, transparent: true, opacity: 0.8 }));
    l.computeLineDistances(); scene.add(l);
  };
  dash([2.8, 0.05, 3.2], [5.2, 0.05, 1.2], BLUE); dash([7.2, 0.05, 0], [6.4, 0.05, -1.6], BLUE); dash([-7.2, 0.05, -3], [-4.2, 0.05, -1.4], ORANGE);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 16), new THREE.MeshStandardMaterial({ map: ballTexture(), roughness: 0.5, emissive: 0x331a00 }));
  scene.add(ball);

  scene.add(new THREE.AmbientLight(0xbcd2ee, 0.9));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(-6, 12, 8); scene.add(sun);
  const rimL = new THREE.PointLight(ORANGE, 30, 26); rimL.position.set(-8, 4, -6); scene.add(rimL);

  let tx = 0, ty = 0, cx = 0, cy = 0, scrollP = 0;
  const onMove = (e) => {
    const r = stage.getBoundingClientRect();
    tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
    ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2));
  };
  const onLeave = () => { tx = ty = 0; };
  const onScroll = () => { const r = stage.getBoundingClientRect(); scrollP = Math.max(-1, Math.min(1, 1 - (r.top + r.height / 2) / innerHeight * 2 + 0)); };
  stage.addEventListener('pointermove', onMove); stage.addEventListener('pointerleave', onLeave); addEventListener('scroll', onScroll, { passive: true }); onScroll();

  const loop = createLoop(stage, renderer, camera, (dt, t) => {
    cx += (tx - cx) * Math.min(1, dt * 3); cy += (ty - cy) * Math.min(1, dt * 3);
    const yaw = -0.5 + cx * 0.35 + scrollP * 0.2, dist = 21 - scrollP * 2;
    camera.position.set(Math.sin(yaw) * dist * 0.6 - 3, 9.5 + cy * 1.2, Math.cos(yaw) * dist * 0.9);
    camera.lookAt(0, 0.8, 0);
    stage.style.setProperty('--cx', cx.toFixed(3)); stage.style.setProperty('--cy', cy.toFixed(3));
    const cycle = 4.2, p = (t % cycle) / cycle, prog = Math.min(1, p / 0.7); // 70% flight, 30% pause
    const e = prog * prog * (3 - 2 * prog);
    ball.position.copy(curve.getPoint(e)); ball.position.y += 0.15; ball.rotation.x += dt * 6; ball.visible = true;
    path.geometry.setDrawRange(0, Math.max(2, Math.floor(e * 81)));
    markers.forEach((k) => { k.m.position.y = k.base + Math.sin(t * 1.6 + k.ph) * 0.03; k.ring.material.opacity = 0.4 + Math.sin(t * 1.6 + k.ph) * 0.15; });
    renderer.render(scene, camera);
  });
  stage.classList.add('is-3d');
  renderer.render(scene, camera);
  return {
    setActive: loop.setActive,
    destroy() {
      loop.destroy(); stage.removeEventListener('pointermove', onMove); stage.removeEventListener('pointerleave', onLeave); removeEventListener('scroll', onScroll);
      disposeScene(scene, renderer); stage.classList.remove('is-3d');
    },
  };
}
