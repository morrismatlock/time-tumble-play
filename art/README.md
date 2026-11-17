# Painted art slots

Drop PNG files in this folder and list them in `manifest.json`; the game uses them instead of
the code-drawn versions. Anything missing just falls back to the drawn art.

Keys (i = era 0-7: jungle, desert, medieval, 18th century, industrial, present, neon, end of time):
- `sky{i}`   full sky painting, any size (shown at 1280 x 610)
- `far{i}`   distant skyline strip, transparent PNG, tiles horizontally (shown 360 px tall)
- `near{i}`  closer skyline strip, transparent PNG, tiles horizontally (shown 360 px tall)
- `prop{i}_tall`, `prop{i}_block`, `prop{i}_wide`  big obstacles, transparent PNG (tall ≈ 1:2, block ≈ 1:1, wide ≈ 2:1)

manifest.json example: { "sky0": "sky0.png", "near0": "near0.png", "prop0_wide": "stegosaurus.png" }
