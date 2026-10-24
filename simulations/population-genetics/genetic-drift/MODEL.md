# Duck Pond: genetic drift

A neutral diploid Wright–Fisher population at one biallelic locus. Each rendered duck is one individual; its two coloured circles are its actual gene copies. All ducks have the same yellow body colour. Only the two teal/coral dots encode genetic information; position has no effect on inheritance.

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

`pond-scene.js` renders every individual in a Canvas 2D pond, using the approved `duck-character.js` silhouette, soft volume shading, teal outline and actual allele markers. Idle swimming uses cached sprites; the featured parents and duckling use the same articulated character directly. All bodies are yellow to avoid implying unmodelled sex classes. Ducks swim towards destinations sampled throughout the full safe pond ellipse, including its centre, at roughly 85–110 scene units per second in the smallest pond, decreasing smoothly with population size to roughly 32–42 at N = 500. The movement clock is independent of generation speed. Slower ducks also keep their headings longer, giving them time to explore the full pond. A compact laptop projection compresses pond depth while preserving the ducks' proportions. Swimming, turning, spacing, wakes, water and lilies are cosmetic and do not enter inheritance.

At one generation per 8, 4 or 2 seconds (4 seconds by default), for N ≤ 24 one actual sampled family is shown approaching, chest-puffing, head-bobbing and wing-wiggling, followed by hearts, highlighted inherited gene copies, copied allele trails, a splash and the duckling reveal. A family with distinct parents is selected from the sampled cohort when available; this display choice never changes any offspring. If all sampled offspring have the same parent for both copies, the single real parent is shown and both recorded source copies are used, without inventing a second organism.

Every sampled offspring also schedules a small heart pulse over each of its actual parent indices. The two contributing parents pulse together even when swimming apart; one-parent draws pulse once. Unchosen individuals receive no reproductive heart. Repeated contributions can pulse again, and overlapping pulses on one duck merge to keep the view legible. This cosmetic schedule cannot alter sampling. In detailed small-pond playback the featured parents use the close-up heart instead of duplicate small hearts. Larger ponds show the small hearts throughout the pond without a close-up.

The full new cohort is sampled exactly once before the sequence starts. The main pond keeps N adults while a separate nursery fills with the N recorded offspring. The featured duckling enters the nursery first; the other offspring are revealed in a compact sequence. The nursery contains each offspring exactly once, with its actual two copies. After all N places are filled, the old adults fade and the complete N-duck cohort takes over. The short splash overlap is a storytelling effect; the parents return and remain available until the generation change. No parent is removed because it has reproduced. The nursery is staging for the next generation, not a change in the model's adult population size.

The nursery counter and phase captions distinguish the old and next generations. The numerical generation, frequencies, chart and inheritance inspector change only when the whole generation is committed. Pausing and changing speed preserve the pending cohort and recorded source copies. A pointer selection or native selector inspects any duck's actual family from the immediately preceding generation.

At 3, 10, 30 or 100 generations per second, courtship is skipped and model generations are processed in frame-sized batches. Every generation, including ones between screen refreshes, is recorded in the history. Small hearts retain one real sampled generation per 1.15-second visual cycle, anchored to its recorded parent positions; all of that generation's sampled mating events are scheduled. Intervening model generations continue unchanged. Thus fast-forward hearts are representative reproductive cues, rather than a claim to display every mating across every rapidly processed generation. The UI refreshes at most ten times per second during fast playback. The model is identical at every speed. The available population sizes are 6, 12, 24, 48, 96, 200 and 500, and every duck is rendered. Dense populations can be inspected one duck at a time.

Pause freezes reproductive progress; the pond's ambient movement continues. Hiding the tab pauses generations. Changing speed preserves the pending family and does not advance a paused generation. Reduced-motion settings suppress ambient movement and shorten the family transition to a static crossfade. No generation runs until requested.

## Validation

Run `node --test tests/genetic-drift.test.cjs tests/duck-family.test.cjs tests/pond-lifecycle.test.cjs`. Seeded numerical checks cover exact starting counts, source-to-offspring inheritance, constant N, absorbing boundaries, conditional means and variances, expected diversity decay, the population-size effect, and fixation probabilities. The browser uses Math.random; deterministic random functions are injected only by tests. These checks verify the specified educational model, not biological realism or research suitability.

Lifecycle tests additionally cover nursery cardinality, complete replacement for N = 6, 24 and 500, retained allele data, the one-parent case, and destinations in the pond centre.

Drawing is capped at 30 frames per second; the generation clock uses elapsed time independently of the drawing rate.

The page generator embeds `illustration.html` inside the shared site shell. Local model and interface scripts and styles remain independent of the shared gallery templates. To edit the page, change the fragment and regenerate with `python3 scripts/build_pages.py`.
