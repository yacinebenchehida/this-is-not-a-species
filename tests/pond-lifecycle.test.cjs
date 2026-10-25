const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const model = require('../simulations/population-genetics/genetic-drift/model.js');

function sceneFixture() {
  const context = new Proxy({
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} })
  }, { get: (object, key) => key in object ? object[key] : () => {} });
  const element = () => ({ width: 1500, height: 105, clientWidth: 1000, dataset: {}, attributes: {},
    getContext: () => context, toDataURL: () => 'data:image/png;base64,',
    setAttribute(key, value) { this.attributes[key] = value; }, addEventListener() {} });
  const sandbox = { window: { matchMedia: () => ({ matches: false }) },
    document: { createElement: element }, Path2D: class {}, ResizeObserver: class { observe() {} } };
  vm.createContext(sandbox);
  for (const file of ['duck-character.js', 'pond-scene.js']) {
    vm.runInContext(fs.readFileSync(`${__dirname}/../${process.env.POND_LOCALE === 'fr' && file === 'pond-scene.js' ? 'fr/' : ''}simulations/population-genetics/genetic-drift/${file}`, 'utf8'), sandbox);
  }
  return new sandbox.window.PondScene(element(), () => {}, element());
}

test('the nursery fills with exactly N recorded offspring and the complete cohort replaces the adults', () => {
  for (const size of [6, 24, 500]) {
    const scene = sceneFixture(), previous = model.createPopulation(size, .5);
    const original = JSON.stringify(previous), next = model.nextGeneration(previous);
    scene.setPopulation(previous); scene.beginBirth(previous, next.population, next.parents, 0);
    assert.equal(scene.birth.order.length, size); assert.equal(new Set(scene.birth.order).size, size);
    let last = 0;
    for (const progress of [0, .1, .3, .42, .55, .65, .75, .8, .85, .9, .92, .96, .999]) {
      scene.birth.progress = progress;
      const born = scene.bornCount(); assert(born >= last && born <= size); last = born;
      scene.render(1 / 30); assert.equal(Number(scene.nursery.dataset.born), born);
      assert.equal(scene.ducks.length, size); assert.equal(scene.population, previous);
    }
    assert.equal(last, size); assert.equal(JSON.stringify(previous), original);
    scene.finishBirth(next.population);
    assert.equal(scene.population, next.population); assert.equal(scene.birth, null); assert.equal(scene.ducks.length, size);
    scene.ducks.forEach((duck, i) => assert.equal(JSON.stringify(duck.alleles), JSON.stringify(next.population[i])));
  }
});

test('a family with both copies from one parent transfers the recorded copies without inventing another duck', () => {
  const scene = sceneFixture(), previous = [[1, 0], [0, 1]], next = [[0, 1], [0, 0]], parents = [[1, 0], [1, 1]];
  scene.setPopulation(previous); scene.beginBirth(previous, next, parents, 0);
  assert.equal(JSON.stringify(scene.birth.sources), '[0,0]'); assert.equal(JSON.stringify(scene.birth.copies), '[1,0]');
  for (const progress of [.35, .5, .6, .7, .8, .93]) { scene.birth.progress = progress; scene.render(1 / 30); }
  scene.finishBirth(next); assert.equal(scene.population.length, 2); assert.equal(JSON.stringify(scene.population), JSON.stringify(next));
});

test('a duck hopping between destinations covers the centre and the edges and stays inside the safe area', () => {
  const scene = sceneFixture(); let x = 200, y = 300, central = 0, outer = 0;
  for (let i = 0; i < 4000; i++) {
    const next = scene.swimTarget(x, y); x = next.x; y = next.y;
    const radius = Math.hypot((x - 500) / 340, (y - 315) / 164);
    assert(radius <= 1.000001);
    if (radius < .3) central++; if (radius > .8) outer++;
  }
  // A uniform spread puts about 9% of stops within 0.3 of the centre and 36% beyond 0.8.
  assert(central > 200, 'ducks should regularly visit the centre');
  assert(outer > 1100, 'ducks should not crowd into the centre');
});

test('dense ponds swim more slowly and all bodies use the same colour', () => {
  const small = sceneFixture(), large = sceneFixture();
  small.setPopulation(model.createPopulation(6, .5)); large.setPopulation(model.createPopulation(500, .5));
  assert(Math.max(...large.ducks.map(d => d.speed)) < Math.min(...small.ducks.map(d => d.speed)));
  assert([...small.ducks, ...large.ducks].every(d => d.cream === false));
});

