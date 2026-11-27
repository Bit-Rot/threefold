# Threefold

A lane-battler roguelite built with Three.js. Both sides draw five fresh cards each turn and play into their own sides of three lanes. Cards reveal at the end of the turn. Each of the eight stages starts with a shared battle. Then choose one of two paths with two nodes apiece that lead to the same boss. Build your deck during the run and unlock content between runs.

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
- 5 available starter decks, 44 relics, 11 gems, 21 locations, 15 Home-lane upgrades
- 11 regular opponents and 8 bosses with distinct rules
- 24 replayable levels unlocked in order by beating their bosses, alongside the eight-boss run
- 74 achievement unlocks, including 49 individual cards, and 8 Heat tiers for full runs
- Main-menu Perk Shop for permanent skips, rerolls, banishes and scouting
- All art is procedurally painted at runtime (`src/art/painter.js`) — no image assets.

Cards start with one socket. Gem nodes and shops socket gems directly into a compatible card and offer Evo Gems only when you have a base card and its catalyst. The Evo Gem and catalyst are spent as soon as you confirm the evolution. Fuse nodes combine duplicate cards, and Campfires refill your hearts.

## Layout
- `src/engine/` — DOM-free rules (battle, run/map/shop/forge)
- `src/data/` — all content definitions
- `src/art/` — procedural painters and card renderer
- `src/three/` — 3D battle board and menu backdrop
- `src/game.js` — screens, input and flow
- `tools/` — simulation and screenshot scripts
