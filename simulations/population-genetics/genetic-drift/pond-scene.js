/* The scenery and swimming are cosmetic; birth scenes use recorded inheritance. */
(function () {
  'use strict';
  const W = 1000, H = 620;
  const WATER = 'M98 299C73 209 181 138 299 133C360 76 477 96 552 120C691 77 849 146 878 248C953 320 903 414 809 457C718 529 565 484 492 520C350 551 240 498 194 451C93 446 45 365 98 299Z';
  const GROUND = 'M58 282C18 166 143 83 277 80C353 14 480 38 555 65C713 16 921 100 926 242C1000 341 949 469 830 504C722 590 560 542 492 569C328 611 202 551 159 498C36 493 4 371 58 282Z';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  function ellipse(c, x, y, rx, ry, fill, rotation = 0) {
    c.beginPath(); c.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2); c.fillStyle = fill; c.fill();
  }
  function duckShape(c, alleles, blink = false, cream = false) {
    c.save();
    c.lineJoin = 'round'; c.lineCap = 'round';
    const silhouette = new Path2D('M-30 7C-39-3-40-16-35-19Q-29-12-20-12Q-10-17-2-15C-14-29-8-53 13-57C34-62 49-41 38-23Q53-12 39 7C28 26-15 31-30 7Z');
    c.fillStyle = cream ? '#fff0bd' : '#ffdb63'; c.fill(silhouette);
    c.strokeStyle = '#286f75'; c.lineWidth = 2.6; c.stroke(silhouette);
    const beak = new Path2D('M36-31Q44-34 49-29Q53-23 46-20Q39-17 34-23Q33-27 36-31Z');
    c.fillStyle = '#f59b60'; c.fill(beak); c.lineWidth = 2.3; c.stroke(beak);
    if (blink) {
      c.beginPath(); c.moveTo(20, -35); c.quadraticCurveTo(24, -32, 28, -35); c.strokeStyle = '#153f4b'; c.lineWidth = 2.5; c.stroke();
    } else ellipse(c, 24, -35, 3.8, 5, '#153f4b');
    alleles.forEach((allele, i) => ellipse(c, i ? 12 : -10, 6, 9, 9, allele ? '#57a9ac' : '#f77e5b'));
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
        for (const cream of [false, true]) for (const blink of [false, true]) {
          const sprite = document.createElement('canvas'); sprite.width = 288; sprite.height = 288;
          const c = sprite.getContext('2d'); c.scale(2.5, 2.5); c.translate(55, 70); duckShape(c, pair, blink, cream);
          this.sprites[`${pair.join('')}${cream ? 'c' : ''}${blink ? 'b' : ''}`] = sprite;
          if (!blink && !cream) this.thumbnails[pair.join('')] = sprite.toDataURL();
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
      const result = [], spacing = 84 * this.scale;
      population.forEach((alleles, i) => {
        let x, y;
        for (let attempt = 0; attempt < 45; attempt++) {
          const theta = Math.random() * Math.PI * 2, radius = Math.sqrt(Math.random());
          x = 500 + Math.cos(theta) * radius * 324; y = 315 + Math.sin(theta) * radius * 153;
          if (result.every(d => Math.hypot(d.x - x, (d.y - y) * .9) > spacing)) break;
        }
        const target = this.swimTarget(x, y, i % 2 ? 1 : -1);
        const angle = Math.atan2(target.y - y, target.x - x);
        const speed = (58 + Math.random() * 26) * (.8 + this.scale * .2);
        result.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          targetX: target.x, targetY: target.y, speed, orbit: i % 2 ? 1 : -1, cream: i % 3 === 1,
          phase: Math.random() * 50, facing: Math.cos(angle) >= 0 ? 1 : -1, alleles, wake: Math.random(), blink: Math.random() * 8 });
      });
      return result;
    }
    keepSpace(dt) {
      const spacing = 82 * this.scale, grid = new Map();
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
    setPopulation(population, newborn = false) {
      this.population = population; this.scale = Math.max(.19, Math.min(1.15, 2.5 / Math.pow(population.length, .43)));
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
      ellipse(c, d.x, d.y + 8 * s, 34 * s, 8.5 * s, '#265b5833');
      c.strokeStyle = '#e3f4dc95'; c.lineWidth = 1.4;
      c.beginPath(); c.ellipse(d.x, d.y + 8 * s, 40 * s, 10 * s, 0, .15, 2.9); c.stroke();
      if (selected) { c.strokeStyle = '#fff4c8cc'; c.lineWidth = 2; c.beginPath(); c.ellipse(d.x, d.y + 1, 47 * s, 15 * s, 0, 0, Math.PI * 2); c.stroke(); }
      c.translate(d.x, d.y + bob);
      const turnWidth = .72 + Math.min(1, Math.abs(d.facing)) * .28;
      c.scale(s * (d.facing >= 0 ? 1 : -1) * turnWidth, s);
      if (!this.reduced.matches) c.rotate(Math.sin(this.time * 3.5 + d.phase) * .035);
      const blink = !this.reduced.matches && (this.time + d.blink) % 6.5 < .13;
      const sprite = this.sprites[d.alleles.join('') + (d.cream ? 'c' : '') + (blink ? 'b' : '')];
      c.drawImage(sprite, -55, -70, 115.2, 115.2);
      c.restore();
    }
    swimTarget(x, y, direction = 1) {
      const currentAngle = Math.atan2((y - 315) / 153, (x - 500) / 324);
      const angle = currentAngle + direction * (.8 + Math.random() * .6);
      const r = .6 + Math.random() * .32;
      return { x: 500 + Math.cos(angle) * r * 324, y: 315 + Math.sin(angle) * r * 153 };
    }
    updateDuck(d, dt, i) {
      let dx = d.targetX - d.x, dy = d.targetY - d.y;
      if (Math.hypot(dx, dy) < 35) {
        const target = this.swimTarget(d.x, d.y, d.orbit); d.targetX = target.x; d.targetY = target.y;
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
        const target = this.swimTarget(d.x, d.y, d.orbit); d.targetX = target.x; d.targetY = target.y;
      }
      const facing = d.vx > 2 ? 1 : d.vx < -2 ? -1 : Math.sign(d.facing) || 1;
      d.facing = lerp(d.facing, facing, Math.min(1, dt * 5));
      d.wake += dt;
      if (d.wake > .22 && i % Math.max(1, Math.ceil(this.ducks.length / 36)) === 0) {
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
      this.lily(c, 246, 212, 32, false, 1);
      this.growth = Math.min(1, this.growth + dt * .24);
      if (!this.reduced.matches) {
        const steps = Math.max(1, Math.ceil(dt / .04));
        for (let step = 0; step < steps; step++) {
          this.ducks.forEach((d, i) => this.updateDuck(d, dt / steps, i)); this.keepSpace(dt / steps);
        }
      }
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
      this.lily(c, 780, 410, 36, false, 4);
      c.restore();
    }
  }
  window.PondScene = PondScene;
})();
