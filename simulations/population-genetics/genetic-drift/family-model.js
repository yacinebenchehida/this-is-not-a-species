/* A single offspring of two specified diploid parents; independent Mendelian draws. */
(function (root) {
  'use strict';
  function offspring(first, second, random = Math.random) {
    for (const parent of [first, second]) {
      if (!Array.isArray(parent) || parent.length !== 2 || parent.some(a => a !== 0 && a !== 1)) {
        throw new TypeError('Each parent must carry exactly two teal/coral gene copies.');
      }
    }
    const sourceCopies = [Math.floor(random() * 2), Math.floor(random() * 2)];
    return { sourceCopies, alleles: [first[sourceCopies[0]], second[sourceCopies[1]]] };
  }
  const api = { offspring };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DuckFamily = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
