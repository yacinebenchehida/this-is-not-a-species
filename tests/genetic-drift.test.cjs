const test = require('node:test');
const assert = require('node:assert/strict');
const { createPopulation, nextGeneration, countAlleles } = require('../simulations/population-genetics/genetic-drift/model.js');

function seeded(seed) {
  return () => {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function moments(size, p, repetitions, seed) {
  const random = seeded(seed);
  const pop = createPopulation(size, p, random);
  const actual = countAlleles(pop) / (2 * size);
  let sum = 0, squares = 0, diversity = 0;
  for (let i = 0; i < repetitions; i++) {
    const q = countAlleles(nextGeneration(pop, random).population) / (2 * size);
    sum += q;
    squares += q * q;
    diversity += 2 * q * (1 - q);
  }
  return { mean: sum / repetitions, variance: squares / repetitions - (sum / repetitions) ** 2, diversity: diversity / repetitions, p: actual };
}

test('initial populations contain exactly the nearest possible starting allele count', () => {
  for (const size of [1, 6, 12, 24, 48, 96]) {
    for (const p of [0, .05, .2, .5, .95, 1]) {
      const pop = createPopulation(size, p, seeded(size));
      assert.equal(pop.length, size);
      assert.equal(countAlleles(pop), Math.round(2 * size * p));
      assert.ok(pop.every(duck => duck.length === 2 && duck.every(a => a === 0 || a === 1)));
    }
  }
  assert.throws(() => createPopulation(0, .5), RangeError);
  assert.throws(() => createPopulation(6, NaN), RangeError);
  assert.throws(() => createPopulation(6, 2), RangeError);
});

test('offspring alleles match recorded source copies and population size stays constant', () => {
  const random = seeded(92);
  let pop = createPopulation(24, .5, random);
  for (let gen = 0; gen < 200; gen++) {
    const next = nextGeneration(pop, random);
    assert.equal(next.population.length, 24);
    for (let duck = 0; duck < 24; duck++) {
      for (let copy = 0; copy < 2; copy++) {
        const source = next.parents[duck][copy];
        assert.ok(Number.isInteger(source) && source >= 0 && source < 48);
        assert.equal(next.population[duck][copy], pop[Math.floor(source / 2)][source % 2]);
      }
    }
    pop = next.population;
  }
});

test('sampling is with replacement, including repeated use of one parent copy', () => {
  const pop = [[1, 0], [0, 0]];
  const next = nextGeneration(pop, () => 0);
  assert.equal(countAlleles(next.population), 4);
  assert.deepEqual(next.parents, [[0, 0], [0, 0]]);
  assert.deepEqual(pop, [[1, 0], [0, 0]]);
});

test('loss and fixation remain absorbing across generations', () => {
  const random = seeded(88);
  for (const p of [0, 1]) {
    let pop = createPopulation(12, p, random);
    for (let i = 0; i < 100; i++) {
      pop = nextGeneration(pop, random).population;
      assert.equal(countAlleles(pop), 24 * p);
    }
  }
});

test('conditional mean, variance and diversity decay agree with Wright–Fisher theory', () => {
  const repetitions = 40000;
  for (const [size, p] of [[6, .25], [12, .5], [48, .75]]) {
    const result = moments(size, p, repetitions, size + 500);
    const expectedVariance = result.p * (1 - result.p) / (2 * size);
    assert.ok(Math.abs(result.mean - result.p) < 6 * Math.sqrt(expectedVariance / repetitions));
    assert.ok(Math.abs(result.variance / expectedVariance - 1) < .04);
    const expectedDiversity = (1 - 1 / (2 * size)) * 2 * result.p * (1 - result.p);
    assert.ok(Math.abs(result.diversity - expectedDiversity) < .003);
  }
});

test('a larger population has proportionally smaller one-generation drift variance', () => {
  const small = moments(6, .5, 30000, 10);
  const large = moments(48, .5, 30000, 20);
  assert.ok(Math.abs(small.variance / large.variance - 8) < .45);
});

test('neutral fixation probability follows the starting allele frequency', () => {
  const random = seeded(1830), trials = 2500;
  for (const p of [.25, .5, .75]) {
    let fixedA = 0;
    for (let trial = 0; trial < trials; trial++) {
      let pop = createPopulation(6, p, random);
      let count = countAlleles(pop), generations = 0;
      while (count > 0 && count < 12 && generations < 10000) {
        pop = nextGeneration(pop, random).population;
        count = countAlleles(pop);
        generations++;
      }
      assert.ok(count === 0 || count === 12, 'each seeded run reaches an absorbing boundary');
      if (count === 12) fixedA++;
    }
    assert.ok(Math.abs(fixedA / trials - p) < 6 * Math.sqrt(p * (1 - p) / trials));
  }
});
