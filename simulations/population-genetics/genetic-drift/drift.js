(function () {
  'use strict';
  const { createPopulation, nextGeneration, countAlleles } = window.DriftModel;
  const $ = id => document.getElementById(id);
  const modelLimit = 10000;
  let population, previous, parents, generation, history, selected = 0;
  let playing = false;
  let timer = null;
  let animationFrame = null;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const alleleName = value => value ? 'A' : 'a';
  const percent = value => `${(value * 100).toFixed(1).replace(/\.0$/, '')}%`;
  const token = value => `<span class="allele-token allele-${alleleName(value)}">${alleleName(value)}</span>`;
  const isFixed = () => {
    const count = countAlleles(population);
    return count === 0 || count === population.length * 2;
  };

  function duckSVG(alleles, highlighted = -1) {
    const dots = alleles.map((value, i) => `<circle cx="${i ? 71 : 46}" cy="73" r="11" fill="${value ? '#287c80' : '#ce513e'}" ${highlighted === i ? 'stroke="#173e43" stroke-width="3"' : ''}/><text class="duck-label" x="${i ? 71 : 46}" y="73">${alleleName(value)}</text>`).join('');
    return `<svg viewBox="0 0 120 108" aria-hidden="true"><ellipse cx="59" cy="94" rx="40" ry="7" fill="none" stroke="#e7f8ef" stroke-width="2.5"/><path d="M16 92Q10 99 29 103M91 99Q108 96 102 90" fill="none" stroke="#d4f1e8" stroke-width="2" stroke-linecap="round"/><g class="duck-body"><path d="M89 49C103 58 102 80 85 88C64 98 31 94 23 77C18 66 15 58 17 49Q20 44 25 51L34 57L52 52C46 47 45 40 46 32C47 16 61 9 75 13C90 16 98 33 89 49Z" fill="#ffda63" stroke="#286a6b" stroke-width="3" stroke-linejoin="round"/><path d="M92 35Q99 31 107 37Q110 43 102 47Q97 49 90 44" fill="#f39a51" stroke="#286a6b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="78" cy="33" rx="3.6" ry="4.8" fill="#173e43"/><circle cx="79" cy="31.5" r="1" fill="#fffbf2"/><path d="M29 65Q29 82 41 85" fill="none" stroke="#e9bc4a" stroke-width="2" stroke-linecap="round"/>${dots}</g></svg>`;
  }

  function renderFlock(animate) {
    const columns = { 6: 3, 12: 6, 24: 6, 48: 8, 96: 12 }[population.length];
    const flock = $('flock');
    flock.style.setProperty('--columns', columns);
    flock.style.setProperty('--phone-columns', population.length <= 12 ? (population.length === 6 ? 3 : 4) : 6);
    flock.innerHTML = population.map((duck, i) => `<button type="button" class="duck" data-duck="${i}" aria-label="Duck ${i + 1}: ${alleleName(duck[0])} and ${alleleName(duck[1])}" aria-pressed="${i === selected}" style="--delay:${(i % columns) * 18}ms">${duckSVG(duck)}</button>`).join('');
    flock.classList.remove('fresh');
    cancelAnimationFrame(animationFrame);
    if (animate && !reducedMotion.matches) {
      animationFrame = requestAnimationFrame(() => flock.classList.add('fresh'));
    }
  }

  function renderInheritance() {
    const duck = population[selected];
    $('selected-generation').textContent = `Generation ${generation}`;
    if (!previous) {
      $('inheritance').innerHTML = `<div class="inheritance-start">${duckSVG(duck)}<p>Duck ${selected + 1} carries ${token(duck[0])} and ${token(duck[1])}.</p></div>`;
      $('inheritance-note').textContent = isFixed() ? 'Only one allele is present. Change the starting share to include both alleles and explore genetic drift.' : 'This is the starting generation. Take one step to see alleles passed from parents to offspring.';
      return;
    }
    const sources = parents[selected];
    $('inheritance').innerHTML = `<div class="parent-pair">${sources.map((source, i) => {
      const parentIndex = Math.floor(source / 2);
      return `<div class="parent-duck">${duckSVG(previous[parentIndex], source % 2)}<p>Duck ${parentIndex + 1}<br>passes ${token(duck[i])}</p></div>`;
    }).join('')}</div><span class="inheritance-arrow" aria-hidden="true">→</span><div class="child-duck">${duckSVG(duck)}<p>Duck ${selected + 1}<br>Generation ${generation}</p></div>`;
    const sourceNames = sources.map(source => Math.floor(source / 2) + 1);
    $('inheritance-note').textContent = `In generation ${generation - 1}, duck ${sourceNames[0]} passed ${alleleName(duck[0])} and duck ${sourceNames[1]} passed ${alleleName(duck[1])}. Each gene copy was chosen at random.${sourceNames[0] === sourceNames[1] ? ' Both came from the same parent: this simplified model allows that.' : ''}`;
  }

  function renderChart() {
    const width = 520, height = 210;
    const left = 43, right = 502, top = 16, bottom = 169;
    const extent = Math.max(20, Math.ceil(generation / 20) * 20);
    const x = i => left + i / extent * (right - left);
    const y = p => bottom - p * (bottom - top);
    // At most one min/max pair per horizontal pixel preserves spikes on long runs.
    function points(inverse) {
      const bucketSize = Math.max(1, Math.ceil(history.length / 460));
      const samples = [];
      for (let i = 0; i < history.length; i += bucketSize) {
        const end = Math.min(history.length, i + bucketSize);
        let low = i, high = i;
        for (let j = i + 1; j < end; j++) {
          if (history[j] < history[low]) low = j;
          if (history[j] > history[high]) high = j;
        }
        for (const index of [...new Set([i, low, high, end - 1])].sort((a, b) => a - b)) {
          samples.push(`${x(index).toFixed(2)},${y(inverse ? 1 - history[index] : history[index]).toFixed(2)}`);
        }
      }
      return samples.join(' ');
    }
    const last = history[history.length - 1];
    const grid = [0, .5, 1].map(p => `<line x1="${left}" x2="${right}" y1="${y(p)}" y2="${y(p)}" stroke="#e7e2d2" ${p === .5 ? 'stroke-dasharray="4 4"' : ''}/><text class="chart-label" x="${left - 8}" y="${y(p) + 4}" text-anchor="end">${p * 100}%</text>`).join('');
    const ticks = [0, extent / 2, extent].map(i => `<text class="chart-label" x="${x(i)}" y="188" text-anchor="middle">${i}</text>`).join('');
    $('frequency-chart').innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Allele frequencies over ${generation} ${generation === 1 ? 'generation' : 'generations'}. A started at ${percent(history[0])} and is now ${percent(last)}. The rest is a.">${grid}${ticks}<text class="chart-label" x="273" y="207" text-anchor="middle">Generation</text><polyline points="${points(true)}" fill="none" stroke="#ce513e" stroke-width="2.5" stroke-dasharray="6 4" stroke-linejoin="round"/><polyline points="${points(false)}" fill="none" stroke="#287c80" stroke-width="3" stroke-linejoin="round"/><circle cx="${x(generation)}" cy="${y(1 - last)}" r="3.5" fill="#ce513e"/><circle cx="${x(generation)}" cy="${y(last)}" r="3.5" fill="#287c80"/></svg>`;
  }

  function updateButtons() {
    $('play').innerHTML = playing ? 'Pause <span aria-hidden="true">Ⅱ</span>' : 'Play <span aria-hidden="true">▶</span>';
    $('play').disabled = isFixed() || generation >= modelLimit;
    $('step').disabled = playing || isFixed() || generation >= modelLimit;
  }

  function render(animate = false) {
    const count = countAlleles(population), total = population.length * 2;
    $('generation').textContent = generation;
    $('duck-count').textContent = `${population.length} ducks · ${total} gene copies`;
    $('total-A').textContent = percent(count / total);
    $('total-a').textContent = percent(1 - count / total);
    $('copies-A').textContent = `${count} ${count === 1 ? 'copy' : 'copies'}`;
    $('copies-a').textContent = `${total - count} ${total - count === 1 ? 'copy' : 'copies'}`;
    $('bar-A').style.width = `${count / total * 100}%`;
    $('bar-a').style.width = `${(1 - count / total) * 100}%`;
    renderFlock(animate);
    renderInheritance();
    renderChart();
    updateButtons();
  }

  function pause() {
    playing = false;
    clearTimeout(timer);
    timer = null;
    updateButtons();
  }

  function fixedMessage() {
    const fixed = population[0][0] ? 'A' : 'a';
    const lost = fixed === 'A' ? 'a' : 'A';
    if (generation === 0) return `Only ${fixed} is present to begin with. Change the starting share of A to include both alleles.`;
    return `${fixed} is fixed: every gene copy is ${fixed}. ${lost} has disappeared. Start again for another story.`;
  }

  function advance() {
    if (isFixed() || generation >= modelLimit) return;
    previous = population;
    const next = nextGeneration(population);
    population = next.population;
    parents = next.parents;
    generation++;
    history.push(countAlleles(population) / (population.length * 2));
    if (isFixed()) {
      pause();
      $('pond-message').textContent = fixedMessage();
    } else if (generation >= modelLimit) {
      pause();
      $('pond-message').textContent = '10,000 generations explored. Start again for another story.';
    } else if (!playing) {
      $('pond-message').textContent = 'A new generation, chosen by chance. Take another step or press Play.';
    }
    render(true);
  }

  function schedule() {
    clearTimeout(timer);
    if (!playing) return;
    timer = setTimeout(() => {
      advance();
      schedule();
    }, 1000 / Number($('speed').value));
  }

  function restart() {
    clearTimeout(timer);
    timer = null;
    playing = false;
    const size = Number($('population').value);
    const frequency = Number($('frequency').value) / 100;
    population = createPopulation(size, frequency);
    previous = null;
    parents = null;
    generation = 0;
    selected = 0;
    history = [countAlleles(population) / (2 * size)];
    $('frequency-label').textContent = `${Math.round(frequency * 100)}%`;
    $('frequency').setAttribute('aria-valuetext', `${Math.round(frequency * 100)} percent A`);
    $('starting-count').textContent = `Starts with ${countAlleles(population)} of ${2 * size} A copies (${percent(history[0])}).`;
    $('pond-message').textContent = isFixed() ? fixedMessage() : 'Nothing favours either allele. What will chance do?';
    render();
  }

  $('play').addEventListener('click', () => {
    if (playing) {
      pause();
      $('pond-message').textContent = 'Paused. Take a closer look, or press Play to carry on.';
    } else if (!isFixed() && generation < modelLimit) {
      playing = true;
      $('pond-message').textContent = 'The generations are turning. Watch the dots, then follow their story below.';
      updateButtons();
      advance();
      schedule();
    }
  });
  $('step').addEventListener('click', advance);
  $('restart').addEventListener('click', restart);
  $('population').addEventListener('change', restart);
  $('frequency').addEventListener('input', restart);
  $('speed').addEventListener('input', () => {
    const speed = Number($('speed').value);
    $('speed-label').textContent = `${speed} / second`;
    $('speed').setAttribute('aria-valuetext', `${speed} generations per second`);
    schedule();
  });
  $('flock').addEventListener('click', event => {
    const button = event.target.closest('[data-duck]');
    if (!button) return;
    if (playing) {
      pause();
      $('pond-message').textContent = 'Paused to follow this duck. Press Play when you are ready.';
    }
    selected = Number(button.dataset.duck);
    for (const duck of $('flock').children) duck.setAttribute('aria-pressed', String(duck === button));
    renderInheritance();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && playing) {
      pause();
      $('pond-message').textContent = 'Paused while you were away. Press Play to carry on.';
    }
  });
  restart();
  $('drift-app').hidden = false;
})();
