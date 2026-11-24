# Painted art slots

Images in this folder listed in `manifest.json` replace the code-drawn versions at boot (loaded as
`art_<key>`). Anything missing or failing to load falls back to the drawn art. These files are made by
`scripts/process-art.mjs`; see `docs/ART_PROMPTS.md` for the whole pipeline and the prompts.

Keys (i = era 0-7: jungle, desert, medieval, 18th century, industrial, present, neon, end of time):
- `sky{i}`       full sky painting, any size (shown at 1280 x 906)
- `far{i}`       distant skyline strip, transparent, tiles horizontally (shown 360 px tall)
- `hillsMid{i}`  middle layer, transparent, tiles horizontally, exactly 360 px tall (used at its own size)
- `near{i}`      closer skyline strip, transparent, tiles horizontally (shown 360 px tall)
- `mat{i}`       256 px seamless material; fills the code-drawn ground, blocks and hills (`src/envArt.ts`)
- `prop{i}_tall`, `prop{i}_block`, `prop{i}_wide`  big obstacles, transparent, stretched to the obstacle's box
- `decor{i}_{k}` (k 0-3) decorations behind the track, transparent, sized to the old drawn boxes (v0.13)
- `brk{i}`       breakable object, transparent, drawn per crate cell under the code's gold rim/cracks (v0.13)
- `pad{i}`       launch-pad mushroom, transparent (v0.13)
- `ledge{i}`     ledge slab strip, transparent, 52 px tall, 3-sliced to any width (v0.13)
- `cave{i}`      256 px seamless cave wall (v0.13)
- `frame_a`      menu panel frame for the nine-slice panel (spares `frame_b` vines, `frame_c` brass stay in art-src)
- `lip{i}`       walkable ground edge strip (v0.15), 72 px tall at 2x, walking line 16 px from the top, tiles
                 horizontally; drawn at half size by the ground edge, block tops and hill curves (`src/envArt.ts`)
- `cloud`        cloud-garden ledge slab (v0.15), 3-sliced, drawn CLOUD_LIFT px higher (puffs above the flat top)
