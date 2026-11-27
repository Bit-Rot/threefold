# Threefold

A lane-battler roguelite built with Three.js. Both sides draw five fresh cards each turn and play into their own sides of three lanes. Cards reveal at the end of the turn. Before each of eight bosses, choose one of two paths with two nodes apiece. Build your deck during the run and unlock content between runs.

## Play
- `npm install`
- `npm run dev` — local dev server
- `npm run build` — production build in `dist/`
- `npm test` — battle, route, gem, and save regression checks
- `npm run sim` — headless balance/crash simulation (greedy bot plays full runs)

## Deploy (GitHub Pages)
Push to `main`. The workflow in `.github/workflows/deploy.yml` builds and publishes `dist/`.
In the repo settings, set **Pages → Source** to **GitHub Actions** once.

## Content
- 90 cards + 12 evolutions (base + catalyst + Evo Gem), 6 tribes
- 5 wardens, 44 relics, 11 gems, 21 locations, 15 Home-lane upgrades
- 11 regular opponents, 5 elites, 8 bosses with distinct rules, and 12 events
- Meta progression (the Archive) with 31 unlocks and 8 Heat levels
- All art is procedurally painted at runtime (`src/art/painter.js`) — no image assets.

Gem nodes and shops socket gems directly into a compatible card. A Forge can bore an empty socket, fuse duplicates, or evolve a card that already has an Evo Gem.

## Layout
- `src/engine/` — DOM-free rules (battle, run/map/shop/forge)
- `src/data/` — all content definitions
- `src/art/` — procedural painters and card renderer
- `src/three/` — 3D battle board and menu backdrop
- `src/game.js` — screens, input and flow
- `tools/` — simulation and screenshot scripts
