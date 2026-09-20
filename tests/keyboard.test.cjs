const {test}=require('node:test');
const assert=require('node:assert/strict');
const {setup}=require('./harness.cjs');
async function game(){const t=await setup();t.run("$('intro').style.display='none';audio=()=>{};beep=()=>{}");return t;}
const press=(t,code,fields={})=>t.dispatch('window','keydown',{code,...fields});
const release=(t,code)=>t.dispatch('window','keyup',{code});
const movement=t=>JSON.parse(t.run('JSON.stringify(movementInput())'));
const editable=selector=>({closest:s=>s.split(',').map(x=>x.trim()).includes(selector)?{}:null});

test('arrows and physical WASD keys move, cancel and release',async()=>{
 const t=await game();
 for(const [code,dx,dy] of [['ArrowUp',0,-1],['KeyW',0,-1],['ArrowDown',0,1],['KeyS',0,1],['ArrowLeft',-1,0],['KeyA',-1,0],['ArrowRight',1,0],['KeyD',1,0]]){
  assert.equal(press(t,code,{key:'ㅁ'}).defaultPrevented,true);
  assert.deepEqual(movement(t),{dx,dy});release(t,code);assert.deepEqual(movement(t),{dx:0,dy:0});
 }
 press(t,'KeyD');press(t,'ArrowRight');assert.equal(movement(t).dx,1);
 press(t,'KeyA');assert.equal(movement(t).dx,0);
});
test('actual update keeps diagonal movement at straight-line speed',async()=>{
 const t=await game();t.run("blocked=()=>false;world='room';player.x=200;player.y=200");
 press(t,'KeyD');t.run('update(0.02)');const straight=t.run('Math.hypot(player.x-200,player.y-200)');
 t.run('player.x=200;player.y=200');press(t,'KeyS');t.run('update(0.02)');
 assert.ok(straight>0);assert.ok(Math.abs(t.run('Math.hypot(player.x-200,player.y-200)')-straight)<1e-9);
});
test('Space refreshes nearby action and acts once per press',async()=>{
 const t=await game();t.run('var calls=[];findNearest=()=>calls.push("find");doAction=()=>calls.push("act")');
 press(t,'Space');press(t,'Space',{repeat:true});press(t,'Space');
 assert.equal(t.run('calls.join()'),'find,act');release(t,'Space');press(t,'Space');
 assert.equal(t.run('calls.join()'),'find,act,find,act');
});
test('typing, IME composition and shortcuts preserve native input and stop movement',async()=>{
 const t=await game();t.run('var acts=0;doAction=()=>acts++');
 for(const fields of [{target:editable('input')},{target:editable('textarea')},{target:editable('select')},{target:{isContentEditable:true}},{isComposing:true},{ctrlKey:true},{metaKey:true},{altKey:true}]){
  press(t,'KeyD');assert.equal(press(t,'Space',fields).defaultPrevented,undefined);
  assert.equal(t.run('heldKeys.size'),0);assert.equal(t.run('acts'),0);
 }
 press(t,'KeyD');t.env.document.activeElement=editable('input');assert.deepEqual(movement(t),{dx:0,dy:0});
});
test('intro, dialog lock, transitions and hidden pages block controls',async()=>{
 const t=await game();t.run('var acts=0;doAction=()=>acts++');
 for(const [on,off] of [["$('intro').style.display='flex'","$('intro').style.display='none'"],['uiOpen=1','uiOpen=0'],['fadeDir=1','fadeDir=0'],['document.hidden=true','document.hidden=false']]){
  t.run(on);assert.equal(press(t,'KeyD').defaultPrevented,undefined);press(t,'Space');assert.deepEqual(movement(t),{dx:0,dy:0});t.run(off);
 }
 assert.equal(t.run('acts'),0);
});
test('blur, hidden page and editable focus clear both controls',async()=>{
 const t=await game();
 for(const [scope,name,fields] of [['window','blur',{}],['document','visibilitychange',{}],['document','focusin',{target:editable('input')}]]){
  press(t,'KeyD');t.run('joy.active=true;joy.dx=1');
  if(name==='visibilitychange')t.env.document.hidden=true;
  t.dispatch(scope,name,fields);assert.equal(t.run('heldKeys.size'),0);assert.equal(t.run('joy.active'),false);
  t.env.document.hidden=false;
 }
});
test('opening a modal, dialog or warp clears held movement',async()=>{
 for(const action of ["openModal('메뉴','')","dialog('🐰','토끼',['안녕'])",'warp(()=>{})']){
  const t=await game();press(t,'KeyD');t.run(action);
  assert.equal(t.run('heldKeys.size'),0);assert.deepEqual(movement(t),{dx:0,dy:0});
 }
});
test('touch joystick still moves, takes precedence and releases',async()=>{
 const t=await game();press(t,'KeyA');
 t.events['joyzone:pointerdown']({pointerId:1,clientX:100,clientY:100,preventDefault(){}});
 t.dispatch('window','pointermove',{pointerId:1,clientX:146,clientY:100});
 assert.equal(movement(t).dx,1);t.dispatch('window','pointerup',{pointerId:1});assert.equal(movement(t).dx,-1);
});
test('focused button or link keeps native Space behavior',async()=>{
 const t=await game();t.run('var acts=0;doAction=()=>acts++');
 for(const selector of ['button','a'])assert.equal(press(t,'Space',{target:editable(selector)}).defaultPrevented,undefined);
 assert.equal(t.run('acts'),0);
});
