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
- The wardrobe switches between storybook basic costume and classic individual customization. Changing an individual outfit item selects classic, except basic/sky costumes, butterfly wings and removing wings, which retain the current style. Ownership, stats and items are retained.
- Each painted character atlas is a complete costume. Basic and sky outfits now have dedicated atlases. Clothing and hair are not yet separated into layers. Butterfly wings are a separate painted equipment layer; other equipped item visuals are shown in classic mode. The wardrobe explains this distinction.
- Each gender has its own image cache and load/error status. Late loading of the other gender cannot change the chosen character. Failures retain a drawable classic fallback and allow an explicit retry.
- Missing image support does not stop gameplay. No new external image service is requested by the game.

## Validation

`node --test tests/*.test.cjs` covers new defaults, gender selection, independent image loading, style persistence, older save migration, selected clothing preservation, invalid import rejection, retries and four-direction frame selection, alongside gameplay regressions. A Node Canvas animation shows both characters at the same scale with the real game renderer. Actual browser/device checks are still required.

## Butterfly equipment layer

`lumi-butterfly-wings.webp`: 768 × 192 alpha WebP, three 256 × 192 cells (front, right, rear). Both genders share this optional asset. The side attachment is aligned to the character back; left mirrors the complete composite. Front/side draw wings behind the character and rear draws them on the back, with gentle horizontal flutter. Original character pixels are unchanged.

Produced with the built-in image tool using the princess as a style reference. Prompt: isolated wearable butterfly wing pair, pearly ivory/blush pink with delicate golden veins, three front/right/rear views, painted storybook materials, transparent background, no character/text/shadows. Mechanical alpha-bound cropping and proportional resizing pack the generated parts into the atlas; no recoloring or procedural replacement artwork.

Existing level-5 ownership, prices, charm and save fields are retained. Selecting/removing wings saves immediately. The asset loads lazily once for both genders. Missing/invalid images use the complete classic character with its equipped wings, retain the saved style, and expose an explicit retry in the wardrobe. Successful late loading cannot re-equip removed gear. Other wings still select classic mode. Further outfits, independent hair and other equipment layers remain future work.

## Sky costume variants

`lumi-princess-sky-walk.webp` and `lumi-prince-sky-walk.webp` use the same 576 × 540 / 144 × 180 cell format and foot baseline as the basic atlases. These are complete painted costume variants rather than separate clothing cutouts. The existing `dress: 'sky'` selects the matching gender atlas; `pink` selects the original basic character. Unsupported dresses retain the existing classic selection behavior. A player who explicitly selected classic keeps that preference when choosing a supported costume and can switch back using the wardrobe button.

Both images were created with the built-in image tool as edits of their corresponding basic atlas. Prompt: change only the dress/jacket to light sky blue silk with ivory and warm gold details, preserve character identity, hair, crown, ribbons, shoes/trousers, 4 × 3 direction/pose order, and actual transparency. Cropping and proportional resizing standardize each frame to 160 px painted height. As generated variants, fine details can vary slightly; these are not pixel-identical palette swaps.

Sky clothing still comes from the existing bear quest, costs no new currency, and retains its +3 charm. No ownership grants or game-balance changes were added. Wardrobe entries mark supported outfits. Outfit selection now saves immediately. Costume caches are separate by gender and outfit; sky loads only when selected/rendered, retries target the selected variant, and late responses never modify player state or the basic start-screen portraits. Butterfly wings work on either costume.

Automated tests additionally cover reward locking, actual wardrobe selection, immediate persistence, retained wings and stats, gender/costume load races, selected-variant retries and classic preference. Node Canvas preview compares basic and sky outfits, walking directions, and sky plus wings. Real browser/mobile validation remains pending.

## Wardrobe release polish

Storybook mode shows illustrated cards for supported costumes and butterfly wings, with acquisition requirements. Other customization appears after explicitly switching to classic, preventing an unexpected style change from an ordinary selection. Mode changes rebuild the wardrobe without opening extra modals. Costume/wing buttons use click activation so keyboard activation and scrolling do not equip items on initial pointer contact. If the main image cannot load, the retry control is accompanied by a classic-mode escape button. The browser environment blocks local file URLs; public GitHub Pages is the target for post-deployment browser checks.

## Full wardrobe and world artwork (2026-09-20)

The storybook renderer now uses independent body, head, equipment and wing layers.
All 79 existing wardrobe entries use their original keys, ownership, prices,
reward conditions and bonuses. Selecting equipment no longer changes avatarStyle.
Dresses and shoes use material recoloring; rainbow and star/legend variants include
bands or embroidery. Hair color changes exclude the face, eyes and neck. These are
color/pattern variants of the two base clothing silhouettes, not 17 different cuts.
Headgear uses painted 2D overlays; body animation has four frames per direction.

New assets (WebP with alpha unless noted):
- modular-{girl,boy}-body.webp: 576×540; 4 walking frames × 3 views; 144×180 cells.
- modular-{girl,boy}-heads.webp: 432×1080; front/right/back × six hairstyle rows.
- modular-accessories.webp: 768×1344; 192px cells, ACCS order then wand and gloves.
- modular-wings.webp: 768×2112; 256×192 cells; front/right/back × WINGS order.
- storybook-pets.webp: 1024×3840; 256px cells, 60 species in PETSPEC order.
- storybook-furniture.webp: 1024×1280; 256px cells in FURN order; bottom baseline 254.
- storybook-room.webp: 1152×896, opaque. Source wall ends at y=316; game maps it to
  2 tiles, floor to 5 tiles. Existing wallpaper/floor choices tint the painted room.
- storybook-world.webp: 768×1024; 256px cells: fir, oak, cherry tree, palm, tulips,
  mushrooms, cherry bush, ice flower, castle, cottage, easel, exit door.

Furniture is rendered at its actual floor contact point, with a low contact shadow.
Floor rugs are below furniture. Furniture in front of the player is drawn afterward.
The room editor, furniture shop, capture dialog and pet collection show atlas thumbnails.
Most animal quest NPCs share matching painted species art; human NPCs use separate painted atlases. Other regional scenery remains mixed
vector/painted artwork.

Image creation: built-in image generation, followed by mechanical atlas extraction,
connected-component sprite separation, scaling and WebP packing. Prompts requested
high-quality hand-painted storybook sprites, transparent backgrounds, consistent
upper-left lighting, and independent atlas cells. Character prompts requested body-only
sky-blue/ivory costumes and six chestnut hairstyles in three views for each gender.
Equipment prompts listed the existing ACCS and WINGS entries in order. Animal prompts
listed all 60 PETSPEC species in three groups of 20. Furniture prompts listed all 20
FURN objects in their existing order, with visible feet and no floating cast shadows.
The room prompt requested an empty pink/ivory royal bedroom with warm oak flooring.
Nature prompts requested four trees, four forage plants, castle, cottage, easel and door.

Validation: 37 automated tests cover persistence, controls, purchases, reward locks,
all wardrobe categories, atlas mapping, direction/layer order, failure/retry and furniture
anchors. Native Canvas visual QA covered both genders, all hairstyles and accessories,
material colors, legendary equipment, wings, pets and the furnished room.

Additional assets: storybook-npcs.webp (512×1024, eight 256px cells for five regional people, blue bird, star spirit and queen); storybook-residents.webp (1024×512, HUMANS order); storybook-terrain.webp (1024×1024, four 512px quadrants: grass, earth, water, snow). Built-in generation prompts specified existing roles and clothing, full-body isolated sprites, and low-contrast watercolor terrain materials. Hand equipment uses per-gender/per-direction/per-frame contact anchors.
