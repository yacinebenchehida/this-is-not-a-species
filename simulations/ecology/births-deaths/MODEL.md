# Step 2 — Births and deaths

## Current status

Readable chapter and static illustration only. There is no running birth–death model, slider, counter or numerical integration on this page. `illustration.html` generates both `index.html` and `play.html`; French pages are generated from `content/locales/fr.json`. The shared `../growth-series/illustrations.js` paints a single still using the existing character and dish; it does not sample events or advance time. Shapes and colours have no demographic meaning.

## Proposed model

Let N(t) be the living population. The constant per-capita division rate b and death rate d have units of inverse model time, for example h⁻¹. A division replaces one cell by two, so the net population gain is one, not two. A death removes one living cell.

    dN/dt = bN − dN = (b − d)N
    N(t) = N0 exp[(b − d)t]

The rates bN and dN are expected event flows per unit time; they are not probabilities. With b = d > 0, N is constant but both flows remain positive. With b = d = 0, no events occur. Food is continually renewed and never limits either rate. There is no migration, age structure, resource budget, colour-specific survival or density dependence.

Before the animation is implemented, choose and document one representation: a deterministic expected trajectory with retained event counts, or an explicit stochastic birth–death process. A stochastic process has independent hazards bN and dN; it need not remain exactly constant when b = d and can go extinct. Do not silently force stochastic counts to follow the smooth curve. For small populations, explain the distinction between an expected stable population and a fluctuating realization.

## TODO — scene and controls

- [ ] One dish, endless sugar supply, the existing bacterium character and whole-cube gulp.
- [ ] Two real controls: “How often they divide” (b) and “How often they die” (d). Show units and keep rates nonnegative.
- [ ] Side-by-side cumulative birth and death counters for the same elapsed interval; one division contributes +1 to births and population.
- [ ] Retained division events replace a parent with two daughters. Death events remove one living cell and briefly fade its image; fading cells are not counted as living.
- [ ] Show `N = N0 + births − deaths`, sign of change, playback/reset and reduced-motion alternatives. Separate visual timing from numerical events.

## TODO — numerical tests

- [ ] Exact initial value and solution for positive, zero and negative b − d; positivity, exponential decline and no finite-time zero in the deterministic model.
- [ ] b = d > 0 gives zero net change with equal positive expected birth/death flows; b = d = 0 gives no events.
- [ ] Birth/death/population bookkeeping and individual identities; never count two net births for a binary fission.
- [ ] If stochastic: verify ensemble means and absorbing extinction, preserving seeded event draws during replay.
- [ ] Slow, fast and batched playback preserve the chosen event history and counts; rendering cannot change rates.

## Background

[OpenStax, Environmental Limits to Population Growth](https://openstax.org/books/biology-2e/pages/45-3-environmental-limits-to-population-growth). This is an educational model, not validated research software.
