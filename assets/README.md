# Storybook princess prototype

`lumi-storybook-walk.webp` is an original character atlas produced with the built-in image generation tool from the user-approved Lumi princess concept. The approved direction is a warm painted storybook character with chestnut twin ponytails, a rose/ivory dress, a gold crown and rose shoes.

Generation prompt summary: preserve the approved character identity and painted fabric/hair detail; create four walking phases for front, right-side and rear views; transparent background, identical proportions, complete bodies, alternating small steps, no scenery or text. A second generation pass requested transparent gutters and consistent cell placement. Cropping and proportional resizing then aligned the twelve figures to one foot baseline; no recoloring or replacement drawing was applied.

- Atlas: 576 × 540, alpha WebP, 4 columns × 3 rows.
- Cell: 144 × 180; painted height 160; foot baseline 172.
- Rows: south, east, north. West mirrors east.
- Columns: four walking phases at 8 fps. Column 1 is used while idle.
- All frames use one image request. Missing or invalid image falls back to the existing renderer.

This is a fixed-outfit preview, not the finished clothing-layer system. Enable it in the princess wardrobe with “동화풍 공주 체험하기”. It is off initially and not written into save data. Choosing wardrobe items ends the preview. Equipment, ownership, stats and purchases keep their original behavior. Prince art is unchanged.

Verification: Node Canvas rendered a direction/motion preview, and `node --test tests/*.test.cjs` checks loading failure, retry, late load, pose selection and unchanged game state alongside the existing regression suite. Browser/device appearance and motion still need playtesting. The four-frame walk is a first prototype; finer gait/arm animation and layered clothes are future work.