test('every duckling gets one mating event linking its two recorded parents', () => {
  for (const size of [6, 24, 48, 500]) {
    const scene = sceneFixture(), previous = model.createPopulation(size, .5), next = model.nextGeneration(previous);
    scene.setPopulation(previous); scene.beginBirth(previous, next.population, next.parents, 0);
    const birth = scene.birth, children = birth.events.map(e => e.child);
    if (birth.featured >= 0) children.push(birth.featured);
    assert.equal(children.length, size); assert.equal(new Set(children).size, size);
    assert.equal(birth.featured >= 0, size <= 24, 'only small ponds get the close-up family');
    for (const e of birth.events) {
      assert.deepEqual(e.sources, next.parents[e.child].map(copy => Math.floor(copy / 2)));
      assert(e.start >= 0 && e.start + e.length <= .84 + 1e-9);
    }
  }
});

test('one-parent draws get a single heart and dozing ducks are exactly those that passed on nothing', () => {
  const scene = sceneFixture(), previous = [[1, 0], [0, 1], [1, 1]];
  const next = [[1, 0], [0, 0], [1, 1]], parents = [[0, 1], [1, 1], [0, 4]];
  scene.setPopulation(previous); scene.beginBirth(previous, next, parents, 0);
  assert.deepEqual(scene.birth.unused, [1], 'duck 2 was never drawn');
  const selfed = scene.birth.events.find(e => e.child === 1);
  assert.deepEqual(selfed.sources, [0, 0]);
  scene.birth.progress = selfed.start + selfed.length / 2; scene.render(1 / 30);
  assert(Number(scene.canvas.dataset.matingHearts) >= 1);
  scene.birth.progress = .9; assert.match(scene.storyLabel(true), process.env.POND_LOCALE === 'fr' ? /1 canard n’a transmis aucune copie/ : /1 duck passed on no copies/);
});

test('fast-forward shows no matings and the panel has a seat for every copy and duckling', () => {
  for (const size of [6, 96, 500]) {
    const scene = sceneFixture(), population = model.createPopulation(size, .5);
    scene.fast = true; scene.setPopulation(population); scene.render(1 / 30);
    assert.equal(scene.activeEvents().length, 0); assert.match(scene.storyLabel(true), process.env.POND_LOCALE === 'fr' ? /En accéléré/ : /Fast-forward/);
    assert.equal(scene.pool.cells.length, size); assert.equal(scene.nest.cells.length, size);
    for (const cell of [...scene.pool.cells, ...scene.nest.cells]) assert(cell.x > 100 && cell.x < 1000 && cell.y > 0 && cell.y < 160);
  }
});

test('watch-every-mating mode: beak-to-beak meetings one at a time, for up to 24 ducks, with parents face to face', () => {
  for (const [size, slow, expected] of [[6, true, true], [12, true, true], [24, true, true], [48, true, false], [12, false, false]]) {
    const scene = sceneFixture(); scene.slow = slow; scene.setPopulation(model.createPopulation(size, .5));
    assert.equal(scene.beakToBeak(), expected, `${size} ducks, slow ${slow}`);
  }
  const timing = sceneFixture();
  assert.deepEqual([6, 12, 24].map(n => Math.round(timing.slowSeconds(n))), [22, 35, 61]);
  for (const size of [6, 12, 24]) {
    const scene = sceneFixture(); scene.slow = true; const pop = model.createPopulation(size, .5), next = model.nextGeneration(pop);
    scene.setPopulation(pop); scene.beginBirth(pop, next.population, next.parents, 0);
    const seconds = scene.slowSeconds(size);
    for (const e of scene.birth.events) assert(e.length * seconds > 2, 'each meeting gets more than two seconds');
  }
  const scene = sceneFixture(); scene.slow = true; scene.genSeconds = 20;
  const previous = model.createPopulation(6, .5); scene.setPopulation(previous);
  // Duckling 1 has two distinct parents (ducks 0 and 1); every other duckling comes from duck 5 alone.
  const parents = previous.map((_, i) => i === 1 ? [0, 2] : [10, 11]);
  const next = { parents, population: parents.map(pair => pair.map(copy => previous[Math.floor(copy / 2)][copy % 2])) };
  scene.beginBirth(previous, next.population, next.parents, 0);
  const e = scene.birth.events.find(ev => ev.child === 1);
  for (const other of scene.birth.events) assert(other === e || other.start >= e.start + e.length - 1e-9 || other.start + other.length <= e.start + 1e-9, 'meetings never overlap');
  scene.birth.progress = e.start + e.length * .4; scene.steerPairs();
  const [a, b] = e.sources.map(i => scene.ducks[i]), left = a.x < b.x ? a : b, right = left === a ? b : a;
  assert(left.facing > 0 && right.facing < 0, 'parents face each other');
  assert(Math.abs(right.x - left.x - 80 * scene.scale) < 1e-6 && Math.abs(a.y - b.y) < 1e-6, 'parents meet side by side');
  assert.equal(JSON.stringify(scene.birth.parents), JSON.stringify(next.parents), 'meeting never changes the recorded parents');
});
