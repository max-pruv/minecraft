# Web Minecraft

A Minecraft replica that runs entirely in the browser — no build step, no server
logic, no external assets. Terrain, textures, physics and rendering are all
generated in ~1,500 lines of vanilla JavaScript on top of [Three.js](https://threejs.org)
(vendored in `vendor/`).

## Features

- **Infinite procedural terrain** — rolling hills, mountains, beaches, oceans and
  snowy peaks, generated from deterministic fractal value noise and streamed in
  16×160×16 chunks as you walk. The sky reaches 160 blocks so landmarks can be
  built at something close to their real proportions; the ground is capped
  independently at 80 so raising the ceiling never shifts a saved world.
- **Trees** with trunks and canopies that correctly span chunk borders.
- **Break & place blocks** — 31 block types: terrain blocks, sandstone, gravel,
  mossy cobble, three wood tones, ice, gold, diamond, obsidian, bookshelf, six
  wool colors, and four half-slabs (with true half-height physics — perfect for
  stairs and terraces). A customizable 9-slot hotbar plus an inventory (E or 🎒)
  to pick any block; middle click grabs the targeted block.
- **First-person controls** — pointer-lock mouse look, WASD, sprint, jumping,
  gravity, swimming with buoyancy, and a fly mode for building.
- **Voxel physics** — AABB collision against the world, tunnel-proof substepping,
  and DDA raycasting for block targeting.
- **Procedural pixel-art textures** — the whole texture atlas is painted onto a
  canvas at startup; the repo ships zero image files.
- **Day/night cycle** with sky, fog and light level transitions.
- **Creature catching** — 32 procedurally generated original species with
  elemental types (fire, water, grass, electric, rock, ice, bug, spooky) spawn
  in matching biomes. Throw catch-balls (Q or the ◓ button) at them, watch the
  ball shake, and fill your Creature Dex (B). Rarer species are harder to catch.
- **Mobile support** — virtual joystick, drag-to-look, tap to mine/build with a
  ⛏️/🧱 mode toggle, and jump/fly/catch buttons.
- **Friendly NPCs** — Marlon, a kid in a striped sailor shirt who follows you
  around and chats in French, and Professeur Cornichon, the creature expert.
- **Educational mode** (always on — it cannot be disabled) — Professeur
  Cornichon's quiz starts every play session, and pops up again after each
  4 minutes of play: US first-grade math, English, and French questions
  (fill-in-the-blank, spelling, word problems, translations…). 5 correct
  answers earn 4 minutes of play, with star progress, confetti celebrations,
  and questions that avoid repeating. Refreshing the page doesn't skip the
  quiz — it just brings it right back. The 🎓 button shows today's play time,
  every correct answer, and past days — all saved in the browser
  (localStorage).
- **Adaptive difficulty** — every skill (additions, spelling, conjugaison…)
  tracks its own success history: 80%+ right levels it up, 40%- levels it
  down. Math starts at level 2 (two-digit numbers) and climbs to hundreds;
  English and French unlock harder word banks. Current levels show in the
  🎓 panel.
- **Random-clicking protection** — instant clicks are ignored, and a pattern
  of fast wrong answers triggers a warning, then a 10-second freeze that adds
  an extra required correct answer.
- **Daily hard stop** — after 45 minutes of cumulative play in a day, the game
  locks. Unlocking another 45-minute block takes either the parental code or
  a 20-correct-answer marathon quiz. Repeatable; survives refreshes since play
  time is persisted.
- **Fully offline** — the game is an installable PWA: open it once online,
  add it to the home screen (iPhone/iPad: Share → Add to Home Screen), and it
  runs entirely offline afterwards. When releasing changes, bump
  `CACHE_VERSION` in `sw.js` so installed clients update.
- **Persistence** — your block edits and creature collection are saved to
  `localStorage` and restored on reload (terrain is deterministic, so only the
  diff is stored).

## Run it

The game is a static site, but it uses ES modules, so it must be served over HTTP
(opening `index.html` directly from disk won't work):

```bash
# from the repo root — pick whichever you have:
python3 -m http.server 8000
# or
npx serve .
```

Then open <http://localhost:8000>.

It also works out of the box on **GitHub Pages**: enable Pages for this repo
(Settings → Pages → deploy from the `main` branch, root folder) and play at
`https://<user>.github.io/minecraft/`.

## Tests

The shared-world code is exercised by real browsers playing together, against a
local signalling server — no build step, no external service:

```bash
cd tests
npm install
npm test
```

It takes about forty-five minutes, on purpose. Seven suites run one after the
other — never in parallel, since two browsers fighting over four cores produce
failures that don't exist in the game — and the waits have to outlast the
game's own thresholds (twenty seconds of silence before a link is cut) or they
would prove nothing. Each verdict is written to disk as it lands, so a crashed
or recycled container costs one suite rather than the whole run;
`npm test -- --depuis-zero` forces a full replay.

See `tests/README.md` for what each scenario reproduces — every one of them is
a failure that actually happened to the children playing — and `CLAUDE.md` for
the invariants a change must not break.

## Controls

| Input | Action |
| --- | --- |
| W A S D | Move |
| Mouse | Look around |
| Left click (hold to repeat) | Break block |
| Right click | Place block |
| Middle click | Pick targeted block |
| Space | Jump / swim up |
| Shift | Sprint |
| 1–9 or mouse wheel | Select hotbar slot |
| F | Toggle fly mode (Space up, C down) |
| Q | Throw a catch-ball at a wild creature |
| B | Open the Creature Dex |
| Esc | Pause |

On touch devices: left thumb summons a joystick, right thumb looks around,
tap mines or builds (⛏️/🧱 button toggles which), and the on-screen buttons
handle jumping, flying, and throwing catch-balls.

## Code layout

```
index.html        page shell, HUD, styles
CLAUDE.md         invariants, release procedure, and the traps that cost time
src/main.js       scene setup, chunk streaming, input, HUD, game loop
src/world.js      noise, terrain/tree generation, chunk storage, edits + saving
src/mesher.js     chunk geometry builder (visible faces only, water surface)
src/player.js     movement, collision, swimming, flying, voxel raycast
src/blocks.js     block ids and metadata
src/textures.js   procedural texture atlas

  the shared world
src/net.js        sessions, peers, presentation, edit log, reconnection
src/relaisnuage.js  cloud relay: a PeerJS-shaped pipe through the database
src/cloud.js      Supabase calls: world saves, profiles, relay, presence
src/sync.js       whole-profile portability, keyed by first name
src/visio.js      camera tiles and sound, split so autoplay can't mute both

  who lives there
src/creatures.js  creature species/AI/meshes, catch-balls, collection
src/animals.js    passive animals, spawning, the mount you can climb
src/montures.js   the eight rideable beasts and the height of their backs
src/marlon.js     friendly NPCs (Marlon the companion, Professeur Cornichon)
src/vie.js        city life; src/vehicules.js  métro trains and F1 cars

  the places
src/paris.js src/manhattan.js src/sanfrancisco.js src/nice.js src/lille.js
src/chine.js src/pole.js src/espace.js src/gaulois.js src/villandry.js
src/aeroport.js src/circuit.js src/ville.js src/parc.js src/voies.js

  learning and parents
src/education.js  quiz bank, adaptive difficulty, stats, persistence
src/identity.js   face signatures (never photos) and the hashed parent code
src/admin.js      the parent space

vendor/           three.js (r160, MIT — see THREE_LICENSE)
```
