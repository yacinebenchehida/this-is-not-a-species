/* Neutral, diploid Wright–Fisher inheritance. See MODEL.md for assumptions. */
(function (root) {
  'use strict';

  function createPopulation(size, frequency, random = Math.random) {
    if (!Number.isInteger(size) || size < 1 || !Number.isFinite(frequency) || frequency < 0 || frequency > 1) {
      throw new RangeError('Use a positive whole population size and a frequency between 0 and 1.');
    }
    const count = Math.round(2 * size * frequency);
    const copies = Array.from({ length: 2 * size }, (_, i) => i < count ? 1 : 0);
    // Shuffle a fixed allele count so the requested start has no extra sampling error.
    for (let i = copies.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [copies[i], copies[j]] = [copies[j], copies[i]];
    }
    return Array.from({ length: size }, (_, i) => copies.slice(i * 2, i * 2 + 2));
  }

  function nextGeneration(population, random = Math.random) {
    const size = population.length;
    if (!size) throw new RangeError('The population cannot be empty.');
    const parents = [];
    const offspring = Array.from({ length: size }, () => {
      // Independent draws with replacement give Binomial(2N, p) allele counts.
      const sources = [0, 1].map(() => Math.floor(random() * (2 * size)));
      parents.push(sources);
      return sources.map(source => population[Math.floor(source / 2)][source % 2]);
    });
    return { population: offspring, parents };
  }

  function countAlleles(population) {
    return population.reduce((sum, duck) => sum + duck[0] + duck[1], 0);
  }

  const api = { createPopulation, nextGeneration, countAlleles };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DriftModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
