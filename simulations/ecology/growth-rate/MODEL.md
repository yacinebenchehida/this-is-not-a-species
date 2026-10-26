# Step 3 — The growth rate r

## Current status

Readable chapter, one still dish and a static SVG rate diagram. No resource dynamics, numerical population trajectory or functional controls have been implemented. The SVG is a geometric example, not measured data or output from a solver. Its falling line and constant line intersect at the intended equilibrium. English/French pages and the French SVG are generated; never edit `fr/` directly.

## Proposed demographic model and derivation

Food is supplied continuously at a fixed limited rate, unlike step 1's depleting lunchbox or step 4's closed culture. Approximate resource sharing through a declining per-capita division rate b(N); mortality d is constant in this particular model. This is a density-dependent phenomenological rule, not an explicit nutrient conservation equation.

Choose b0 > d > 0 and Kprime > 0. On the domain 0 ≤ N ≤ Kprime:

    b(N) = b0(1 − N/Kprime)
    g(N) = b(N) − d
    dN/dt = [b0 − d − (b0/Kprime)N] N
    r = b0 − d
    K = Kprime (1 − d/b0) = Kprime r/b0
    dN/dt = rN(1 − N/K)

Here g(N) is the actual net rate per living bacterium; the logistic parameter r is its low-density limit and is fixed for a given setting. They must not be presented as the same constant. K is the birth–death balance point; Kprime is the larger population at which the linear birth rate becomes zero. K must not be substituted for Kprime inside b(N), which would give b(K) = 0 rather than d.

For N > Kprime, physically nonnegative births require `b(N) = max(0, b0(1 − N/Kprime))`. Above Kprime the trajectory is pure death and is **not** exactly logistic. Either restrict the initial state to the invariant interval [0, Kprime] or implement/document this clipped extension. If d ≥ b0 there is no positive equilibrium; K = 0 cannot be used as a logistic denominator. Handle that regime explicitly if controls allow it.

At K, births = deaths = dK > 0. Population below K grows; above K but below Kprime it declines towards K. With N0 > 0 in the stated domain, the exact logistic trajectory is `K/[1 + (K/N0 − 1) exp(−rt)]`. A larger effective food supply can be represented by a larger Kprime with b0 and d fixed, moving K upwards. This is an approximation to renewed supply; it does not prove that a fixed resource influx produces this exact linear birth rule.

The static rate diagram uses b0 = 0.6 h⁻¹, d = 0.2 h⁻¹, Kprime = 90 and K = 60. Its x positions are linear in N; the crossing lies at two thirds of Kprime. No numerical values are shown to visitors yet.

## TODO — scene and controls

- [ ] One dish with a slow renewed trickle of sugar cubes, sharing among existing cells, ongoing deaths and the same character artwork.
- [ ] Choose the demographic representation consistently with step 2; retain living IDs and event/counter history.
- [ ] A food-delivery control mapped explicitly to Kprime, plus starting population; expose further parameters only if useful.
- [ ] Plot divisions and deaths per bacterium against N, label units and mark their crossing K. Mark the current N on that same chart.
- [ ] At equilibrium, continue both divisions and deaths; never freeze all organisms or silently stop the event clocks.
- [ ] Provide reduced-motion states and English/French controls, captions and accessibility labels.

## TODO — numerical tests

- [ ] Algebraic equivalence to the logistic law on [0, Kprime], and agreement of exact trajectories with that law.
- [ ] b(K) = d, g(K) = 0, with positive turnover dK and growth signs on both sides of K.
- [ ] Nonnegative rates, N = 0 absorbing, invariance of [0, Kprime], and explicit treatment of any clipped or d ≥ b0 regime.
- [ ] Consistent mapping of food delivery to Kprime and K, with K moving in the intended direction.
- [ ] Event/counter conservation and playback invariance; if stochastic, test ensemble behaviour rather than exact stillness at K.

## Background

[OpenStax, Environmental Limits to Population Growth](https://openstax.org/books/biology-2e/pages/45-3-environmental-limits-to-population-growth). The planned model is an illustrative demographic decomposition, not a detailed culture simulator.
