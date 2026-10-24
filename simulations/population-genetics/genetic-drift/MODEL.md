# Duck Pond: genetic drift

A neutral diploid Wright–Fisher population at one biallelic locus. Each rendered duck is one individual; its two coloured circles are its actual gene copies. Body colour and position have no effect on inheritance.

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

The plot always uses a 0–100% frequency axis. On long runs, per-pixel minima and maxima preserve the trajectory's extremes. History is retained for up to 100,000 generations per run, when playback stops explicitly. Playback begins only on user request and generation transitions respect reduced motion.

Reference: [Tree Sequence Tutorials: Building a forward simulator, Core steps](https://tskit-dev.github.io/tutorials/forward_sims.html#core-steps), including its discussion of diploidy, sampling with replacement and selfing.

## Movement and playback

`pond-scene.js` renders every individual in a Canvas 2D pond. Shading is baked into four cached diploid duck sprites (plus blinking variants). Swimming, turning, spacing, wakes, water and lilies are cosmetic and do not enter the inheritance model. The coloured markers use the individual's actual two gene copies, without letter labels. A pointer selection or native duck selector shows its actual parent copies in the family panel.

At 1 generation per 6 seconds, 1 per 2 seconds, or 1 per second, one actual sampled family is shown approaching, courting and hatching. A family with distinct parents is chosen from the sampled offspring when available; this display choice does not change any offspring. If all offspring have the same parent for both copies, a single-parent hatch is shown. One duckling is a preview of that family; the full new cohort then replaces the old cohort. The frequency display changes only when the generation is committed. New cohorts grow visually, without adding extra generations.

At 3, 10, 30 or 100 generations per second, courtship is skipped and model generations are processed in frame-sized batches. Every generation, including ones between screen refreshes, is recorded in the history. The UI refreshes at most ten times per second during fast playback. The model is identical at every speed. The available population sizes are 6, 12, 24, 48, 96, 200 and 500, and every duck is rendered. Dense populations can be inspected one duck at a time.

Pause freezes reproductive progress; the pond's ambient movement continues. Hiding the tab pauses generations. Changing speed preserves the pending family and does not advance a paused generation. Reduced-motion settings suppress ambient movement and shorten the family transition to a static crossfade. No generation runs until requested.

## Validation

Run `node --test tests/genetic-drift.test.cjs`. Seeded numerical checks cover exact starting counts, source-to-offspring inheritance, constant N, absorbing boundaries, conditional means and variances, expected diversity decay, the population-size effect, and fixation probabilities. The browser uses Math.random; deterministic random functions are injected only by tests. These checks verify the specified educational model, not biological realism or research suitability.

Drawing is capped at 30 frames per second; the generation clock uses elapsed time independently of the drawing rate.

The page generator embeds `illustration.html` inside the shared site shell. Local model and interface scripts and styles remain independent of the shared gallery templates. To edit the page, change the fragment and regenerate with `python3 scripts/build_pages.py`.
