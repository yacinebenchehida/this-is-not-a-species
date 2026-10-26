# The Petri Dish

[Français](README.fr.md) · [Play the animation](play.html) · [Watch cell division up close](motion.html)

Start two little populations and watch their different futures. One dish receives replenished food; the other has a fixed supply. Cells grow and divide, golden nutrient particles disappear from the limited dish, and a graph follows the population sizes through time.

Change the starting bacteria, division time and food supply, or adjust playback speed. “A little later” advances ten model minutes; “Start again” resets both dishes. Growth settings start a fresh experiment. Equations and assumptions are available under “A little more about these dishes.”

Every character represents one whole cell. Both dishes use the same drawing scale, which decreases as numbers grow so every cell remains visible. The colours and shapes are decorative and have no advantage. At fast speeds some divisions happen between screen refreshes, but all completed divisions are counted and all resulting cells are shown. Reduced motion suppresses drifting and stretching while retaining the population changes.

The curves follow a deterministic exponential or logistic growth rule. Cell positions do not affect division or resources. This is a simplified educational illustration, not a model of a particular bacterial species or a complete laboratory culture. The viewing window ends after four model hours or when the unlimited population reaches 512 cells; exponential growth would continue beyond that window.

Scientific and maintenance details are in [MODEL.md](MODEL.md). The separate character study shows each of eight starting cells dividing once.
