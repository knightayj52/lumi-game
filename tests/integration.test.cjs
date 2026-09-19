// Run: node --test tests/integration.test.cjs (no third-party dependencies).
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {setup}=require('./harness.cjs');

test('save failure, recovery and manual feedback use actual storage result',async()=>{
  const t=await setup({fail:true});
  t.run("var notices=[];toast=m=>notices.push(m);beep=()=>{}");
  assert.equal(await t.run('saveGame({notify:true})'),false);
  assert.equal(t.run("notices.some(s=>s.includes('저장 완료'))"),false);
  assert.equal(t.run("notices.some(s=>s.includes('진행 코드'))"),true);
  await t.run('saveGame()');assert.equal(t.run('notices.length'),1);
  t.storage.fail=false;
  assert.equal(await t.run('saveGame()'),true);
  assert.equal(t.run("notices.some(s=>s.includes('다시 정상'))"),true);
  assert.ok(t.valid(JSON.parse(t.raw)));
});

test('both manual save buttons report failure rather than success',async()=>{
  const t=await setup({fail:true});
  t.run("var notices=[];toast=m=>notices.push(m);audio=()=>{};beep=()=>{};openStats()");
  for(const id of ['btnSave','savebtn2']){
    t.events[id+':pointerdown']();
    await t.run('storageWriteQueue');await Promise.resolve();
  }
  assert.equal(t.run('notices.length'),2);
  assert.equal(t.run("notices.some(s=>s.includes('저장 완료'))"),false);
});

test('hosted fallback saves validated state and reload chooses newest snapshot',async()=>{
  let value;
  const host={set:async(k,v)=>{value=v;return{key:k}},get:async()=>value?{value}:null};
  const t=await setup({host});
  t.run('S.coins=50');await t.run('saveGame()');await t.run('storageWriteQueue');
  const earlier=t.raw;t.storage.fail=true;t.run('S.coins=90');
  assert.equal(await t.run('saveGame({notify:true})'),true);
  assert.equal((await t.run('loadGame()')).coins,90);
  const u=await setup({saved:earlier,host});
  assert.equal(u.run('S.coins'),90);
});

test('local success is not blocked by a pending hosted write; order is preserved',async()=>{
  const calls=[];let release;
  const t=await setup({host:{set:(k,v)=>{calls.push(JSON.parse(v).coins);return calls.length===1?new Promise(r=>release=r):Promise.resolve({key:k})}}});
  t.run('S.coins=10');assert.equal(await t.run('saveGame()'),true);
  t.run('S.coins=20');assert.equal(await t.run('saveGame()'),true);
  assert.deepEqual(calls,[10]);release({key:'ok'});await t.run('storageWriteQueue');
  assert.deepEqual(calls,[10,20]);
});

test('old asynchronous failure cannot replace latest save success',async()=>{
  let release;
  const t=await setup({fail:true,host:{set:()=>new Promise(r=>release=r)}});
  t.run('var notices=[];toast=m=>notices.push(m);beep=()=>{}');
  const prior=t.run('saveGame()');await Promise.resolve();
  t.storage.fail=false;await t.run('saveGame({notify:true})');
  release(null);await prior;
  assert.equal(t.run('notices.length'),1);
  assert.equal(t.run("notices[0].includes('저장 완료')"),true);
});

test('prince hairstyle, daily progress and sale survive export/import and reload',async()=>{
  const t=await setup();
  t.run("S.sex='boy';S.tutorial=true;S.owned.hairstyles.push('wave');setOutfit('hairstyle','wave');S.achv=Object.fromEntries(ACHV.map(a=>[a.id,1]));S.level=18;S.xp=LEVEL_XP[17];S.renown=800;S.coins=100;S.inv.carrot=7;ensureDaily();S.daily.tasks=[{id:'talk3',prog:0},{id:'fish3',prog:0},{id:'forage5',prog:0}];countTalk('rabbit');countTalk('fox');var expectedCoins=S.coins+shopSellPrice('carrot')*7;sellShopItem('carrot',7)");
  assert.equal(t.run('S.coins===expectedCoins'),true);
  const saved=JSON.parse(t.raw);assert.ok(t.valid(saved));
  assert.equal(t.import(saved),true);
  const u=await setup({saved:t.raw});
  assert.equal(u.run('S.outfit.hairstyle'),'wave');
  assert.equal(u.run('S.coins'),saved.coins);
  assert.equal(u.run("inv('carrot')"),0);
  assert.equal(u.run("S.daily.tasks.find(t=>t.id==='talk3').prog"),2);
  u.run("countTalk('rabbit')");
  assert.equal(u.run("S.daily.tasks.find(t=>t.id==='talk3').prog"),2);
});

test('new free short hair survives strict validation for both characters',async()=>{
  const t=await setup();
  for(const sex of ['boy','girl']){
    t.env.sex=sex;t.run("S.sex=sex;S.outfit.hairstyle='short'");
    assert.equal(t.import(t.fresh()),true);
    assert.equal(t.run('S.outfit.hairstyle'),'short');
    assert.equal(t.run("S.owned.hairstyles.filter(k=>k==='short').length"),1);
  }
});

test('midnight rollover resets talks while imported transient state never saves',async()=>{
  const t=await setup();
  t.run("ensureDaily();S._talkedToday={rabbit:true};S.daily.tasks=[{id:'talk3',prog:1},{id:'fish3',prog:0},{id:'forage5',prog:0}]");
  const code=t.fresh();const before=t.run('JSON.stringify(S)'),writes=t.writes.length;
  t.setClock(new Date(2026,8,20,12).getTime());
  t.run("var originalApply=applyLoaded;applyLoaded=(d,persist)=>{originalApply(d,persist);throw Error('after rollover')}");
  assert.equal(t.import(code),false);
  assert.equal(t.run('JSON.stringify(S)'),before);
  assert.equal(t.writes.length,writes);
  t.run('applyLoaded=originalApply');
  assert.equal(t.import(code),true);
  assert.equal(t.run('S.daily.date'),'2026-9-20');
  assert.equal(t.run('S._talkedToday.rabbit'),undefined);
  assert.equal(t.writes.length,writes+1);
  assert.ok(t.valid(JSON.parse(t.raw)));
});

test('malformed import preserves current state and persistent record',async()=>{
  const t=await setup();await t.run('saveGame()');
  const before=t.run('JSON.stringify(S)'),stored=t.raw;
  const invalid=t.fresh();invalid.outfit=null;
  assert.equal(t.import(invalid),false);
  assert.equal(t.run('JSON.stringify(S)'),before);
  assert.equal(t.raw,stored);
});

test('castle render loop continues with particles after a successful import',async()=>{
  const t=await setup();assert.equal(t.import(t.fresh()),true);
  t.run("world='in';sparks.length=0;spark(player.x,player.y,'✨')");
  const before=t.frames.length;t.run('loop()');
  assert.equal(t.frames.length,before+1);
});
