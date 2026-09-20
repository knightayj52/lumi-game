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
