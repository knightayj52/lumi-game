# Storybook character graphics

The two original atlases were produced with the built-in image generation tool. The princess follows the user-approved rose/ivory storybook character; the matching prince has short chestnut hair, a small gold crown, a dusty teal embroidered jacket, cream trousers and brown boots. Both retain the same warm painted materials, proportions and light direction.

## Atlas format

| Asset | Character | Size |
| --- | --- | --- |
| lumi-storybook-walk.webp | Princess | 576 × 540, alpha WebP |
| lumi-prince-walk.webp | Prince | 576 × 540, alpha WebP |

Each atlas has four columns and three rows. Cells are 144 × 180, painted height 160, foot baseline 172. Rows are front/south, right/east, rear/north. Left mirrors right. Four walking phases play at 8 fps; column 1 is used while idle. Figures were cropped and proportionally resized to align their baseline, without redrawing or recoloring the generated artwork.

Prompt summary: match the approved painterly princess quality, preserve identity and clothing between views, create four small walking phases from front/right/rear with alternating legs and opposing arms, transparent background, consistent scale and clear gaps. A correction pass requested clearer passing poses for the prince. This remains a four-frame initial walking cycle, not a finished high-frame-count animation.

## Default behavior and saves

- New games use `avatarStyle: 'storybook'` for both genders. Selection buttons also show the corresponding image.
- `avatarStyle` is saved and validated (`storybook` or `classic`).
- Old saves without a style use storybook only when the outfit is the unmodified starting outfit. Customized old saves keep the classic renderer and all equipped items.
- The wardrobe switches between storybook basic costume and classic individual customization. Changing an individual outfit item selects classic. Ownership, stats and items are retained.
- The painted image is a fixed costume. Clothing/hair/equipment are not yet separated into layers; equipped item visuals are shown in classic mode. The wardrobe explains this distinction.
- Each gender has its own image cache and load/error status. Late loading of the other gender cannot change the chosen character. Failures retain a drawable classic fallback and allow an explicit retry.
- Missing image support does not stop gameplay. No new external image service is requested by the game.

## Validation

`node --test tests/*.test.cjs` covers new defaults, gender selection, independent image loading, style persistence, older save migration, selected clothing preservation, invalid import rejection, retries and four-direction frame selection, alongside gameplay regressions. A Node Canvas animation shows both characters at the same scale with the real game renderer. Actual browser/device checks are still required.
