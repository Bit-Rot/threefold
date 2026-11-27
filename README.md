# Threefold

A lane-battler roguelite built with three.js. You and an AI opponent play cards into your own sides of three lanes; cards reveal at end of turn, Energy equals the turn number, and you win by taking 2 of 3 lanes after 6 turns. Build your deck across a branching three-act run and unlock new content between runs.

## Play
- `npm install`
- `npm run dev` — local dev server
- `npm run build` — production build in `dist/`
- `npm run sim` — headless balance/crash simulation (greedy bot plays full runs)

## Deploy (GitHub Pages)
Push to `main`. The workflow in `.github/workflows/deploy.yml` builds and publishes `dist/`.
In the repo settings, set **Pages → Source** to **GitHub Actions** once.

## Content
- 90 cards + 12 evolutions (base + catalyst + Evo Gem), 6 tribes
- 5 wardens, 44 relics, 11 gems, 21 locations, 15 Home-lane upgrades
- 11 AI opponents with their own decks, 5 elites, 3 rule-breaking bosses, 12 events
- Meta progression (the Archive) with 31 unlocks and 8 Heat levels
- All art is procedurally painted at runtime (`src/art/painter.js`) — no image assets.

## Layout
- `src/engine/` — DOM-free rules (battle, run/map/shop/forge)
- `src/data/` — all content definitions
- `src/art/` — procedural painters and card renderer
- `src/three/` — 3D battle board and menu backdrop
- `src/game.js` — screens, input and flow
- `tools/` — simulation and screenshot scripts
