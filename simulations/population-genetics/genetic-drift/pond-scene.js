/* The scenery and swimming are cosmetic; birth scenes use recorded inheritance. */
(function () {
  'use strict';
  const W = 1000, H = 540;
  const WATER = 'M98 299C73 209 181 138 299 133C360 76 477 96 552 120C691 77 849 146 878 248C953 320 903 414 809 457C718 529 565 484 492 520C350 551 240 498 194 451C93 446 45 365 98 299Z';
  const GROUND = 'M58 282C18 166 143 83 277 80C353 14 480 38 555 65C713 16 921 100 926 242C1000 341 949 469 830 504C722 590 560 542 492 569C328 611 202 551 159 498C36 493 4 371 58 282Z';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  function ellipse(c, x, y, rx, ry, fill, rotation = 0) {
    c.beginPath(); c.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2); c.fillStyle = fill; c.fill();
  }

  class PondScene {
    constructor(canvas, onSelect, nursery) {
      this.canvas = canvas; this.c = canvas.getContext('2d'); this.onSelect = onSelect;
      this.nursery = nursery; this.nc = nursery.getContext('2d');
      if (!this.c) throw new Error('Canvas is unavailable');
      this.water = new Path2D(WATER); this.ground = new Path2D(GROUND);
      this.ducks = []; this.population = []; this.birth = null; this.wakes = []; this.fastMatings = null; this.time = 0; this.selected = 0;
      this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.sprites = {}; this.thumbnails = {};
      for (const pair of [[0, 0], [0, 1], [1, 0], [1, 1]]) {
        for (const cream of [false]) for (const blink of [false, true]) {
          const sprite = document.createElement('canvas'); sprite.width = 288; sprite.height = 288;
          const c = sprite.getContext('2d'); c.scale(2.5, 2.5); c.translate(55, 70); window.DuckCharacter.draw(c, { x: 0, y: 0, scale: 1, facing: 1, alleles: pair, cream }, 1, { still: true, blink });
          this.sprites[`${pair.join('')}${cream ? 'c' : ''}${blink ? 'b' : ''}`] = sprite;
          if (!blink && !cream) this.thumbnails[pair.join('')] = sprite.toDataURL();
        }
      }
      this.background = document.createElement('canvas'); this.background.width = W * 1.5; this.background.height = 620 * 1.5;
      const bc = this.background.getContext('2d'); bc.scale(1.5, 1.5); this.drawGround(bc);
      this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(canvas);
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
      const spacing = (this.population.length <= 24 ? 100 : 82) * this.scale, grid = new Map();
      this.ducks.forEach((d, i) => {
        const key = `${Math.floor(d.x / spacing)},${Math.floor(d.y / spacing)}`;
        if (!grid.has(key)) grid.set(key, []); grid.get(key).push(i);
      });
      this.ducks.forEach((d, i) => {
        const gx = Math.floor(d.x / spacing), gy = Math.floor(d.y / spacing);
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
          for (const j of grid.get(`${gx + dx},${gy + dy}`) || []) {
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
    setPopulation(population, newborn = false, parents = null) {
      if (!parents) this.fastMatings = null;
      else if (!this.fastMatings || this.time - this.fastMatings.started >= 1.15) {
        // Retain one real generation long enough to see, even at 100 generations/second.
        this.fastMatings = { plan: this.planMatings(parents), started: this.time,
          positions: this.ducks.map(d => ({ x: d.x, y: d.y })) };
      }
      this.population = population; this.scale = Math.max(.19, Math.min(1.15, 2.5 / Math.pow(population.length, .43)));
      if (this.ducks.length !== population.length) this.ducks = this.makeDucks(population);
      this.ducks.forEach((d, i) => { d.alleles = population[i]; });
      this.growth = newborn ? .65 : 1; this.birth = null;
      this.nursery.setAttribute('aria-label', `The next generation will contain ${population.length} ducklings. None born yet.`);
      this.nursery.dataset.born = '0'; this.nursery.dataset.total = String(population.length);
      this.canvas.dataset.population = String(population.length);
      this.canvas.setAttribute('aria-label', `${population.length} swimming ducks, each carrying two coloured allele markers. Choose a duck with the pointer or the duck selector below.`);
    }
    beginBirth(previous, next, parents, child) {
      this.fastMatings = null;
      const sources = parents[child].map(source => Math.floor(source / 2));
      const from = sources.map(i => ({ x: this.ducks[i].x, y: this.ducks[i].y }));
      const meeting = { x: clamp((from[0].x + from[1].x) / 2, 340, 660), y: clamp((from[0].y + from[1].y) / 2, 280, 370) };
      // The complete cohort is already sampled by the model. These events never draw genes.
      this.birth = { sources, copies: parents[child].map(source => source % 2), alleles: next[child], child,
        progress: 0, next: this.makeDucks(next), from, meeting, matings: this.planMatings(parents),
        order: [child, ...next.map((_, i) => i).filter(i => i !== child)] };
    }
    planMatings(parents) {
      return parents.map((copies, i) => ({ sources: [...new Set(copies.map(copy => Math.floor(copy / 2)))],
        start: .06 + i / parents.length * .55 }));
    }
    matingHearts(plan, progress) {
      const hearts = new Map();
      for (const event of plan) {
        const age = (progress - event.start) / .34;
        if (age <= 0 || age >= 1) continue;
        const alpha = Math.min(1, age * 5, (1 - age) * 5);
        for (const index of event.sources) {
          // Repeated contributions pulse again; overlapping hearts on one parent merge.
          const previous = hearts.get(index);
          if (!previous || alpha > previous.alpha) hearts.set(index, { alpha, age });
        }
      }
      return hearts;
    }
    drawMatings(c, excluded) {
      let hearts = new Map();
      if (!this.reduced.matches) {
        if (this.birth) hearts = this.matingHearts(this.birth.matings, this.birth.progress);
        else if (this.fastMatings) hearts = this.matingHearts(this.fastMatings.plan, (this.time - this.fastMatings.started) / 1.15);
      }
      let shown = 0;
      const scale = clamp(this.scale * .65, .22, .48);
      for (const [index, pulse] of hearts) {
        if (excluded.has(index)) continue; // The close-up has its own large heart.
        const d = this.birth ? this.ducks[index] : this.fastMatings.positions[index];
        if (!d) continue;
        this.drawHeart(c, d.x, d.y - (62 * this.scale + 8) * 620 / H - pulse.age * 16, scale, pulse.alpha * .9, true);
        shown++;
      }
      this.canvas.dataset.matingHearts = String(shown);
    }
    bornCount() {
      if (!this.birth) return 0;
      const p = this.birth.progress;
      if (p < .8) return 0;
      return Math.min(this.population.length, 1 + Math.floor(clamp((p - .8) / .1, 0, 1) * this.population.length));
    }
    drawNursery() {
      const c = this.nc, size = this.population.length, birth = this.birth, count = this.bornCount();
      c.setTransform(this.nursery.width / 1000, 0, 0, this.nursery.height / 70, 0, 0); c.clearRect(0, 0, 1000, 70);
      const columns = Math.min(size, Math.ceil(Math.sqrt(size * 8))), rows = Math.ceil(size / columns);
      const cellWidth = 950 / columns, cellHeight = 64 / rows;
      const scale = Math.min(.52, cellWidth / 100, cellHeight / 95);
      const born = new Set(birth ? birth.order.slice(0, count) : []);
      const fade = birth ? 1 - smooth((birth.progress - .94) / .06) : 1;
      for (let i = 0; i < size; i++) {
        const row = Math.floor(i / columns), inRow = Math.min(columns, size - row * columns);
        const x = (1000 - inRow * cellWidth) / 2 + (i % columns + .5) * cellWidth;
        const y = 3 + (row + .8) * cellHeight;
        if (born.has(i)) {
          const d = birth.next[i]; c.save(); c.globalAlpha = fade;
          const sprite = this.sprites[d.alleles.join('') + (d.cream ? 'c' : '')];
          c.drawImage(sprite, x - 55 * scale, y - 70 * scale, 115.2 * scale, 115.2 * scale); c.restore();
        } else { ellipse(c, x, y - 8, Math.min(18, cellWidth * .24), Math.min(4, cellHeight * .07), '#a8bcb044'); }
      }
      if (this.nursery.dataset.born !== String(count)) {
        this.nursery.dataset.born = String(count);
        this.nursery.setAttribute('aria-label', `${count} of ${size} ducklings ready for the next generation.`);
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
      c.fillStyle = '#a3dcda'; c.fill(this.water); c.strokeStyle = '#5caaa7'; c.lineWidth = 2; c.stroke(this.water);
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
    drawDuck(c, d, alpha = 1, size = 1, selected = false) {
      const depth = .9 + (d.y - 160) / 1600, s = this.scale * size * depth;
      const bob = this.reduced.matches ? 0 : Math.sin(this.time * 4.8 + d.phase) * 1.6;
      c.save(); c.globalAlpha = alpha;
      if (selected) { c.strokeStyle = '#fff4c8cc'; c.lineWidth = 2; c.beginPath(); c.ellipse(d.x, d.y + 1, 47 * s, 15 * s, 0, 0, Math.PI * 2); c.stroke(); }
      c.translate(d.x, d.y + bob);
      const turnWidth = .72 + Math.min(1, Math.abs(d.facing)) * .28;
      c.scale(s * (d.facing >= 0 ? 1 : -1) * turnWidth, s * 620 / H);
      if (!this.reduced.matches) c.rotate(Math.sin(this.time * 3.5 + d.phase) * .035);
      const blink = !this.reduced.matches && (this.time + d.blink) % 6.5 < .13;
      const sprite = this.sprites[d.alleles.join('') + (d.cream ? 'c' : '') + (blink ? 'b' : '')];
      c.drawImage(sprite, -55, -70, 115.2, 115.2);
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
      if (Math.hypot(dx, dy) < 35 || d.headingTimer <= 0) {
        const target = this.swimTarget(d.x, d.y); d.targetX = target.x; d.targetY = target.y; d.headingTimer = (2 + Math.random() * 2) * d.wanderTime;
        dx = d.targetX - d.x; dy = d.targetY - d.y;
      }
      const distance = Math.max(1, Math.hypot(dx, dy));
      const steering = Math.min(1, dt * 3.2);
      d.vx = lerp(d.vx, dx / distance * d.speed, steering);
      d.vy = lerp(d.vy, dy / distance * d.speed, steering);
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
    drawHeart(c, x, y, scale, alpha, small = false) {
      c.save(); c.translate(x, y); c.scale(scale, scale * 620 / H); c.globalAlpha = alpha; c.shadowColor = '#d9798560'; c.shadowBlur = small ? 0 : 12;
      c.fillStyle = small ? '#d7768f' : '#e58e99'; c.beginPath(); c.moveTo(0, 9); c.bezierCurveTo(-26, -8, -14, -27, 0, -14); c.bezierCurveTo(14, -27, 26, -8, 0, 9); c.fill(); if (small) { c.strokeStyle = '#bb637b'; c.lineWidth = .8; c.stroke(); } c.shadowColor = 'transparent'; ellipse(c, -7, -13, 3, 1.5, '#ffd6cf9c', -.5); c.restore();
    }
    character(c, display, pose) {
      // Compress pond depth for the laptop layout while preserving the approved duck proportions.
      c.save(); c.translate(display.x, display.y); c.scale(1, 620 / H);
      const markers = window.DuckCharacter.draw(c, { ...display, x: 0, y: 0 }, this.time, pose); c.restore();
      return markers.map(m => ({ ...m, x: m.x + display.x, y: m.y * 620 / H + display.y }));
    }
    cloud(c, x, y, alpha, spread) {
      c.save(); c.globalAlpha = alpha;
      const fill = c.createRadialGradient(x, y - 30, 5, x, y, 115); fill.addColorStop(0, '#fffce4'); fill.addColorStop(1, '#eff6d8');
      for (let i = 0; i < 7; i++) { const a = i * Math.PI * 2 / 7; ellipse(c, x + Math.cos(a) * 46 * spread, y - 27 + Math.sin(a) * 29 * spread, 34 + i % 2 * 9, 28, fill); }
      ellipse(c, x, y - 27, 63, 40, fill); c.restore();
    }
    drawFamily(c, birth) {
      const p = Math.min(1, birth.progress / .8), m = birth.meeting;
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
        const pose = { still: this.reduced.matches, alpha: 1 - between(.7, .79) + between(.85, .94) };
        pose.alpha = clamp(pose.alpha, 0, 1);
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
      if (!same && p > .36 && p < .74) {
        const q = clamp((p - .36) / .38, 0, 1), alpha = Math.min(1, q * 7) * (1 - between(.67, .74));
        this.drawHeart(c, m.x, m.y - focusScale * 74 - q * 29, .9, alpha);
        if (p > .43) this.drawHeart(c, m.x + 32, m.y - focusScale * 58 - q * 48, .35, alpha * .7);
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
          ellipse(c, x, y, 10, 10, '#fffbe2'); ellipse(c, x, y, 7.5, 7.5, window.DuckCharacter.palette[birth.alleles[i]]);
          if (q < .95) { c.beginPath(); c.moveTo(source.x, source.y); c.quadraticCurveTo(control.x, control.y, x, y); c.strokeStyle = '#fff8dc9c'; c.lineWidth = 2; c.setLineDash([3, 6]); c.stroke(); c.setLineDash([]); }
        });
      }
      if (p > .79 && birth.progress < .82) {
        const reveal = between(.79, .88), exit = between(.88, 1), next = birth.next[birth.child];
        this.character(c, { ...next, x: lerp(m.x, m.x + 80, exit), y: lerp(m.y + 18, 470, exit), scale: .45 + reveal * .3, facing: 1, baby: true },
          { still: this.reduced.matches, alpha: reveal * (1 - smooth((birth.progress - .77) / .03)) });
      }
    }
    render(dt) {
      if (!this.reduced.matches) this.time += dt;
      const c = this.c; c.setTransform(this.canvas.width / W, 0, 0, this.canvas.height / 620, 0, 0); c.clearRect(0, 0, W, 620); c.drawImage(this.background, 0, 0, W, 620);
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
      this.lily(c, 246, 212, 32, false, 1); c.restore();
      this.growth = Math.min(1, this.growth + dt * .24);
      if (!this.reduced.matches) {
        const steps = Math.max(1, Math.ceil(dt / .04));
        for (let step = 0; step < steps; step++) {
          this.ducks.forEach((d, i) => this.updateDuck(d, dt / steps, i)); this.keepSpace(dt / steps);
        }
      }
      const birth = this.birth, p = birth ? birth.progress : 0;
      const oldAlpha = birth ? 1 - smooth((p - .94) / .06) : 1;
      const focus = birth && this.population.length <= 24 && p < .8 && !this.reduced.matches;
      const focusIndices = new Set(focus ? birth.sources : []);
      const others = this.ducks.map((d, i) => ({ d, i })).filter(({ i }) => !focusIndices.has(i)).sort((a, b) => a.d.y - b.d.y);
      const dim = focus ? 1 - .45 * smooth(p / .15) * (1 - smooth((p - .7) / .1)) : 1;
      others.forEach(({ d, i }) => this.drawDuck(c, d, oldAlpha * dim, this.growth, i === this.selected));
      if (focus) this.drawFamily(c, birth);
      this.drawMatings(c, focusIndices);
      if (birth && p > .94) birth.next.forEach(d => this.drawDuck(c, d, smooth((p - .94) / .06), .65, false));
      this.lily(c, 780, 410, 36, false, 4);
      this.drawNursery();
    }
  }
  window.PondScene = PondScene;
})();
