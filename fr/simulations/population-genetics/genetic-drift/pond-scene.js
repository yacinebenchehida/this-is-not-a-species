/* The scenery and swimming are cosmetic; birth scenes use recorded inheritance. */
(function () {
  'use strict';
  const W = 1000, H = 540, Y = 620 / H;
  const WATER = 'M98 299C73 209 181 138 299 133C360 76 477 96 552 120C691 77 849 146 878 248C953 320 903 414 809 457C718 529 565 484 492 520C350 551 240 498 194 451C93 446 45 365 98 299Z';
  const GROUND = 'M58 282C18 166 143 83 277 80C353 14 480 38 555 65C713 16 921 100 926 242C1000 341 949 469 830 504C722 590 560 542 492 569C328 611 202 551 159 498C36 493 4 371 58 282Z';
  // Birth timeline, as fractions of one generation's playback.
  const BORN_AT = .9, MEET_PART = .35;
  // Normal playback: shares of one generation for the close-up, the other matings and the dozing.
  const TIMELINE = { feature: .40, mating: .80, doze: .93 };
  // "Watch every mating" playback, in seconds: close-up, each beak-to-beak mating, dozing, swap.
  const SLOW = { feature: 6, mating: 2.2, doze: 3.5, swap: 1, maxDucks: 24 };
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
      if (!this.c) throw new Error('Le canevas graphique est indisponible');
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
          ({ x, y } = this.randomSpot());
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
      const scale = Math.max(.19, Math.min(1.15, 2.5 / Math.pow(population.length, .43)));
      if (scale !== this.scale || this.mask === undefined) this.mask = this.buildMask(18 + 42 * scale);
      this.population = population; this.scale = scale;
      if (this.ducks.length !== population.length) this.ducks = this.makeDucks(population);
      this.ducks.forEach((d, i) => { d.alleles = population[i]; });
      this.growth = newborn ? .65 : 1; this.birth = null;
      this.layoutPanel();
      this.nursery.setAttribute('aria-label', `Le réservoir de gènes contient ${population.length * 2} copies. Le nid attend ${population.length} canetons.`);
      this.nursery.dataset.born = '0'; this.nursery.dataset.total = String(population.length);
      this.canvas.dataset.population = String(population.length);
      this.canvas.setAttribute('aria-label', `${population.length} canards en train de nager, portant chacun deux perles d’allèles colorées. Choisissez un canard avec le pointeur ou le sélecteur ci-dessous.`);
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
        const shape = window.DuckCharacter.shape || { x: 1, y: 1 };
        return { x: cell.x + window.DuckCharacter.markerSpots[copy][0] * s * shape.x, y: cell.y + 14 * s + window.DuckCharacter.markerSpots[copy][1] * s * shape.y, r: 7.2 * s };
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
      const rest = next.map((_, i) => i).filter(i => i !== featured), beak = this.beakToBeak();
      const tl = beak ? this.slowTimeline(next.length) : TIMELINE;
      const start = featured >= 0 ? tl.feature : .04, span = tl.mating - start;
      // Beak-to-beak meetings run one at a time so no two pairs travel at once; otherwise they overlap.
      const length = beak ? span / Math.max(1, rest.length) : clamp(span * 3 / Math.max(1, rest.length), .025, .2);
      const gap = beak ? length : rest.length > 1 ? (span - length) / (rest.length - 1) : 0;
      const used = new Set(parents.flat().map(copy => Math.floor(copy / 2)));
      // The complete cohort is already sampled by the model. These events never draw genes.
      this.birth = { sources, copies: parents[child].map(source => source % 2), alleles: next[child], child, featured, beak, tl,
        progress: 0, next: this.makeDucks(next), parents, from, meeting,
        events: rest.map((i, k) => ({ child: i, start: start + k * gap, length, sources: parents[i].map(c => Math.floor(c / 2)), copies: parents[i] })),
        unused: previous.map((_, i) => i).filter(i => !used.has(i)),
        order: featured >= 0 ? [featured, ...rest] : rest };
    }
    // Progress at which each duckling settles in the nest.
    bornAt(child) {
      const birth = this.birth;
      if (child === birth.featured) return birth.tl.feature * .86;
      const event = birth.events.find(e => e.child === child);
      return event.start + event.length * this.bornFraction();
    }
    bornCount() {
      if (!this.birth) return 0;
      const p = this.birth.progress;
      let count = this.birth.featured >= 0 && p >= this.birth.tl.feature * .86 ? 1 : 0;
      for (const e of this.birth.events) if (p >= e.start + e.length * this.bornFraction()) count++;
      return count;
    }
    // In beak-to-beak mode the first 35% of each mating is the swim to meet; the story follows.
    storyQ(q) { return this.birth && this.birth.beak ? (q - MEET_PART) / (1 - MEET_PART) : q; }
    rawQ(story) { return this.birth && this.birth.beak ? MEET_PART + (1 - MEET_PART) * story : story; }
    // In slow mode the duckling's walk to the nest carries on while the next pair meets.
    walkEnd() { return this.birth && this.birth.beak ? 1.6 : 1; }
    bornFraction() { return this.rawQ(this.walkEnd()); }
    unusedCount() { return this.birth ? this.birth.unused.length : 0; }
    storyLabel(running) {
      const size = this.population.length, birth = this.birth;
      if (!birth) return this.fast ? 'En accéléré : toutes les générations comptent' : running ? 'Les générations se succèdent' : 'Un moment paisible au bord de la mare';
      const p = birth.progress, born = this.bornCount();
      if (p >= birth.tl.doze) return `${size} adultes → ${size} nouveaux adultes`;
      if (p >= birth.tl.mating) {
        const n = this.unusedCount();
        return n ? `${n} ${n === 1 ? 'canard n’a' : 'canards n’ont'} transmis aucune copie cette fois-ci` : 'Chaque canard a transmis au moins une copie';
      }
      if (birth.featured >= 0 && p < birth.tl.feature) {
        const story = p / birth.tl.feature;
        if (story < .34) return 'Une rencontre inattendue…';
        if (story < .51) return 'On bombe le torse, on agite les ailes…';
        if (story < .7) return 'Une copie du gène de chaque parent';
        if (story < .85) return 'Une éclaboussure pleine de surprises';
        return 'Bonjour, petit caneton !';
      }
      return size <= 48 ? `Caneton ${Math.min(size, born + 1)} sur ${size} : une copie de chaque parent` : `Chaque cœur relie les deux parents d’un caneton : ${born} sur ${size}`;
    }
    activeEvents(lead = 0, trail = 1) {
      if (!this.birth || this.reduced.matches) return [];
      const p = this.birth.progress;
      return this.birth.events.map(e => ({ e, q: (p - e.start) / e.length })).filter(({ q }) => q > -lead && q < trail);
    }
    // Where a duckling leaves the pond: the bottom bank, below the place it will take in the nest.
    bankSpot(child) { const slot = this.nest.cells[child]; return { x: 270 + (slot.x - PANEL.labelEnd) / (PANEL.w - PANEL.labelEnd) * 460, y: 548 }; }
    beadWorld(index, copy) {
      const d = this.ducks[index], depth = .9 + (d.y - 160) / 1600, s = this.scale * depth * this.growth;
      const spot = window.DuckCharacter.markerSpots[copy], face = d.facing >= 0 ? 1 : -1;
      const shape = window.DuckCharacter.shape || { x: 1, y: 1 };
      return { x: d.x + spot[0] * s * face * shape.x, y: d.y + spot[1] * s * Y * shape.y };
    }
    // One mating per duckling: the parents pair up under a heart, one bead flies from each
    // into a duckling that appears between them, and the duckling heads for the nest.
    drawMatings(c) {
      let shown = 0;
      const heartScale = clamp(this.scale * .75, .28, .66), small = this.population.length <= 48;
      const walkEnd = this.walkEnd();
      for (const { e, q: raw } of this.activeEvents(0, this.rawQ(walkEnd))) {
        const q = this.storyQ(raw);
        if (q <= 0) continue; // still swimming to meet
        const alpha = Math.min(1, q * 6, (1 - q) * 5), link = Math.min(1, q * 6) * (1 - smooth((q - .5) / .12));
        const [a, b] = e.sources, pa = this.ducks[a], pb = this.ducks[b], same = a === b;
        const mid = same ? { x: pa.x, y: pa.y } : { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 };
        if (small && link > 0) {
          for (const d of same ? [pa] : [pa, pb]) {
            c.save(); c.globalAlpha = link * .55; c.strokeStyle = '#ffe9a8'; c.lineWidth = 3;
            c.beginPath(); c.ellipse(d.x, d.y + 2, 46 * this.scale, 13 * this.scale, 0, 0, Math.PI * 2); c.stroke(); c.restore();
          }
        }
        if (!same && link > 0 && !this.birth.beak) {
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
        if (q > .48 && q < walkEnd) {
          // The duckling appears, waddles to the bottom bank, then steps down towards the nest below.
          const bank = this.bankSpot(e.child), span = walkEnd - .62;
          const grow = smooth((q - .48) / .1), go = smooth((q - .62) / (span * .8)), down = smooth((q - .62 - span * .8) / (span * .2));
          const alleles = this.birth.next[e.child].alleles;
          const x = lerp(meet.x, bank.x, go), y = lerp(meet.y, bank.y, go) + down * 34, s = Math.max(.32, this.scale * .62) * (.6 + grow * .4);
          const waddle = this.reduced.matches || go <= 0 || go >= 1 && down <= 0 ? 0 : Math.sin(this.time * 12 + e.child) * .15;
          const hopY = waddle ? -Math.abs(Math.sin(this.time * 12 + e.child)) * 4 : 0;
          c.save(); c.globalAlpha = grow * (1 - down); c.translate(x, y + hopY); c.rotate(waddle); c.scale(s * (bank.x >= meet.x ? 1 : -1), s * Y);
          c.drawImage(this.sprites[alleles.join('') + (go > .9 ? 'n' : '')], -55, -70, 115.2, 115.2); c.restore();
          if (down > 0 && down < 1) { c.save(); c.globalAlpha = (1 - down) * .8; c.fillStyle = '#5a6e56'; c.font = '600 18px system-ui,sans-serif'; c.textAlign = 'center'; c.fillText('↓', x, y + 24); c.restore(); }
        }
        if (raw < 1) shown++;
      }
      this.canvas.dataset.matingHearts = String(shown);
    }
    // How many ducklings each adult has had so far this generation. Neutral counts, no prizes:
    // being chosen often is luck, not merit.
    drawCounters(c) {
      const birth = this.birth;
      // Counters belong to the "Watch every mating" mode only.
      if (!birth || !birth.beak || birth.progress >= birth.tl.doze) return;
      const counts = new Map(), p = birth.progress;
      for (const child of birth.order) {
        if (p < this.bornAt(child)) continue;
        for (const parent of new Set(birth.parents[child].map(copy => Math.floor(copy / 2)))) counts.set(parent, (counts.get(parent) || 0) + 1);
      }
      const r = clamp(12 * this.scale, 8, 12);
      c.save(); c.font = `700 ${Math.round(r * 1.2)}px system-ui,sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      for (const [index, n] of counts) {
        const d = this.ducks[index], depth = .9 + (d.y - 160) / 1600, s = this.scale * depth;
        const x = d.x - 24 * s * Math.sign(d.facing || 1), y = d.y - 80 * s * Y, w = r * 3.1;
        c.beginPath(); c.roundRect(x - w / 2, y - r, w, 2 * r, r); c.fillStyle = '#fffaf0'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#34777b'; c.stroke();
        // A tiny duckling, then the number of ducklings so far.
        const dx = x - w / 2 + r * 1.05;
        ellipse(c, dx, y + r * .2, r * .62, r * .42, '#f6c94a'); ellipse(c, dx + r * .28, y - r * .3, r * .34, r * .34, '#f6c94a'); ellipse(c, dx + r * .6, y - r * .28, r * .16, r * .1, '#e3962a');
        c.fillStyle = '#1d3f3d'; c.fillText(String(n), x + r * .55, y + .5);
      }
      c.restore();
      this.canvas.dataset.counters = String(counts.size);
    }
    drawPanel() {
      const c = this.nc, n = this.population.length, birth = this.birth;
      c.setTransform(this.nursery.width / PANEL.w, 0, 0, this.nursery.height / PANEL.h, 0, 0); c.clearRect(0, 0, PANEL.w, PANEL.h);
      const count = this.bornCount(), p = birth ? birth.progress : 0;
      // Labels
      c.fillStyle = '#304d43'; c.font = '600 13px system-ui,sans-serif'; c.fillText('Réservoir de gènes', 4, 31);
      c.fillText('Nid', 4, 114);
      c.fillStyle = '#62735f'; c.font = '11px system-ui,sans-serif'; c.fillText(`${2 * n} copies`, 4, 46);
      c.fillText(birth ? `${count} sur ${n} canetons` : this.fast ? 'skipped' : 'waiting', 4, 129);
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
      const dozing = birth && p >= birth.tl.mating;
      // Lines from pool copies to ducklings
      if (birth) {
        for (const child of bornSet) {
          const age = (p - this.bornAt(child)) * (this.genSeconds || 8), fresh = age < 1.4;
          if (!fresh && n > 24) continue;
          birth.parents[child].forEach((copy, i) => {
            const a = this.poolBead(copy), b = this.nestBead(child, i), allele = this.population[copy >> 1][copy % 2];
            c.strokeStyle = fresh ? window.DuckCharacter.palette[allele] : '#58705f'; c.globalAlpha = fresh ? .9 : .16; c.lineWidth = fresh ? 2 : 1;
            c.setLineDash(allele ? [4, 3] : []);
            c.beginPath(); c.moveTo(a.x, a.y + a.r); c.bezierCurveTo(a.x, a.y + 30, b.x, b.y - 30, b.x, b.y - b.r); c.stroke(); c.setLineDash([]); c.globalAlpha = 1;
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
          window.DuckCharacter.bead(c, b.x, b.y, this.population[i][k], b.r);
          c.globalAlpha = 1;
          if (birth && this.pool.cw >= 60 && (counts[copy] || dozing)) {
            c.fillStyle = counts[copy] ? '#304d43' : '#8a968a'; c.font = `${counts[copy] ? 600 : 400} 10px system-ui,sans-serif`; c.textAlign = 'center';
            c.fillText(`×${counts[copy]}`, b.x, b.y + b.r + 11); c.textAlign = 'left';
          }
        }
      });
      // Ducklings in the nest
      const fade = birth ? 1 - smooth((p - birth.tl.doze) / (1 - birth.tl.doze)) : 1, s = this.nestScale();
      for (let i = 0; i < n; i++) {
        const cell = this.nest.cells[i];
        if (bornSet.has(i)) {
          const arrived = (p - this.bornAt(i)) * (this.genSeconds || 8);
          if (arrived < 1.4 && !this.reduced.matches) {
            // A soft glow marks the duckling that has just arrived from the pond.
            const glow = 1 - arrived / 1.4, r = (this.nest.sprites ? 40 * s : this.nestBead(i, 0).r * 3.2) * (1 + (1 - glow) * .25);
            const g = c.createRadialGradient(cell.x, cell.y, 0, cell.x, cell.y, r); g.addColorStop(0, `rgba(255,246,190,${.95 * glow})`); g.addColorStop(1, 'rgba(255,246,190,0)');
            c.fillStyle = g; c.beginPath(); c.arc(cell.x, cell.y, r, 0, Math.PI * 2); c.fill();
          }
          const alleles = birth.next[i].alleles; c.save(); c.globalAlpha = fade;
          if (this.nest.sprites) c.drawImage(this.sprites[alleles.join('') + 'n'], cell.x - 55 * s, cell.y + 14 * s - 70 * s, 115.2 * s, 115.2 * s);
          else {
            const r = this.nestBead(i, 0).r; ellipse(c, cell.x, cell.y + r * .3, r * 2.6, r * 1.7, '#f8d465');
            for (const k of [0, 1]) { const b = this.nestBead(i, k); window.DuckCharacter.bead(c, b.x, b.y, alleles[k], b.r); }
          }
          c.restore();
        } else {
          const r = this.nest.sprites ? 26 * s : this.nestBead(i, 0).r * 2.4;
          ellipse(c, cell.x, cell.y + (this.nest.sprites ? 22 * s : 0), r, r * .38, '#5a3d1c40');
        }
      }
      if (this.nursery.dataset.born !== String(count)) {
        this.nursery.dataset.born = String(count);
        this.nursery.setAttribute('aria-label', `${count} sur ${n} canetons dans le nid. Les lignes relient les deux copies du gène de chaque caneton à leurs copies d’origine.`);
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
    lily(c, x, y, size, frog, phase) {
      c.save(); c.translate(x, y + Math.sin(this.time * .8 + phase) * 2); c.rotate(Math.sin(this.time * .25 + phase) * .04);
      c.beginPath(); c.ellipse(0, 0, size, size * .49, -.15, .3, Math.PI * 1.94); c.lineTo(-3, -1); c.closePath();
      c.fillStyle = '#93b06f'; c.fill(); c.strokeStyle = '#28777b'; c.lineWidth = 2.4; c.stroke();
      if (frog) this.frog(c, x, y);
      c.restore();
    }
    // A frog watches from its lily pad: its eyes follow the latest mating, it blinks and now and
    // then puffs its throat. Purely decorative.
    frog(c, wx, wy) {
      let look = { x: 500, y: 315 };
      const active = this.activeEvents();
      if (active.length) {
        const e = active[active.length - 1].e, [a, b] = e.sources.map(i => this.ducks[i]);
        look = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      } else if (this.ducks.length) look = this.ducks[0];
      const ang = Math.atan2(look.y - (wy - 20), look.x - wx), still = this.reduced.matches;
      const croak = still ? 0 : Math.max(0, Math.sin(this.time * 1.1)) ** 12, blink = !still && this.time % 4.3 < .14;
      c.save(); c.translate(2, -10); c.scale(1.3, 1.3); c.lineJoin = 'round';
      ellipse(c, 0, 4, 19, 12, '#7fb35a'); c.strokeStyle = '#28777b'; c.lineWidth = 2; c.beginPath(); c.ellipse(0, 4, 19, 12, 0, 0, Math.PI * 2); c.stroke();
      ellipse(c, -13, 13, 7, 4, '#6a9e4a'); ellipse(c, 13, 13, 7, 4, '#6a9e4a');
      if (croak > .02) { ellipse(c, 0, 11, 9 * croak + 3, 6 * croak + 2, '#e9f2c6'); }
      for (const side of [-1, 1]) {
        const ex = side * 8, ey = -6;
        ellipse(c, ex, ey, 6.5, 6.5, '#7fb35a'); c.beginPath(); c.arc(ex, ey, 6.5, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
        if (blink) { c.beginPath(); c.moveTo(ex - 4, ey); c.lineTo(ex + 4, ey); c.strokeStyle = '#174551'; c.lineWidth = 1.8; c.stroke(); c.strokeStyle = '#28777b'; c.lineWidth = 2; }
        else { ellipse(c, ex, ey, 4.2, 4.2, '#fffaf0'); ellipse(c, ex + Math.cos(ang) * 1.8, ey + Math.sin(ang) * 1.6, 2.1, 2.1, '#174551'); }
      }
      c.beginPath(); c.moveTo(-6, 4); c.quadraticCurveTo(0, 8, 6, 4); c.strokeStyle = '#2e5e45'; c.lineWidth = 1.5; c.stroke();
      c.restore();
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
      if (look.grey && !this.reduced.matches) this.zzz(c, d.x + 22 * s * Math.sign(d.facing || 1), d.y - 64 * s * Y, Math.max(.8, s * 1.7) * (1 + (look.sleepiness || 0) * .5), alpha, look.sleepiness || 0);
    }
    zzz(c, x, y, s, alpha, sleepiness = 0) {
      c.save(); c.fillStyle = '#37636a';
      for (let i = 0; i < 3 + Math.round(sleepiness * 2); i++) {
        const k = (this.time * .6 + i / 3) % 1; c.globalAlpha = alpha * .8 * (1 - k);
        c.font = `600 ${(9 + i * 3) * s}px Georgia,serif`; c.fillText('z', x + i * 7 * s + k * 6 * s, y - i * 9 * s - k * 10 * s);
      }
      c.restore();
    }
    // The swimmable area is the real pond outline, shrunk by a margin that grows with duck size.
    // Without a pixel mask (for example in tests) it falls back to a central ellipse.
    buildMask(margin) {
      try {
        const m = document.createElement('canvas'); m.width = 250; m.height = 155;
        const c = m.getContext('2d'); c.scale(.25, .25);
        c.fillStyle = '#000'; c.fill(this.water);
        c.globalCompositeOperation = 'destination-out'; c.lineJoin = 'round'; c.lineWidth = margin * 2; c.stroke(this.water);
        const data = c.getImageData(0, 0, 250, 155).data;
        if (!data || !data.length) return null;
        const alpha = new Uint8Array(250 * 155);
        for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3];
        return alpha;
      } catch (error) { return null; }
    }
    inWater(x, y) {
      if (!this.mask) return Math.hypot((x - 500) / 340, (y - 315) / 164) <= 1;
      const head = y - 40 * (this.scale || 1) * Y, test = (px, py) => {
        const i = Math.floor(py / 4) * 250 + Math.floor(px / 4);
        return px >= 0 && py >= 0 && px < 1000 && py < 620 && this.mask[i] > 128;
      };
      return test(x, y) && test(x, head);
    }
    randomSpot() {
      if (this.mask) {
        for (let attempt = 0; attempt < 60; attempt++) {
          const spot = { x: 60 + Math.random() * 900, y: 70 + Math.random() * 500 };
          if (this.inWater(spot.x, spot.y)) return spot;
        }
      }
      const angle = Math.random() * Math.PI * 2, radius = Math.sqrt(Math.random());
      return { x: 500 + Math.cos(angle) * radius * 324, y: 315 + Math.sin(angle) * radius * 153 };
    }
    // Short hops in a random direction. Crossing the whole pond to random destinations would
    // send most paths through the middle and slowly herd every duck into the centre.
    swimTarget(x, y) {
      // A hop that would land on the bank is simply not taken: the duck lingers and tries again
      // later. Redrawing until a hop points inwards would bias ducks towards the middle.
      const angle = Math.random() * Math.PI * 2, hop = 90 + Math.random() * 170;
      const target = { x: x + Math.cos(angle) * hop, y: y + Math.sin(angle) * hop * .55 };
      if (this.inWater(target.x, target.y)) return target;
      return this.inWater(x, y) ? { x, y, linger: true } : this.randomSpot();
    }
    updateDuck(d, dt, i) {
      if (d.held) return;
      d.headingTimer -= dt;
      let dx = d.targetX - d.x, dy = d.targetY - d.y;
      if (!d.meeting && ((Math.hypot(dx, dy) < 35 && !d.lingering) || d.headingTimer <= 0)) {
        const target = this.swimTarget(d.x, d.y); d.targetX = target.x; d.targetY = target.y;
        d.headingTimer = target.linger ? .3 + Math.random() * .5 : (2 + Math.random() * 2) * d.wanderTime;
        d.lingering = Boolean(target.linger);
        dx = d.targetX - d.x; dy = d.targetY - d.y;
      }
      const distance = Math.max(1, Math.hypot(dx, dy));
      const steering = Math.min(1, dt * 3.2), speed = d.meeting && distance < 40 * this.scale ? d.speed * .15 : d.speed;
      d.vx = lerp(d.vx, dx / distance * speed, steering);
      d.vy = lerp(d.vy, dy / distance * speed, steering);
      const fromX = d.x, fromY = d.y;
      d.x += d.vx * dt; d.y += d.vy * dt;
      // Swimming follows destinations inside a convex safe area; guard the bank after spacing adjustments.
      if (this.mask) {
        if (!this.inWater(d.x, d.y)) {
          // Step back off the bank (only a little, so crowding never pumps ducks into the middle).
          if (this.inWater(fromX, fromY)) { d.x = fromX; d.y = fromY; }
          else { const L = Math.hypot(500 - d.x, 315 - d.y) || 1; d.x += (500 - d.x) / L * 2; d.y += (315 - d.y) / L * 2; }
          d.vx *= -.3; d.vy *= -.3;
          if (!d.meeting) { const target = this.swimTarget(d.x, d.y); d.targetX = target.x; d.targetY = target.y; }
        }
      } else {
        const r = Math.hypot((d.x - 500) / 340, (d.y - 315) / 164);
        if (r > 1) {
          d.x = 500 + (d.x - 500) / r; d.y = 315 + (d.y - 315) / r;
          const target = this.swimTarget(d.x, d.y); d.targetX = target.x; d.targetY = target.y;
        }
      }
      const facing = d.vx > 2 ? 1 : d.vx < -2 ? -1 : Math.sign(d.facing) || 1;
      d.facing = lerp(d.facing, facing, Math.min(1, dt * 5));
      d.wake += dt;
      if (d.wake > .22 && i % Math.max(1, Math.ceil(this.ducks.length / 36)) === 0) {
        this.wakes.push({ x: d.x - Math.sign(d.facing) * 20 * this.scale, y: d.y + 5 * this.scale, age: 0, size: this.scale }); d.wake = 0;
      }
    }
    // Beak-to-beak meetings only where they stay readable: few ducks and slow playback.
    beakToBeak() { return Boolean(this.slow) && !this.reduced.matches && this.population.length <= SLOW.maxDucks; }
    // Length of one generation in "Watch every mating" mode: every duckling gets its own meeting.
    slowSeconds(size) { return SLOW.feature + (size - 1) * SLOW.mating + SLOW.doze + SLOW.swap; }
    slowTimeline(size) {
      const total = this.slowSeconds(size);
      return { feature: SLOW.feature / total, mating: (total - SLOW.doze - SLOW.swap) / total, doze: (total - SLOW.swap) / total };
    }
    // Paired parents come together while their duckling is made. Cosmetic only: the pairs are
    // already drawn by the model, from anywhere in the pond.
    steerPairs() {
      this.ducks.forEach(d => { d.meeting = false; d.held = false; });
      if (!this.birth) return;
      if (this.birth.beak) {
        const p = this.birth.progress;
        for (const e of this.birth.events) {
          const q = (p - e.start) / e.length;
          if (q <= 0 || e.sources[0] === e.sources[1]) continue;
          if (this.storyQ(q) >= .62) { if (e.meet && !e.released) { e.released = true; e.sources.forEach(i => { this.ducks[i].headingTimer = 0; this.ducks[i].lingering = false; }); } continue; }
          const [ia, ib] = e.sources, A = this.ducks[ia], B = this.ducks[ib];
          if (!e.meet) {
            const m = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
            for (let k = 0; k < 12 && !this.inWater(m.x, m.y); k++) { m.x += (500 - m.x) * .15; m.y += (315 - m.y) * .15; }
            e.meet = { ...m, from: [{ x: A.x, y: A.y }, { x: B.x, y: B.y }], leftIsA: A.x <= B.x };
          }
          const s = smooth(q / MEET_PART), gap = 40 * this.scale;
          [ia, ib].forEach((i, k) => {
            const d = this.ducks[i], left = (k === 0) === e.meet.leftIsA, from = e.meet.from[k];
            const to = { x: e.meet.x + (left ? -gap : gap), y: e.meet.y };
            d.x = lerp(from.x, to.x, s); d.y = lerp(from.y, to.y, s); d.vx = d.vy = 0; d.targetX = d.x; d.targetY = d.y;
            d.facing = s < .92 ? Math.sign(to.x - from.x) || d.facing : left ? 1 : -1; d.held = true;
          });
        }
        return;
      }
      // In bigger ponds or faster playback, pulling pairs together would herd everyone into the middle.
      if (this.population.length > 24) return;
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
      const p = Math.min(1, birth.progress / birth.tl.feature), m = birth.meeting;
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
        this.steerPairs(); // keep meeting pairs exactly in place after spacing nudges
      }
      const birth = this.birth, p = birth ? birth.progress : 0;
      const tl = birth ? birth.tl : TIMELINE;
      const oldAlpha = birth ? 1 - smooth((p - tl.doze) / (1 - tl.doze)) : 1;
      const focus = birth && birth.featured >= 0 && p < tl.feature;
      const focusIndices = new Set(focus ? birth.sources : []);
      const dozing = new Set(birth && p >= tl.mating ? birth.unused : []);
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
      const dim = focus ? 1 - .5 * smooth(p / tl.feature / .15) * (1 - smooth((p / tl.feature - .7) / .1)) : 1;
      const sleepiness = birth ? clamp((p - tl.mating) / Math.max(.001, tl.doze - tl.mating), 0, 1) : 0;
      others.forEach(({ d, i }) => this.drawDuck(c, d, oldAlpha, this.growth, i === this.selected, { dim, grey: dozing.has(i), sleepiness }));
      if (focus) this.drawFamily(c, birth);
      this.drawMatings(c);
      if (!focus) this.drawCounters(c);
      if (birth && p > tl.doze) birth.next.forEach(d => this.drawDuck(c, d, smooth((p - tl.doze) / (1 - tl.doze)), .65, false));
      this.lily(c, 780, 410, 36, true, 4);
      this.drawPanel();
    }
  }
  window.PondScene = PondScene;
})();
