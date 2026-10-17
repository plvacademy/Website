/**
 * PLV — ambient background: small balls, rings, diamonds and sparkles fly across the whole page on random curved paths,
 * plus drifting dust. One fixed canvas behind the content. Every path is re-randomised each time, nothing sits in a fixed place.
 */
const rnd = (a, b) => a + Math.random() * (b - a);

export function initAmbient(canvas, { lite = false } = {}) {
  if (!canvas || matchMedia('(prefers-reduced-motion: reduce)').matches) return { stop() {} };
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1, raf = 0, last = 0, running = false;
  const flights = [], dust = [];

  const size = () => {
    dpr = Math.min(devicePixelRatio || 1, lite ? 1 : 1.5);
    W = innerWidth; H = innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const newDust = (any) => {
    const life = rnd(6, 12);
    return { x: rnd(0, W), y: rnd(any ? 0 : H * 0.4, H), vx: rnd(-8, 8), vy: -rnd(8, 24), age: any ? rnd(0, life) : 0, life, s: [1.2, 1.6, 1.6, 2, 2.6][Math.floor(Math.random() * 5)], blue: Math.random() < 0.35 };
  };
  const newFlight = (any) => {
    const flip = Math.random() < 0.5, y0 = rnd(H * 0.1, H * 0.95);
    const p1y = Math.max(20, Math.min(H - 20, y0 + rnd(-H * 0.55, H * 0.3)));
    return {
      sh: ['o', 'r', 'd', 's', 's'][Math.floor(Math.random() * 5)],
      p0: { x: flip ? W + 40 : -40, y: y0 }, p1: { x: flip ? -40 : W + 40, y: p1y },
      c: { x: rnd(W * 0.2, W * 0.8), y: Math.max(0, Math.min(H, (y0 + p1y) / 2 + rnd(-H * 0.4, H * 0.1))) },
      t: any ? -rnd(0, 5) : -rnd(0.4, 4), dur: rnd(6, 11),
    };
  };
  const bez = (f, u) => {
    const a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u;
    return [a * f.p0.x + b * f.c.x + c * f.p1.x, a * f.p0.y + b * f.c.y + c * f.p1.y];
  };
  const fill = () => {
    flights.length = 0; dust.length = 0;
    const area = Math.max(0.5, Math.min(1.6, (W * H) / (1440 * 800)));
    const nf = Math.round((lite ? 5 : 9) * area + 2), nd = Math.round((lite ? 18 : 34) * area);
    for (let i = 0; i < nf; i++) flights.push(newFlight(true));
    for (let i = 0; i < nd; i++) dust.push(newDust(true));
  };

  const drawShape = (sh, x, y, r, a) => {
    ctx.globalAlpha = a;
    if (sh === 'o') { ctx.fillStyle = '#FF850B'; ctx.shadowColor = 'rgba(255,133,11,.8)'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill(); ctx.shadowBlur = 0; }
    else if (sh === 'r') { ctx.strokeStyle = '#FF850B'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r * 1.5, 0, 6.2832); ctx.stroke(); }
    else if (sh === 'd') { ctx.fillStyle = '#9fc6f5'; ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4); ctx.fillRect(-r, -r, r * 2, r * 2); ctx.restore(); }
    else { ctx.fillStyle = '#fff'; const R = r * 2.2, k = R * 0.24; ctx.beginPath(); ctx.moveTo(x, y - R); ctx.lineTo(x + k, y - k); ctx.lineTo(x + R, y); ctx.lineTo(x + k, y + k); ctx.lineTo(x, y + R); ctx.lineTo(x - k, y + k); ctx.lineTo(x - R, y); ctx.lineTo(x - k, y - k); ctx.closePath(); ctx.fill(); }
  };

  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    if (now - last < 33) return;
    const dt = Math.min(0.1, (now - last) / 1000 || 0.033); last = now;
    ctx.clearRect(0, 0, W, H);
    dust.forEach((d, i) => {
      d.x += d.vx * dt; d.y += d.vy * dt; d.age += dt;
      if (d.age > d.life || d.y < -10) { dust[i] = newDust(false); return; }
      ctx.globalAlpha = Math.sin(Math.PI * d.age / d.life) * 0.7;
      ctx.fillStyle = d.blue ? '#9fc6f5' : '#ffd2a0';
      ctx.beginPath(); ctx.arc(d.x, d.y, d.s, 0, 6.2832); ctx.fill();
    });
    flights.forEach((f, i) => {
      f.t += dt;
      if (f.t >= f.dur) { flights[i] = newFlight(false); return; }
      if (f.t < 0) return;
      const u = f.t / f.dur, fade = Math.min(1, u * 8, (1 - u) * 8);
      for (let k = 6; k >= 1; k--) {
        const uu = u - k * 0.012; if (uu < 0) continue;
        const [qx, qy] = bez(f, uu);
        ctx.globalAlpha = fade * (0.5 - k * 0.07); ctx.fillStyle = '#FF850B';
        ctx.beginPath(); ctx.arc(qx, qy, Math.max(1, 3 - k * 0.3), 0, 6.2832); ctx.fill();
      }
      const [x, y] = bez(f, u);
      drawShape(f.sh, x, y, f.sh === 'o' ? 4.5 : f.sh === 'r' ? 5 : 4, fade);
    });
    ctx.globalAlpha = 1;
  };
  const start = () => { if (running) return; running = true; last = 0; raf = requestAnimationFrame(frame); };
  const stop = () => { running = false; cancelAnimationFrame(raf); };

  size(); fill(); start();
  addEventListener('resize', () => { size(); fill(); });
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  return { stop };
}
