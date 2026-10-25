# The Duck Pond — genetic drift

[Français](README.fr.md) · **[Open the animation](https://yacinebenchehida.github.io/this-is-not-a-species/simulations/population-genetics/genetic-drift/play.html)**

Explore how chance changes the genetic composition of a population. Each duck carries two copies of a gene, shown as turquoise and coral beads. All ducks have the same yellow body; body colour does not represent sex or genotype.

## What to try

1. Press **Play** or **Next generation**. Adjust population size, starting teal share and generation speed.
2. In a small pond, enable **Watch every mating** to follow the parents of each duckling, one pair at a time. Hearts link one duckling's parents; lines and moving beads show the copies it inherits.
3. Watch the gene pool and nest fill the next generation. Duckling counters appear in the detailed mode. Grey sleeping ducks contributed no gene copies this time; this is chance, not poor fitness.
4. Restart with the same settings to retain earlier trajectories as faint lines. The display also tracks ducks with both alleles and the outcomes of completed runs.
5. Use **Many ponds at once** to explore repeated outcomes, or compare 6-duck and 96-duck populations.

The starting share of an allele equals its probability of eventually becoming the only allele left in this neutral model. Larger populations, at the same starting proportions, generally take more generations to reach that point. Outcomes and waiting times vary between runs.

## The model

The population stays at N ducks. Each of the next generation's 2N gene copies is drawn independently, with replacement, from the previous generation. Consequently, some parents and copies contribute several times, while others contribute nothing. Both copies can come from the same parent; sexes are not modelled. There is no selection, mutation or migration. Swimming, hearts and scenery do not affect the draws. Fast-forward skips matings but still calculates each generation.

This is a playful educational implementation of a neutral diploid Wright–Fisher model, not validated research software or a realistic account of duck reproduction.

[Detailed assumptions and validation](MODEL.md) · [Two-parent motion study](MOTION.md)

## For contributors

The numerical rules live in `model.js`; `pond-scene.js` and `duck-character.js` render the pond; `drift.js` manages playback and the main charts; `replicates.js` manages the many-pond comparison. The page source is `illustration.html`.

Run `python3 scripts/build_pages.py` from the repository root to generate both languages. French text lives in `content/locales/fr.json`; generated files under `fr/` should not be edited directly. Run `node --test tests/*.test.cjs` to check inheritance and the animation lifecycle.
