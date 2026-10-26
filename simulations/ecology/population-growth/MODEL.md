# Petri Dish: population growth

This educational animation compares exact exponential and logistic population curves. It is not a microbiological culture simulator or validated research software.

## Equations and assumptions

Time is in illustrative model minutes. Let N0 be the starting population and T the potential doubling time in unlimited food. Both dishes use r = ln(2)/T.

- Replenished food: dN/dt = rN; N(t) = N0 exp(rt).
- Limited food: dN/dt = rN(1-N/K); N(t) = K/[1+(K/N0-1)exp(-rt)].
- N0 is 4, 8 or 12. T is 20, 30 or 60 minutes. K is 24, 48, 72 or 96, always greater than N0.
- K is set by the food supply; it is not a geometric limit imposed by the drawn dish. Division time changes the rate of approach, not K.
- A simplified resource bookkeeping interpretation is R = K-N, with one normalized resource unit required per new cell and dR/dt = -dN/dt. The per-capita limited growth rate is rR/K. The food meter and particles show R(t)/R(0). Initial growth in the limited dish is already slightly slower than in unlimited food, especially when N0/K is large.
- No maintenance consumption, deaths, lag phase, waste products, mutation, migration, spatial resource competition or colour-specific growth rates are included. The plateau represents negligible net growth without modelling birth/death turnover.
- Species, real generation times and environmental chemistry are not fitted. The figures are illustrative controls.

## Whole-cell illustration

Each character represents one whole cell. The model is a continuous population curve; a division is committed whenever that curve reaches the next integer. Thus the visible number is the integer part of N(t), up to numerical tolerance and the display limit. The curve can be fractional between divisions. Nutrient particles are a gauge rather than individually consumed simulated resources.

Crossing times for an integer n > N0 are:

- Unlimited food: t(n) = ln(n/N0)/r.
- Limited food, n < K: t(n) = ln[n(K-N0)/(N0(K-n))]/r.

The logistic trajectory approaches K asymptotically. It does not reach K in finite time. Scheduling stops at K-1 whole cells; no rounding artificially creates a final division at the limit. At r=0 there are no divisions. N0=K is a supported constant-population model boundary, though not offered by the controls.

A deterministic age queue chooses the next parent and replaces it with two retained daughter IDs. There are no stochastic birth or death draws. Daughters inherit their parent's decorative colour and shape; these do not affect event times. Apparent lineage differences are scheduling details, not selection. These allocated individual division times illustrate the prescribed smooth law rather than independently modelling realistic cell cycles.

The character elongates and constricts before its scheduled division. Every completion event is processed even when it falls between rendered frames. At dense populations the renderer uses cached character drawings; the numerical events and all cell counts remain identical. Each dish uses the same drawing scale, decreasing as the unlimited population increases, to fit all characters. The drawings shrink for readability; cells are not physically shrinking or viewed in a changing physical container.

## Playback and boundaries

The run ends at min(240 minutes, the unlimited-food crossing time for 512 cells). The end message explicitly calls this the end of the viewing window; it is not an ecological ceiling on exponential growth. A changed starting population, division time or food supply resets both populations and the graph. Speed changes affect only elapsed wall time, preserving the numerical time and event histories. A step advances ten model minutes over about one wall-clock second, stopping at the viewing boundary. Pause freezes numerical time; decorative movement continues. Hidden tabs pause growth. Reduced-motion settings suppress ambient movement and stretching, retaining the division replacements and numerical curves.

The graph shows both continuous curves at the shared elapsed time with solid/dashed lines and a dotted K line. The linear population axis expands in 64-cell increments. The time axis spans the full viewing window. All curves are drawn only as far as the elapsed time, without revealing future trajectories.

## Files and checks

`growth-model.js` owns the exact equations, inverse crossing times and retained lineage schedule. `growth-scene.js` extends the existing dish renderer and reuses the established bacterium character. `growth.js` owns controls, time and DOM/SVG presentation. English `illustration.html` generates `index.html` and `play.html`; French pages and presentation strings are generated from `content/locales/fr.json`. The separate `motion-fragment.html` still generates the isolated cell-division study.

Run `node --test tests/population-growth.test.cjs` for equation, inverse-crossing, monotonicity, lineage, integer count, zero-growth and playback-batching checks. `python3 -m unittest discover -s tests -p 'test_*.py'` checks localization and static links. Run the existing JavaScript tests after integration. These checks verify the stated educational rules, not empirical bacterial realism.
