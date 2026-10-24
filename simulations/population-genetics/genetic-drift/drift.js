(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  try {
    const { createPopulation, nextGeneration, countAlleles } = window.DriftModel;
    const rates = [.125, .25, .5, 3, 10, 30, 100];
    const modelLimit = 100000;
    const scene = new window.PondScene($('pond-canvas'), chooseDuck, $('brood-canvas'));
    let population, previous = null, parents = null, generation = 0, history = [], selected = 0;
    let running = false, stepping = false, pending = null, accumulator = 0, lastFrame = null, lastUI = 0, lastPaint = 0, dirty = false;
    const colour = allele => allele ? 'teal' : 'coral';
    const percent = value => `${(value * 100).toFixed(1).replace(/\.0$/, '')}%`;
    const dot = value => `<i class="allele-swatch ${colour(value)}" aria-hidden="true"></i>`;
    const isFixed = () => { const n = countAlleles(population); return n === 0 || n === population.length * 2; };
    const rate = () => rates[Number($('speed').value)];
    const portrait = duck => `<img src="${scene.thumbnail(duck)}" alt="" width="120" height="120">`;

    function renderInheritance() {
      const duck = population[selected];
      scene.selected = selected;
      if (!previous) {
        $('inheritance').innerHTML = `<div class="inheritance-start">${portrait(duck)}<p>Duck ${selected + 1}<br><span class="inherited-dot">${dot(duck[0])}${colour(duck[0])}</span> + <span class="inherited-dot">${dot(duck[1])}${colour(duck[1])}</span></p></div>`;
        $('inheritance-note').textContent = isFixed() ? 'Only one allele is present. Change the starting share to include both colours.' : 'Two dots, two gene copies. Take a step to see a family, or choose another duck in the pond.';
        return;
      }
      const sources = parents[selected];
      $('inheritance').innerHTML = `<div class="parent-pair">${sources.map((source, i) => `<div class="parent-duck">${portrait(previous[Math.floor(source / 2)])}<p>Duck ${Math.floor(source / 2) + 1}<br><span class="inherited-dot">passes ${dot(duck[i])}${colour(duck[i])}</span></p></div>`).join('')}</div><span class="inheritance-arrow" aria-hidden="true">→</span><div class="child-duck">${portrait(duck)}<p>Duck ${selected + 1}<br>Generation ${generation}</p></div>`;
      const names = sources.map(s => Math.floor(s / 2) + 1);
      $('inheritance-note').textContent = `In generation ${generation - 1}, duck ${names[0]} passed a ${colour(duck[0])} copy and duck ${names[1]} passed a ${colour(duck[1])} copy. Both were chosen at random.${names[0] === names[1] ? ' Both copies came from the same parent; this simplified population model allows that.' : ''}`;
    }

    function renderChart() {
      const left = 34, right = 276, top = 14, bottom = 128;
      const extent = Math.max(20, Math.ceil(generation / 20) * 20);
      const x = i => left + i / extent * (right - left), y = p => bottom - p * (bottom - top);
      function points(inverse) {
        const stride = Math.max(1, Math.ceil(history.length / 240)), result = [];
        for (let i = 0; i < history.length; i += stride) {
          const end = Math.min(history.length, i + stride); let low = i, high = i;
          for (let j = i + 1; j < end; j++) { if (history[j] < history[low]) low = j; if (history[j] > history[high]) high = j; }
          for (const j of [...new Set([i, low, high, end - 1])].sort((a, b) => a - b)) result.push(`${x(j).toFixed(2)},${y(inverse ? 1 - history[j] : history[j]).toFixed(2)}`);
        }
        return result.join(' ');
      }
      const last = history[history.length - 1];
      const grid = [0, .5, 1].map(p => `<line x1="${left}" x2="${right}" y1="${y(p)}" y2="${y(p)}" stroke="#dcdcc7" ${p === .5 ? 'stroke-dasharray="4 4"' : ''}/><text class="chart-label" x="${left - 8}" y="${y(p) + 4}" text-anchor="end">${p * 100}%</text>`).join('');
      const ticks = [0, extent / 2, extent].map(i => `<text class="chart-label" x="${x(i)}" y="146" text-anchor="middle">${i}</text>`).join('');
      $('frequency-chart').innerHTML = `<svg viewBox="0 0 290 170" role="img" aria-label="Teal allele frequency started at ${percent(history[0])} and is ${percent(last)} at generation ${generation}. Coral makes up the rest.">${grid}${ticks}<text class="chart-label" x="155" y="165" text-anchor="middle">Generation</text><polyline points="${points(true)}" fill="none" stroke="#e8795e" stroke-width="2.5" stroke-dasharray="6 4" stroke-linejoin="round"/><polyline points="${points(false)}" fill="none" stroke="#399b94" stroke-width="3" stroke-linejoin="round"/><circle cx="${x(generation)}" cy="${y(last)}" r="3.5" fill="#399b94"/><circle cx="${x(generation)}" cy="${y(1 - last)}" r="3.5" fill="#e8795e"/></svg>`;
    }

    function updateButtons() {
      $('play').innerHTML = running || stepping ? 'Pause <span aria-hidden="true">Ⅱ</span>' : 'Play <span aria-hidden="true">▶</span>';
      $('play').disabled = isFixed() || generation >= modelLimit;
      $('step').disabled = running || stepping || Boolean(pending) || isFixed() || generation >= modelLimit;
      $('duck-select').disabled = Boolean(pending);
    }
    function renderUI(full = false) {
      const count = countAlleles(population), total = population.length * 2;
      $('generation').textContent = generation;
      $('duck-count').textContent = `${population.length} ducks · ${total} gene copies`;
      $('total-A').textContent = percent(count / total); $('total-a').textContent = percent(1 - count / total);
      $('copies-A').textContent = `${count} ${count === 1 ? 'copy' : 'copies'}`;
      $('copies-a').textContent = `${total - count} ${total - count === 1 ? 'copy' : 'copies'}`;
      $('bar-A').style.width = `${count / total * 100}%`; $('bar-a').style.width = `${(1 - count / total) * 100}%`;
      if (full || $('duck-select').options.length !== population.length) $('duck-select').innerHTML = population.map((_, i) => `<option value="${i}">Duck ${i + 1}</option>`).join('');
      $('duck-select').value = String(selected);
      renderChart(); renderInheritance(); updateButtons(); dirty = false;
    }
    function pause(message) {
      running = false; stepping = false; accumulator = 0;
      if (message) $('pond-message').textContent = message;
      updateButtons();
    }
    function fixedMessage() {
      const fixed = colour(population[0][0]), lost = colour(1 - population[0][0]);
      return generation === 0 ? `Only ${fixed} is present to begin with. Change the starting share to include both colours.` : `${fixed[0].toUpperCase() + fixed.slice(1)} is fixed: all gene copies are ${fixed}. The ${lost} allele has disappeared. Start again for another story.`;
    }
    function commit(next, animated = false, child = selected) {
      previous = population; population = next.population; parents = next.parents; generation++;
      selected = child; history.push(countAlleles(population) / (2 * population.length));
      if (animated) scene.finishBirth(population); else scene.setPopulation(population, false, parents);
      scene.selected = selected; dirty = true;
      if (isFixed()) pause(fixedMessage());
      else if (generation >= modelLimit) pause('100,000 generations explored. Start again for another story.');
    }
    function beginFamily(singleStep = false) {
      if (isFixed() || generation >= modelLimit) return;
      const next = nextGeneration(population);
      // Show an actual family with two distinct parents where the sampled cohort has one.
      let child = next.parents.findIndex(pair => Math.floor(pair[0] / 2) !== Math.floor(pair[1] / 2));
      if (child < 0) child = 0;
      pending = { next, elapsed: 0, duration: scene.reduced.matches ? .15 : 1 / rate(), child, singleStep };
      scene.beginBirth(population, next.population, next.parents, child);
      updateButtons();
    }
    function chooseDuck(index) {
      if (pending) return;
      pause('Paused to follow this duck. Press Play when you are ready.'); selected = index;
      $('duck-select').value = String(index); renderInheritance();
    }
    function speedLabel() {
      const r = rate(); $('speed-label').textContent = r < 1 ? `1 every ${Math.round(10 / r) / 10} s` : `${r} / second`;
      $('speed').setAttribute('aria-valuetext', r < 1 ? `One generation every ${Math.round(10 / r) / 10} seconds` : `${r} generations per second`);
      $('speed-note').textContent = r <= 1 ? 'Small hearts mark the sampled parents. Up to 24 ducks, follow one family up close.' : 'Fast-forward: small hearts show matings from sampled generations; the close-up is skipped.';
    }
    function restart() {
      running = false; stepping = false; pending = null; accumulator = 0;
      const size = Number($('population').value), p = Number($('frequency').value) / 100;
      population = createPopulation(size, p); previous = null; parents = null; generation = 0; selected = 0;
      history = [countAlleles(population) / (2 * size)];
      scene.ducks = []; scene.setPopulation(population);
      $('frequency-label').textContent = `${Math.round(p * 100)}%`;
      $('frequency').setAttribute('aria-valuetext', `${Math.round(p * 100)} percent teal`);
      $('starting-count').textContent = `Starts with ${countAlleles(population)} teal copies out of ${size * 2} (${percent(history[0])}).`;
      $('pond-message').textContent = isFixed() ? fixedMessage() : size >= 200 ? 'A busy pond! Choose a duck to see its two dots up close.' : 'Every duck has the same chances. Let the story unfold.';
      $('scene-phase').textContent = 'A quiet moment at the pond'; speedLabel(); renderUI(true);
    }
    function phaseLabel() {
      const size = population.length;
      const count = pending ? scene.bornCount() : 0;
      $('brood-count').textContent = `${count} / ${size} ducklings`;
      $('brood-caption').textContent = pending ? count < size ? 'Growing the next generation' : 'Ready to take over the pond' : 'Next generation';
      if (!pending) return running ? 'The generations are flowing' : 'A quiet moment at the pond';
      const p = pending.elapsed / pending.duration, story = Math.min(1, p / .8);
      if (p >= .94) return `${size} adults → ${size} new adults`;
      if (p >= .8) return `The next generation: ${count} of ${size} ducklings`;
      if (population.length > 24) return 'Little hearts, chance meetings';
      if (story < .34) return 'A chance meeting…';
      if (story < .51) return 'A chest puff, a wing wiggle…';
      if (story < .7) return 'One gene copy from each parent';
      if (story < .85) return 'A little splash of possibility';
      return 'Hello, little duckling!';
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
          } else if (rate() <= 1) beginFamily(stepping);
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
      if (rate() > 1) { commit(nextGeneration(population)); renderUI(); }
      else { stepping = true; beginFamily(true); }
    });
    $('restart').addEventListener('click', restart);
    $('population').addEventListener('change', restart); $('frequency').addEventListener('input', restart);
    $('speed').addEventListener('input', () => {
      speedLabel(); accumulator = 0;
      if (pending) {
        const fraction = pending.elapsed / pending.duration;
        pending.duration = scene.reduced.matches || rate() > 1 ? .15 : 1 / rate();
        pending.elapsed = fraction * pending.duration;
      }
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
