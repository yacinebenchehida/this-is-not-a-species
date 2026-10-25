/* Replicate ponds: independent neutral Wright–Fisher populations from the same start. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('replicate-ponds');
  if (!canvas || !window.DriftModel || !window.DuckCharacter) return;
  const { createPopulation, nextGeneration, countAlleles } = window.DriftModel;
  const { bead, palette } = window.DuckCharacter;
  const c = canvas.getContext('2d'), W = 1000, H = 260;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const SMALL = '#c98a1e', LARGE = '#2d5878', RATE = 10, LIMIT = 5000;
  let mode = 'same', ponds = [], generation = 0, running = false, accumulator = 0, last = null, time = 0, chartDirty = true;

  function blob(cx, cy, rx, ry, k, seed) {
    c.beginPath();
    for (let i = 0; i <= 80; i++) {
      const a = i / 80 * Math.PI * 2, r = 1 + .05 * Math.sin(3 * a + 1 + seed) + .03 * Math.sin(5 * a + seed * 2);
      const x = cx + Math.cos(a) * rx * k * r, y = cy + Math.sin(a) * ry * k * r;
      if (i) c.lineTo(x, y); else c.moveTo(x, y);
    }
    c.closePath();
  }
  // Seats for N ducks inside the pond ellipse, nearest the centre first.
  function seats(n, cx, cy, rx, ry) {
    for (let gap = 30; gap > 3; gap -= .5) {
      const points = [];
      for (let y = cy - ry; y <= cy + ry; y += gap) {
        const row = Math.round((y - cy) / gap);
        for (let x = cx - rx; x <= cx + rx; x += gap * 1.45) {
          const px = x + (Math.abs(row) % 2) * gap * .72, u = (px - cx) / (rx * .8), v = (y - cy) / (ry * .78);
          if (u * u + v * v <= 1) points.push({ x: px, y, d: u * u + v * v });
        }
      }
      if (points.length >= n) return { points: points.sort((a, b) => a.d - b.d).slice(0, n), gap };
    }
    return { points: [], gap: 3 };
  }
  function fresh() {
    const sizes = mode === 'same' ? [12, 12, 12, 12, 12] : [6, 6, 6, 96, 96, 96], cell = W / sizes.length;
    ponds = sizes.map((size, i) => {
      const P = { cx: cell * (i + .5), cy: 106, rx: cell * .4, ry: 74 };
      const population = createPopulation(size, .5);
      return { size, population, history: [.5], fixedAt: null, fixedTo: null, label: 'ABCDEF'[i], P, seats: seats(size, P.cx, P.cy, P.rx, P.ry), phase: Math.random() * 9, seed: i * 1.3 };
    });
    generation = 0; running = false; accumulator = 0; chartDirty = true; controls();
  }
  function step() {
    generation++;
    for (const pond of ponds) {
      if (pond.fixedAt !== null) continue;
      pond.population = nextGeneration(pond.population).population;
      const share = countAlleles(pond.population) / (2 * pond.size); pond.history.push(share);
      if (share === 0 || share === 1) { pond.fixedAt = generation; pond.fixedTo = share; }
    }
    if (ponds.every(p => p.fixedAt !== null) || generation >= LIMIT) running = false;
    chartDirty = true;
  }
  function controls() {
    const done = ponds.every(p => p.fixedAt !== null);
    $('replicate-run').innerHTML = running ? 'Pause <span aria-hidden="true">Ⅱ</span>' : done ? 'All fixed' : 'Run <span aria-hidden="true">▶</span>';
    $('replicate-run').disabled = done;
    $('mode-same').setAttribute('aria-pressed', String(mode === 'same'));
    $('mode-compare').setAttribute('aria-pressed', String(mode !== 'same'));
    $('replicate-legend').innerHTML = mode === 'same'
      ? `<span>Generation ${generation}</span><span>Each line is one pond, labelled at its end.</span>`
      : `<span>Generation ${generation}</span><span><i style="background:${SMALL}"></i>6 ducks</span><span><i style="background:${LARGE}"></i>96 ducks</span><span>Small ponds swing harder and usually lose a colour sooner.</span>`;
  }
  function drawPonds() {
    const ratio = canvas.width / W; c.setTransform(ratio, 0, 0, canvas.height / H, 0, 0);
    c.fillStyle = '#cddcaa'; c.fillRect(0, 0, W, H);
    for (const pond of ponds) {
      const { P } = pond;
      blob(P.cx, P.cy, P.rx, P.ry, 1.09, pond.seed); c.fillStyle = '#f2dfae'; c.fill();
      blob(P.cx, P.cy, P.rx, P.ry, 1, pond.seed);
      const g = c.createRadialGradient(P.cx - 20, P.cy - 20, 5, P.cx, P.cy, P.rx); g.addColorStop(0, '#b4e4e0'); g.addColorStop(1, '#88c7c9');
      c.fillStyle = g; c.fill(); c.strokeStyle = '#5caaa7'; c.lineWidth = 1.4; c.stroke();
      const { points, gap } = pond.seats, r = Math.min(5.5, gap * .26);
      points.forEach((seat, j) => {
        const still = reduced.matches, x = seat.x + (still ? 0 : Math.sin(time * .8 + j * 1.7 + pond.phase) * gap * .08), y = seat.y + (still ? 0 : Math.cos(time * .7 + j * 2.3) * gap * .06);
        c.beginPath(); c.ellipse(x, y + r * .3, r * 2.5, r * 1.6, 0, 0, Math.PI * 2); c.fillStyle = '#f8d465'; c.fill();
        if (r > 2.5) { c.strokeStyle = '#34777b'; c.lineWidth = .9; c.stroke(); }
        const duck = pond.population[j];
        for (const k of [0, 1]) {
          const bx = x + (k ? 1 : -1) * r * 1.05;
          if (r > 3.2) bead(c, bx, y, duck[k], r); else { c.beginPath(); c.arc(bx, y, r, 0, Math.PI * 2); c.fillStyle = palette[duck[k]]; c.fill(); }
        }
      });
      const share = pond.history[pond.history.length - 1];
      c.textAlign = 'center'; c.fillStyle = '#09232c'; c.font = '600 13.5px Georgia,serif';
      c.fillText(`Pond ${pond.label} · ${pond.size} ducks`, P.cx, 212);
      c.font = '12.5px system-ui,sans-serif'; c.fillStyle = '#37514f';
      c.fillText(pond.fixedAt !== null ? `${pond.fixedTo ? 'Teal' : 'Coral'} fixed at generation ${pond.fixedAt}` : `Teal ${Math.round(share * 100)}%`, P.cx, 231);
      const width = P.rx * 1.3, x0 = P.cx - width / 2;
      c.fillStyle = '#e8795e'; c.beginPath(); c.roundRect(x0, 240, width, 6, 3); c.fill();
      if (share > 0) { c.fillStyle = '#399b94'; c.beginPath(); c.roundRect(x0, 240, width * share, 6, 3); c.fill(); }
      c.textAlign = 'left';
    }
  }
  function drawChart() {
    if (!chartDirty) return; chartDirty = false;
    const left = 40, right = 960, top = 12, bottom = 170;
    const extent = Math.max(30, Math.ceil(generation / 30) * 30);
    const x = i => left + i / extent * (right - left), y = p => bottom - p * (bottom - top);
    const gridLines = [0, .25, .5, .75, 1].map(p => `<line x1="${left}" x2="${right}" y1="${y(p)}" y2="${y(p)}" stroke="#e1dfca"/><text class="chart-label" x="${left - 7}" y="${y(p) + 4}" text-anchor="end">${p * 100}%</text>`).join('');
    const ticks = [0, extent / 3, 2 * extent / 3, extent].map(i => `<text class="chart-label" x="${x(i)}" y="${bottom + 16}" text-anchor="middle">${Math.round(i)}</text>`).join('');
    const labels = [];
    const lines = ponds.map(pond => {
      const colour = mode === 'same' ? '#2f4a46' : pond.size < 50 ? SMALL : LARGE, h = pond.history;
      const stride = Math.max(1, Math.ceil(h.length / 400)), pts = [];
      for (let i = 0; i < h.length; i += stride) pts.push(`${x(i).toFixed(1)},${y(h[i]).toFixed(1)}`);
      pts.push(`${x(h.length - 1).toFixed(1)},${y(h[h.length - 1]).toFixed(1)}`);
      labels.push({ x: x(h.length - 1) + 5, y: y(h[h.length - 1]) + 4, colour, text: pond.label });
      return `<polyline points="${pts.join(' ')}" fill="none" stroke="${colour}" stroke-opacity=".85" stroke-width="2" stroke-linejoin="round"/>`;
    }).join('');
    labels.sort((a, b) => a.y - b.y);
    for (let i = 1; i < labels.length; i++) if (Math.abs(labels[i].x - labels[i - 1].x) < 14 && labels[i].y - labels[i - 1].y < 12) labels[i].y = labels[i - 1].y + 12;
    const text = labels.map(l => `<text x="${l.x.toFixed(1)}" y="${l.y.toFixed(1)}" fill="${l.colour}" font-size="11" font-weight="600" font-family="system-ui,sans-serif">${l.text}</text>`).join('');
    $('replicate-chart').innerHTML = `<svg viewBox="0 0 980 205" role="img" aria-label="Teal share in each pond over ${generation} generations."><text class="chart-title" x="${left}" y="8">Teal share in each pond</text>${gridLines}${ticks}${lines}${text}<text class="chart-label" x="${(left + right) / 2}" y="${bottom + 32}" text-anchor="middle">Generation</text></svg>`;
  }
  function frame(now) {
    const dt = last === null ? 0 : Math.min(.1, (now - last) / 1000); last = now;
    if (!document.hidden) {
      if (!reduced.matches) time += dt;
      if (running) {
        accumulator += dt * RATE;
        while (accumulator >= 1 && running) { accumulator--; step(); }
        controls();
      }
      drawPonds(); drawChart();
    }
    setTimeout(() => requestAnimationFrame(frame), 1000 / 30 - 2);
  }
  $('replicate-run').addEventListener('click', () => { running = !running; accumulator = 0; controls(); });
  $('replicate-new').addEventListener('click', fresh);
  $('mode-same').addEventListener('click', () => { mode = 'same'; fresh(); });
  $('mode-compare').addEventListener('click', () => { mode = 'compare'; fresh(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && running) { running = false; controls(); } });
  fresh(); requestAnimationFrame(frame);
})();
