# Illustration assets

Developer reference for the site's artwork.

## Homepage

| Asset | Role |
| --- | --- |
| `butterfly-mule.png`, `favicon.png` | Site mark and browser icon. |
| `hero-landscape.webp` | Atmospheric landscape behind the homepage introduction. |
| `evolution.webp`, `population-genetics.webp`, `ecology.webp`, `genomics.webp`, `bioinformatics.webp` | Homepage theme illustrations. |
| `genetic-drift.webp`, `predator-prey.webp`, `sequencing-zoom.webp` | Homepage featured illustrations. |
| `evolutionary-tree.png` | Retained source artwork; not used as a large page decoration. |

The site mark and tree were extracted from the project's AI-assisted concept sheet. Homepage card illustrations were cropped from its AI-assisted homepage artwork. The panoramic landscape was generated to match that artwork.

## Inner galleries and exhibits

`cartoons/` contains the simpler collection used by the exhibit catalogue and individual preview pages.

- Cartoon WebPs: rounded ducks, moths, butterflies, foxes, rabbits, birds, microbes, plants, a tree and a sequencer. These AI-assisted illustrations share a restrained teal/coral/yellow/green palette, soft outlines and sparse ivory backgrounds. Some related exhibits share an illustration.
- SVG schematics: recombination, inversions, coalescent ancestry, read mapping, assembly, variant calling and fragmented DNA. Regenerate these editable static illustrations with `python3 scripts/build_schematics.py`.
- `content/exhibits.json` maps each exhibit to its artwork. Page titles, descriptions and controls remain HTML text.

Keep characters recognisable and biological differences clear at small sizes. Retain the atmospheric homepage while keeping inner-page artwork simple. These are preview illustrations, not implemented simulations or numerical results.
