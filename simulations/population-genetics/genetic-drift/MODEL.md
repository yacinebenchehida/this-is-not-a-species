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

`pond-scene.js` renders every individual in a Canvas 2D pond, using the approved `duck-character.js` silhouette, soft volume shading, teal outline and actual allele markers. Idle swimming uses cached sprites; the featured parents and duckling use the same articulated character directly. All bodies are yellow to avoid implying unmodelled sex classes. Ducks swim in short hops (90–260 scene units) in random directions within the real pond outline, shrunk by a margin that grows with duck size; a hop that would land on the bank is not taken and the duck lingers briefly before trying again, which keeps the long-run spread even across the pond instead of crowding the centre. Paired parents only swim towards each other in ponds of up to 24 ducks, so matings do not herd larger ponds into the middle. Ducks swim at roughly 85–110 scene units per second in the smallest pond, decreasing smoothly with population size to roughly 32–42 at N = 500. The movement clock is independent of generation speed. Slower ducks also keep their headings longer, giving them time to explore the full pond. A compact laptop projection compresses pond depth while preserving the ducks' proportions. Swimming, turning, spacing, wakes, water and lilies are cosmetic and do not enter inheritance.

At one generation per 16, 8, 4 or 2 seconds (8 seconds by default; 16 seconds gives the most time to follow each mating), for N ≤ 24 one actual sampled family is shown first in close-up: approaching, chest-puffing, head-bobbing and wing-wiggling, followed by a heart, highlighted inherited gene copies, copied allele trails, a splash and the duckling, which then waddles towards its place in the nest. A family with distinct parents is selected from the sampled cohort when available; this display choice never changes any offspring. If all sampled offspring have the same parent for both copies, the single real parent is shown and both recorded source copies are used, without inventing a second organism. The close-up uses the first 42% of the generation's playback.

Every other sampled offspring then gets its own short mating, in turn, until 84% of the playback. Its two recorded parents swim towards each other (N ≤ 48), a heart and a dashed link appear between them, one bead flies from each parent's recorded source copy into a duckling that appears between them, and the duckling heads for its place in the nest. When both copies come from one duck, a single heart sits over that duck and both beads come from it. Hearts therefore always mean "these parents made this one duckling"; there are no hearts over unchosen ducks. Each duckling's mating is scheduled exactly once, and the steering of parents towards each other is cosmetic: it cannot alter sampling. From 84% to 94% of the playback, ducks that passed on no copies turn grey and doze, and the caption counts them.

The full new cohort is sampled exactly once before the sequence starts. The main pond keeps N adults while the panel below it shows the gene pool (all 2N current copies, grouped by adult) above a nest with one place per offspring. When a duckling settles in the nest, curves link its two copies to the pool copies they came from, and ×n labels count how often each pool copy has been drawn; copies never drawn fade during the dozing phase. The nest contains each offspring exactly once, with its actual two copies. After all N places are filled, the old adults fade and the complete N-duck cohort takes over. No parent is removed because it has reproduced. The nest is staging for the next generation, not a change in the model's adult population size.

The nest counter and phase captions distinguish the old and next generations. The numerical generation, frequencies, chart and inheritance inspector change only when the whole generation is committed. Pausing and changing speed preserve the pending cohort and recorded source copies. A pointer selection or native selector inspects any duck's actual family from the immediately preceding generation.

At 3, 10, 30 or 100 generations per second, matings are skipped entirely and model generations are processed in frame-sized batches. Every generation, including ones between screen refreshes, is recorded in the history; the gene pool panel shows the current copies and the nest stays empty. No hearts are shown in fast playback, so a heart is never a representative or approximate cue. The UI refreshes at most ten times per second during fast playback. The model is identical at every speed. The available population sizes are 6, 12, 24, 48, 96, 200 and 500, and every duck is rendered. Dense populations can be inspected one duck at a time.

Pause freezes reproductive progress; the pond's ambient movement continues. Hiding the tab pauses generations. Changing speed preserves the pending family and does not advance a paused generation. Reduced-motion settings suppress ambient movement and shorten the family transition to a static crossfade. No generation runs until requested.

