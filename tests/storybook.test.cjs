const {test}=require('node:test');
const assert=require('node:assert/strict');
const {setup}=require('./harness.cjs');
function adapter(){const images=[];class Image{constructor(){images.push(this)}naturalWidth=576;naturalHeight=540;}return{Image,images};}
test('storybook loading never alters equipped items, ownership or persistent save',async()=>{
 const mock=adapter(),t=await setup(mock);t.run("S.sex='girl'");const before=t.run('JSON.stringify(S)'),writes=t.writes.length;
 t.run('toggleStorybookPreview()');assert.equal(mock.images.length,1);assert.equal(t.run('storybookPreview.ready'),false);
 mock.images[0].onload();assert.equal(t.run('storybookPreview.ready'),true);
 t.run('toggleStorybookPreview()');assert.equal(t.run('storybookPreview.enabled'),false);
 assert.equal(t.run('JSON.stringify(S)'),before);assert.equal(t.writes.length,writes);
 t.run('toggleStorybookPreview()');assert.equal(mock.images.length,1);
});
test('failed or wrong-sized image falls back and can retry',async()=>{
 const mock=adapter(),t=await setup(mock);t.run('toggleStorybookPreview()');mock.images[0].onerror();
 assert.equal(t.run('storybookPreview.enabled'),false);assert.equal(t.run('storybookPreview.loading'),false);
 t.run('toggleStorybookPreview()');assert.equal(mock.images.length,2);mock.images[1].naturalWidth=1;mock.images[1].onload();
 assert.equal(t.run('storybookPreview.ready'),false);
});
test('late load cannot re-enable a preview the player turned off',async()=>{
 const mock=adapter(),t=await setup(mock);t.run('toggleStorybookPreview();toggleStorybookPreview()');mock.images[0].onload();
 assert.equal(t.run('storybookPreview.enabled'),false);
});
test('walk frames, idle frame and four directions select the correct atlas region',async()=>{
 const t=await setup();for(const [dx,dy,row,flip]of [[0,1,0,false],[1,0,1,false],[-1,0,1,true],[0,-1,2,false]]){
 t.env.dx=dx;t.env.dy=dy;const pose=JSON.parse(t.run('JSON.stringify(storybookPose(.26,true,{dx,dy}))'));
 assert.deepEqual(pose,{row,flip,frame:2});
 }
 assert.equal(t.run('storybookPose(7,false).frame'),1);
 assert.equal(t.run('storybookPose(.5,true).frame'),0);
});
test('renderer falls back while disabled, not ready, or using the prince',async()=>{
 const t=await setup();assert.equal(t.run('drawStorybookPrincess(ctx,0,0,1,0,false)'),false);
 t.run('storybookPreview.enabled=true');assert.equal(t.run('drawStorybookPrincess(ctx,0,0,1,0,false)'),false);
 t.run("storybookPreview.ready=true;S.sex='boy'");assert.equal(t.run('drawStorybookPrincess(ctx,0,0,1,0,false)'),false);
});
