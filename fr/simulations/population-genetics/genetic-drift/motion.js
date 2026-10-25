(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  try {
    const canvas = $('family-canvas'), c = canvas.getContext('2d');
    if (!c) throw new Error('Le canevas graphique est indisponible');
    canvas.dataset.characterRenderer = window.DuckCharacter.renderer || 'canvas-2d';
    const { draw: drawDuck, palette, oval } = window.DuckCharacter;
    const W = 1000, H = 460, duration = 6.4;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const water = new Path2D('M94 213C77 134 208 79 327 94C438 43 536 77 591 95C733 54 888 126 905 220C963 306 873 365 772 374C665 426 557 384 468 411C322 438 221 391 183 352C90 350 46 273 94 213Z');
    const parentAlleles = [[1, 0], [0, 1]];
    const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
    const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
    const lerp = (a, b, t) => a + (b - a) * t;
    const between = (p, a, b) => smooth((p - a) / (b - a));
    const colourLabel = allele => allele ? 'turquoise' : 'corail';
    const colour = value => value ? 'teal' : 'coral';
    function target() {
      const angle = Math.random() * Math.PI * 2, radius = Math.sqrt(Math.random());
      return { x: 500 + Math.cos(angle) * radius * 305, y: 265 + Math.sin(angle) * radius * 87 };
    }
    function actor(x, y, i) {
      return { x, y, vx: i ? -78 : 80, vy: i ? -9 : 12, target: i ? { x: 290, y: 240 } : { x: 740, y: 285 }, facing: i ? -1 : 1, yaw: i ? -1.16 : 1.16, phase: i * 2.1, scale: 1.6, cream: false, alleles: parentAlleles[i], wake: 0, headingTimer: 2.5 };
    }
    const adults = [actor(270, 235, 0), actor(740, 300, 1)];
    let baby = { ...actor(500, 285, 0), scale: 1.03, baby: true };
    let family = window.DuckFamily.offspring(...parentAlleles), run;
    let progress = 0, running = false, started = false, endSwimming = false, time = 0, last = null, lastPaint = 0, lastUI = 0;
    let wakes = [], lastStage = '', previousCardState = '';
    const background = document.createElement('canvas'); background.width = 1500; background.height = 690;
    const bg = background.getContext('2d'); bg.scale(1.5, 1.5);
    function makeBackground() {
      bg.lineJoin = 'round'; bg.shadowColor = '#5d77521e'; bg.shadowBlur = 9; bg.shadowOffsetY = 6;
      bg.strokeStyle = '#baca9d'; bg.lineWidth = 58; bg.stroke(water); bg.shadowColor = 'transparent';
      bg.strokeStyle = '#d5c697'; bg.lineWidth = 36; bg.stroke(water); bg.strokeStyle = '#f0dfb6'; bg.lineWidth = 28; bg.stroke(water);
      const wash = bg.createLinearGradient(0, 80, 0, 410); wash.addColorStop(0, '#b8e5dc'); wash.addColorStop(1, '#93d2cd');
      bg.fillStyle = wash; bg.fill(water); bg.strokeStyle = '#5a9f9e'; bg.lineWidth = 1.8; bg.stroke(water);
      for (const [x, y, mirror] of [[157, 134, 1], [868, 332, -1]]) {
        bg.save(); bg.translate(x, y); bg.scale(mirror, 1); bg.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
          bg.beginPath(); bg.moveTo(i * 5, 5); bg.quadraticCurveTo(i * 7 - 8, -25, i * 11 - 13, -53 + i * 13);
          bg.strokeStyle = '#759b6c'; bg.lineWidth = 4; bg.stroke();
        }
        bg.lineWidth = 9; bg.strokeStyle = '#90ad77'; bg.beginPath(); bg.moveTo(-13, -51); bg.lineTo(-17, -66); bg.stroke(); bg.restore();
      }
    }
    makeBackground();
    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2), width = canvas.clientWidth || W;
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(width * H / W * ratio);
    }
    new ResizeObserver(resize).observe(canvas); resize();
    function makeRun() {
      const meeting = { x: clamp((adults[0].x + adults[1].x) / 2 + (Math.random() - .5) * 160, 350, 670), y: clamp((adults[0].y + adults[1].y) / 2, 240, 315) };
      run = { meeting, starts: adults.map(d => ({ x: d.x, y: d.y, facing: d.facing, yaw: d.yaw })),
        swimEnds: adults.map((d, i) => ({ x: clamp(d.x + (i ? -145 : 145), 220, 780), y: clamp(d.y + (i ? -45 : 45), 190, 335) })),
        controls: [{ x: 530, y: 175 }, { x: 475, y: 350 }] };
      baby.alleles = family.alleles; baby.target = target();
    }
    makeRun();
    function wander(d, dt) {
      d.headingTimer -= dt;
      if (Math.hypot(d.target.x - d.x, d.target.y - d.y) < 35 || d.headingTimer < 0) {
        let next;
        for (let attempt = 0; attempt < 8; attempt++) { next = target(); if (Math.hypot(next.x - d.x, next.y - d.y) > 160) break; }
        d.target = next; d.headingTimer = 2 + Math.random() * 2;
      }
      const dx = d.target.x - d.x, dy = d.target.y - d.y, distance = Math.max(1, Math.hypot(dx, dy));
      d.vx = lerp(d.vx, dx / distance * 95, Math.min(1, dt * 2.9)); d.vy = lerp(d.vy, dy / distance * 95, Math.min(1, dt * 2.9));
      d.x += d.vx * dt; d.y += d.vy * dt;
      const r = Math.hypot((d.x - 500) / 325, (d.y - 265) / 100);
      if (r > 1) { d.x = 500 + (d.x - 500) / r; d.y = 265 + (d.y - 265) / r; d.target = target(); }
      if (Math.abs(d.vx) > 8) d.facing = d.vx > 0 ? 1 : -1;
      const desiredYaw = Math.atan2(d.vx, d.vy / .55);
      const turn = Math.atan2(Math.sin(desiredYaw - d.yaw), Math.cos(desiredYaw - d.yaw));
      d.yaw += turn * Math.min(1, dt * 3.5);
    }
    function arcPoint(a, b, control, t) {
      const u = 1 - t; return { x: u * u * a.x + 2 * u * t * control.x + t * t * b.x, y: u * u * a.y + 2 * u * t * control.y + t * t * b.y };
    }
    function stage(p) {
      if (p < .2) return ['Nage', 'Deux canards, deux copies chacun.', 'Un peu d’espace à explorer.'];
      if (p < .34) return ['Rencontre', 'Tiens, bonjour !', 'Une rencontre au hasard de la mare.'];
      if (p < .51) return ['Parade', 'Un petit numéro de charme.', 'On bombe le torse, on agite les ailes… et un cœur apparaît.'];
      if (p < .7) return ['Transmission', 'Une copie de chacun.', 'Les perles lumineuses sont copiées dans le caneton.'];
      if (p < .85) return ['Éclaboussure', 'Une éclaboussure pleine de surprises.', 'Deux copies héritées se réunissent.'];
      return ['Bienvenue !', 'Bonjour, petit !', 'Une copie du gène de chaque parent.'];
    }
    function displayProgress() {
      if (!reduced.matches) return progress;
      if (progress < .2) return .1;
      if (progress < .34) return .33;
      if (progress < .51) return .43;
      if (progress < .7) return .64;
      if (progress < .85) return .8;
      return .95;
    }
    function heart(x, y, size, alpha) {
      c.save(); c.translate(x, y); c.scale(size, size); c.globalAlpha = alpha;
      const fill = c.createLinearGradient(0, -22, 0, 12); fill.addColorStop(0, '#f5b0b5'); fill.addColorStop(1, '#dd7e91');
      c.fillStyle = fill; c.beginPath(); c.moveTo(0, 10); c.bezierCurveTo(-28, -7, -16, -31, 0, -16); c.bezierCurveTo(16, -31, 28, -7, 0, 10); c.fill();
      c.strokeStyle = '#cc78855c'; c.lineWidth = 1; c.stroke(); c.restore();
    }
    function lily(x, y, r, phase) {
      c.save(); c.translate(x, y + (reduced.matches ? 0 : Math.sin(time * .9 + phase) * 1.4)); c.rotate(-.12);
      c.beginPath(); c.moveTo(-3, 0); c.ellipse(0, 0, r, r * .48, 0, .2, Math.PI * 1.9); c.closePath();
      c.fillStyle = '#9ebc7d'; c.fill(); c.strokeStyle = '#3a8380'; c.lineWidth = 2; c.stroke(); c.restore();
    }
    function cloud(x, y, strength, spread) {
      c.save(); c.globalAlpha = strength;
      const wash = c.createRadialGradient(x, y - 30, 5, x, y, 115); wash.addColorStop(0, '#fffce4'); wash.addColorStop(1, '#eff6d8');
      c.fillStyle = wash;
      for (let i = 0; i < 7; i++) { const a = i * Math.PI * 2 / 7; oval(c, x + Math.cos(a) * 46 * spread, y - 27 + Math.sin(a) * 29 * spread, 34 + i % 2 * 9, 28, wash); }
      oval(c, x, y - 27, 63, 40, wash);
      c.strokeStyle = '#f8ffef'; c.lineWidth = 2;
      for (let i = 0; i < 5; i++) { const a = i * 1.7; c.beginPath(); c.arc(x + Math.cos(a) * (68 + spread * 17), y + Math.sin(a) * (38 + spread * 10), 4 + i % 3, 0, Math.PI * 2); c.stroke(); }
      c.restore();
    }
    function wake(d, dt, active, clock = d) {
      if (!active || reduced.matches) return;
      clock.wake += dt;
      if (clock.wake > .17) { wakes.push({ x: d.x - d.facing * 25 * d.scale, y: d.y + d.scale * 10, age: 0, scale: d.scale }); clock.wake = 0; }
    }
    function render(dt) {
      c.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0); c.clearRect(0, 0, W, H); c.drawImage(background, 0, 0, W, H);
      c.save(); c.clip(water);
      for (let i = 0; i < 16; i++) {
        const x = 170 + i * 43, y = 135 + (i % 4) * 66 + Math.sin(i * 2) * 12, shift = Math.sin(time * .8 + i) * 12;
        c.beginPath(); c.moveTo(x + shift, y); c.quadraticCurveTo(x + 17 + shift, y + 4, x + 36 + shift, y);
        c.strokeStyle = '#f3fbe14d'; c.lineWidth = 1.5; c.stroke();
      }
      wakes = wakes.filter(w => w.age < 1.9);
      wakes.forEach(w => { if (!reduced.matches) w.age += dt; c.beginPath(); c.ellipse(w.x, w.y, (22 + w.age * 20) * w.scale, (5 + w.age * 5) * w.scale, 0, .1, 3.05); c.strokeStyle = `rgba(244,253,228,${Math.max(0, .5 * (1 - w.age / 1.9))})`; c.lineWidth = 1.5; c.stroke(); });
      lily(211, 183, 28, 1); c.restore();
      const p = displayProgress(), m = run.meeting;
      const markers = [];
      const adultAlpha = started ? 1 - between(p, .7, .79) : 1;
      const dance = started && p >= .34 && p < .56;
      adults.forEach((d, i) => {
        let pose = { still: reduced.matches }, display = { ...d };
        if (started) {
          const start = run.starts[i], end = run.swimEnds[i];
          if (p < .2) { const q = arcPoint(start, end, run.controls[i], p / .2); display.x = q.x; display.y = q.y; display.facing = i ? -1 : 1; }
          else { const approach = between(p, .2, .34), fuse = between(p, .66, .78); display.x = lerp(end.x, m.x + (i ? 79 : -79), approach); display.y = lerp(end.y, m.y, approach); display.x = lerp(display.x, m.x + (i ? 8 : -8), fuse); display.facing = i ? -1 : 1; }
          if (dance && !reduced.matches) {
            const q = (p - .34) / .17, bounce = Math.sin(q * Math.PI * 4 + i * .6);
            pose.puff = Math.max(0, bounce); pose.nod = Math.sin(q * Math.PI * 4 + i) * .14; pose.flap = Math.max(0, Math.sin(q * Math.PI * 8 + i)) * .8;
            display.y -= Math.abs(bounce) * 4;
          }
          pose.alpha = adultAlpha;
          if (p >= .5) pose.highlight = family.sourceCopies[i];
        }
        if (started) {
          const facingYaw = i ? -1.16 : 1.16;
          const turn = Math.atan2(Math.sin(facingYaw - run.starts[i].yaw), Math.cos(facingYaw - run.starts[i].yaw));
          display.yaw = run.starts[i].yaw + turn * between(p, 0, .22);
        }
        const dots = drawDuck(c, display, reduced.matches ? 1 : time, pose); markers.push(dots[family.sourceCopies[i]]);
        wake(display, dt, !started || (running && p < .34), d);
      });
      if (started && p > .36 && p < .74) {
        const q = clamp((p - .36) / .38), alpha = Math.min(1, q * 7) * (1 - between(p, .67, .74));
        heart(m.x, m.y - 118 - q * 29, 1.08 + Math.sin(q * Math.PI * 3) * .06, alpha);
        if (p > .43) heart(m.x + 38, m.y - 92 - q * 48, .38, alpha * .7);
      }
      const cloudOpacity = between(p, .66, .73) * (1 - between(p, .83, .91));
      if (started && cloudOpacity > 0) cloud(m.x, m.y + 5, cloudOpacity, .7 + between(p, .66, .86) * .4);
      if (started && p >= .51 && p < .84) {
        const q = between(p, .51, .7);
        markers.forEach((source, i) => {
          const destination = { x: m.x + (i ? 14 : -14), y: m.y - 8 };
          const control = { x: lerp(source.x, destination.x, .5), y: Math.min(source.y, destination.y) - 55 };
          const point = arcPoint(source, destination, control, q);
          c.save(); c.shadowColor = '#fffbc8'; c.shadowBlur = 12; oval(c, point.x, point.y, 11, 11, '#fffbe2'); oval(c, point.x, point.y, 8.6, 8.6, palette[family.alleles[i]]); c.restore();
          if (q < .95) { c.beginPath(); c.moveTo(source.x, source.y); c.quadraticCurveTo(control.x, control.y, point.x, point.y); c.strokeStyle = '#fff8dc72'; c.lineWidth = 2; c.setLineDash([3, 6]); c.stroke(); c.setLineDash([]); }
        });
      }
      if (started && p > .79) {
        const reveal = between(p, .79, .88), exit = between(p, .88, 1);
        const destination = { x: m.x > 500 ? 300 : 720, y: m.y > 280 ? 210 : 325 };
        let display = { ...baby, x: lerp(m.x, destination.x, exit), y: lerp(m.y + 15 - Math.sin(reveal * Math.PI) * 14, destination.y, exit), scale: (0.55 + reveal * .5) * (1 + Math.sin(reveal * Math.PI) * .12), facing: destination.x > m.x ? 1 : -1 };
        display.yaw = display.facing * 1.16;
        if (progress >= 1 && endSwimming && !reduced.matches) display = baby;
        drawDuck(c, display, reduced.matches ? 1 : time, { alpha: reveal, still: reduced.matches }); wake(display, dt, p > .88 && (running || endSwimming), baby);
      }
      lily(805, 338, 33, 3);
    }
    function dot(value, chosen, waiting = false) { return `<span class="gene-dot ${waiting ? 'waiting' : colour(value)}${chosen ? ' chosen' : ''}" role="img" aria-label="${waiting ? 'Pas encore révélé' : 'allèle ' + colourLabel(value) + (chosen ? ', transmis au caneton' : '')}"></span>`; }
    function updateUI(force = false) {
      const s = stage(progress), selected = started && progress >= .5, revealed = started && progress >= .84;
      const state = `${selected}-${revealed}-${family.sourceCopies.join('')}`;
      if (state !== previousCardState || force) {
        $('first-copies').innerHTML = parentAlleles[0].map((a, i) => dot(a, selected && family.sourceCopies[0] === i)).join('');
        $('second-copies').innerHTML = parentAlleles[1].map((a, i) => dot(a, selected && family.sourceCopies[1] === i)).join('');
        $('child-copies').innerHTML = family.alleles.map(a => dot(a, false, !revealed)).join('');
        $('family-outcome').textContent = revealed ? `${colourLabel(family.alleles[0])[0].toUpperCase() + colourLabel(family.alleles[0]).slice(1)} du premier parent. ${colourLabel(family.alleles[1])[0].toUpperCase() + colourLabel(family.alleles[1]).slice(1)} du deuxième parent.` : 'Quelles copies le caneton va-t-il recevoir ?';
        previousCardState = state;
      }
      $('story-progress').value = Math.round(progress * 1000); $('story-progress').setAttribute('aria-valuetext', `${s[0]}, ${Math.round(progress * 100)} pour cent de l’histoire`);
      if (lastStage !== s[1] || force) {
        $('story-phase').textContent = s[1]; $('story-line').textContent = !started ? 'Laissez-les explorer, ou lancez leur histoire.' : s[2];
        for (const button of document.querySelectorAll('[data-stage]')) button.setAttribute('aria-current', String(Number(button.dataset.stage) === ({ Swim:0, Meet:.26, Dance:.43, Share:.61, Splash:.765, 'Hello!':.88, Nage:0, Rencontre:.26, Parade:.43, Transmission:.61, 'Éclaboussure':.765, 'Bienvenue !':.88 })[s[0]]));
        lastStage = s[1];
      }
      $('story-play').innerHTML = running ? 'Pause <span aria-hidden="true">Ⅱ</span>' : progress >= 1 ? 'Rejouer <span aria-hidden="true">↻</span>' : started && progress > 0 ? 'Continuer <span aria-hidden="true">▶</span>' : 'Lancer l’histoire <span aria-hidden="true">▶</span>';
      canvas.setAttribute('aria-label', !started ? 'Deux canards nagent librement dans une mare. Chacun porte une copie turquoise et une copie corail du gène.' : revealed ? `Leur caneton porte une copie ${colourLabel(family.alleles[0])} du premier parent et une copie ${colourLabel(family.alleles[1])} du deuxième parent.` : s[1] + ' ' + s[2]);
    }
    function seek(value) { endSwimming = false; running = false; started = true; progress = clamp(value); lastStage = ''; updateUI(true); }
    $('story-play').addEventListener('click', () => {
      if (running) running = false;
      else { if (!started) makeRun(); if (progress >= 1) { progress = 0; endSwimming = false; } started = true; running = true; }
      updateUI(true);
    });
    $('story-new').addEventListener('click', () => { family = window.DuckFamily.offspring(...parentAlleles); makeRun(); endSwimming = false; progress = 0; started = true; running = true; wakes = []; updateUI(true); });
    $('story-progress').addEventListener('input', () => seek(Number($('story-progress').value) / 1000));
    document.querySelectorAll('[data-stage]').forEach(button => {
      button.style.left = `${Number(button.dataset.stage) * 100}%`;
      button.addEventListener('click', () => seek(Number(button.dataset.stage)));
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden && running) { running = false; updateUI(true); } });
    function frame(now) {
      const dt = last === null ? 0 : Math.min(.5, (now - last) / 1000); last = now;
      if (!document.hidden) {
        if (!reduced.matches) time += dt;
        if (!started && !reduced.matches) {
          adults.forEach(d => wander(d, dt));
          const dx = adults[0].x - adults[1].x, dy = adults[0].y - adults[1].y, distance = Math.hypot(dx, dy);
          if (distance < 125 && distance > .1) { const push = (125 - distance) * Math.min(.2, dt * 2); adults[0].x += dx / distance * push; adults[0].y += dy / distance * push; adults[1].x -= dx / distance * push; adults[1].y -= dy / distance * push; }
        }
        if (running) {
          const old = progress; progress = Math.min(1, progress + dt * Number($('story-tempo').value) / duration);
          if (old < 1 && progress >= 1) {
            running = false; endSwimming = true; const m = run.meeting; baby.x = m.x > 500 ? 300 : 720; baby.y = m.y > 280 ? 210 : 325; baby.facing = m.x > 500 ? -1 : 1; baby.yaw = baby.facing * 1.16; baby.target = target(); baby.headingTimer = 2;
          }
        }
        if (progress >= 1 && endSwimming && !reduced.matches) wander(baby, dt);
        if (now - lastUI > 90) { updateUI(); lastUI = now; }
        if (now - lastPaint >= 1000 / 30) { render(Math.min(.5, (now - lastPaint) / 1000)); lastPaint = now; }
      }
      requestAnimationFrame(frame);
    }
    updateUI(true); $('motion-app').hidden = false; $('motion-loading').hidden = true; requestAnimationFrame(frame);
  } catch (error) { $('motion-loading').textContent = 'L’histoire des canards n’a pas pu démarrer. Veuillez recharger la page.'; console.error('Duck story:', error); }
})();
