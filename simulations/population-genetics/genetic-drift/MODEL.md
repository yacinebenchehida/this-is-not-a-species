# Duck Pond: genetic drift

A neutral diploid Wright–Fisher population at one biallelic locus. Each rendered duck is one individual; its two labelled circles are its actual gene copies. Body colour and position have no effect on inheritance.

## Assumptions

- Constant population size N, discrete non-overlapping generations, two copies per individual.
- Each of the next generation's 2N copies is sampled independently and uniformly with replacement from the current 2N copies. Pairs form the N new individuals. This is equivalent to independently drawing a parent and then one of its two copies.
- No selection, mutation, migration, sex structure or spatial effects. Selfing is allowed. The ducks illustrate an ideal population; the model does not reproduce real duck mating.
- The initial number of A copies is round(2N × requested frequency), followed by a Fisher–Yates shuffle. Its realised count and frequency are displayed. There is no extra binomial sampling at initialisation.
- The parent inspector records the actual source copy for each offspring copy, from the immediately preceding generation. Parent labels refer only to that generation.
- Loss and fixation are absorbing. Playback stops at either boundary; it also pauses when the tab is hidden. Settings for N and initial frequency start a fresh run. Speed changes only the playback timing.

If K is the current A count, p = K/(2N), and K′ is the next count:

    K′ | K ~ Binomial(2N, p)
    E[p′ | p] = p
    Var(p′ | p) = p(1 − p)/(2N)
    E[2p′(1 − p′) | p] = (1 − 1/(2N)) × 2p(1 − p)

The plot always uses a 0–100% frequency axis. On long runs, per-pixel minima and maxima preserve the trajectory's extremes. History is retained for up to 10,000 generations per run, when playback stops explicitly. Playback begins only on user request and generation transitions respect reduced motion.

Reference: [Tree Sequence Tutorials: Building a forward simulator, Core steps](https://tskit-dev.github.io/tutorials/forward_sims.html#core-steps), including its discussion of diploidy, sampling with replacement and selfing.

## Validation

Run `node --test tests/genetic-drift.test.cjs`. Seeded numerical checks cover exact starting counts, source-to-offspring inheritance, constant N, absorbing boundaries, conditional means and variances, expected diversity decay, the population-size effect, and fixation probabilities. The browser uses Math.random; deterministic random functions are injected only by tests. These checks verify the specified educational model, not biological realism or research suitability.

The page generator embeds `illustration.html` inside the shared site shell. Local model and interface scripts and styles remain independent of the shared gallery templates. To edit the page, change the fragment and regenerate with `python3 scripts/build_pages.py`.
