# Web Minecraft

A Minecraft replica that runs entirely in the browser — no build step, no server
logic, no external assets. Terrain, textures, physics and rendering are all
generated in ~1,500 lines of vanilla JavaScript on top of [Three.js](https://threejs.org)
(vendored in `vendor/`).

## Features

- **Infinite procedural terrain** — rolling hills, mountains, beaches, oceans and
  snowy peaks, generated from deterministic fractal value noise and streamed in
  16×96×16 chunks as you walk.
- **Trees** with trunks and canopies that correctly span chunk borders.
- **Break & place blocks** with a 9-slot hotbar (grass, dirt, stone, cobblestone,
  planks, logs, leaves, glass, bricks), block picking with middle click, and a
  target outline.
- **First-person controls** — pointer-lock mouse look, WASD, sprint, jumping,
  gravity, swimming with buoyancy, and a fly mode for building.
- **Voxel physics** — AABB collision against the world, tunnel-proof substepping,
  and DDA raycasting for block targeting.
- **Procedural pixel-art textures** — the whole texture atlas is painted onto a
  canvas at startup; the repo ships zero image files.
- **Day/night cycle** with sky, fog and light level transitions.
- **Creature catching** — 16 procedurally generated original species with
  elemental types (fire, water, grass, electric, rock, ice, bug, spooky) spawn
  in matching biomes. Throw catch-balls (Q or the ◓ button) at them, watch the
  ball shake, and fill your Creature Dex (B). Rarer species are harder to catch.
- **Mobile support** — virtual joystick, drag-to-look, tap to mine/build with a
  ⛏️/🧱 mode toggle, and jump/fly/catch buttons.
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
src/main.js       scene setup, chunk streaming, input, HUD, game loop
src/world.js      noise, terrain/tree generation, chunk storage, edits + saving
src/mesher.js     chunk geometry builder (visible faces only, water surface)
src/player.js     movement, collision, swimming, flying, voxel raycast
src/creatures.js  creature species/AI/meshes, catch-balls, collection
src/blocks.js     block ids and metadata
src/textures.js   procedural texture atlas
vendor/           three.js (r160, MIT — see THREE_LICENSE)
```
