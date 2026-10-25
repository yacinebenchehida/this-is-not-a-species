/* Replicate ponds: independent neutral Wright–Fisher populations from the same start. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('replicate-ponds');
  if (!canvas || !window.DriftModel || !window.DuckCharacter) return;
  const { createPopulation, nextGeneration, countAlleles } = window.DriftModel;
  const { bead, palette } = window.DuckCharacter;
  const c = canvas.getContext('2d'), W = 1000;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const TEAL = '#399b94', CORAL = '#e8795e', OPEN = '#2f4a46', SMALL = '#c98a1e', LARGE = '#2d5878', LIMIT = 5000;
  let mode = 'many', ponds = [], generation = 0, running = false, accumulator = 0, last = null, time = 0, chartDirty = true;
  let H = 260, layout = null;

  function blob(cx, cy, rx, ry, seed) {
    c.beginPath();
    for (let i = 0; i <= 64; i++) {
      const a = i / 64 * Math.PI * 2, r = 1 + .05 * Math.sin(3 * a + 1 + seed) + .03 * Math.sin(5 * a + seed * 2);
      const x = cx + Math.cos(a) * rx * r, y = cy + Math.sin(a) * ry * r;
      if (i) c.lineTo(x, y); else c.moveTo(x, y);
    }
    c.closePath();
  }
  // Seats for N ducks inside the pond ellipse, nearest the centre first.
  function seats(n, cx, cy, rx, ry) {
    for (let gap = 30; gap > 2; gap -= .25) {
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
    return { points: [], gap: 2 };
  }
  const share = () => Number($('rep-share').value) / 100;
  function fresh() {
    const sizes = mode === 'many' ? Array(Number($('rep-count').value)).fill(Number($('rep-size').value)) : [6, 6, 6, 96, 96, 96];
    const n = sizes.length, cols = n <= 6 ? n : n <= 10 ? 5 : 10, rows = Math.ceil(n / cols);
    const cw = W / cols, compact = cols > 6, tileH = compact ? 134 : n > 6 ? 182 : 250, ry = compact ? 38 : n > 6 ? 52 : 74;
    H = rows * tileH; layout = { cols, cw, tileH, compact };
    canvas.width = 2 * W; canvas.height = 2 * H; canvas.style.aspectRatio = `${W} / ${H}`;
    const start = share();
    ponds = sizes.map((size, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const P = { cx: cw * (col + .5), cy: row * tileH + ry * 1.09 + 8, rx: cw * .4, ry };
      return { size, population: createPopulation(size, start), history: [], fixedAt: null, fixedTo: null,
        label: String(i + 1), P, seats: seats(size, P.cx, P.cy, P.rx, P.ry), phase: Math.random() * 9, seed: i * 1.3 };
    });
    ponds.forEach(p => p.history.push(countAlleles(p.population) / (2 * p.size)));
    generation = 0; running = false; accumulator = 0; chartDirty = true; controls();
  }
  function step() {
    generation++;
    for (const pond of ponds) {
      if (pond.fixedAt !== null) continue;
      pond.population = nextGeneration(pond.population).population;
      const value = countAlleles(pond.population) / (2 * pond.size); pond.history.push(value);
      if (value === 0 || value === 1) { pond.fixedAt = generation; pond.fixedTo = value; }
    }
    if (ponds.every(p => p.fixedAt !== null) || generation >= LIMIT) running = false;
    chartDirty = true;
  }
  const percent = v => `${Math.round(v * 100)}%`;
  function controls() {
    const done = ponds.every(p => p.fixedAt !== null), start = ponds.length ? ponds[0].history[0] : share();
    $('replicate-run').innerHTML = running ? 'Pause <span aria-hidden="true">Ⅱ</span>' : done ? 'All fixed' : 'Run <span aria-hidden="true">▶</span>';
    $('replicate-run').disabled = done;
    $('mode-many').setAttribute('aria-pressed', String(mode === 'many'));
    $('mode-compare').setAttribute('aria-pressed', String(mode !== 'many'));
    $('rep-count').disabled = $('rep-size').disabled = mode !== 'many';
    $('rep-share-label').textContent = percent(share());
    const teal = ponds.filter(p => p.fixedTo === 1).length, coral = ponds.filter(p => p.fixedTo === 0).length, open = ponds.length - teal - coral;
    $('replicate-summary').textContent = `Generation ${generation}: teal fixed in ${teal} of ${ponds.length} ponds, coral in ${coral}${open ? `, ${open} still mixed` : ''}. Expected: teal wins in about ${percent(start)} of ponds, its starting share (${Math.round(start * 2 * ponds[0].size)} of ${2 * ponds[0].size} copies).`;
    $('rep-tally-teal').style.width = `${teal + coral ? teal / (teal + coral) * 100 : 0}%`;
    $('rep-tally').classList.toggle('empty', !(teal + coral));
    $('rep-tally-mark').style.left = `${start * 100}%`;
    $('replicate-legend').innerHTML = mode === 'many'
      ? `<span>The bar shows how the finished ponds split; the mark is the starting share.</span><span><i style="background:${TEAL}"></i>teal fixed</span><span><i style="background:${CORAL}"></i>coral fixed</span><span><i style="background:${OPEN}"></i>still mixed</span>`
      : `<span>The bar shows how the finished ponds split; the mark is the starting share.</span><span><i style="background:${SMALL}"></i>6 ducks</span><span><i style="background:${LARGE}"></i>96 ducks</span><span>Small ponds swing harder and usually lose a colour sooner.</span>`;
  }
  function drawPonds() {
    c.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    c.fillStyle = '#cddcaa'; c.fillRect(0, 0, W, H);
    const compact = layout.compact;
    for (const pond of ponds) {
      const { P } = pond;
      blob(P.cx, P.cy, P.rx * 1.09, P.ry * 1.09, pond.seed); c.fillStyle = '#f2dfae'; c.fill();
      blob(P.cx, P.cy, P.rx, P.ry, pond.seed);
      const g = c.createRadialGradient(P.cx - P.rx * .25, P.cy - P.ry * .25, 4, P.cx, P.cy, P.rx); g.addColorStop(0, '#b4e4e0'); g.addColorStop(1, '#88c7c9');
      c.fillStyle = g; c.fill(); c.strokeStyle = '#5caaa7'; c.lineWidth = 1.2; c.stroke();
      const { points, gap } = pond.seats, r = Math.min(5.5, gap * .26);
      points.forEach((seat, j) => {
        const still = reduced.matches || running && compact;
        const x = seat.x + (still ? 0 : Math.sin(time * .8 + j * 1.7 + pond.phase) * gap * .08), y = seat.y + (still ? 0 : Math.cos(time * .7 + j * 2.3) * gap * .06);
        const duck = pond.population[j];
        if (r > 1.6) { c.beginPath(); c.ellipse(x, y + r * .3, r * 2.5, r * 1.6, 0, 0, Math.PI * 2); c.fillStyle = '#f8d465'; c.fill(); }
        if (r > 2.5) { c.strokeStyle = '#34777b'; c.lineWidth = .9; c.stroke(); }
        for (const k of [0, 1]) {
          const bx = x + (k ? 1 : -1) * r * 1.05;
          if (r > 3.2) bead(c, bx, y, duck[k], r); else { c.beginPath(); c.arc(bx, y, Math.max(1.1, r), 0, Math.PI * 2); c.fillStyle = palette[duck[k]]; c.fill(); }
        }
      });
      const value = pond.history[pond.history.length - 1], base = P.cy + P.ry * 1.09;
      c.textAlign = 'center'; c.fillStyle = '#09232c';
      c.font = compact ? '600 11px Georgia,serif' : '600 13.5px Georgia,serif';
      c.fillText(compact ? `Pond ${pond.label}` : `Pond ${pond.label} · ${pond.size} ducks`, P.cx, base + (compact ? 15 : 22));
      c.font = compact ? '10.5px system-ui,sans-serif' : '12.5px system-ui,sans-serif'; c.fillStyle = pond.fixedTo === null ? '#37514f' : pond.fixedTo ? '#2a7c76' : '#b9573d';
      const status = pond.fixedAt !== null ? (compact ? `${pond.fixedTo ? 'teal' : 'coral'} fixed` : `${pond.fixedTo ? 'Teal' : 'Coral'} fixed at generation ${pond.fixedAt}`) : `${Math.round(value * 100)}% teal`;
      c.fillText(status, P.cx, base + (compact ? 29 : 41));
      const width = P.rx * 1.3, x0 = P.cx - width / 2, by = base + (compact ? 35 : 50);
      c.fillStyle = CORAL; c.beginPath(); c.roundRect(x0, by, width, compact ? 4 : 6, 3); c.fill();
      if (value > 0) { c.fillStyle = TEAL; c.beginPath(); c.roundRect(x0, by, width * value, compact ? 4 : 6, 3); c.fill(); }
      c.textAlign = 'left';
    }
  }
  function drawChart() {
    if (!chartDirty) return; chartDirty = false;
    const left = 40, right = 960, top = 12, bottom = 170, start = ponds[0].history[0];
    const extent = Math.max(30, Math.ceil(generation / 30) * 30);
    const x = i => left + i / extent * (right - left), y = p => bottom - p * (bottom - top);
    const gridLines = [0, .25, .5, .75, 1].map(p => `<line x1="${left}" x2="${right}" y1="${y(p)}" y2="${y(p)}" stroke="#e1dfca"/><text class="chart-label" x="${left - 7}" y="${y(p) + 4}" text-anchor="end">${p * 100}%</text>`).join('');
    const ticks = [0, extent / 3, 2 * extent / 3, extent].map(i => `<text class="chart-label" x="${x(i)}" y="${bottom + 16}" text-anchor="middle">${Math.round(i)}</text>`).join('');
    const opacity = ponds.length > 10 ? .55 : .8;
    // Running ponds first, so finished teal and coral lines sit on top.
    const lines = ponds.slice().sort((a, b) => (a.fixedTo !== null) - (b.fixedTo !== null)).map(pond => {
      const colour = mode !== 'many' ? (pond.size < 50 ? SMALL : LARGE) : pond.fixedTo === null ? OPEN : pond.fixedTo ? TEAL : CORAL, h = pond.history;
      const stride = Math.max(1, Math.ceil(h.length / 300)), pts = [];
      for (let i = 0; i < h.length; i += stride) pts.push(`${x(i).toFixed(1)},${y(h[i]).toFixed(1)}`);
      pts.push(`${x(h.length - 1).toFixed(1)},${y(h[h.length - 1]).toFixed(1)}`);
      return `<polyline points="${pts.join(' ')}" fill="none" stroke="${colour}" stroke-opacity="${opacity}" stroke-width="1.8" stroke-linejoin="round"/>`;
    }).join('');
    $('replicate-chart').innerHTML = `<svg viewBox="0 0 980 205" role="img" aria-label="Teal share in each of ${ponds.length} ponds over ${generation} generations, all starting at ${percent(start)}."><text class="chart-title" x="${left}" y="8">Teal share in each pond</text>${gridLines}<line x1="${left}" x2="${right}" y1="${y(start)}" y2="${y(start)}" stroke="#7d8a78" stroke-dasharray="4 4"/>${ticks}${lines}<text class="chart-label" x="${(left + right) / 2}" y="${bottom + 32}" text-anchor="middle">Generation</text></svg>`;
  }
  function frame(now) {
    const dt = last === null ? 0 : Math.min(.1, (now - last) / 1000); last = now;
    if (!document.hidden) {
      if (!reduced.matches) time += dt;
      if (running) {
        // Larger ponds take longer to fix, so they run a little faster.
        accumulator += dt * Math.max(10, Math.max(...ponds.map(p => p.size)) / 4);
        while (accumulator >= 1 && running) { accumulator--; step(); }
        controls();
      }
      drawPonds(); drawChart();
    }
    setTimeout(() => requestAnimationFrame(frame), 1000 / 30 - 2);
  }
  $('replicate-run').addEventListener('click', () => { running = !running; accumulator = 0; controls(); });
  $('replicate-new').addEventListener('click', fresh);
  $('mode-many').addEventListener('click', () => { mode = 'many'; fresh(); });
  $('mode-compare').addEventListener('click', () => { mode = 'compare'; fresh(); });
  for (const id of ['rep-count', 'rep-size']) $(id).addEventListener('change', fresh);
  $('rep-share').addEventListener('input', fresh);
  document.addEventListener('visibilitychange', () => { if (document.hidden && running) { running = false; controls(); } });
  fresh(); requestAnimationFrame(frame);
})();
