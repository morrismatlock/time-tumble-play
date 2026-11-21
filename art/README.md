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
