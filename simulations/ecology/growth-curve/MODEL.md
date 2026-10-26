# Step 4 — The real growth curve

## Current status

Readable chapter, one still dish and a schematic SVG with four coloured, labelled phases. The curve has no numerical time scale and is not model output or data. No culture dynamics, controls or solver have been built. `illustration.html` generates index/play and their French counterparts. Artwork uses the existing bacterium character and dish.

## Proposed illustrative closed-culture model

Track living population N ≥ 0 and remaining substrate S ≥ 0. Use a smooth adaptation factor A(t) to delay strong division, nutrient-dependent division, nutrient use for maintenance and higher mortality under starvation. One possible starting model is:

    A(t) = 1 − exp(−t/tau)
    b(S,t) = A(t) bmax S/(Hs + S)
    m(S) = mmax S/(Hm + S)
    d(S) = d0 + dstarve Hs/(Hs + S)
    dN/dt = [b(S,t) − d(S)] N
    dS/dt = −[b(S,t)/Y + m(S)] N

All rate constants are nonnegative; tau, Hs, Hm and yield Y are positive. N is a living cell-equivalent population; S is a normalized food reserve. b and d have units of inverse model time. Y is new cell-equivalent growth per nutrient unit; m is nutrient use per cell-equivalent per time. The maintenance term consumes substrate without creating new cells. Starvation mortality increases smoothly as S falls; food need not hit a hard zero to trigger decline. Both consumption terms vanish at S = 0, so the boundary does not drive food negative. Dead cells do not automatically regenerate nutrients. Keep discarded biomass/waste separate if a mass balance is later introduced.

No food enters this story. Waste toxicity, oxygen limitation, nutrient recycling, dormancy and species differences are omitted. The smooth adaptation factor is an illustrative lag, not a universal physiological law. At low initial growth, even a slight initial decline is possible if background mortality exceeds division. Choose and document parameters that visibly illustrate adaptation, near-exponential increase, a transient near-stationary period and decline. The stationary period is approximate and transient; this model does not guarantee a long, perfectly flat plateau. Do not force phases using arbitrary population thresholds or claim every bacterium follows the same four-stage timetable.

Only living cells contribute to N and the chart. Mortality does not mean all cells disappear instantly when food becomes scarce. A fade is a visual death cue, not a microscopic claim that dead cells physically vanish. Feeding, if added later as a separate experiment, acts on survivors and does not resurrect dead cells.

## TODO — scene and controls

- [ ] Implement a separate pure numerical model; do not add lag or mortality to step 1's model.
- [ ] One closed dish with a finite starting reserve, recognizable sugar cubes, the same character, and food use for both growth and maintenance.
- [ ] One living-population chart; label lag, exponential, stationary and death phases using both text and colour as they occur. Distinguish a log axis from a linear one if either is introduced.
- [ ] Start with play/pause/reset and a modest choice of starting food/adaptation duration; no feeding challenge in this chapter.
- [ ] Retained division and death events/identities, consistent with the chosen representation from steps 2–3. Separate fading remains from living counts.
- [ ] Reduced-motion presentation, English/French labels and an explanation of the schematic timescale.

## TODO — numerical tests

- [ ] N and S stay finite and nonnegative; S is nonincreasing in the closed system. No food creation from death.
- [ ] At N = 0, no events or consumption; at S = 0, no births or maintenance consumption, while starvation mortality remains defined.
- [ ] Food consumption equals growth demand plus maintenance; one model state drives food, counters and chart.
- [ ] Adaptation suppresses initial division; abundant food and adapted cells approach the prescribed net exponential regime.
- [ ] The chosen illustrative parameters produce the intended sequence of net-rate regimes, including a genuine interval of small net growth before decline; document tolerances.
- [ ] Solver convergence under reduced time steps and event/counter conservation at all playback speeds; no artificial phase switches from frame rate.
- [ ] If future feeding is introduced, it preserves living identities and history and never revives dead IDs.

## Background

[OpenStax, How Microbes Grow](https://openstax.org/books/microbiology/pages/9-1-how-microbes-grow). This is an intentionally illustrative proposal, not a fitted or validated model of any species or experiment.
