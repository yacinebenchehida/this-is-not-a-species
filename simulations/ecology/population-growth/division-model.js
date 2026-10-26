/* A finite cell-division story, not an exponential or logistic population model. */
(function (root) {
  'use strict';
  const initialCount = 8, duration = 24, divisionLength = 2.8;
  const order = [2, 5, 0, 6, 3, 1, 7, 4];
  function state(time) {
    if (!Number.isFinite(time)) throw new RangeError('Time must be finite.');
    const t = Math.max(0, Math.min(duration, time));
    const divisions = order.map((parent, i) => ({parent, progress: Math.max(0, Math.min(1, (t - 1 - i * 2.6) / divisionLength))}));
    return {time:t, divisions, count:initialCount + divisions.filter(d => d.progress === 1).length, done:t >= duration};
  }
  const api = {state, initialCount, duration};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DivisionStory = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
