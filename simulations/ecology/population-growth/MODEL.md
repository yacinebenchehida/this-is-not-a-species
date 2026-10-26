# Petri Dish: nutrients and population growth

This educational animation illustrates nutrient uptake, cell growth and division. It compares exact exponential and logistic trajectories with explicit resource bookkeeping; it is not validated research software or a detailed culture simulator.

## Coupled growth and nutrient reserve

Time is in illustrative model minutes. The starting cell count N0 is 4, 8 or 12. The potential doubling time T is 20, 30 or 60 minutes, giving r = ln(2)/T.

- Replenished nutrients: dN/dt = rN; N(t) = N0 exp(rt). The supply is continually renewed and does not constrain growth.
- Finite reserve: dN/dt = rN R/K, dR/dt = -dN/dt, and K = N + R. Thus the coupled nutrient balance gives dN/dt = rN(1-N/K) and N(t) = K/[1+(K/N0-1)exp(-rt)].
- R measures normalized material available for new cell growth. One unit of new cell-equivalent population uses one normalized reserve unit. This is a teaching-scale yield assumption, not a nutrient concentration or fitted biochemical yield.
- The None / Small / Medium / Large / Abundant supply choices initialize R0 to 0 / 24 / 48 / 72 / 96 units. With no nutrients, N is constant until a portion is added; the addition then uses a small 24-unit portion. K = N0 + R0. Supply is never labelled as a number of bacteria in the interface.
- The meter and tray show the remaining reserve relative to all nutrients supplied so far: R(t)/(K-N0), or zero when no nutrients have been supplied. They reflect the same resource state that limits growth. Initial per-capita growth is already slower with a small finite reserve because its rate is rR/K.
- Maintenance consumption, mortality, lag phases, waste, spatial competition and colour-specific growth differences are omitted. The plateau represents negligible growth without modelling birth/death turnover. Real bacterial generation times and nutrient chemistry are not inferred.

## Replenishment

“Add nutrients” supplies one further portion of the selected initial reserve (24, 48, 72 or 96 units; None uses 24, and all additions are capped by the total-reserve limit) to the finite dish at the current model time. The current continuous N, whole-cell count, identities and history are preserved. R and K increase by 24 immediately; the subsequent growth rate increases because R/K increases. The unlimited dish is unchanged.

The exact logistic solution is restarted from the current fractional population at each addition, preserving continuity in N. Each segment retains its time, initial N and K. The graph shows the original trajectory before each addition and its new trajectory afterwards, a vertical nutrient-addition marker and the corresponding stepped support limit. Repeated additions are allowed up to 192 total reserve units. Adding nutrients can extend the initial viewing window by one potential doubling time, bounded by the maximum window below. At the initial pause, “Add nutrients & continue” automatically resumes playback. Additions are disabled only at the maximum observation boundary or reserve limit.

## Whole cells and retained divisions

Each character represents one whole cell. The curves are continuous; one division is completed whenever the curve crosses the next integer. Thus the visible count is the integer part of N(t), up to numerical tolerance. Logistic growth approaches K asymptotically and cannot complete the final division to exactly K in finite time.

Integer-crossing times for n > the current segment’s starting population Ns are:

- Unlimited: ln(n/Ns)/r.
- Finite: ln[n(K-Ns)/(Ns(K-n))]/r for n < K.

A deterministic age queue assigns the next division to an existing parent, replacing it with two retained daughters. There are no stochastic birth or death draws. Daughters retain their parent's decorative colour and shape, which never affect timing. These individual timings illustrate a smooth population law rather than a detailed independent cell-cycle model.

After replenishment, completed events and living cell IDs are preserved and future event times are rebuilt using the new exact segment. Every completion is processed, including events between rendered frames. Fast playback never changes the population or resource equations.

## Illustrated mechanism

The header shows nutrients entering a cell, growth, and two daughter cells. The two scenes use the established rounded cartoon bacterium character and glass dish.

Golden angular parcels represent growth material. The tray fill follows the actual remaining reserve; parcels travel from the tray to actual cells preparing to divide and disappear as they enter. Cell elongation follows the same retained division schedule. Replenishment preserves each existing cell’s illustrated growth progress, then accelerates its future progression; it does not instantaneously stretch the cells. Replenished nutrients visibly arrive from outside the unlimited dish. A few uptake paths are highlighted at a time to keep dense populations readable. Parcels have schematic size and represent uptake, not independently simulated molecules: locations and paths do not determine division times or create additional resource consumption.

