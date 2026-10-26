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

The exact logistic solution is restarted from the current fractional population at each addition, preserving continuity in N. Each segment retains its time, initial N and K. The graph shows the original trajectory before each addition and its new trajectory afterwards, a vertical nutrient-addition marker and the corresponding stepped support limit. Repeated additions are allowed up to 192 total reserve units. There is no elapsed-time cutoff. Nutrient additions remain available after any elapsed time, up to the explicit 192-unit total nutrient-addition allowance. Replenishment resumes a run stopped at 5% food and otherwise preserves play/pause state; it does not reset the clock or population. The addition-limit message names the interface limit rather than claiming the remaining reserve is full.

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
- Each dish has its own drawing scale, max(0.5, min(1.3, 1.3·sqrt(10/max(10, N)))) for that dish's N (crowded dishes overlap; counts stay exact), and every cell's whole body, including a dividing cell's length, is kept inside the liquid, which starts shrinking from 10 cells so dishes never look full. Lunchbox cells can therefore look bigger than buffet cells; the page says so. Space is not limiting in this model. Faces are drawn at least at a readable size.

## Sugar cubes

Each sugar cube (crumb in the code) is one normalized unit of food, which in this model makes exactly one new cell (dN/dt = −dR/dt). The lunchbox dish always shows K − (whole cells) crumbs, which equals the food left in the model rounded up; top-ups add crumbs. The buffet starts with the same number of free crumbs as the lunchbox (at least 24) and adds a fresh crumb whenever one is taken, so its free crumbs stay constant. A cell that will divide claims the nearest free crumb and swims towards it. Newborn cells start with a closed mouth and no cube. Before the retained division time, a wall-clock feeding sequence anticipates, opens wide, holds the whole cube inside the mouth, snaps shut, and gives a satisfied reaction. The opening uses the character's own face coordinates; the full-size cube is drawn behind the body and inside the mouth clip, beneath the teeth. A short lunge and movement of the cube bring them together. The take lasts up to 1.8 seconds and shortens for crowded dishes or imminent births; it never delays a numerical division. Daughter faces emerge after the gulp. A small comic “Gulp!” appears in dishes of up to 40 cells. The cube is removed from the count at the division event. The buffet keeps its visible food supply after its drawing limit is reached. Because a logistic population never quite reaches K, the last crumb is never finished. Above 250 cells, detailed feeding poses are skipped; above 400 cells, cells also stop swimming to crumbs. Crumbs are still claimed and removed exactly. Crumb positions and swimming are cosmetic.

## Playback, graph and accessibility

Each run automatically pauses at 5% of all nutrients supplied to the lunchbox. For a current total K − N0, the stopping population is `K − 0.05(K − N0)`. Its exact time is computed with `crossing` from the latest trajectory segment, and frame advances clamp to that time. This is a labelled near-depletion threshold: the logistic reserve reaches zero only asymptotically. A refill recomputes the resource-based stopping time, preserves the current clock, population and history, and resumes a finished run. A refill during a manually paused run preserves that pause. There is no fixed 240/480-minute ceiling. With no food supplied, the lunchbox stays empty and does not trigger a false 5% completion; the buffet can still be explored.

The buffet's retained drawing schedule ends at 512 cells. Its picture is updated at min(model time, the exact crossing time of 512), while its characters keep moving. Its displayed population is calculated from the uncapped exponential equation at the shared clock, independently of those drawing events. The counter rises to 1,000,000 and then shows “1,000,000+”, explicitly a lower bound. Its graph stops at the 512 crossing with an onward arrow, never a false flat population segment. The time axis expands as needed. The lunchbox uses the full clock and represents every whole cell. Its 192-unit total nutrient-addition allowance bounds the number of visible cells below 205. Exhausting that allowance disables further additions with a clearly named interface limit; it does not cause an early pause while food remains.

At completion the play button is disabled, the meter reads 5%, and the caption explains that the last traces take increasingly long to consume. The refill button resumes the same population whenever another portion is allowed. “Less than 1%” remains the label for a trace reserve if such a state is observed, rather than rounding a nonzero reserve to 0%.

Starting-population, division-time and supply changes reset both dishes. Playback-speed changes preserve model time. Drawing positions and animation limits do not change the lunchbox resource equations or retained division history.

Reduced motion suppresses drifting, travelling parcels, growth stretching and replenishment pulses. Cell replacements, tray fill, meter, counts and graph remain available. Labels, counters and solid/dashed/dotted chart lines do not depend exclusively on colour. All interface and accessible copy is generated in English and French.

The main chart shows both populations on one linear scale; “Inspect the slowdown” shows just the finite population with a closer vertical scale. This is clearly labelled and hides the unlimited key. No future growth curve is revealed; known nutrient-supported limits extend across the viewing window.

## Files and checks

`growth-model.js` owns exact trajectories, reserve accounting, replenishment and retained lineage events. `growth-scene.js` owns character drawing, nutrient illustrations and the small mechanism diagram. `growth.js` owns controls, playback and SVG presentation. `illustration.html` generates `index.html` and `play.html`; French pages are generated using `content/locales/fr.json`. `motion-fragment.html` preserves the isolated cell-division study.

`node --test tests/population-growth.test.cjs` checks equations, crossings, lineage, count/renderer agreement, playback batching, reduced motion, nutrient conservation, continuity and faster growth following additions, repeated additions and preservation of historical trajectories. Existing JavaScript tests and `python3 -m unittest discover -s tests -p 'test_*.py'` check integration and bilingual static routing. These checks verify the specified teaching model, not empirical bacterial realism.
