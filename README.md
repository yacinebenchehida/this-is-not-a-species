# This is not a species.

A personal illustrated playground for evolution, population genetics, ecology, genomics and bioinformatics.

**Live website: https://yacinebenchehida.github.io/this-is-not-a-species/**

GitHub Pages is active and publishes the committed static files from `main`.

## Current state

The illustrated homepage, five theme galleries, About page and three simulation preview pages are in place. The homepage uses artwork extracted from the approved reference, the original butterfly–mule logo, a separate multicoloured evolutionary tree, and a matching landscape prepared for live HTML content. All three simulations are explicitly **Coming soon**; none is implemented yet.

## Structure and editing

- `index.html` — homepage, real HTML headings, links and cards.
- `about/` — project philosophy and limitations.
- `simulations/<theme>/` — five galleries.
- `simulations/<theme>/<exhibit>/` — independent exhibit folders.
- `shared/styles.css` — palette, typography, responsive layouts and shared components.
- `shared/app.js` — progressive mobile navigation, including Escape to close.
- `assets/illustrations/` — optimized artwork and provenance notes.
- `assets/fonts/` — self-hosted La Belle Aurore and its SIL Open Font License.
- `scripts/build_pages.py` — optional standard-library Python helper generating the current static pages from shared header/footer and content definitions. After editing its templates, run `python3 scripts/build_pages.py` and commit the resulting HTML. GitHub Pages requires no build command or Python runtime.
- `AGENTS.md` — guidance for future AI development.

Plain HTML/CSS/JavaScript; no framework, package installation, backend, tracking, or external font request. Relative paths support the existing GitHub Pages project URL. Locally, serve the repository with a static HTTP server. Mobile cards reflow, navigation collapses, keyboard focus remains visible and reduced-motion preferences are respected.

Keep the approved art direction: warm ivory, dark navy, coral and botanical teal; handwritten site name and serif headings; compact illustrated galleries. The hero contains the smaller evolutionary tree, while the butterfly–mule remains the official header/footer mark. The landscape is a separate image, never a screenshot of a complete interface.

## Adding an exhibit

Give each simulation its own folder and maintain its numerical model and UI independently. Link galleries to that shared folder rather than duplicating a simulation across themes. Update the content definitions/templates or write an independent page using the existing shared styles and navigation. Keep a preview labelled Coming soon until a working interaction is present. Future scientific models need documented assumptions and automated numerical sanity checks before publication.

## Limitations

A hobby project using AI-generated or AI-assisted code and artwork. The underlying code has not undergone independent human review. Applications are intended for illustrative and educational exploration rather than scientific research. No institutional affiliation is claimed.