## Duck character

All ducks share one yellow body, a teal outline and an ochre bill, so coral appears only as an allele. The two allele beads sit on the wing. A waterline, ripple ring and soft reflection seat swimming ducks in the water; nest ducklings are drawn dry. Faded background ducks keep their allele beads at full strength. Occasional tail wiggles and head dips are random and cosmetic.

## Earlier runs, tally and mixed ducks

Restarting with the same settings keeps up to 12 earlier frequency trajectories as faint lines (compactly stored, keeping each run's extremes). When an allele fixes, a card reports the generation and the run is added to a tally of fixed outcomes for the current settings; a mark on the tally bar shows the realised starting teal share, which is the expected long-run fraction of teal fixations. Changing the population size or starting share clears the earlier runs and the tally.

A second panel, "Ducks with both colours (heterozygotes)", plots the share of ducks carrying one copy of each allele. Its dashed line is the expectation 2p₀(1 − p₀)(1 − 1/(2N))^(t − 1) for generations t ≥ 1, because each new duck's two copies are independent draws from the previous generation's copies.

## Many ponds

`replicates.js` runs independent copies of the same model side by side. In "Many ponds" mode the visitor chooses 5, 10 or 20 ponds, 6, 12, 24 or 96 ducks per pond, and a starting teal share from 10% to 90%; each pond starts with exactly round(2N × share) teal copies, shuffled. "6 ducks vs 96 ducks" runs three ponds of each size at the chosen share. Ponds run at 10 generations per second, or N/4 per second for larger ponds, until fixation. A summary counts teal and coral fixations, and a bar compares the split of finished ponds with the starting share, which is each pond's probability of teal fixation under this model; with few ponds the split varies around it. Chart lines turn teal or coral when a pond fixes. Each mini pond shows every duck's two beads. Replicates use `DriftModel` directly and share no state with the main pond.

## Validation

Run `node --test tests/genetic-drift.test.cjs tests/duck-family.test.cjs tests/pond-lifecycle.test.cjs`. Seeded numerical checks cover exact starting counts, source-to-offspring inheritance, constant N, absorbing boundaries, conditional means and variances, expected diversity decay, the population-size effect, and fixation probabilities. The browser uses Math.random; deterministic random functions are injected only by tests. These checks verify the specified educational model, not biological realism or research suitability.

Lifecycle tests additionally cover nest cardinality, complete replacement for N = 6, 24 and 500, retained allele data, one mating event per duckling linking its recorded parents, the one-parent case, dozing ducks being exactly the unused parents, the absence of matings in fast playback, panel seats for every copy and duckling, and destinations in the pond centre.

Drawing is capped at 30 frames per second; the generation clock uses elapsed time independently of the drawing rate.

The page generator embeds `illustration.html` inside the shared site shell. Local model and interface scripts and styles remain independent of the shared gallery templates. To edit the page, change the fragment and regenerate with `python3 scripts/build_pages.py`.

## Visitor explanations

Each heart links the two parents of one duckling, or sits over one duck when both copies came from it. Ducks that are never drawn doze off before the ducklings take over, so repeated and absent contributions are both visible.

Under this neutral, finite, constant-size model, an allele's eventual fixation probability equals its realised initial frequency. The explanation uses a 75% example, which is exactly representable at every offered population size, while retaining the rounding note for other percentages. Odds describe repeated runs and do not determine a single outcome.

Comparisons of fixation timing hold the initial frequencies constant. Larger populations have smaller generation-to-generation frequency fluctuations and usually take more generations to reach fixation. The waiting time remains random. Cosmetic swimming speed and wall-clock playback speed do not determine the numerical process.

Primary background: [Tomizawa, 2000, derivation of neutral fixation probability](https://pubmed.ncbi.nlm.nih.gov/10861006/); [Waxman, 2012, fixation times, including the constant-size result](https://pmc.ncbi.nlm.nih.gov/articles/PMC3374318/).
