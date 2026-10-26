# The Petri Dish

[Français](README.fr.md) · [Meet the bacteria](motion.html)

The character and movement preview shows eight illustrated cells elongating, constricting and dividing into sixteen daughter cells. Start, pause, change the tempo or replay the story. The full comparison of exponential growth and growth limited by resources is **coming soon**.

The characters follow the site's Petri Dish illustration: rounded silhouettes, teal outlines, dot eyes and soft coral, yellow and turquoise shading. Shapes and colours are decorative; they do not encode different growth rates, species or advantages. Small movements suggest a schematic liquid medium. Reduced-motion settings suppress drifting, blinking and stretching, showing each completed division as a replacement instead.

This short sequence is a visual study, not an exponential or logistic growth model. Every founding cell divides once on a fixed schedule. Each rendered cell is one cell in this story; the displayed count increases by one only when a division finishes. Positions and tempo do not change the sequence. There is no mortality, inheritance sampling or nutrient calculation.

## Maintenance

`division-model.js` owns the retained division schedule, `bacterium-character.js` draws the characters, `dish-scene.js` owns scenery and movement, and `motion.js` owns playback. `illustration.html` is the English source fragment for `motion.html`. Regenerate both languages with `python3 scripts/build_pages.py`; never edit `fr/` output directly.

Run `node --test tests/bacteria-division.test.cjs` for checks of counting, division boundaries, replay and tempo-independent final state. These checks concern the teaching sequence, not research validation.
