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

test('key-only and legacy keyboard events move and release without code',async()=>{
 const t=await game();
 for(const [key,keyCode,dx,dy] of [['ArrowRight',39,1,0],['Left',37,-1,0],['W',87,0,-1],['s',83,0,1],['ㅁ',65,-1,0],['ㅇ',68,1,0]]){
  for(const fields of [{key},{key:'Unidentified',keyCode},{key:'',keyCode}]){
   assert.equal(press(t,'',fields).defaultPrevented,true);assert.deepEqual(movement(t),{dx,dy});
   t.dispatch('window','keyup',{code:'',...fields});assert.deepEqual(movement(t),{dx:0,dy:0});
  }
 }
});
test('IME-marked movement works outside editors but never steals text entry',async()=>{
 const t=await game();
 for(const fields of [{code:'KeyD',key:'ㅇ'},{code:'',key:'ArrowRight'},{code:'',key:'ㅇ'}]){
  t.dispatch('window','keydown',{...fields,isComposing:true});assert.equal(movement(t).dx,1);t.dispatch('window','keyup',fields);
  assert.equal(t.dispatch('window','keydown',{...fields,isComposing:true,target:editable('input')}).defaultPrevented,undefined);
  assert.equal(movement(t).dx,0);
 }
});
test('keyboard takes over stale touch and touch can take over again',async()=>{
 const t=await game();t.run('joy.active=true;joy.dx=0;joy.dy=0');press(t,'ArrowRight');assert.equal(movement(t).dx,1);assert.equal(t.run('joy.active'),false);
 t.events['joyzone:pointerdown']({pointerId:2,clientX:100,clientY:100,preventDefault(){}});
 t.dispatch('window','pointermove',{pointerId:2,clientX:54,clientY:100});assert.equal(movement(t).dx,-1);
 press(t,'ArrowRight',{repeat:true});assert.equal(movement(t).dx,1);release(t,'ArrowRight');assert.equal(movement(t).dx,0);
});
test('repeated movement after an input reset resumes without repeating actions',async()=>{
 const t=await game();press(t,'KeyD');t.run('resetInput()');press(t,'KeyD',{repeat:true});assert.equal(movement(t).dx,1);
 t.run('var acts=0;doAction=()=>acts++');press(t,'Space',{repeat:true});assert.equal(t.run('acts'),0);
});
test('hidden former editors do not keep the game locked to typing',async()=>{
 const t=await game();const editor={getClientRects:()=>[]};const target={closest:()=>editor};
 t.env.document.activeElement=target;press(t,'ArrowRight',{target});assert.equal(movement(t).dx,1);
 editor.getClientRects=()=>[{}];assert.equal(press(t,'ArrowLeft',{target}).defaultPrevented,undefined);assert.equal(movement(t).dx,0);
});
test('starting and closing overlays return focus to the playable canvas',async()=>{
 const t=await game();let focused=0;const canvas=t.elements.get('cv');canvas.focus=()=>{focused++;t.env.document.activeElement=canvas;};
 t.run('startMusic=()=>{}');t.events['startbtn:pointerdown']();assert.equal(focused,1);
 for(const open of ["openModal('메뉴','')","dialog('🐰','토끼',['안녕'])",'openFishing()']){
  t.run(open);const before=focused;
  if(open.startsWith('openModal'))t.run('closeModal()');else if(open.startsWith('dialog'))t.run('closeDialog()');else t.run('closeFishing()');
  assert.equal(focused,before+1);press(t,'KeyD');assert.equal(movement(t).dx,1);release(t,'KeyD');
 }
});
