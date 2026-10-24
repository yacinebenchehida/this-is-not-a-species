/* The scenery and swimming are cosmetic; birth scenes use recorded inheritance. */
(function () {
  'use strict';
  const W = 1000, H = 620;
  const WATER = 'M98 299C73 209 181 138 299 133C360 76 477 96 552 120C691 77 849 146 878 248C953 320 903 414 809 457C718 529 565 484 492 520C350 551 240 498 194 451C93 446 45 365 98 299Z';
  const GROUND = 'M58 282C18 166 143 83 277 80C353 14 480 38 555 65C713 16 921 100 926 242C1000 341 949 469 830 504C722 590 560 542 492 569C328 611 202 551 159 498C36 493 4 371 58 282Z';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  function seeded(seed) { return () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; }; }
  function ellipse(c, x, y, rx, ry, fill, rotation = 0) {
    c.beginPath(); c.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2); c.fillStyle = fill; c.fill();
  }
  function gradient(c, x, y, radius, stops) {
    const g = c.createRadialGradient(x - radius * .3, y - radius * .4, 1, x, y, radius);
    stops.forEach(([stop, colour]) => g.addColorStop(stop, colour)); return g;
  }
  function duckShape(c, alleles, blink = false) {
    c.save();
    const silhouette = new Path2D('M-28 6C-38-5-39-17-35-23Q-29-12-17-11Q-5-17 4-15C-6-29 0-49 17-52C36-56 49-36 38-21C50-7 37 13 15 20C-4 27-24 22-28 6Z');
    c.shadowColor = '#b8732440'; c.shadowBlur = 4; c.shadowOffsetY = 2;
    c.fillStyle = gradient(c, 2, -15, 64, [[0, '#fff8c4'], [.32, '#ffe779'], [.74, '#f4ca4d'], [1, '#d99a29']]);
    c.fill(silhouette); c.shadowColor = 'transparent'; c.strokeStyle = '#b68e37'; c.lineWidth = .85; c.stroke(silhouette);
    c.save(); c.clip(silhouette);
    ellipse(c, -4, 15, 33, 11, '#b7782527');
    ellipse(c, 10, -41, 15, 8, '#fffce872', -.35);
    ellipse(c, -18, -7, 15, 5, '#fff9c258', -.3);
    c.restore();
    c.save(); c.translate(-9, 2); c.rotate(-.16);
    c.shadowColor = '#b3793038'; c.shadowBlur = 3; c.shadowOffsetY = 2;
    ellipse(c, 0, 0, 19, 12, gradient(c, -2, -2, 23, [[0, '#fff0a3'], [.65, '#f7d261'], [1, '#dfac38']]));
    c.shadowColor = 'transparent'; c.strokeStyle = '#d5a33b'; c.lineWidth = .7;
    c.beginPath(); c.ellipse(0, 0, 19, 12, 0, -.2, 2.8); c.stroke();
    c.restore();
    c.fillStyle = gradient(c, 42, -29, 15, [[0, '#ffc77c'], [.6, '#ed9341'], [1, '#cc6628']]);
    const beak = new Path2D('M33-33Q44-38 52-29Q56-24 46-21Q39-19 32-25Q36-28 33-33Z'); c.fill(beak);
    c.strokeStyle = '#bd702b'; c.lineWidth = .7; c.stroke(beak);
    c.beginPath(); c.moveTo(37, -26); c.quadraticCurveTo(44, -24, 50, -26); c.strokeStyle = '#b87931'; c.lineWidth = .75; c.stroke();
    ellipse(c, 45, -30, .9, .65, '#985a29');
    if (blink) { c.beginPath(); c.moveTo(24, -35); c.quadraticCurveTo(28, -32, 31, -35); c.strokeStyle = '#423b28'; c.lineWidth = 2.2; c.stroke(); }
    else { ellipse(c, 27, -35, 3.5, 4.8, '#342f24', .07); ellipse(c, 28, -36.7, 1.2, 1.5, '#fffdf0'); }
    ellipse(c, 30, -24, 5.5, 3.7, '#ed9e5359');
    alleles.forEach((a, i) => {
      const x = i ? 4 : -11, y = i ? 7 : 3;
      c.shadowColor = '#6f642c3b'; c.shadowBlur = 2; c.shadowOffsetY = 1.5;
      ellipse(c, x, y, 6.5, 6.5, gradient(c, x, y, 8, a ? [[0, '#75d0bd'], [.45, '#3b9c94'], [1, '#22676f']] : [[0, '#ffa886'], [.45, '#eb795d'], [1, '#bb4d38']]));
      c.shadowColor = 'transparent'; ellipse(c, x - 1.8, y - 2, 2.2, 1.3, '#ffffff65', -.5);
    });
    c.restore();
  }

  class PondScene {
    constructor(canvas, onSelect) {
      this.canvas = canvas; this.c = canvas.getContext('2d'); this.onSelect = onSelect;
      if (!this.c) throw new Error('Canvas is unavailable');
      this.water = new Path2D(WATER); this.ground = new Path2D(GROUND);
      this.ducks = []; this.population = []; this.birth = null; this.wakes = []; this.time = 0; this.selected = 0;
      this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.sprites = {}; this.thumbnails = {};
      for (const pair of [[0, 0], [0, 1], [1, 0], [1, 1]]) {
        for (const blink of [false, true]) {
          const sprite = document.createElement('canvas'); sprite.width = 288; sprite.height = 288;
          const c = sprite.getContext('2d'); c.scale(2.5, 2.5); c.translate(55, 70); duckShape(c, pair, blink);
          this.sprites[`${pair.join('')}${blink ? 'b' : ''}`] = sprite;
          if (!blink) this.thumbnails[pair.join('')] = sprite.toDataURL();
        }
      }
      this.background = document.createElement('canvas'); this.background.width = W * 1.5; this.background.height = H * 1.5;
      const bc = this.background.getContext('2d'); bc.scale(1.5, 1.5); this.drawGround(bc);
      this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(canvas);
      canvas.addEventListener('pointerdown', event => {
        const rect = canvas.getBoundingClientRect(), x = (event.clientX - rect.left) * W / rect.width, y = (event.clientY - rect.top) * H / rect.height;
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
      const result = [], spacing = 78 * this.scale;
      population.forEach((alleles, i) => {
        let x, y;
        for (let attempt = 0; attempt < 45; attempt++) {
          const theta = Math.random() * Math.PI * 2, radius = Math.sqrt(Math.random());
          x = 500 + Math.cos(theta) * radius * 324; y = 315 + Math.sin(theta) * radius * 153;
          if (result.every(d => Math.hypot(d.x - x, (d.y - y) * 1.5) > spacing)) break;
        }
        result.push({ x, y, vx: (Math.random() - .5) * 14, vy: (Math.random() - .5) * 8,
          phase: Math.random() * 50, facing: i % 2 ? 1 : -1, alleles, wake: Math.random(), blink: Math.random() * 8 });
      });
      return result;
    }
    keepSpace(dt) {
      const spacing = 73 * this.scale, grid = new Map();
      this.ducks.forEach((d, i) => {
        const key = `${Math.floor(d.x / spacing)},${Math.floor(d.y / spacing)}`;
        if (!grid.has(key)) grid.set(key, []); grid.get(key).push(i);
      });
      this.ducks.forEach((d, i) => {
        const gx = Math.floor(d.x / spacing), gy = Math.floor(d.y / spacing);
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
          for (const j of grid.get(`${gx + dx},${gy + dy}`) || []) {
            if (j <= i) continue;
            const other = this.ducks[j], x = d.x - other.x, y = (d.y - other.y) * 1.5;
            const distance = Math.hypot(x, y);
            if (distance > .1 && distance < spacing) {
              const force = (spacing - distance) * Math.min(dt * 2.5, .18);
              d.x += x / distance * force; other.x -= x / distance * force;
              d.y += y / distance * force / 1.5; other.y -= y / distance * force / 1.5;
            }
          }
        }
      });
    }
    setPopulation(population, newborn = false) {
      this.population = population; this.scale = Math.max(.19, Math.min(.96, 2.5 / Math.pow(population.length, .43)));
      if (this.ducks.length !== population.length) this.ducks = this.makeDucks(population);
      this.ducks.forEach((d, i) => { d.alleles = population[i]; });
      this.growth = newborn ? .65 : 1; this.birth = null;
      this.canvas.setAttribute('aria-label', `${population.length} swimming ducks, each carrying two coloured allele markers. Choose a duck with the pointer or the duck selector below.`);
    }
    beginBirth(previous, next, parents, child) {
      const sources = parents[child].map(s => Math.floor(s / 2));
      this.birth = { sources, alleles: next[child], child, progress: 0, next: this.makeDucks(next), from: sources.map(i => ({ x: this.ducks[i].x, y: this.ducks[i].y })) };
    }
    finishBirth(population) {
      const next = this.birth && this.birth.next;
      if (next) this.ducks = next;
      this.setPopulation(population, true);
    }
    drawGround(c) {
      const rng = seeded(871923);
      c.clearRect(0, 0, W, H);
      c.shadowColor = '#555f4234'; c.shadowBlur = 22; c.shadowOffsetY = 16;
      c.fillStyle = gradient(c, 490, 290, 520, [[0, '#bac58b'], [.6, '#a9b97d'], [1, '#7f9c69']]); c.fill(this.ground);
      c.shadowColor = 'transparent';
      c.strokeStyle = '#6e8e5840'; c.lineWidth = 2; c.stroke(this.ground);
      c.save(); c.clip(this.ground);
      for (let i = 0; i < 1700; i++) {
        const x = rng() * W, y = rng() * H;
        ellipse(c, x, y, .5 + rng(), .3 + rng(), i % 2 ? '#eaf0bc45' : '#4c743b24');
      }
      c.restore();
      c.lineJoin = 'round';
      c.shadowColor = '#3d563b35'; c.shadowBlur = 7; c.shadowOffsetY = 5;
      c.strokeStyle = '#b19d6b'; c.lineWidth = 48; c.stroke(this.water); c.shadowColor = 'transparent';
      const sand = c.createLinearGradient(0, 90, 0, 530); sand.addColorStop(0, '#f1dfaa'); sand.addColorStop(.5, '#e9d49b'); sand.addColorStop(1, '#c6b47d');
      c.strokeStyle = sand; c.lineWidth = 40; c.stroke(this.water);
      c.strokeStyle = '#fff0c447'; c.lineWidth = 3; c.stroke(new Path2D('M78 296C53 193 183 111 299 113C358 54 480 75 556 99C705 54 879 140 898 245'));
      c.save(); const ring = new Path2D(GROUND + WATER); c.clip(ring, 'evenodd');
      for (let i = 0; i < 2400; i++) { const x = rng() * W, y = rng() * H; ellipse(c, x, y, rng() * 1.4 + .35, rng() * .7 + .25, i % 3 ? '#8e875334' : '#fff4c98c'); }
      c.restore();
      c.fillStyle = '#4c8477'; c.fill(this.water);
      const water = c.createLinearGradient(0, 110, 0, 520); water.addColorStop(0, '#b5ddc7'); water.addColorStop(.35, '#8bcbbd'); water.addColorStop(1, '#5da99f');
      c.fillStyle = water; c.fill(this.water);
      c.save(); c.clip(this.water); c.strokeStyle = '#e5edb940'; c.lineWidth = 29; c.stroke(this.water);
      const glow = gradient(c, 360, 250, 380, [[0, '#e2f3cc49'], [.6, '#bddfc813'], [1, '#a4c4ae00']]); c.fillStyle = glow; c.fillRect(0, 0, W, H);
      c.strokeStyle = '#f7efd36a'; c.lineWidth = 2; c.stroke(this.water); c.restore();
      const rocks = [[113, 253, 14], [108, 274, 9], [124, 282, 7], [798, 493, 16], [822, 483, 10], [812, 511, 7], [601, 101, 10], [620, 104, 7], [298, 524, 10], [881, 216, 9]];
      rocks.forEach(([x, y, size]) => {
        c.shadowColor = '#3c5b3e45'; c.shadowBlur = 4; c.shadowOffsetY = 3;
        ellipse(c, x, y, size, size * .65, gradient(c, x, y, size * 1.3, [[0, '#e8e3c4'], [.6, '#bab9a1'], [1, '#8b967e']]), -.3);
        c.shadowColor = 'transparent'; c.beginPath(); c.ellipse(x - 2, y - 2, size * .6, size * .29, -.3, 3.4, 5.7); c.strokeStyle = '#f8f2db9c'; c.lineWidth = 1; c.stroke();
      });
      this.grass(c, 170, 139, 43, -1); this.grass(c, 900, 371, 49, 1); this.grass(c, 653, 532, 33, -1); this.grass(c, 325, 109, 23, 1); this.grass(c, 194, 481, 21, -1);
      [[275, 95], [286, 105], [873, 191], [350, 551], [364, 545]].forEach(([x, y]) => {
        c.strokeStyle = '#6f8d52'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y + 12); c.lineTo(x, y); c.stroke();
        for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ellipse(c, x + Math.cos(a) * 3, y + Math.sin(a) * 3, 3.5, 2, '#fff6df', a); }
        ellipse(c, x, y, 2, 2, '#eac65d');
      });
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
      c.save(); c.translate(x, y + Math.sin(this.time * .6 + phase) * 1.5); c.rotate(Math.sin(this.time * .18 + phase) * .035);
      ellipse(c, 0, 5, size * 1.08, size * .52, '#226b6840');
      c.save(); c.scale(1, .64);
      c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, size, .2, Math.PI * 1.93); c.closePath();
      c.fillStyle = gradient(c, -3, -3, size * 1.2, [[0, '#c6d68b'], [.5, '#8aaf69'], [1, '#4d855c']]); c.fill(); c.strokeStyle = '#5c8a5b'; c.lineWidth = 1; c.stroke();
      c.strokeStyle = '#d4e4a760'; c.lineWidth = .7;
      for (let i = 1; i < 8; i++) { const a = i * .8; c.beginPath(); c.moveTo(-3, 0); c.lineTo(Math.cos(a) * size * .85, Math.sin(a) * size * .85); c.stroke(); }
      c.restore();
      if (flower) {
        c.translate(-3, -9);
        for (let layer = 0; layer < 2; layer++) for (let i = 0; i < 7; i++) {
          const a = i * Math.PI * 2 / 7 + layer * .4, radius = layer ? 8 : 13;
          c.save(); c.rotate(a); c.beginPath(); c.moveTo(0, 2); c.bezierCurveTo(-8, -radius * .4, -5, -radius * 1.7, 0, -radius * 1.9); c.bezierCurveTo(5, -radius * 1.7, 8, -radius * .4, 0, 2);
          c.fillStyle = gradient(c, 0, -radius, radius * 1.4, [[0, '#fff6ec'], [.6, '#f4bbc0'], [1, '#d9859f']]); c.fill(); c.restore();
        }
        ellipse(c, 0, -2, 4.5, 3.3, '#eac762');
      }
      c.restore();
    }
    drawDuck(c, d, alpha = 1, size = 1, selected = false) {
      const depth = .9 + (d.y - 160) / 1600, s = this.scale * size * depth;
      const bob = this.reduced.matches ? 0 : Math.sin(this.time * 2.7 + d.phase) * 1.25;
      c.save(); c.globalAlpha = alpha;
      ellipse(c, d.x, d.y + 8 * s, 34 * s, 8.5 * s, '#265b5833');
      c.strokeStyle = '#e3f4dc95'; c.lineWidth = 1.4;
      c.beginPath(); c.ellipse(d.x, d.y + 8 * s, 40 * s, 10 * s, 0, .15, 2.9); c.stroke();
      if (selected) { c.strokeStyle = '#fff4c8cc'; c.lineWidth = 2; c.beginPath(); c.ellipse(d.x, d.y + 1, 47 * s, 15 * s, 0, 0, Math.PI * 2); c.stroke(); }
      c.translate(d.x, d.y + bob);
      const turnWidth = .72 + Math.min(1, Math.abs(d.facing)) * .28;
      c.scale(s * (d.facing >= 0 ? 1 : -1) * turnWidth, s);
      if (!this.reduced.matches) c.rotate(Math.sin(this.time * 1.8 + d.phase) * .025);
      const blink = !this.reduced.matches && (this.time + d.blink) % 6.5 < .13;
      const sprite = this.sprites[d.alleles.join('') + (blink ? 'b' : '')];
      c.drawImage(sprite, -55, -70, 115.2, 115.2);
      c.restore();
    }
    updateDuck(d, dt, i) {
      const dx = (d.x - 500) / 324, dy = (d.y - 315) / 153, radius = Math.hypot(dx, dy);
      d.vx += (Math.sin(this.time * .55 + d.phase) * 2 - d.vx * .055) * dt;
      d.vy += (Math.cos(this.time * .37 + d.phase) * 1.2 - d.vy * .06) * dt;
      if (radius > .92) { d.vx -= dx * 30 * dt; d.vy -= dy * 17 * dt; }
      d.vx = clamp(d.vx, -17, 17); d.vy = clamp(d.vy, -9, 9);
      d.x += d.vx * dt; d.y += d.vy * dt;
      // Keep every actor inside the swimmable area even after long unattended runs.
      const r = Math.hypot((d.x - 500) / 340, (d.y - 315) / 164);
      if (r > 1) { d.x = 500 + (d.x - 500) / r; d.y = 315 + (d.y - 315) / r; }
      const facing = d.vx > .8 ? 1 : d.vx < -.8 ? -1 : Math.sign(d.facing) || 1;
      d.facing = lerp(d.facing, facing, Math.min(1, dt * 2.5));
      d.wake += dt;
      if (d.wake > .6 && i % Math.max(1, Math.ceil(this.ducks.length / 36)) === 0) {
        this.wakes.push({ x: d.x - Math.sign(d.facing) * 20 * this.scale, y: d.y + 5 * this.scale, age: 0, size: this.scale }); d.wake = 0;
      }
    }
    drawHeart(c, x, y, scale, alpha) {
      c.save(); c.translate(x, y); c.scale(scale, scale); c.globalAlpha = alpha; c.shadowColor = '#d9798560'; c.shadowBlur = 12;
      c.fillStyle = '#e58e99'; c.beginPath(); c.moveTo(0, 9); c.bezierCurveTo(-26, -8, -14, -27, 0, -14); c.bezierCurveTo(14, -27, 26, -8, 0, 9); c.fill(); c.shadowColor = 'transparent'; ellipse(c, -7, -13, 3, 1.5, '#ffd6cf9c', -.5); c.restore();
    }
    render(dt) {
      if (!this.reduced.matches) this.time += dt;
      const c = this.c; c.setTransform(this.canvas.width / W, 0, 0, this.canvas.height / H, 0, 0); c.clearRect(0, 0, W, H); c.drawImage(this.background, 0, 0, W, H);
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
      this.lily(c, 246, 212, 26, true, 1); this.lily(c, 279, 223, 18, false, 3);
      this.growth = Math.min(1, this.growth + dt * .24);
      if (!this.reduced.matches) { this.ducks.forEach((d, i) => this.updateDuck(d, dt, i)); this.keepSpace(dt); }
      const birth = this.birth, p = birth ? birth.progress : 0;
      const oldAlpha = birth ? 1 - smooth((p - .83) / .17) : 1;
      const moving = new Map();
      if (birth && !this.reduced.matches) {
        const approach = smooth(p / .4);
        birth.sources.forEach((index, i) => {
          const from = birth.from[i], targetX = birth.sources[0] === birth.sources[1] ? 500 : (i ? 535 : 465);
          moving.set(index, { ...this.ducks[index], x: lerp(from.x, targetX, approach), y: lerp(from.y, 325, approach), facing: i ? -1 : 1 });
        });
        if (p > .28 && p < .82) {
          ellipse(c, 500, 329, 85, 25, '#e9f1be20');
          if (birth.sources[0] !== birth.sources[1]) this.drawHeart(c, 500, 250 - smooth((p - .4) / .25) * 18, .85, smooth((p - .28) / .16) * (1 - smooth((p - .68) / .1)));
        }
      }
      const actors = this.ducks.map((d, i) => ({ d: moving.get(i) || d, i })).sort((a, b) => a.d.y - b.d.y);
      actors.forEach(({ d, i }) => this.drawDuck(c, d, oldAlpha, this.growth, i === this.selected || moving.has(i)));
      if (birth && p > .55 && p < .91 && !this.reduced.matches) {
        const hatch = smooth((p - .6) / .15);
        if (p < .72) {
          c.save(); c.globalAlpha = 1 - hatch; c.shadowColor = '#546b3d45'; c.shadowBlur = 6; c.shadowOffsetY = 5;
          ellipse(c, 500, 352, 13, 18, '#fff5d0', Math.sin(this.time * 18) * .12);
          c.shadowColor = 'transparent'; c.strokeStyle = '#d4bc82'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(489, 351); c.lineTo(495, 347); c.lineTo(501, 353); c.lineTo(507, 349); c.stroke(); c.restore();
        }
        if (hatch > 0) this.drawDuck(c, { x: 500, y: 365, phase: 0, facing: 1, blink: 2, alleles: birth.alleles }, Math.min(1, hatch * 2), .35 + hatch * .28, false);
      }
      if (birth && p > .83) {
        birth.next.forEach(d => this.drawDuck(c, d, smooth((p - .83) / .17), .65, false));
      }
      this.lily(c, 780, 410, 30, true, 4); this.lily(c, 738, 422, 20, false, 2);
      c.restore();
    }
  }
  window.PondScene = PondScene;
})();
