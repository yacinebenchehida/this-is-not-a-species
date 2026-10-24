# Instructions for AI coding assistants

This is a personal, playful, non-research science illustration website. Prioritise attractive visuals, delightful animations, accessibility, maintainability, and correctness of stated scientific assumptions.

## Architecture
- Static GitHub Pages site. Plain HTML, CSS, vanilla JavaScript first.
- No backend, accounts, tracking, or build pipeline.
- One theme folder per scientific discipline under `simulations/`.
- Each simulation should have its own folder, files and explicitly documented model assumptions.
- Keep navigation, colours and reusable styling in `shared/`; avoid breaking existing pages.
- Use relative URLs so site works at GitHub Pages project subpath.
- Do not add heavy dependencies without a clear reason.

## Scientific integrity
- These are playful illustrations, not validated research software.
- Explain whether animated organisms are actual agents or just representations of numerical dynamics.
- Provide automated numerical sanity checks for each implemented scientific model.
- Never describe a placeholder or illustrative animation as a validated scientific simulation.

## Collaboration
- Human owner tests functionality, scientific behaviour and aesthetics, not source code line by line.
- Make small, reversible commits; don't change unrelated simulations.
- Preserve visual consistency with the homepage.
- Clearly distinguish complete features from placeholders.
- Design mobile layouts and respect reduced-motion settings.
