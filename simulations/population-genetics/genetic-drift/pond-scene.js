/* The scenery and swimming are cosmetic; birth scenes use recorded inheritance. */
(function () {
  'use strict';
  const W = 1000, H = 540, Y = 620 / H;
  const WATER = 'M98 299C73 209 181 138 299 133C360 76 477 96 552 120C691 77 849 146 878 248C953 320 903 414 809 457C718 529 565 484 492 520C350 551 240 498 194 451C93 446 45 365 98 299Z';
  const GROUND = 'M58 282C18 166 143 83 277 80C353 14 480 38 555 65C713 16 921 100 926 242C1000 341 949 469 830 504C722 590 560 542 492 569C328 611 202 551 159 498C36 493 4 371 58 282Z';
  // Birth timeline, as fractions of one generation's playback.
  const FEATURE_END = .42, MATING_END = .84, DOZE_END = .94, BORN_AT = .9;
  const PANEL = { w: 1000, h: 160, labelEnd: 118, pool: [8, 62], nest: [84, 154] };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  function ellipse(c, x, y, rx, ry, fill, rotation = 0) {
    c.beginPath(); c.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2); c.fillStyle = fill; c.fill();
  }
  // Evenly spaced cells for n items inside a box, keeping each cell's width:height ratio.
  function grid(n, x0, x1, y0, y1, aspect) {
    const width = x1 - x0, height = y1 - y0; let best = { rows: 1, cols: n, cw: 0 };
    for (let rows = 1; rows <= n; rows++) {
      const cols = Math.ceil(n / rows), cw = Math.min(width / cols, height / rows * aspect);
      if (cw > best.cw) best = { rows, cols, cw };
      if (height / rows * aspect < best.cw) break;
    }
    const { rows, cols, cw } = best, ch = cw / aspect, cells = [];
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / cols), inRow = Math.min(cols, n - row * cols);
      cells.push({ x: x0 + (width - inRow * cw) / 2 + (i % cols + .5) * cw, y: y0 + (height - rows * ch) / 2 + (row + .5) * ch });
    }
    return { cells, cw, ch };
  }

  class PondScene {
    constructor(canvas, onSelect, nursery) {
      this.canvas = canvas; this.c = canvas.getContext('2d'); this.onSelect = onSelect;
      this.nursery = nursery; this.nc = nursery.getContext('2d');
      if (!this.c) throw new Error('Canvas is unavailable');
      this.water = new Path2D(WATER); this.ground = new Path2D(GROUND);
      this.ducks = []; this.population = []; this.birth = null; this.wakes = []; this.time = 0; this.selected = 0; this.fast = false;
      this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.sprites = {}; this.thumbnails = {};
      const looks = { '': { still: true }, b: { still: true, blink: true }, g: { still: true, tone: 'grey', sleep: true },
        o: { still: true, beads: 'only' }, r: { still: true, dry: true, shadow: false, beads: 'none' }, n: { still: true, dry: true } };
      for (const pair of [[0, 0], [0, 1], [1, 0], [1, 1]]) {
        for (const [key, pose] of Object.entries(looks)) {
          const sprite = document.createElement('canvas'); sprite.width = 288; sprite.height = 288;
          const c = sprite.getContext('2d'); c.scale(2.5, 2.5); c.translate(55, 70);
          window.DuckCharacter.draw(c, { x: 0, y: 0, scale: 1, facing: 1, alleles: pair, cream: false }, 1, pose);
          this.sprites[pair.join('') + key] = sprite;
          if (key === '') this.thumbnails[pair.join('')] = sprite.toDataURL();
        }
      }
      this.background = document.createElement('canvas'); this.background.width = W * 1.5; this.background.height = 620 * 1.5;
      const bc = this.background.getContext('2d'); bc.scale(1.5, 1.5); this.drawGround(bc);
      this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(canvas); this.resizeObserver.observe(nursery);
      canvas.addEventListener('pointerdown', event => {
        const rect = canvas.getBoundingClientRect(), x = (event.clientX - rect.left) * W / rect.width, y = (event.clientY - rect.top) * 620 / rect.height;
        const hits = this.ducks.map((d, i) => ({ i, y: d.y, distance: Math.hypot(d.x - x, d.y - 18 * this.scale - y) })).filter(d => d.distance < Math.max(17, 42 * this.scale));
        hits.sort((a, b) => a.distance - b.distance);
        if (hits.length && !this.birth) this.onSelect(hits[0].i);
      });
      this.resize();
    }
    resize() {
      const width = this.canvas.clientWidth || W, ratio = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.round(width * ratio); this.canvas.height = Math.round(width * H / W * ratio);
      const panelWidth = this.nursery.clientWidth || W;
      this.nursery.width = Math.round(panelWidth * ratio); this.nursery.height = Math.round(panelWidth * PANEL.h / PANEL.w * ratio);
    }
    thumbnail(alleles) { return this.thumbnails[alleles.join('')]; }
    makeDucks(population) {
      const result = [], spacing = (population.length <= 24 ? 100 : 84) * this.scale;
      population.forEach((alleles, i) => {
        let x, y;
        for (let attempt = 0; attempt < 45; attempt++) {
          const theta = Math.random() * Math.PI * 2, radius = Math.sqrt(Math.random());
          x = 500 + Math.cos(theta) * radius * 324; y = 315 + Math.sin(theta) * radius * 153;
          if (result.every(d => Math.hypot(d.x - x, (d.y - y) * .9) > spacing)) break;
        }
        const target = this.swimTarget(x, y);
        const angle = Math.atan2(target.y - y, target.x - x);
        // Larger shoals drift more gently; this is independent of the generation clock.
        const crowding = Math.max(.42, Math.min(1, Math.pow(6 / population.length, .18)));
        const speed = (85 + Math.random() * 25) * (.8 + this.scale * .2) * crowding;
        result.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          targetX: target.x, targetY: target.y, speed, wanderTime: 1 / crowding, headingTimer: (2 + Math.random() * 2) / crowding, cream: false,
          phase: Math.random() * 50, facing: Math.cos(angle) >= 0 ? 1 : -1, alleles, wake: Math.random(), blink: Math.random() * 8 });
      });
      return result;
    }
    keepSpace(dt) {
      const spacing = (this.population.length <= 24 ? 100 : 82) * this.scale, cells = new Map();
      this.ducks.forEach((d, i) => {
        const key = `${Math.floor(d.x / spacing)},${Math.floor(d.y / spacing)}`;
        if (!cells.has(key)) cells.set(key, []); cells.get(key).push(i);
      });
      this.ducks.forEach((d, i) => {
        const gx = Math.floor(d.x / spacing), gy = Math.floor(d.y / spacing);
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
          for (const j of cells.get(`${gx + dx},${gy + dy}`) || []) {
            if (j <= i) continue;
            const other = this.ducks[j], x = d.x - other.x, y = (d.y - other.y) * .9;
            const distance = Math.hypot(x, y);
            if (distance > .1 && distance < spacing) {
              const force = (spacing - distance) * Math.min(dt * 2.5, .18);
              d.x += x / distance * force; other.x -= x / distance * force;
              d.y += y / distance * force / .9; other.y -= y / distance * force / .9;
            }
          }
        }
      });
    }
    setPopulation(population, newborn = false) {
      this.population = population; this.scale = Math.max(.19, Math.min(1.15, 2.5 / Math.pow(population.length, .43)));
      if (this.ducks.length !== population.length) this.ducks = this.makeDucks(population);
      this.ducks.forEach((d, i) => { d.alleles = population[i]; });
      this.growth = newborn ? .65 : 1; this.birth = null;
      this.layoutPanel();
      this.nursery.setAttribute('aria-label', `The gene pool holds ${population.length * 2} copies. The nest is ready for ${population.length} ducklings.`);
      this.nursery.dataset.born = '0'; this.nursery.dataset.total = String(population.length);
      this.canvas.dataset.population = String(population.length);
      this.canvas.setAttribute('aria-label', `${population.length} swimming ducks, each carrying two coloured allele beads. Choose a duck with the pointer or the duck selector below.`);
    }
    layoutPanel() {
      const n = this.population.length, small = n <= 48;
      this.pool = grid(n, PANEL.labelEnd, PANEL.w - 8, PANEL.pool[0], PANEL.pool[1], 2.7);
      this.nest = grid(n, PANEL.labelEnd + 6, PANEL.w - 14, PANEL.nest[0] + 4, PANEL.nest[1] - 4, small ? 1.2 : 2.7);
      this.nest.sprites = small;
    }
    poolBead(copy) {
      const cell = this.pool.cells[copy >> 1], r = Math.min(this.pool.cw * .17, this.pool.ch * .36, 9);
      return { x: cell.x + (copy % 2 ? 1 : -1) * r * 1.2, y: cell.y, r };
    }
    nestBead(child, copy) {
      const cell = this.nest.cells[child];
      if (this.nest.sprites) {
        const s = this.nestScale();
        return { x: cell.x + window.DuckCharacter.markerSpots[copy][0] * s, y: cell.y + 14 * s + window.DuckCharacter.markerSpots[copy][1] * s, r: 7.2 * s };
      }
      const r = Math.min(this.nest.cw * .17, this.nest.ch * .36, 9);
      return { x: cell.x + (copy ? 1 : -1) * r * 1.2, y: cell.y, r };
    }
    nestScale() { return Math.min(.62, this.nest.cw / 112, this.nest.ch / 92); }
    beginBirth(previous, next, parents, child) {
      const featured = this.population.length <= 24 && !this.reduced.matches ? child : -1;
      const sources = parents[child].map(source => Math.floor(source / 2));
      const from = sources.map(i => ({ x: this.ducks[i].x, y: this.ducks[i].y }));
      const meeting = { x: clamp((from[0].x + from[1].x) / 2, 340, 660), y: clamp((from[0].y + from[1].y) / 2, 280, 370) };
      const rest = next.map((_, i) => i).filter(i => i !== featured);
      const start = featured >= 0 ? FEATURE_END : .04, span = MATING_END - start;
      const length = clamp(span * 3 / Math.max(1, rest.length), .025, .2), gap = rest.length > 1 ? (span - length) / (rest.length - 1) : 0;
      const used = new Set(parents.flat().map(copy => Math.floor(copy / 2)));
      // The complete cohort is already sampled by the model. These events never draw genes.
      this.birth = { sources, copies: parents[child].map(source => source % 2), alleles: next[child], child, featured,
        progress: 0, next: this.makeDucks(next), parents, from, meeting,
        events: rest.map((i, k) => ({ child: i, start: start + k * gap, length, sources: parents[i].map(c => Math.floor(c / 2)), copies: parents[i] })),
        unused: previous.map((_, i) => i).filter(i => !used.has(i)),
        order: featured >= 0 ? [featured, ...rest] : rest };
    }
    // Progress at which each duckling settles in the nest.
    bornAt(child) {
      const birth = this.birth;
      if (child === birth.featured) return FEATURE_END * .86;
      const event = birth.events.find(e => e.child === child);
      return event.start + event.length * BORN_AT;
    }
    bornCount() {
      if (!this.birth) return 0;
      const p = this.birth.progress;
      let count = this.birth.featured >= 0 && p >= FEATURE_END * .86 ? 1 : 0;
      for (const e of this.birth.events) if (p >= e.start + e.length * BORN_AT) count++;
      return count;
    }
    unusedCount() { return this.birth ? this.birth.unused.length : 0; }
    storyLabel(running) {
      const size = this.population.length, birth = this.birth;
      if (!birth) return this.fast ? 'Fast-forward: every generation still counts' : running ? 'The generations are flowing' : 'A quiet moment at the pond';
      const p = birth.progress, born = this.bornCount();
      if (p >= DOZE_END) return `${size} adults → ${size} new adults`;
      if (p >= MATING_END) {
        const n = this.unusedCount();
        return n ? `${n} ${n === 1 ? 'duck' : 'ducks'} passed on no copies this time` : 'Every duck passed on at least one copy';
      }
      if (birth.featured >= 0 && p < FEATURE_END) {
        const story = p / FEATURE_END;
        if (story < .34) return 'A chance meeting…';
        if (story < .51) return 'A chest puff, a wing wiggle…';
        if (story < .7) return 'One gene copy from each parent';
        if (story < .85) return 'A little splash of possibility';
        return 'Hello, little duckling!';
      }
      return size <= 48 ? `Duckling ${Math.min(size, born + 1)} of ${size}: one copy from each parent` : `Each heart links one duckling's two parents: ${born} of ${size}`;
    }
    activeEvents(lead = 0) {
      if (!this.birth || this.reduced.matches) return [];
      const p = this.birth.progress;
      return this.birth.events.map(e => ({ e, q: (p - e.start) / e.length })).filter(({ q }) => q > -lead && q < 1);
    }
    beadWorld(index, copy) {
      const d = this.ducks[index], depth = .9 + (d.y - 160) / 1600, s = this.scale * depth * this.growth;
      const spot = window.DuckCharacter.markerSpots[copy], face = d.facing >= 0 ? 1 : -1;
      return { x: d.x + spot[0] * s * face, y: d.y + spot[1] * s * Y };
    }
    // One mating per duckling: the parents pair up under a heart, one bead flies from each
    // into a duckling that appears between them, and the duckling heads for the nest.
    drawMatings(c) {
      let shown = 0;
      const heartScale = clamp(this.scale * .75, .28, .66), small = this.population.length <= 48;
      for (const { e, q } of this.activeEvents()) {
        const alpha = Math.min(1, q * 6, (1 - q) * 5), link = Math.min(1, q * 6) * (1 - smooth((q - .5) / .12));
        const [a, b] = e.sources, pa = this.ducks[a], pb = this.ducks[b], same = a === b;
        const mid = same ? { x: pa.x, y: pa.y } : { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 };
        if (small && link > 0) {
          for (const d of same ? [pa] : [pa, pb]) {
            c.save(); c.globalAlpha = link * .55; c.strokeStyle = '#ffe9a8'; c.lineWidth = 3;
            c.beginPath(); c.ellipse(d.x, d.y + 2, 46 * this.scale, 13 * this.scale, 0, 0, Math.PI * 2); c.stroke(); c.restore();
          }
        }
        if (!same && link > 0) {
          c.save(); c.globalAlpha = link * .85; c.setLineDash([5, 6]); c.lineCap = 'round'; c.strokeStyle = '#d7768f'; c.lineWidth = small ? 2.4 : 1.4;
          c.beginPath(); c.moveTo(pa.x, pa.y - 22 * this.scale * Y); c.lineTo(pb.x, pb.y - 22 * this.scale * Y); c.stroke(); c.restore();
        }
        // Both copies may come from one duck, which this model allows: one heart, no invented partner.
        if (q < .62) this.drawHeart(c, mid.x, mid.y - (same ? 62 : 52) * this.scale * Y - 10 - q * 12, heartScale, alpha * (1 - smooth((q - .5) / .12)), true);
        const meet = { x: mid.x, y: mid.y + 6 }, slot = this.nest.cells[e.child];
        if (q > .22 && q < .52) {
          const t = smooth((q - .22) / .26);
          e.copies.forEach((copy, i) => {
            const from = this.beadWorld(e.sources[i], copy % 2), to = { x: meet.x + (i ? 6 : -6), y: meet.y - 4 };
            const cx = (from.x + to.x) / 2, cy = Math.min(from.y, to.y) - 40 * Math.max(.5, this.scale), u = 1 - t;
            const x = u * u * from.x + 2 * u * t * cx + t * t * to.x, y = u * u * from.y + 2 * u * t * cy + t * t * to.y;
            const allele = this.population[Math.floor(copy / 2)][copy % 2], r = Math.max(3.5, 8 * Math.min(1, this.scale * 1.3));
            ellipse(c, x, y, r + 2, r + 2, '#fffbe2'); window.DuckCharacter.bead(c, x, y, allele, r);
          });
        }
        if (q > .48) {
          const grow = smooth((q - .48) / .1), go = smooth((q - .62) / .3), alleles = this.birth.next[e.child].alleles;
          const x = lerp(meet.x, slot.x, go), y = lerp(meet.y, 655, go), s = this.scale * (.35 + grow * .25) * (1 - go * .3);
          c.save(); c.globalAlpha = grow * (1 - smooth((q - .9) / .1)); c.translate(x, y); c.scale(s * (slot.x >= meet.x ? 1 : -1), s * Y);
          c.drawImage(this.sprites[alleles.join('')], -55, -70, 115.2, 115.2); c.restore();
        }
        shown++;
      }
      this.canvas.dataset.matingHearts = String(shown);
    }
    drawPanel() {
      const c = this.nc, n = this.population.length, birth = this.birth;
      c.setTransform(this.nursery.width / PANEL.w, 0, 0, this.nursery.height / PANEL.h, 0, 0); c.clearRect(0, 0, PANEL.w, PANEL.h);
      const count = this.bornCount(), p = birth ? birth.progress : 0;
      // Labels
      c.fillStyle = '#304d43'; c.font = '600 13px system-ui,sans-serif'; c.fillText('Gene pool', 4, 31);
      c.fillText('Nest', 4, 114);
      c.fillStyle = '#62735f'; c.font = '11px system-ui,sans-serif'; c.fillText(`${2 * n} copies`, 4, 46);
      c.fillText(birth ? `${count} of ${n} ducklings` : this.fast ? 'skipped' : 'waiting', 4, 129);
      // Nest of twigs
      c.save(); c.beginPath(); c.roundRect(PANEL.labelEnd - 4, PANEL.nest[0], PANEL.w - PANEL.labelEnd - 2, PANEL.nest[1] - PANEL.nest[0], 26);
      const twig = c.createLinearGradient(0, PANEL.nest[0], 0, PANEL.nest[1]); twig.addColorStop(0, '#c9a46c'); twig.addColorStop(1, '#a37b48');
      c.fillStyle = twig; c.fill(); c.clip(); c.strokeStyle = '#e3c58f88'; c.lineWidth = 1.6;
      for (let i = 0; i < 70; i++) { const x = PANEL.labelEnd + (i * 137) % (PANEL.w - PANEL.labelEnd), y = PANEL.nest[0] + (i * 53) % 70; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 18, y + (i % 2 ? 4 : -4)); c.stroke(); }
      c.restore();
      // Which copies have been drawn so far, and how often.
      const counts = new Array(2 * n).fill(0), bornSet = new Set();
      if (birth) {
        for (const child of birth.order) if (p >= this.bornAt(child)) { bornSet.add(child); birth.parents[child].forEach(copy => counts[copy]++); }
      }
      const dozing = birth && p >= MATING_END;
      // Lines from pool copies to ducklings
      if (birth) {
        for (const child of bornSet) {
          const age = p - this.bornAt(child), fresh = age < .08;
          if (!fresh && n > 24) continue;
          birth.parents[child].forEach((copy, i) => {
            const a = this.poolBead(copy), b = this.nestBead(child, i), allele = this.population[copy >> 1][copy % 2];
            c.strokeStyle = fresh ? window.DuckCharacter.palette[allele] : '#58705f'; c.globalAlpha = fresh ? .9 : .16; c.lineWidth = fresh ? 2 : 1;
            c.beginPath(); c.moveTo(a.x, a.y + a.r); c.bezierCurveTo(a.x, a.y + 30, b.x, b.y - 30, b.x, b.y - b.r); c.stroke(); c.globalAlpha = 1;
          });
        }
      }
      // Pool beads, grouped by adult
      const pr = this.poolBead(0).r;
      this.pool.cells.forEach((cell, i) => {
        if (this.pool.cw > 26) { c.fillStyle = '#ffffff70'; c.beginPath(); c.roundRect(cell.x - pr * 2.5, cell.y - pr * 1.45, pr * 5, pr * 2.9, pr * 1.45); c.fill(); }
        for (const k of [0, 1]) {
          const copy = 2 * i + k, b = this.poolBead(copy);
          c.globalAlpha = dozing && counts[copy] === 0 ? .25 : 1;
          if (b.r >= 3.2) window.DuckCharacter.bead(c, b.x, b.y, this.population[i][k], b.r);
          else ellipse(c, b.x, b.y, b.r, b.r, window.DuckCharacter.palette[this.population[i][k]]);
          c.globalAlpha = 1;
          if (birth && this.pool.cw >= 60 && (counts[copy] || dozing)) {
            c.fillStyle = counts[copy] ? '#304d43' : '#8a968a'; c.font = `${counts[copy] ? 600 : 400} 10px system-ui,sans-serif`; c.textAlign = 'center';
            c.fillText(`×${counts[copy]}`, b.x, b.y + b.r + 11); c.textAlign = 'left';
          }
        }
      });
      // Ducklings in the nest
      const fade = birth ? 1 - smooth((p - DOZE_END) / (1 - DOZE_END)) : 1, s = this.nestScale();
      for (let i = 0; i < n; i++) {
        const cell = this.nest.cells[i];
        if (bornSet.has(i)) {
          const alleles = birth.next[i].alleles; c.save(); c.globalAlpha = fade;
          if (this.nest.sprites) c.drawImage(this.sprites[alleles.join('') + 'n'], cell.x - 55 * s, cell.y + 14 * s - 70 * s, 115.2 * s, 115.2 * s);
          else {
            const r = this.nestBead(i, 0).r; ellipse(c, cell.x, cell.y + r * .3, r * 2.6, r * 1.7, '#f8d465');
            for (const k of [0, 1]) { const b = this.nestBead(i, k); ellipse(c, b.x, b.y, b.r, b.r, window.DuckCharacter.palette[alleles[k]]); }
          }
          c.restore();
        } else {
          const r = this.nest.sprites ? 26 * s : this.nestBead(i, 0).r * 2.4;
          ellipse(c, cell.x, cell.y + (this.nest.sprites ? 22 * s : 0), r, r * .38, '#5a3d1c40');
        }
      }
      if (this.nursery.dataset.born !== String(count)) {
        this.nursery.dataset.born = String(count);
        this.nursery.setAttribute('aria-label', `${count} of ${n} ducklings in the nest. Lines link each duckling's two gene copies to the copies they came from.`);
      }
    }
    finishBirth(population) {
      const next = this.birth && this.birth.next;
      if (next) this.ducks = next;
      this.setPopulation(population, true);
    }
    drawGround(c) {
      c.clearRect(0, 0, W, H);
      c.fillStyle = '#bed0a0'; c.fill(this.ground); c.strokeStyle = '#91ad86'; c.lineWidth = 2; c.stroke(this.ground);
      c.lineJoin = 'round'; c.strokeStyle = '#cabf8d'; c.lineWidth = 36; c.stroke(this.water);
      c.strokeStyle = '#f3e2b6'; c.lineWidth = 29; c.stroke(this.water);
      const g = c.createRadialGradient(420, 230, 20, 500, 320, 470); g.addColorStop(0, '#b3e4e0'); g.addColorStop(1, '#8dcdcd');
      c.fillStyle = g; c.fill(this.water); c.strokeStyle = '#5caaa7'; c.lineWidth = 2; c.stroke(this.water);
      this.grass(c, 170, 139, 43, -1); this.grass(c, 900, 371, 49, 1); this.grass(c, 653, 532, 33, -1);
    }
    grass(c, x, y, height, direction) {
      c.save(); c.translate(x, y); c.scale(direction, 1);
      for (let i = 0; i < 7; i++) {
        const shift = (i - 3) * 5, h = height * (.65 + Math.sin(i * 7) * .2);
        c.beginPath(); c.moveTo(shift * .2, 4); c.quadraticCurveTo(shift - 8, -h * .6, shift - 5, -h); c.quadraticCurveTo(shift + 3, -h * .5, shift * .2 + 4, 4);
        c.fillStyle = i % 2 ? '#7e9f64' : '#557f54'; c.fill();
      }
      if (height > 35) {
        c.strokeStyle = '#648653'; c.lineWidth = 2;
        for (const [dx, h] of [[-1, height * 1.5], [13, height * 1.15]]) {
          c.beginPath(); c.moveTo(1, 3); c.quadraticCurveTo(dx - 4, -h * .6, dx, -h); c.stroke();
          c.lineWidth = 6; c.lineCap = 'round'; c.strokeStyle = '#a27c4b'; c.beginPath(); c.moveTo(dx, -h + 8); c.lineTo(dx, -h - 5); c.stroke(); c.lineWidth = 2; c.strokeStyle = '#648653';
        }
      }
      c.restore();
    }
    lily(c, x, y, size, flower, phase) {
      c.save(); c.translate(x, y + Math.sin(this.time * .8 + phase) * 2); c.rotate(Math.sin(this.time * .25 + phase) * .04);
      c.beginPath(); c.ellipse(0, 0, size, size * .49, -.15, .3, Math.PI * 1.94); c.lineTo(-3, -1); c.closePath();
      c.fillStyle = '#93b06f'; c.fill(); c.strokeStyle = '#28777b'; c.lineWidth = 2.4; c.stroke(); c.restore();
    }
    duckTransform(c, d, size) {
      const depth = .9 + (d.y - 160) / 1600, s = this.scale * size * depth;
      const bob = this.reduced.matches ? 0 : Math.sin(this.time * 2.6 + d.phase) * 1.4;
      const turnWidth = .72 + Math.min(1, Math.abs(d.facing)) * .28;
      return { s, bob, sx: s * (d.facing >= 0 ? 1 : -1) * turnWidth, sy: s * Y };
    }
    drawReflection(c, d, alpha, size) {
      const { bob, sx, sy } = this.duckTransform(c, d, size);
      c.save(); c.globalAlpha = alpha * .22; c.translate(d.x, d.y + bob); c.scale(sx, sy);
      c.translate(0, 25.6); c.scale(1, -.6);
      c.drawImage(this.sprites[d.alleles.join('') + 'r'], -55, -70, 115.2, 115.2); c.restore();
    }
    drawDuck(c, d, alpha = 1, size = 1, selected = false, look = {}) {
      const { s, bob, sx, sy } = this.duckTransform(c, d, size);
      c.save(); c.globalAlpha = alpha;
      if (selected) { c.strokeStyle = '#fff4c8cc'; c.lineWidth = 2; c.beginPath(); c.ellipse(d.x, d.y + 1, 47 * s, 15 * s, 0, 0, Math.PI * 2); c.stroke(); }
      c.translate(d.x, d.y + bob); c.scale(sx, sy);
      if (!this.reduced.matches) {
        // A gentle roll, with an occasional tail wiggle.
        let roll = Math.sin(this.time * 3.5 + d.phase) * .03; const wiggle = (this.time * .17 + d.phase * .31) % 1;
        if (wiggle < .06) roll += Math.sin(wiggle / .06 * Math.PI * 4) * .06;
        c.rotate(roll);
      }
      const blink = !this.reduced.matches && (this.time + d.blink) % 6.5 < .13, key = d.alleles.join('');
      const sprite = this.sprites[key + (look.grey ? 'g' : blink ? 'b' : '')];
      if (look.dim !== undefined && look.dim < 1) {
        // Faded bodies keep their allele beads at full strength: they are the data.
        c.globalAlpha = alpha * look.dim; c.drawImage(sprite, -55, -70, 115.2, 115.2);
        c.globalAlpha = alpha; c.drawImage(this.sprites[key + 'o'], -55, -70, 115.2, 115.2);
      } else c.drawImage(sprite, -55, -70, 115.2, 115.2);
      c.restore();
      if (look.grey && !this.reduced.matches) this.zzz(c, d.x + 22 * s * Math.sign(d.facing || 1), d.y - 64 * s * Y, Math.max(.6, s * 1.3), alpha);
    }
    zzz(c, x, y, s, alpha) {
      c.save(); c.fillStyle = '#37636a';
      for (let i = 0; i < 3; i++) {
        const k = (this.time * .6 + i / 3) % 1; c.globalAlpha = alpha * .8 * (1 - k);
        c.font = `600 ${(9 + i * 3) * s}px Georgia,serif`; c.fillText('z', x + i * 7 * s + k * 6 * s, y - i * 9 * s - k * 10 * s);
      }
      c.restore();
    }
    swimTarget(x, y) {
      let target;
      for (let attempt = 0; attempt < 8; attempt++) {
        const angle = Math.random() * Math.PI * 2, radius = Math.sqrt(Math.random());
        target = { x: 500 + Math.cos(angle) * radius * 324, y: 315 + Math.sin(angle) * radius * 153 };
        if (Math.hypot(target.x - x, target.y - y) > 150) break;
      }
      return target;
    }
    updateDuck(d, dt, i) {
      d.headingTimer -= dt;
      let dx = d.targetX - d.x, dy = d.targetY - d.y;
      if (!d.meeting && (Math.hypot(dx, dy) < 35 || d.headingTimer <= 0)) {
        const target = this.swimTarget(d.x, d.y); d.targetX = target.x; d.targetY = target.y; d.headingTimer = (2 + Math.random() * 2) * d.wanderTime;
        dx = d.targetX - d.x; dy = d.targetY - d.y;
      }
      const distance = Math.max(1, Math.hypot(dx, dy));
      const steering = Math.min(1, dt * 3.2), speed = d.meeting && distance < 40 * this.scale ? d.speed * .15 : d.speed;
      d.vx = lerp(d.vx, dx / distance * speed, steering);
      d.vy = lerp(d.vy, dy / distance * speed, steering);
      d.x += d.vx * dt; d.y += d.vy * dt;
      // Swimming follows destinations inside a convex safe area; guard the bank after spacing adjustments.
      const r = Math.hypot((d.x - 500) / 340, (d.y - 315) / 164);
      if (r > 1) {
        d.x = 500 + (d.x - 500) / r; d.y = 315 + (d.y - 315) / r;
        const target = this.swimTarget(d.x, d.y); d.targetX = target.x; d.targetY = target.y;
      }
      const facing = d.vx > 2 ? 1 : d.vx < -2 ? -1 : Math.sign(d.facing) || 1;
      d.facing = lerp(d.facing, facing, Math.min(1, dt * 5));
      d.wake += dt;
      if (d.wake > .22 && i % Math.max(1, Math.ceil(this.ducks.length / 36)) === 0) {
        this.wakes.push({ x: d.x - Math.sign(d.facing) * 20 * this.scale, y: d.y + 5 * this.scale, age: 0, size: this.scale }); d.wake = 0;
      }
    }
    // Paired parents drift towards each other while their duckling is made. Cosmetic only.
    steerPairs() {
      this.ducks.forEach(d => { d.meeting = false; });
      if (this.population.length > 48) return;
      for (const { e, q } of this.activeEvents(.7)) {
        if (q > .62 || e.sources[0] === e.sources[1]) continue;
        const [a, b] = e.sources.map(i => this.ducks[i]), gap = 70 * this.scale;
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        a.meeting = b.meeting = true;
        const left = a.x <= b.x ? a : b, right = left === a ? b : a;
        left.targetX = mx - gap / 2; left.targetY = my; right.targetX = mx + gap / 2; right.targetY = my;
      }
    }
    drawHeart(c, x, y, scale, alpha, small = false) {
      c.save(); c.translate(x, y); c.scale(scale, scale * Y); c.globalAlpha = alpha; c.shadowColor = '#d9798560'; c.shadowBlur = small ? 0 : 12;
      c.fillStyle = small ? '#d7768f' : '#e58e99'; c.beginPath(); c.moveTo(0, 9); c.bezierCurveTo(-26, -8, -14, -27, 0, -14); c.bezierCurveTo(14, -27, 26, -8, 0, 9); c.fill(); if (small) { c.strokeStyle = '#bb637b'; c.lineWidth = .8; c.stroke(); } c.shadowColor = 'transparent'; ellipse(c, -7, -13, 3, 1.5, '#ffd6cf9c', -.5); c.restore();
    }
    character(c, display, pose) {
      // Compress pond depth for the laptop layout while preserving the approved duck proportions.
      c.save(); c.translate(display.x, display.y); c.scale(1, Y);
      const markers = window.DuckCharacter.draw(c, { ...display, x: 0, y: 0 }, this.time, pose); c.restore();
      return markers.map(m => ({ ...m, x: m.x + display.x, y: m.y * Y + display.y }));
    }
    cloud(c, x, y, alpha, spread) {
      c.save(); c.globalAlpha = alpha;
      const fill = c.createRadialGradient(x, y - 30, 5, x, y, 115); fill.addColorStop(0, '#fffce4'); fill.addColorStop(1, '#eff6d8');
      for (let i = 0; i < 7; i++) { const a = i * Math.PI * 2 / 7; ellipse(c, x + Math.cos(a) * 46 * spread, y - 27 + Math.sin(a) * 29 * spread, 34 + i % 2 * 9, 28, fill); }
      ellipse(c, x, y - 27, 63, 40, fill); c.restore();
    }
    drawFamily(c, birth) {
      const p = Math.min(1, birth.progress / FEATURE_END), m = birth.meeting;
      const between = (a, b) => smooth((p - a) / (b - a));
      const same = birth.sources[0] === birth.sources[1], focusScale = Math.max(1.12, this.scale * 1.08);
      const markers = [], drawn = new Map();
      birth.sources.forEach((index, i) => {
        if (drawn.has(index)) { markers[i] = drawn.get(index)[birth.copies[i]]; return; }
        const d = this.ducks[index], from = birth.from[i], approach = between(0, .34), fuse = between(.66, .78), release = between(.88, 1);
        const offset = same ? 0 : (i ? 79 : -79) * focusScale / 1.6;
        let x = lerp(from.x, m.x + offset, approach), y = lerp(from.y, m.y, approach);
        x = lerp(x, m.x + (same ? 0 : i ? 8 : -8), fuse);
        x = lerp(x, d.x, release); y = lerp(y, d.y, release);
        const pose = { still: this.reduced.matches, alpha: clamp(1 - between(.7, .79) + between(.85, .94), 0, 1) };
        if (p >= .34 && p < .56 && !this.reduced.matches) {
          const q = (p - .34) / .17, bounce = Math.sin(q * Math.PI * 4 + i * .6);
          pose.puff = Math.max(0, bounce); pose.nod = Math.sin(q * Math.PI * 4 + i) * .14; pose.flap = Math.max(0, Math.sin(q * Math.PI * 8 + i)) * .8;
          y -= Math.abs(bounce) * 4;
        }
        if (p >= .5 && p < .87) {
          pose.highlight = birth.copies[i];
          if (same) pose.highlights = birth.copies;
        }
        const display = { ...d, x, y, facing: i ? -1 : 1, scale: lerp(lerp(this.scale, focusScale, approach), this.scale, release) };
        const dots = this.character(c, display, pose); drawn.set(index, dots); markers[i] = dots[birth.copies[i]];
      });
      if (p > .36 && p < .74) {
        const q = clamp((p - .36) / .38, 0, 1), alpha = Math.min(1, q * 7) * (1 - between(.67, .74));
        this.drawHeart(c, m.x, m.y - focusScale * 74 - q * 29, .9, alpha);
        if (p > .43 && !same) this.drawHeart(c, m.x + 32, m.y - focusScale * 58 - q * 48, .35, alpha * .7);
      }
      const cloudAlpha = between(.66, .73) * (1 - between(.83, .91));
      if (cloudAlpha > 0) this.cloud(c, m.x, m.y + 5, cloudAlpha, .7 + between(.66, .86) * .4);
      if (p >= .51 && p < .84) {
        const q = between(.51, .7);
        markers.forEach((source, i) => {
          const destination = { x: m.x + (i ? 14 : -14), y: m.y - 8 };
          const control = { x: (source.x + destination.x) / 2, y: Math.min(source.y, destination.y) - 55 }, u = 1 - q;
          const x = u * u * source.x + 2 * u * q * control.x + q * q * destination.x;
          const y = u * u * source.y + 2 * u * q * control.y + q * q * destination.y;
          ellipse(c, x, y, 10, 10, '#fffbe2'); window.DuckCharacter.bead(c, x, y, birth.alleles[i], 7.5);
          if (q < .95) { c.beginPath(); c.moveTo(source.x, source.y); c.quadraticCurveTo(control.x, control.y, x, y); c.strokeStyle = '#fff8dc9c'; c.lineWidth = 2; c.setLineDash([3, 6]); c.stroke(); c.setLineDash([]); }
        });
      }
      if (p > .79 && p < .96) {
        // The duckling waddles off towards its place in the nest below the pond.
        const reveal = between(.79, .86), exit = between(.86, .96), next = birth.next[birth.child], slot = this.nest.cells[birth.child];
        this.character(c, { ...next, x: lerp(m.x, slot.x, exit), y: lerp(m.y + 18, 640, exit), scale: .45 + reveal * .3, facing: 1, baby: true },
          { still: this.reduced.matches, alpha: reveal * (1 - between(.93, .96)) });
      }
    }
    render(dt) {
      if (!this.reduced.matches) this.time += dt;
      const c = this.c; c.setTransform(this.canvas.width / W, 0, 0, this.canvas.height / 620, 0, 0); c.clearRect(0, 0, W, 620); c.drawImage(this.background, 0, 0, W, 620);
      this.growth = Math.min(1, this.growth + dt * .24);
      this.steerPairs();
      if (!this.reduced.matches) {
        const steps = Math.max(1, Math.ceil(dt / .04));
        for (let step = 0; step < steps; step++) {
          this.ducks.forEach((d, i) => this.updateDuck(d, dt / steps, i)); this.keepSpace(dt / steps);
        }
      }
      const birth = this.birth, p = birth ? birth.progress : 0;
      const oldAlpha = birth ? 1 - smooth((p - DOZE_END) / (1 - DOZE_END)) : 1;
      const focus = birth && birth.featured >= 0 && p < FEATURE_END;
      const focusIndices = new Set(focus ? birth.sources : []);
      const dozing = new Set(birth && p >= MATING_END ? birth.unused : []);
      c.save(); c.clip(this.water);
      for (let i = 0; i < 19; i++) {
        const x = 150 + i * 39, y = 190 + Math.sin(i * 3.7) * 90 + (i % 3) * 70;
        const wave = Math.sin(this.time * .75 + i) * 10;
        c.beginPath(); c.moveTo(x + wave, y); c.bezierCurveTo(x + 14 + wave, y - 3, x + 24 + wave, y + 4, x + 40 + wave, y);
        c.strokeStyle = i % 3 ? '#eff6cf24' : '#e5f8dc65'; c.lineWidth = i % 3 ? 1.4 : 2; c.lineCap = 'round'; c.stroke();
      }
      this.wakes = this.wakes.filter(w => w.age < 2.4);
      this.wakes.forEach(w => {
        if (!this.reduced.matches) w.age += dt;
        c.beginPath(); c.ellipse(w.x, w.y, (22 + w.age * 18) * w.size, (5 + w.age * 5) * w.size, 0, .15, 2.95);
        c.strokeStyle = `rgba(237,249,218,${.38 * (1 - w.age / 2.4)})`; c.lineWidth = 1.2; c.stroke();
      });
      this.lily(c, 246, 212, 32, false, 1);
      this.ducks.forEach((d, i) => { if (!focusIndices.has(i)) this.drawReflection(c, d, oldAlpha, this.growth); });
      c.restore();
      const others = this.ducks.map((d, i) => ({ d, i })).filter(({ i }) => !focusIndices.has(i)).sort((a, b) => a.d.y - b.d.y);
      const dim = focus ? 1 - .5 * smooth(p / FEATURE_END / .15) * (1 - smooth((p / FEATURE_END - .7) / .1)) : 1;
      others.forEach(({ d, i }) => this.drawDuck(c, d, oldAlpha, this.growth, i === this.selected, { dim, grey: dozing.has(i) }));
      if (focus) this.drawFamily(c, birth);
      this.drawMatings(c);
      if (birth && p > DOZE_END) birth.next.forEach(d => this.drawDuck(c, d, smooth((p - DOZE_END) / (1 - DOZE_END)), .65, false));
      this.lily(c, 780, 410, 36, false, 4);
      this.drawPanel();
    }
  }
  window.PondScene = PondScene;
})();
