const {test}=require('node:test');
const assert=require('node:assert/strict');
const {setup}=require('./harness.cjs');

async function game(options={}){
 const t=await setup(options);let clock=10000;
 t.env.performance.now=()=>clock;
 t.advance=ms=>{clock+=ms;};
 t.run("audio=()=>{};beep=()=>{};$('intro').style.display='none'");
 t.tickFish=()=>{const id=t.run('fishFrame');assert.notEqual(id,null);const fn=t.frames[id-1];t.frames[id-1]=null;fn();};
 return t;
}
function bite(t){t.advance(3000);t.tickFish();assert.equal(t.run('fish.phase'),'bite');}
function miss(t){t.run("fish.fk='minnow'");bite(t);t.events['fbtn:pointerdown']();t.run('fish.pos=-10');t.events['fbtn:pointerdown']();assert.equal(t.run('fish.miss'),true);}
function catchFish(t){t.run("fish.fk='minnow'");bite(t);t.events['fbtn:pointerdown']();t.run('fish.pos=((fish.zy+fish.zh/2)*100-6)/88');t.events['fbtn:pointerdown']();assert.equal(t.run('fish.phase'),'done');assert.equal(t.run('fish.miss'),false);}
function canWalk(t){
 assert.equal(t.run('uiOpen'),0);assert.equal(t.run('gameInputAllowed()'),true);
 t.run("world='room';blocked=()=>false;player.x=200;player.y=200");
 t.dispatch('window','keydown',{code:'KeyD'});t.run('update(.02)');assert.ok(t.run('player.x')>200);
}

test('failed catches retried repeatedly release movement after a successful catch',async()=>{
 const t=await game();t.run('openFishing()');
 for(let i=0;i<5;i++){miss(t);t.events['fbtn:pointerdown']();assert.equal(t.run('uiOpen'),1);}
 const before=t.run("inv('minnow')");catchFish(t);t.events['fbtn:pointerdown']();
 assert.equal(t.run("inv('minnow')"),before+1);assert.equal(t.elements.get('fishing').style.display,'none');canWalk(t);
 await t.run('storageWriteQueue');assert.equal(JSON.parse(t.raw).inv.minnow,before+1);
});
test('missing the bite, including returning after an app switch, can retry and exit',async()=>{
 const t=await game();t.run('openFishing()');bite(t);t.env.document.hidden=true;t.dispatch('document','visibilitychange');
 t.advance(10000);t.env.document.hidden=false;t.dispatch('document','visibilitychange');t.tickFish();
 assert.equal(t.run('fish.miss'),true);assert.equal(t.run('fishFrame'),null);
 t.events['fbtn:pointerdown']();assert.equal(t.run('uiOpen'),1);t.events['fclose:pointerdown']();canWalk(t);
});
test('leaving each fishing phase releases exactly one lock and keeps rewards unchanged',async()=>{
 for(const phase of ['wait','bite','time','done']){
  const t=await game();t.run('openFishing()');if(phase!=='wait')bite(t);
  if(phase==='time'||phase==='done')t.events['fbtn:pointerdown']();
  if(phase==='done'){t.run('fish.pos=-10');t.events['fbtn:pointerdown']();}
  const inv=t.run('JSON.stringify(S.inv)');t.events['fclose:pointerdown']();t.events['fclose:pointerdown']();
  assert.equal(t.run('fishFrame'),null);assert.equal(t.run('JSON.stringify(S.inv)'),inv);canWalk(t);
 }
});
test('restarting rapidly has one fishing animation and exiting cancels it',async()=>{
 const t=await game();t.run('openFishing()');
 for(let i=0;i<20;i++){const old=t.run('fishFrame');t.run('openFishing()');assert.equal(t.frames[old-1],null);}
 assert.equal(t.run('uiOpen'),1);const id=t.run('fishFrame');t.tickFish();assert.equal(t.frames[id-1],null);
 // Only the game's main loop and one fishing callback remain queued.
 assert.equal(t.frames.filter(Boolean).length,2);t.events['fclose:pointerdown']();assert.equal(t.frames.filter(Boolean).length,1);canWalk(t);
});
test('fish guide ends fishing and leaves only the visible guide lock',async()=>{
 const t=await game();t.run('openFishing()');miss(t);t.events['fbtn:pointerdown']();
 t.events['fdexbtn:pointerdown']();assert.equal(t.run('fish.on'),false);assert.equal(t.run('fishFrame'),null);
 assert.equal(t.elements.get('fishing').style.display,'none');assert.equal(t.elements.get('modalwrap').style.display,'flex');assert.equal(t.run('uiOpen'),1);
 t.events['mclose:pointerdown']();canWalk(t);
});
test('closing fishing never removes an unrelated open modal lock',async()=>{
 const t=await game();t.run("openModal('메뉴','');openFishing()");assert.equal(t.run('uiOpen'),2);
 t.events['fclose:pointerdown']();assert.equal(t.run('uiOpen'),1);assert.equal(t.run('gameInputAllowed()'),false);
 t.events['mclose:pointerdown']();canWalk(t);
});
test('a catch can be closed even when saving fails and is never awarded twice',async()=>{
 const t=await game({fail:true});t.run('openFishing()');catchFish(t);const count=t.run("inv('minnow')");
 t.events['fbtn:pointerdown']();t.events['fbtn:pointerdown']();await t.run('storageWriteQueue');
 assert.equal(t.run("inv('minnow')"),count);canWalk(t);
});
