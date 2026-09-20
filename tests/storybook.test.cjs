const {test}=require('node:test');
const assert=require('node:assert/strict');
const {setup}=require('./harness.cjs');
function adapter(){const images=[];class Image{constructor(){images.push(this)}naturalWidth=576;naturalHeight=540;}return{Image,images};}
test('new games use storybook art and preload both genders once',async()=>{
 const mock=adapter(),t=await setup(mock);assert.equal(t.run('S.avatarStyle'),'storybook');
 assert.deepEqual(mock.images.map(x=>x.src),['assets/lumi-storybook-walk.webp','assets/lumi-prince-walk.webp']);
 t.run("ensureStorybookArt('boy');ensureStorybookArt('girl')");assert.equal(mock.images.length,2);
});
test('intro gender choice starts the matching character without resetting the chosen style',async()=>{
 const t=await setup();t.run('audio=()=>{};beep=()=>{};startMusic=()=>{}');
 t.events['pickBoy:pointerdown']();t.events['startbtn:pointerdown']();
 assert.equal(t.run('S.sex'),'boy');assert.equal(t.run('S.avatarStyle'),'storybook');
 assert.equal(t.run('S.outfit.hairstyle'),'short');
});
test('gender-specific renderer never draws a late-loaded princess for a prince',async()=>{
 const mock=adapter(),t=await setup(mock);t.run("S.sex='boy'");mock.images[0].onload();
 assert.equal(t.run('drawStorybookCharacter(ctx,0,0,1,0,false)'),false);mock.images[1].onload();
 const calls=[];t.env.g={save(){},restore(){},translate(){},beginPath(){},ellipse(){},fill(){},scale(){},drawImage(img){calls.push(img)}};
 assert.equal(t.run('drawStorybookCharacter(g,0,0,1,0,false)'),true);assert.equal(calls[0],mock.images[1]);
 t.run("S.sex='girl';drawStorybookCharacter(g,0,0,1,0,false)");assert.equal(calls[1],mock.images[0]);
});
test('style choice survives saving and reload without changing gear or stats',async()=>{
 const t=await setup();const gear=t.run('JSON.stringify([S.outfit,S.owned,S.stats])');
 t.run('toggleStorybookStyle()');await t.run('storageWriteQueue');
 assert.equal(t.run('S.avatarStyle'),'classic');assert.equal(t.run('JSON.stringify([S.outfit,S.owned,S.stats])'),gear);
 const u=await setup({saved:t.raw});assert.equal(u.run('S.avatarStyle'),'classic');
 u.run('toggleStorybookStyle()');await u.run('storageWriteQueue');const v=await setup({saved:u.raw});assert.equal(v.run('S.avatarStyle'),'storybook');
});
test('old default saves adopt storybook art, custom saves keep their equipped appearance',async()=>{
 const t=await setup();for(const sex of ['girl','boy']){
 const d=t.fresh();delete d.avatarStyle;d.sex=sex;d.outfit.hairstyle=sex==='boy'?'short':'long';
 assert.ok(t.valid(d));const u=await setup({saved:JSON.stringify(d)});assert.equal(u.run('S.avatarStyle'),'storybook');
 d.outfit.hair='black';const v=await setup({saved:JSON.stringify(d)});assert.equal(v.run('S.avatarStyle'),'classic');assert.equal(v.run('S.outfit.hair'),'black');
 }
});
test('an explicit saved style overrides automatic old-save migration',async()=>{
 const t=await setup();const d=t.fresh();d.avatarStyle='classic';const u=await setup({saved:JSON.stringify(d)});assert.equal(u.run('S.avatarStyle'),'classic');
 d.avatarStyle='storybook';d.outfit.hair='black';const v=await setup({saved:JSON.stringify(d)});assert.equal(v.run('S.avatarStyle'),'storybook');assert.equal(v.run('S.outfit.hair'),'black');
});
test('selecting individual wardrobe items switches to classic and persists with game save',async()=>{
 const t=await setup();t.run("setOutfit('hair','black')");assert.equal(t.run('S.avatarStyle'),'classic');
 await t.run('saveGame()');const u=await setup({saved:t.raw});assert.equal(u.run('S.avatarStyle'),'classic');assert.equal(u.run('S.outfit.hair'),'black');
});
test('invalid style in a progress code is rejected without modifying state',async()=>{
 const t=await setup(),d=t.fresh(),before=t.run('JSON.stringify(S)');d.avatarStyle='unknown';
 assert.equal(t.valid(d),null);assert.equal(t.import(d),false);assert.equal(t.run('JSON.stringify(S)'),before);
});
test('failure keeps the style preference and retries only when requested',async()=>{
 const mock=adapter(),t=await setup(mock);mock.images[0].onerror();t.run("ensureStorybookArt('girl')");assert.equal(mock.images.length,2);
 assert.equal(t.run('S.avatarStyle'),'storybook');assert.equal(t.run('drawStorybookCharacter(ctx,0,0,1,0,false)'),false);
 t.run('toggleStorybookStyle()');assert.equal(mock.images.length,3);assert.equal(t.run('S.avatarStyle'),'storybook');mock.images[2].onload();assert.equal(t.run('storybookArt.girl.ready'),true);
});
test('wrong atlas dimensions fail safely, late completion never reverses a style change',async()=>{
 const mock=adapter(),t=await setup(mock);mock.images[1].naturalWidth=1;mock.images[1].onload();assert.equal(t.run('storybookArt.boy.failed'),true);
 t.run('toggleStorybookStyle()');mock.images[0].onload();assert.equal(t.run('S.avatarStyle'),'classic');assert.equal(t.run('drawStorybookCharacter(ctx,0,0,1,0,false)'),false);
});
test('walk frames, idle frame and four directions select the correct atlas region',async()=>{
 const t=await setup();for(const [dx,dy,row,flip]of [[0,1,0,false],[1,0,1,false],[-1,0,1,true],[0,-1,2,false]]){
 t.env.dx=dx;t.env.dy=dy;assert.deepEqual(JSON.parse(t.run('JSON.stringify(storybookPose(.26,true,{dx,dy}))')),{row,flip,frame:2});
 }assert.equal(t.run('storybookPose(7,false).frame'),1);assert.equal(t.run('storybookPose(.5,true).frame'),0);
});
test('painted butterfly equipment persists for both genders without changing costume or stats',async()=>{
 for(const sex of ['girl','boy']){const t=await setup();t.env.sex=sex;t.run("S.sex=sex;S.owned.wings.push('butterfly')");const before=t.run('JSON.stringify([S.stats,S.owned,S.outfit.dress,S.outfit.hair])');
 t.run("setOutfit('wings','butterfly')");assert.equal(t.run('S.avatarStyle'),'storybook');assert.equal(t.run('gearCharm()>=3'),true);
 await t.run('saveGame()');const u=await setup({saved:t.raw});assert.equal(u.run('S.outfit.wings'),'butterfly');assert.equal(u.run('S.avatarStyle'),'storybook');assert.equal(u.run('JSON.stringify([S.stats,S.owned,S.outfit.dress,S.outfit.hair])'),before);
 u.run("setOutfit('wings',false)");assert.equal(u.run('S.avatarStyle'),'storybook');assert.equal(u.run('S.outfit.wings'),false);
 u.run("setOutfit('wings','fairy')");assert.equal(u.run('S.avatarStyle'),'classic');}
});
test('wing loading is lazy, shared, validated and retryable without changing equipment',async()=>{
 const mock=adapter(),t=await setup(mock);t.run("setOutfit('wings','butterfly');ensureStorybookWings()");assert.equal(mock.images.length,3);assert.equal(mock.images[2].src,'assets/lumi-butterfly-wings.webp');
 mock.images[2].onload();assert.equal(t.run('storybookWings.failed'),true);t.run('ensureStorybookWings()');assert.equal(mock.images.length,3);
 t.run('ensureStorybookWings(true)');assert.equal(mock.images.length,4);t.run("setOutfit('wings',false)");mock.images[3].naturalWidth=768;mock.images[3].naturalHeight=192;mock.images[3].onload();assert.equal(t.run('S.outfit.wings'),false);assert.equal(t.run('S.avatarStyle'),'storybook');
 t.run("S.sex='boy';setOutfit('wings','butterfly')");assert.equal(mock.images.length,4);
});
test('wing renderer orders layers for front, side and rear and mirrors left with character',async()=>{
 const mock=adapter(),t=await setup(mock);mock.images[0].onload();t.run("setOutfit('wings','butterfly')");assert.equal(t.run('drawStorybookCharacter(ctx,0,0,1,0,false)'),false);
 const wing=mock.images[2];wing.naturalWidth=768;wing.naturalHeight=192;wing.onload();
 const calls=[],scales=[];t.env.g={save(){},restore(){},translate(){},beginPath(){},ellipse(){},fill(){},scale(...args){scales.push(args)},drawImage(...args){calls.push(args)}};
 for(const [dx,dy,row]of [[0,1,0],[1,0,1],[-1,0,1],[0,-1,2]]){calls.length=0;scales.length=0;t.env.face={dx,dy};t.run('drawStorybookCharacter(g,0,0,1,.2,true,face)');assert.equal(calls.length,2);assert.equal(calls[row===2?1:0][0],wing);assert.equal(calls[row===2?1:0][1],row*256);assert.equal(scales.some(a=>a[0]===-1&&a[1]===1),dx===-1);}
 calls.length=0;t.run("setOutfit('wings',false);drawStorybookCharacter(g,0,0,1,0,false)");assert.equal(calls.length,1);assert.equal(calls[0][0],mock.images[0]);
});
test('sky costume selects and persists a gender-specific atlas while keeping wings and stats',async()=>{
 for(const sex of ['girl','boy']){const mock=adapter(),t=await setup(mock);t.env.sex=sex;t.run("S.sex=sex;S.owned.dresses.push('sky');S.outfit.wings='butterfly';S.owned.wings.push('butterfly')");const stats=t.run('JSON.stringify(S.stats)');
 t.run("setOutfit('dress','sky')");await t.run('storageWriteQueue');assert.equal(t.run('S.avatarStyle'),'storybook');assert.equal(t.run('S.outfit.wings'),'butterfly');assert.equal(mock.images[2].src,sex==='boy'?'assets/lumi-prince-sky-walk.webp':'assets/lumi-princess-sky-walk.webp');assert.equal(t.run('JSON.stringify(S.stats)'),stats);
 const u=await setup({saved:t.raw});assert.equal(u.run('S.outfit.dress'),'sky');assert.equal(u.run('S.avatarStyle'),'storybook');assert.equal(u.run('S.outfit.wings'),'butterfly');
 }
});
test('late costume loading never overwrites another costume or gender selection',async()=>{
 const mock=adapter(),t=await setup(mock);mock.images[0].onload();mock.images[1].onload();t.run("setOutfit('dress','sky')");const girlSky=mock.images[2];t.run("S.sex='boy';ensureStorybookArt('boy',false,'sky')");const boySky=mock.images[3];
 const calls=[];t.env.g={save(){},restore(){},translate(){},beginPath(){},ellipse(){},fill(){},scale(){},drawImage(img){calls.push(img)}};
 girlSky.onload();assert.equal(t.run('drawStorybookCharacter(g,0,0,1,0,false)'),false);boySky.onload();t.run('drawStorybookCharacter(g,0,0,1,0,false)');assert.equal(calls.pop(),boySky);
 t.run("setOutfit('dress','pink');drawStorybookCharacter(g,0,0,1,0,false)");assert.equal(calls.pop(),mock.images[1]);t.run("S.sex='girl';setOutfit('dress','sky');drawStorybookCharacter(g,0,0,1,0,false)");assert.equal(calls.pop(),girlSky);assert.equal(mock.images.length,4);
});
test('failed sky asset retries the selected costume without loading a default costume instead',async()=>{
 const mock=adapter(),t=await setup(mock);mock.images[0].onload();t.run("setOutfit('dress','sky')");mock.images[2].onerror();t.run('toggleStorybookStyle()');assert.equal(mock.images[3].src,'assets/lumi-princess-sky-walk.webp');assert.equal(t.run('S.avatarStyle'),'storybook');assert.equal(t.run('S.outfit.dress'),'sky');
 t.run("setOutfit('dress','pink')");mock.images[3].onload();assert.equal(t.run('S.outfit.dress'),'pink');assert.equal(t.run('storybookSkyArt.girl.ready'),true);
});
test('wardrobe keeps sky reward locked and selecting owned sky saves immediately',async()=>{
 const t=await setup();t.run('beep=()=>{}');let select;const chip={dataset:{kind:'dress',k:'sky'},addEventListener(name,fn){select=fn}};
 t.elements.get('mbody').querySelectorAll=()=>[chip];t.run('openCloset()');assert.match(t.elements.get('mbody').innerHTML,/하늘 의상/);const before=t.run('JSON.stringify(S)');select();assert.equal(t.run('JSON.stringify(S)'),before);
 t.run("grantItem('dress_sky')");select();await t.run('storageWriteQueue');assert.equal(JSON.parse(t.raw).outfit.dress,'sky');assert.equal(JSON.parse(t.raw).avatarStyle,'storybook');
});
test('unsupported clothing keeps classic customization and supported clothing respects classic preference',async()=>{
 const t=await setup();t.run("setOutfit('dress','purple')");assert.equal(t.run('S.avatarStyle'),'classic');t.run("setOutfit('dress','sky')");assert.equal(t.run('S.avatarStyle'),'classic');t.run('toggleStorybookStyle()');assert.equal(t.run('S.avatarStyle'),'storybook');assert.equal(t.run('S.outfit.dress'),'sky');
});
test('storybook wardrobe only offers supported gear until player explicitly switches style',async()=>{
 const t=await setup();t.run('openCloset()');let html=t.elements.get('mbody').innerHTML;
 assert.match(html,/costumeGrid/);assert.match(html,/lumi-princess-sky-walk.webp/);assert.doesNotMatch(html,/data-kind="hair"/);assert.doesNotMatch(html,/data-k="fairy"/);
 t.run('toggleStorybookStyle()');html=t.elements.get('mbody').innerHTML;assert.match(html,/data-kind="hair"/);assert.match(html,/data-k="fairy"/);assert.equal(t.run('uiOpen'),1);
 t.run("S.sex='boy';toggleStorybookStyle()");html=t.elements.get('mbody').innerHTML;assert.match(html,/lumi-prince-sky-walk.webp/);assert.doesNotMatch(html,/data-kind="hair"/);assert.equal(t.run('uiOpen'),1);
});
test('a failed storybook asset does not trap the player away from classic wardrobe',async()=>{
 const mock=adapter(),t=await setup(mock);t.run('openCloset()');mock.images[0].onerror();assert.equal(t.elements.get('storybookClassicFallback').style.display,'inline-block');
 t.events['storybookClassicFallback:click']();assert.equal(t.run('S.avatarStyle'),'classic');assert.match(t.elements.get('mbody').innerHTML,/data-kind="hair"/);
});
test('HUD portrait and equipped title follow the selected gender',async()=>{
 const t=await setup();t.run("S.title='novice';S.sex='boy';updateHUD()");assert.equal(t.elements.get('portrait').textContent,'🤴');assert.match(t.elements.get('hname').textContent,/새내기 왕자/);
 t.run("S.title='ruler';updateHUD()");assert.equal(t.run('titleStr()'),'🤴 별들의 왕');
 t.run("S.sex='girl';updateHUD()");assert.equal(t.elements.get('portrait').textContent,'👸');assert.equal(t.run('titleStr()'),'👸 별들의 여왕');
});
