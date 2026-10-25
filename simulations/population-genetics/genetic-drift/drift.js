(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  try {
    const { createPopulation, nextGeneration, countAlleles } = window.DriftModel;
    const rates = [.0625, .125, .25, .5, 3, 10, 30, 100];
    const modelLimit = 100000, ghostLimit = 12;
    const scene = new window.PondScene($('pond-canvas'), chooseDuck, $('brood-canvas'));
    let population, previous = null, parents = null, generation = 0, history = [], mixed = [], selected = 0;
    let ghosts = [], tally = { teal: 0, coral: 0 }, counted = false;
    let running = false, stepping = false, pending = null, accumulator = 0, lastFrame = null, lastUI = 0, lastPaint = 0, dirty = false;
    const colour = allele => allele ? 'teal' : 'coral';
    const capital = word => word[0].toUpperCase() + word.slice(1);
    const percent = value => `${(value * 100).toFixed(1).replace(/\.0$/, '')}%`;
    const dot = value => `<i class="allele-swatch ${colour(value)}" aria-hidden="true"></i>`;
    const isFixed = () => { const n = countAlleles(population); return n === 0 || n === population.length * 2; };
    const mixedShare = pop => pop.filter(duck => duck[0] !== duck[1]).length / pop.length;
    const rate = () => rates[Number($('speed').value)];
    // "Watch every mating" gives each duckling its own beak-to-beak meeting (ponds of up to 24 ducks).
    const slow = () => $('slow-mode').checked && population.length <= 24;
    const fastMode = () => !slow() && rate() > 1;
    const generationSeconds = () => slow() ? scene.slowSeconds(population.length) : 1 / rate();
    const portrait = duck => `<img src="${scene.thumbnail(duck)}" alt="" width="120" height="120">`;

    function renderInheritance() {
      const duck = population[selected];
      scene.selected = selected;
      if (!previous) {
        $('inheritance').innerHTML = `<div class="inheritance-start">${portrait(duck)}<p>Duck ${selected + 1}<br><span class="inherited-dot">${dot(duck[0])}${colour(duck[0])}</span> + <span class="inherited-dot">${dot(duck[1])}${colour(duck[1])}</span></p></div>`;
        $('inheritance-note').textContent = isFixed() ? 'Only one allele is present. Change the starting share to include both colours.' : 'Two beads, two gene copies. Take a step to see a family, or choose another duck in the pond.';
        return;
      }
      const sources = parents[selected];
      $('inheritance').innerHTML = `<div class="parent-pair">${sources.map((source, i) => `<div class="parent-duck">${portrait(previous[Math.floor(source / 2)])}<p>Duck ${Math.floor(source / 2) + 1}<br><span class="inherited-dot">passes ${dot(duck[i])}${colour(duck[i])}</span></p></div>`).join('')}</div><span class="inheritance-arrow" aria-hidden="true">→</span><div class="child-duck">${portrait(duck)}<p>Duck ${selected + 1}<br>Generation ${generation}</p></div>`;
      const names = sources.map(s => Math.floor(s / 2) + 1);
      $('inheritance-note').textContent = `In generation ${generation - 1}, duck ${names[0]} passed a ${colour(duck[0])} copy and duck ${names[1]} passed a ${colour(duck[1])} copy. Both were chosen at random.${names[0] === names[1] ? ' Both copies came from the same parent; this simplified population model allows that.' : ''}`;
    }

    // Min/max thinning keeps the extremes of long runs visible.
    function thin(series, x, y, limit = 240) {
      const stride = Math.max(1, Math.ceil(series.length / limit)), result = [];
      for (let i = 0; i < series.length; i += stride) {
        const end = Math.min(series.length, i + stride); let low = i, high = i;
        for (let j = i + 1; j < end; j++) { if (series[j] < series[low]) low = j; if (series[j] > series[high]) high = j; }
        for (const j of [...new Set([i, low, high, end - 1])].sort((a, b) => a - b)) result.push(`${x(j).toFixed(2)},${y(series[j]).toFixed(2)}`);
      }
      return result.join(' ');
    }
    function ghostOf(series) {
      // Earlier runs are stored compactly: at most 300 points, keeping extremes.
      const stride = Math.max(1, Math.ceil(series.length / 150)), points = [];
      for (let i = 0; i < series.length; i += stride) {
        const end = Math.min(series.length, i + stride); let low = i, high = i;
        for (let j = i + 1; j < end; j++) { if (series[j] < series[low]) low = j; if (series[j] > series[high]) high = j; }
        for (const j of [...new Set([i, low, high, end - 1])].sort((a, b) => a - b)) points.push([j, series[j]]);
      }
      return { length: series.length - 1, points };
    }
    function renderChart() {
      const left = 34, right = 300, top = 14, bottom = 150, mTop = 200, mBottom = 252;
      const longest = Math.max(generation, ...ghosts.map(g => g.length));
      const extent = Math.max(20, Math.ceil(longest / 20) * 20);
      const x = i => left + i / extent * (right - left), y = p => bottom - p * (bottom - top), ym = p => mBottom - p * (mBottom - mTop);
      const last = history[history.length - 1];
      const grid = [0, .25, .5, .75, 1].map(p => `<line x1="${left}" x2="${right}" y1="${y(p)}" y2="${y(p)}" stroke="#e1dfca"/>${p % .5 === 0 ? `<text class="chart-label" x="${left - 7}" y="${y(p) + 4}" text-anchor="end">${p * 100}%</text>` : ''}`).join('');
      const mgrid = [0, .5, 1].map(p => `<line x1="${left}" x2="${right}" y1="${ym(p)}" y2="${ym(p)}" stroke="#e1dfca"/><text class="chart-label" x="${left - 7}" y="${ym(p) + 4}" text-anchor="end">${p * 100}%</text>`).join('');
      const ticks = [0, extent / 2, extent].map(i => `<text class="chart-label" x="${x(i)}" y="${mBottom + 16}" text-anchor="middle">${i}</text>`).join('');
      const ghostLines = ghosts.map(g => `<polyline points="${g.points.map(([i, p]) => `${x(i).toFixed(1)},${y(p).toFixed(1)}`).join(' ')}" fill="none" stroke="#8d9a8a" stroke-opacity=".38" stroke-width="1.3" stroke-linejoin="round"/>`).join('');
      // Expected share of mixed ducks: 2p0(1 − p0)(1 − 1/2N)^(t − 1) from generation 1 on.
      const p0 = history[0], N2 = population.length * 2, expected = [];
      for (let t = 1; t <= extent; t += Math.max(1, Math.floor(extent / 120))) expected.push(`${x(t).toFixed(1)},${ym(2 * p0 * (1 - p0) * Math.pow(1 - 1 / N2, t - 1)).toFixed(1)}`);
      $('frequency-chart').innerHTML = `<svg viewBox="0 0 310 ${mBottom + 34}" role="img" aria-label="Teal share started at ${percent(p0)} and is ${percent(last)} at generation ${generation}. ${ghosts.length} earlier runs with the same settings are shown as faint lines. Below, the share of ducks with both colours (heterozygotes).">
        <text class="chart-title" x="${left}" y="6">Teal share of gene copies</text>
        ${grid}<line x1="${left}" x2="${right}" y1="${y(p0)}" y2="${y(p0)}" stroke="#7d8a78" stroke-dasharray="4 4"/>
        ${ghostLines}
        <polyline points="${thin(history, x, y)}" fill="none" stroke="#399b94" stroke-width="3" stroke-linejoin="round"/>
        <circle cx="${x(generation)}" cy="${y(last)}" r="4" fill="#399b94" stroke="#fffaf0" stroke-width="1.5"/>
        <text class="chart-title" x="${left}" y="${mTop - 10}">Ducks with both colours (heterozygotes)</text>
        ${mgrid}<polyline points="${expected.join(' ')}" fill="none" stroke="#c98a1e" stroke-width="1.6" stroke-dasharray="4 4"/>
        <polyline points="${thin(mixed, x, ym)}" fill="none" stroke="#2f4a46" stroke-width="2" stroke-linejoin="round"/>
        ${ticks}<text class="chart-label" x="${(left + right) / 2}" y="${mBottom + 31}" text-anchor="middle">Generation</text></svg>`;
      $('ghost-note').textContent = ghosts.length ? `Faint lines: ${ghosts.length} earlier ${ghosts.length === 1 ? 'run' : 'runs'} with these settings.` : 'Earlier runs with these settings will appear as faint lines.';
    }
    function renderTally() {
      const runs = tally.teal + tally.coral, start = history[0];
      $('tally-count').textContent = runs ? `${runs} finished ${runs === 1 ? 'run' : 'runs'}: teal fixed ${tally.teal}, coral fixed ${tally.coral}` : 'No finished runs yet with these settings';
      $('tally-teal').style.width = `${runs ? tally.teal / runs * 100 : 0}%`;
      $('tally-bar').classList.toggle('empty', !runs);
      $('tally-mark').style.left = `${start * 100}%`;
      $('tally-note').textContent = `The mark shows the starting teal share, ${percent(start)}. Over many runs, teal should end up fixed about that often.`;
    }

    function updateButtons() {
      $('play').innerHTML = running || stepping ? 'Pause <span aria-hidden="true">Ⅱ</span>' : 'Play <span aria-hidden="true">▶</span>';
      $('play').disabled = isFixed() || generation >= modelLimit;
      $('step').disabled = running || stepping || Boolean(pending) || isFixed() || generation >= modelLimit;
      $('duck-select').disabled = Boolean(pending);
    }
    function renderUI(full = false) {
      const count = countAlleles(population), total = population.length * 2, mix = population.filter(d => d[0] !== d[1]).length;
      $('generation').textContent = generation;
      $('duck-count').textContent = `${population.length} ducks · ${total} gene copies`;
      $('total-A').textContent = percent(count / total); $('total-a').textContent = percent(1 - count / total);
      $('copies-A').textContent = `${count} ${count === 1 ? 'copy' : 'copies'}`;
      $('copies-a').textContent = `${total - count} ${total - count === 1 ? 'copy' : 'copies'}`;
      $('bar-A').style.width = `${count / total * 100}%`; $('bar-a').style.width = `${(1 - count / total) * 100}%`;
      $('mixed-count').textContent = `${mix} of ${population.length}`;
      if (full || $('duck-select').options.length !== population.length) $('duck-select').innerHTML = population.map((_, i) => `<option value="${i}">Duck ${i + 1}</option>`).join('');
      $('duck-select').value = String(selected);
      renderChart(); renderTally(); renderInheritance(); updateButtons(); dirty = false;
    }
    function pause(message) {
      running = false; stepping = false; accumulator = 0;
      if (message) $('pond-message').textContent = message;
      updateButtons();
    }
    function fixedMessage() {
      const fixed = colour(population[0][0]), lost = colour(1 - population[0][0]);
      return generation === 0 ? `Only ${fixed} is present to begin with. Change the starting share to include both colours.` : `${capital(fixed)} is fixed: all gene copies are ${fixed}. The ${lost} allele has disappeared. Start again for another story.`;
    }
    function showFixation() {
      const fixed = colour(population[0][0]), lost = colour(1 - population[0][0]);
      if (!counted) { tally[fixed]++; counted = true; }
      $('fixed-title').textContent = `${capital(fixed)} is fixed after ${generation.toLocaleString()} ${generation === 1 ? 'generation' : 'generations'}`;
      $('fixed-text').textContent = `${capital(lost)} has been lost. Nothing in this pond can bring it back: there are no new mutations and no ducks arriving.`;
      $('fixed-card').hidden = false;
    }
    function commit(next, animated = false, child = selected) {
      previous = population; population = next.population; parents = next.parents; generation++;
      selected = child; history.push(countAlleles(population) / (2 * population.length)); mixed.push(mixedShare(population));
      if (animated) scene.finishBirth(population); else scene.setPopulation(population, false);
      scene.selected = selected; dirty = true;
      if (isFixed()) { pause(fixedMessage()); showFixation(); }
      else if (generation >= modelLimit) pause('100,000 generations explored. Start again for another story.');
    }
    function beginFamily(singleStep = false) {
      if (isFixed() || generation >= modelLimit) return;
      const next = nextGeneration(population);
      // Feature an actual family with two distinct parents where the sampled cohort has one.
      let child = next.parents.findIndex(pair => Math.floor(pair[0] / 2) !== Math.floor(pair[1] / 2));
      if (child < 0) child = 0;
      pending = { next, elapsed: 0, duration: scene.reduced.matches ? .15 : generationSeconds(), child, singleStep };
      scene.beginBirth(population, next.population, next.parents, child);
      updateButtons();
    }
    function chooseDuck(index) {
      if (pending) return;
      pause('Paused to follow this duck. Press Play when you are ready.'); selected = index;
      $('duck-select').value = String(index); renderInheritance();
    }
    function speedLabel() {
      const small = population && population.length <= 24;
      $('slow-mode').disabled = !small; if (!small) $('slow-mode').checked = false;
      $('speed').disabled = slow();
      const r = rate(), seconds = slow() ? Math.round(scene.slowSeconds(population.length)) : null;
      $('speed-label').textContent = seconds ? `1 every ${seconds} s` : r < 1 ? `1 every ${Math.round(10 / r) / 10} s` : `${r} / second`;
      $('speed').setAttribute('aria-valuetext', r < 1 ? `One generation every ${Math.round(10 / r) / 10} seconds` : `${r} generations per second`);
      $('speed-note').textContent = seconds ? `Each duckling's parents meet one pair at a time, so one generation takes about ${seconds} seconds.`
        : r > 1 ? 'Fast-forward: the chart and gene pool record every generation; the matings are skipped.'
        : small ? 'Slow speeds show every duckling being made. One family gets a close-up first.'
        : 'Slow speeds show every duckling being made. Watch every mating works with up to 24 ducks.';
      scene.slow = slow(); scene.fast = fastMode(); scene.genSeconds = generationSeconds();
    }
    // A fresh pond. Same settings keep earlier runs as faint lines; new settings clear them.
    function restart(sameSettings = false) {
      if (sameSettings && generation > 0) { ghosts.push(ghostOf(history)); if (ghosts.length > ghostLimit) ghosts.shift(); }
      if (!sameSettings) { ghosts = []; tally = { teal: 0, coral: 0 }; }
      running = false; stepping = false; pending = null; accumulator = 0; counted = false;
      const size = Number($('population').value), p = Number($('frequency').value) / 100;
      population = createPopulation(size, p); previous = null; parents = null; generation = 0; selected = 0;
      history = [countAlleles(population) / (2 * size)]; mixed = [mixedShare(population)];
      scene.ducks = []; scene.setPopulation(population);
      $('fixed-card').hidden = true;
      $('frequency-label').textContent = `${Math.round(p * 100)}%`;
      $('frequency').setAttribute('aria-valuetext', `${Math.round(p * 100)} percent teal`);
      $('starting-count').textContent = `Starts with ${countAlleles(population)} teal copies out of ${size * 2} (${percent(history[0])}).`;
      $('pond-message').textContent = isFixed() ? fixedMessage() : size >= 200 ? 'A busy pond! Choose a duck to see its two beads up close.' : 'Every duck has the same chances. Let the story unfold.';
      $('scene-phase').textContent = 'A quiet moment at the pond'; speedLabel(); renderUI(true);
    }
    function phaseLabel() {
      const size = population.length, count = pending ? scene.bornCount() : 0;
      $('brood-count').textContent = `${count} / ${size} ducklings`;
      $('brood-caption').textContent = pending ? count < size ? 'Drawing the next generation' : 'Ready to take over the pond' : 'The draw';
      return scene.storyLabel(running);
    }
    function frame(now) {
      const elapsed = lastFrame === null ? 0 : Math.min(2, (now - lastFrame) / 1000); lastFrame = now;
      if (!document.hidden) {
        if (running || stepping) {
          if (pending) {
            pending.elapsed += elapsed;
            scene.birth.progress = Math.min(1, pending.elapsed / pending.duration);
            if (pending.elapsed >= pending.duration) {
              const finished = pending; pending = null; commit(finished.next, true, finished.child);
              if (finished.singleStep) { stepping = false; running = false; if (!isFixed()) $('pond-message').textContent = `${population.length} new ducks replace ${population.length} adults. Follow their families below, or take another step.`; }
              updateButtons();
            }
          } else if (!fastMode()) beginFamily(stepping);
          else {
            accumulator += elapsed * rate();
            const steps = Math.min(200, Math.floor(accumulator)); accumulator -= steps;
            for (let i = 0; i < steps && (running || stepping); i++) {
              commit(nextGeneration(population));
              if (stepping) { stepping = false; break; }
            }
          }
        }
        const label = phaseLabel(); if ($('scene-phase').textContent !== label) $('scene-phase').textContent = label;
        if (dirty && (now - lastUI > 100 || !running)) { renderUI(); lastUI = now; }
        if (now - lastPaint >= 1000 / 30) { scene.render(Math.min(.5, (now - lastPaint) / 1000)); lastPaint = now; }
      }
      requestAnimationFrame(frame);
    }

    $('play').addEventListener('click', () => {
      if (running || stepping) pause('Paused. The pond can wait. Press Play when you are ready.');
      else if (!isFixed() && generation < modelLimit) {
        running = true; stepping = false; accumulator = 0;
        $('pond-message').textContent = 'Chance chooses which copies are passed on. Watch how the colours change.';
        updateButtons();
      }
    });
    $('step').addEventListener('click', () => {
      if (pending || isFixed() || generation >= modelLimit) return;
      if (fastMode()) { commit(nextGeneration(population)); renderUI(); }
      else { stepping = true; beginFamily(true); }
    });
    $('restart').addEventListener('click', () => restart(true));
    $('fixed-again').addEventListener('click', () => restart(true));
    $('fixed-close').addEventListener('click', () => { $('fixed-card').hidden = true; $('restart').focus(); });
    $('population').addEventListener('change', () => restart(false)); $('frequency').addEventListener('input', () => restart(false));
    $('speed').addEventListener('input', () => {
      speedLabel(); accumulator = 0;
      if (pending) {
        const fraction = pending.elapsed / pending.duration;
        pending.duration = scene.reduced.matches || fastMode() ? .15 : generationSeconds();
        pending.elapsed = fraction * pending.duration;
      }
      updateButtons();
    });
    $('slow-mode').addEventListener('change', () => {
      speedLabel(); accumulator = 0;
      if (pending) { const fraction = pending.elapsed / pending.duration; pending.duration = scene.reduced.matches ? .15 : generationSeconds(); pending.elapsed = fraction * pending.duration; }
      updateButtons();
    });
    $('duck-select').addEventListener('change', () => chooseDuck(Number($('duck-select').value)));
    document.addEventListener('visibilitychange', () => { if (document.hidden && (running || stepping)) pause('Paused while you were away. Press Play to carry on.'); });
    restart(); $('drift-app').hidden = false; $('pond-loading').hidden = true; requestAnimationFrame(frame);
  } catch (error) {
    $('pond-loading').textContent = 'The pond could not start. Please reload the page with JavaScript enabled.';
    console.error('Duck Pond initialisation failed:', error);
  }
})();