Both dishes use the same drawing scale, which decreases with the larger population so all cells remain visible. The characters are not physically shrinking. Dense scenes use cached character drawings; cell counts and events are unchanged. Motion, positions and outlines are cosmetic.

## Buffet, lunchbox and visible cues

The interface calls the replenished dish the “endless buffet” and the finite dish “one lunchbox”; K is named the carrying capacity. These cues are drawn from the same model state and never change it:

- Faces in the lunchbox dish follow each cell's relative division speed, R/K (the factor in dN/dt = rN·R/K): happy above 0.6, peckish above 0.25, hungry below. Peckish and hungry cells are also drawn paler so the cue survives small drawing scales. Buffet cells are always happy. Topping up raises R/K and the faces recover.
- A doubling counter under the buffet dish shows floor(log2(count/N0)) completed doublings and the sequence N0, 2N0, 4N0, … (the last four values once it gets long).
- “The stories split” is the first model time at which the buffet population is 1.25 times the lunchbox population. It is located by bisection within each playback step, so fast playback cannot skip it, and it is marked on the chart and announced once in the caption. Before it, the result line reads “neck and neck”.
- A log-scale switch plots population on a base-2 logarithmic axis with ticks at powers of two, where exponential growth is a straight line.
- Each dish has its own drawing scale, max(0.22, min(1.3, 1.3·sqrt(10/max(10, N)))) for that dish's N, which starts shrinking from 10 cells so dishes never look full. Lunchbox cells can therefore look bigger than buffet cells; the page says so. Space is not limiting in this model. Faces are drawn at least at a readable size.

## Food crumbs

Each crumb is one normalized unit of food, which in this model makes exactly one new cell (dN/dt = −dR/dt). The lunchbox dish always shows K − (whole cells) crumbs, which equals the food left in the model rounded up; top-ups add crumbs. The buffet starts with the same number of free crumbs as the lunchbox (at least 24) and adds a fresh crumb whenever one is taken, so its free crumbs stay constant. A cell that will divide claims the nearest free crumb, swims to it and nibbles it while it grows: the crumb's remaining area is 1 − the cell's progress towards division, and the crumb is removed exactly at the division event. Because a logistic population never quite reaches K, the last crumb is never finished. Above 400 cells, cells stop swimming to crumbs but crumbs are still claimed and removed exactly. Crumb positions and swimming are cosmetic.

## Playback, graph and accessibility

The initial viewing window ends at min(240 minutes, the unlimited trajectory’s crossing time for 512 cells). Nutrient additions can extend it, bounded by min(480 minutes, the unlimited trajectory’s crossing time for 1,024 cells). These observation boundaries are explicitly distinguished from biological cessation of exponential growth. Starting-population, division-time and supply changes reset both dishes. Replenishment acts on the existing finite population without resetting. Playback-speed changes preserve model time. “A little later” advances ten model minutes over about one wall-clock second. Pausing freezes model time and uptake progress while decorative cell movement may continue. Hidden tabs pause playback.

Reduced motion suppresses drifting, travelling parcels, growth stretching and replenishment pulses. Cell replacements, tray fill, meter, counts and graph remain available. Labels, counters and solid/dashed/dotted chart lines do not depend exclusively on colour. All interface and accessible copy is generated in English and French.

The main chart shows both populations on one linear scale; “Inspect the slowdown” shows just the finite population with a closer vertical scale. This is clearly labelled and hides the unlimited key. No future growth curve is revealed; known nutrient-supported limits extend across the viewing window.

## Files and checks

`growth-model.js` owns exact trajectories, reserve accounting, replenishment and retained lineage events. `growth-scene.js` owns character drawing, nutrient illustrations and the small mechanism diagram. `growth.js` owns controls, playback and SVG presentation. `illustration.html` generates `index.html` and `play.html`; French pages are generated using `content/locales/fr.json`. `motion-fragment.html` preserves the isolated cell-division study.

`node --test tests/population-growth.test.cjs` checks equations, crossings, lineage, count/renderer agreement, playback batching, reduced motion, nutrient conservation, continuity and faster growth following additions, repeated additions and preservation of historical trajectories. Existing JavaScript tests and `python3 -m unittest discover -s tests -p 'test_*.py'` check integration and bilingual static routing. These checks verify the specified teaching model, not empirical bacterial realism.
