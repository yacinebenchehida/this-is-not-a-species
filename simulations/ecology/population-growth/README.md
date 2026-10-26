# The Petri Dish

[Français](README.fr.md) · [Play the animation](play.html) · [Cell division up close](motion.html)

Watch nutrients enter cells, help them grow and enable division. One dish is an endless buffet: food keeps arriving. The other has one lunchbox of food that gets used up, so growth slows down and levels off at the carrying capacity. The lunchbox cells' faces go from happy to peckish to hungry as food runs short. Golden angular parcels represent nutrients, and the colourful characters represent bacteria.

Change the starting bacteria, potential division time or nutrient supply. Supply is described as None, Small, Medium, Large or Abundant. With no nutrients, the limited cells wait until you supply some. “Top up the lunchbox” feeds the existing population without resetting it, so you can see growth pick up again. A doubling counter follows the buffet dish, the chart marks the moment the two stories split, “Inspect the slowdown” gives a closer view of the lunchbox population, and a log scale turns steady doubling into a straight line.

Every character is one whole cell. Each dish draws its cells smaller as its own population grows, so lunchbox cells can look bigger than buffet cells. Sugar cubes are the food: one cube makes one new cell. The lunchbox shows exactly the food left; the buffet replaces every cube that is taken. Cells swim to a cube, open wide and crunch it in three bites as they grow; the last bite comes as they divide. Shapes and colours are decorative. Fast playback preserves every division count and the same resource rules. Reduced motion retains static nutrient-reserve illustrations, counts and curves while suppressing travelling parcels and stretching.

Play, pause, reset, or change playback speed. Changing starting conditions restarts both populations; topping up the lunchbox preserves them. The first view pauses after four model hours or at 512 cells in the buffet dish. Topping up can continue the story, up to eight model hours or 1,024 cells. The end of a viewing window is not a biological stop to growth.

The optional explanation includes exponential and logistic equations and their assumptions. Nutrient use is explicitly coupled to growth, but the parcels and their paths are schematic representations rather than independently simulated molecules. This is an educational illustration, not a particular bacterial species or a complete laboratory culture. See [MODEL.md](MODEL.md) for the stated rules and checks.
