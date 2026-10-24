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
    vm.runInContext(fs.readFileSync(`${__dirname}/../simulations/population-genetics/genetic-drift/${file}`, 'utf8'), sandbox);
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

test('swimming destinations include the pond centre and remain inside the safe area', () => {
  const scene = sceneFixture(); let central = 0;
  for (let i = 0; i < 1200; i++) {
    const p = scene.swimTarget(200, 250), radius = Math.hypot((p.x - 500) / 324, (p.y - 315) / 153);
    assert(radius <= 1.000001); if (radius < .3) central++;
  }
  assert(central > 30, 'ducks should frequently choose destinations in the centre');
});
