/**
 * PLV — illustrative 3D volleyball court built from CSS 3D transforms (no WebGL).
 * The court turns slowly; a ball is played three touches per side: first touch to the setter, the setter sets
 * the outside hitters, middle or opposite, the third touch crosses the net. Illustration only, no match data.
 */
const RX = 64;

export function initCourt(host, { reduced = false } = {}) {
  host.innerHTML = `<div class="ch-c3b"><div class="ch-c3wrap"><div class="ch-c3" data-c3>
    <div class="ch-c3apron"></div><div class="ch-c3floor"></div>
    <div class="ch-c3line" style="left:319px;top:0;width:3px;height:320px;background:#fff"></div>
    <div class="ch-c3line" style="left:213px;top:0;width:1.5px;height:320px;background:rgba(255,255,255,.4)"></div>
    <div class="ch-c3line" style="left:427px;top:0;width:1.5px;height:320px;background:rgba(255,255,255,.4)"></div>
        <div class="ch-c3post" style="top:-8px"></div><div class="ch-c3post p2" style="top:-8px"></div>
    <div class="ch-c3post" style="top:322px"></div><div class="ch-c3post p2" style="top:322px"></div>
    <div class="ch-c3ant" style="top:2px"></div><div class="ch-c3ant" style="top:318px"></div>
    <div class="ch-c3net"></div>
    <div class="ch-c3sh ch-c3bb" data-sh></div><div class="ch-c3ball ch-c3bb" data-ball></div>
  </div></div></div>`;
  const root = host.querySelector('[data-c3]');
  const F = [[250, 55, 'OH'], [250, 160, 'MB'], [250, 265, 'S'], [110, 55, 'L'], [110, 160, 'OH'], [110, 265, 'OPP']];
  const P = F.map(([x, y, c]) => ({ x, y, c, team: 'b' })).concat(F.map(([x, y, c]) => ({ x: 640 - x, y: 320 - y, c, team: 'o' })));
  const anchor = root.querySelector('.ch-c3post');
  P.forEach((p) => {
    const dot = document.createElement('div'); dot.className = `ch-c3dot ${p.team}`; dot.style.cssText = `left:${p.x}px;top:${p.y}px`;
    const lab = document.createElement('div'); lab.className = `ch-c3lab ch-c3bb ${p.team}`; lab.textContent = p.c;
    root.insertBefore(dot, anchor); root.insertBefore(lab, anchor); p.lab = lab;
  });
  const ball = host.querySelector('[data-ball]'), sh = host.querySelector('[data-sh]');
  const trailEls = Array.from({ length: 9 }, () => { const e = document.createElement('div'); e.className = 'ch-c3tr ch-c3bb'; root.insertBefore(e, sh); return e; });

  let rz = -28, cur, prev = -1, touch = 1, seg, hist, trail = [], raf = 0, active = false, last = 0;
  const bb = (x, y, z) => `translate3d(${x}px,${y}px,${z}px) rotateZ(${-rz}deg) rotateX(${-RX}deg)`;
  const idx = P.map((p, i) => i);
  const setter = (team) => idx.find((i) => P[i].team === team && P[i].c === 'S');
  const pickFrom = (arr) => {
    let c = arr.filter((i) => hist.indexOf(i) < 0); if (!c.length) c = arr;
    const w = c[Math.floor(Math.random() * c.length)];
    hist.push(w); if (hist.length > 3) hist.shift();
    return w;
  };
  const next = () => {
    const me = P[cur].team;
    if (touch === 1) {
      const t = setter(me); hist.push(t); if (hist.length > 3) hist.shift();
      seg = { from: cur, to: t, t0: Date.now(), dur: 950, peak: 70, nt: 2 };
    } else if (touch === 2) {
      seg = { from: cur, to: pickFrom(idx.filter((i) => P[i].team === me && P[i].c !== 'S' && P[i].c !== 'L')), t0: Date.now(), dur: 950, peak: 90, nt: 3 };
    } else {
      seg = { from: cur, to: pickFrom(idx.filter((i) => P[i].team !== me && P[i].c !== 'S')), t0: Date.now(), dur: 1500, peak: 190, nt: 1 };
    }
  };
  cur = [0, 1, 3, 4, 5][Math.floor(Math.random() * 5)]; hist = [cur]; next();

  const draw = (x, y, z) => {
    root.style.transform = `rotateX(${RX}deg) rotateZ(${rz}deg) scale(0.8)`;
    P.forEach((p, i) => { p.lab.style.transform = bb(p.x, p.y, 30); p.lab.classList.toggle('hl', i === cur); });
    trailEls.forEach((e, i) => {
      const q = trail[trail.length - trailEls.length + i];
      if (!q) { e.style.opacity = 0; return; }
      e.style.transform = bb(q.x, q.y, q.z); e.style.opacity = ((i + 1) / trailEls.length * 0.55).toFixed(2);
    });
    ball.style.transform = bb(x, y, z);
    sh.style.transform = `translate3d(${x}px,${y}px,1px) scale(${(1 / (1 + z / 160)).toFixed(2)})`;
    sh.style.opacity = (0.55 / (1 + z / 120)).toFixed(2);
  };
  const tick = (now) => {
    raf = requestAnimationFrame(tick);
    if (now - last < 33) return;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0.033; last = now;
    rz += 11.25 * dt;
    let u = (Date.now() - seg.t0) / seg.dur;
    if (u >= 1) { prev = cur; cur = seg.to; touch = seg.nt; next(); u = 0; }
    const a = P[seg.from], b = P[seg.to];
    const x = a.x + (b.x - a.x) * u, y = a.y + (b.y - a.y) * u, z = 36 + seg.peak * 4 * u * (1 - u);
    trail.push({ x, y, z }); if (trail.length > 9) trail.shift();
    draw(x, y, z);
  };
  draw(P[cur].x, P[cur].y, 36);
  return {
    setActive(on) {
      if (reduced) return;
      if (on && !active) { active = true; last = 0; raf = requestAnimationFrame(tick); }
      else if (!on && active) { active = false; cancelAnimationFrame(raf); }
    },
  };
}
