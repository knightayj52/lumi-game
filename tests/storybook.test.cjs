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
test('invalid style in a progress code is rejected without modifying state',async()=>{
 const t=await setup(),d=t.fresh(),before=t.run('JSON.stringify(S)');d.avatarStyle='unknown';
 assert.equal(t.valid(d),null);assert.equal(t.import(d),false);assert.equal(t.run('JSON.stringify(S)'),before);
});
test('walk frames, idle frame and four directions select the correct atlas region',async()=>{
 const t=await setup();for(const [dx,dy,row,flip]of [[0,1,0,false],[1,0,1,false],[-1,0,1,true],[0,-1,2,false]]){
 t.env.dx=dx;t.env.dy=dy;assert.deepEqual(JSON.parse(t.run('JSON.stringify(storybookPose(.26,true,{dx,dy}))')),{row,flip,frame:2});
 }assert.equal(t.run('storybookPose(7,false).frame'),1);assert.equal(t.run('storybookPose(.5,true).frame'),0);
});
test('wardrobe keeps sky reward locked and selecting owned sky saves immediately',async()=>{
 const t=await setup();t.run('beep=()=>{}');let select;const chip={dataset:{kind:'dress',k:'sky'},addEventListener(name,fn){select=fn}};
 t.elements.get('mbody').querySelectorAll=()=>[chip];t.run('openCloset()');assert.match(t.elements.get('mbody').innerHTML,/data-k="sky"/);const before=t.run('JSON.stringify(S)');select();assert.equal(t.run('JSON.stringify(S)'),before);
 t.run("grantItem('dress_sky')");select();await t.run('storageWriteQueue');assert.equal(JSON.parse(t.raw).outfit.dress,'sky');assert.equal(JSON.parse(t.raw).avatarStyle,'storybook');
});
test('HUD portrait and equipped title follow the selected gender',async()=>{
 const t=await setup();t.run("S.title='novice';S.sex='boy';updateHUD()");assert.equal(t.elements.get('portrait').textContent,'🤴');assert.match(t.elements.get('hname').textContent,/새내기 왕자/);
 t.run("S.title='ruler';updateHUD()");assert.equal(t.run('titleStr()'),'🤴 별들의 왕');
 t.run("S.sex='girl';updateHUD()");assert.equal(t.elements.get('portrait').textContent,'👸');assert.equal(t.run('titleStr()'),'👸 별들의 여왕');
});

test('every purchased wardrobe category stays painted and survives save/reload',async()=>{
 for(const sex of ['girl','boy']){const t=await setup();t.env.sex=sex;t.run("S.sex=sex;S.coins=50000;S.owned.dresses=Object.keys(DRESSES);S.owned.hairs=Object.keys(HAIRS);S.owned.hairstyles=Object.keys(HAIRSTYLES);S.owned.shoes=Object.keys(SHOES);S.owned.accs=Object.keys(ACCS);S.owned.wings=Object.keys(WINGS);S.owned.wands=['legend'];S.owned.gloves=['legend']");
 const before=t.run('JSON.stringify([S.owned,S.stats,S.coins])');
 for(const [kind,defs]of [['dress','DRESSES'],['hair','HAIRS'],['hairstyle','HAIRSTYLES'],['shoes','SHOES'],['acc','ACCS'],['wings','WINGS'],['wand','WANDS'],['gloves','GLOVES']]){for(const k of t.run('Object.keys('+defs+')')){t.env.kind=kind;t.env.k=k;t.run('setOutfit(kind,k)');assert.equal(t.run('S.avatarStyle'),'storybook');assert.equal(t.run('S.outfit[kind]'),k);}}
 await t.run('storageWriteQueue');const u=await setup({saved:t.raw});assert.equal(u.run('JSON.stringify(S.outfit)'),t.run('JSON.stringify(S.outfit)'));assert.equal(u.run('JSON.stringify([S.owned,S.stats,S.coins])'),before);assert.equal(u.run('S.avatarStyle'),'storybook');
 }
});
test('both wardrobe styles expose every existing item and retain explicit classic choice',async()=>{
 const t=await setup();for(const sex of ['girl','boy'])for(const style of ['storybook','classic']){t.env.sex=sex;t.env.style=style;t.run('S.sex=sex;S.avatarStyle=style;openCloset()');const html=t.elements.get('mbody').innerHTML;
 for(const [kind,defs]of [['dress','DRESSES'],['hair','HAIRS'],['hairstyle','HAIRSTYLES'],['shoes','SHOES'],['acc','ACCS'],['wings','WINGS'],['wand','WANDS'],['gloves','GLOVES']])for(const k of t.run('Object.keys('+defs+')'))assert.ok(html.includes('data-kind="'+kind+'" data-k="'+k+'"'),kind+'/'+k);
 t.run("setOutfit('dress','purple')");assert.equal(t.run('S.avatarStyle'),style);
 }
});
test('buying equips the item once, preserves painted style and cannot overspend',async()=>{
 const t=await setup();t.run('beep=()=>{}');let click;const chip={dataset:{kind:'dress',k:'red'},addEventListener(n,fn){click=fn}};t.elements.get('mbody').querySelectorAll=()=>[chip];
 t.run("S.coins=0;openCloset()");const before=t.run('JSON.stringify(S)');click();assert.equal(t.run('JSON.stringify(S)'),before);
 const price=t.run('DRESSES.red.buy');assert.ok(price>0);t.env.price=price;t.run('S.coins=price;openCloset()');click();assert.equal(t.run('S.coins'),0);assert.equal(t.run('S.outfit.dress'),'red');assert.equal(t.run('S.avatarStyle'),'storybook');click();assert.equal(t.run("S.owned.dresses.filter(k=>k==='red').length"),1);
 await t.run('storageWriteQueue');assert.equal(JSON.parse(t.raw).outfit.dress,'red');
});
test('modular assets load concurrently, validate dimensions and retry without changing gear',async()=>{
 const mock=adapter(),t=await setup(mock);t.run("S.outfit.wings='dragon';openCloset()");const loaded=mock.images.filter(i=>i.src.includes('modular-'));assert.equal(loaded.length,4);
 const a=loaded.find(i=>i.src.includes('heads'));a.onload();assert.equal(t.run("paintedAssets['modular-girl-heads'].failed"),true);const gear=t.run('JSON.stringify(S.outfit)');const n=mock.images.length;t.run('openCloset()');assert.equal(mock.images.length,n);t.run('toggleStorybookStyle()');assert.equal(t.run('S.avatarStyle'),'storybook');assert.equal(mock.images.length,n+1);assert.equal(t.run('JSON.stringify(S.outfit)'),gear);
 const retry=mock.images.at(-1);retry.naturalWidth=432;retry.naturalHeight=1080;t.run("S.sex='boy';S.avatarStyle='classic'");retry.onload();assert.equal(t.run('S.sex'),'boy');assert.equal(t.run('S.avatarStyle'),'classic');
});
test('incomplete painted equipment falls back as a whole rather than hiding purchased parts',async()=>{
 const t=await setup();assert.equal(t.run('drawStorybookCharacter(ctx,0,0,1,0,false)'),false);t.run("S.avatarStyle='classic'");assert.equal(t.run('drawStorybookCharacter(ctx,0,0,1,0,false)'),false);
});
test('layering uses selected body, hair style, wing atlas row and left mirroring',async()=>{
 const t=await setup();t.run("for(const n of ['modular-girl-body','modular-girl-heads','modular-accessories','modular-wings'])paintedAssets[n]={ready:true,image:n};tintPainted=(n)=>n;S.outfit.wings='dragon';S.outfit.hairstyle='twin';S.outfit.acc='crown'");
 const calls=[],scales=[];t.env.g={save(){},restore(){},translate(){},beginPath(){},ellipse(){},fill(){},scale(...a){scales.push(a)},drawImage(...a){calls.push(a)}};
 for(const [dx,dy,row]of [[0,1,0],[1,0,1],[-1,0,1],[0,-1,2]]){calls.length=0;scales.length=0;t.env.face={dx,dy};assert.equal(t.run('drawStorybookCharacter(g,0,0,1,.26,true,face)'),true);
 const wi=calls.findIndex(a=>a[0]==='modular-wings'),bi=calls.findIndex(a=>a[0]==='modular-girl-body'),hi=calls.findLastIndex(a=>a[0]==='modular-girl-heads');assert.equal(wi<bi,row!==2);assert.ok(hi>bi);assert.equal(calls[wi][1],row*256);assert.equal(calls[wi][2],9*192);assert.equal(calls[hi][1],row*144);assert.equal(calls[hi][2],2*180);assert.equal(scales.some(a=>a[0]<0),dx===-1);}
});
test('all 60 pet species map to distinct atlas cells',async()=>{
 const t=await setup();t.run("paintedAssets['storybook-pets']={ready:true,image:'pets'}");const calls=[];t.env.g={drawImage(...a){calls.push(a)}};t.run('for(const d of Object.values(PETSPEC))drawPaintedCreature(g,d,0,0,40)');assert.equal(calls.length,60);assert.equal(new Set(calls.map(a=>a[1]+','+a[2])).size,60);assert.equal(calls[59][2],14*256);
});
test('all furniture uses distinct cells and an exact floor contact anchor',async()=>{
 const calls=[],t=await setup({drawImage:(...args)=>calls.push(args)});t.run("paintedAssets['storybook-furniture']={ready:true,image:'furniture'};cam.x=0;cam.y=0");calls.length=0;
 const before=t.run('JSON.stringify([S.room,S.roomInv,S.roomDeco])');assert.equal(t.run("Object.keys(FURN).every(k=>drawPaintedFurniture(k,100,100,80))"),true);
 assert.equal(calls.length,20);assert.equal(new Set(calls.map(a=>a[1]+','+a[2])).size,20);for(const c of calls)assert.deepEqual(c.slice(5),[60,20,80,80]);
 assert.equal(t.run('JSON.stringify([S.room,S.roomInv,S.roomDeco])'),before);
});
test('failed modular download exposes a working classic fallback',async()=>{
 const mock=adapter(),t=await setup(mock);t.run('openCloset()');mock.images.find(i=>i.src.includes('modular-girl-body')).onerror();assert.equal(t.elements.get('storybookClassicFallback').style.display,'inline-block');t.events['storybookClassicFallback:click']();assert.equal(t.run('S.avatarStyle'),'classic');assert.match(t.elements.get('mbody').innerHTML,/data-kind="hair"/);
});
test('continuing or importing a save never replaces purchased hair before tutorial completion',async()=>{
 for(const sex of ['girl','boy']){const t=await setup(),d=t.fresh();d.sex=sex;d.tutorial=false;d.owned.hairstyles.push('twin');d.outfit.hairstyle='twin';
 const u=await setup({saved:JSON.stringify(d)});u.run('audio=()=>{};beep=()=>{};startMusic=()=>{}');u.events['startbtn:pointerdown']();assert.equal(u.run('S.outfit.hairstyle'),'twin');assert.equal(u.run('S.sex'),sex);
 const v=await setup();assert.equal(v.import(d),true);v.run('audio=()=>{};beep=()=>{};startMusic=()=>{}');v.events['startbtn:pointerdown']();assert.equal(v.run('S.outfit.hairstyle'),'twin');}
});

test('all hairstyles keep lower hair behind collars in front/side poses and over the back in rear poses',async()=>{
 const t=await setup(),calls=[];
 t.env.g={save(){},restore(){},translate(){},beginPath(){},ellipse(){},fill(){},scale(){},drawImage(...a){calls.push(a)}};
 t.run("tintPainted=n=>n;S.outfit.wings=false;S.outfit.acc=false;S.outfit.wand=false;S.outfit.gloves=false");
 for(const sex of ['girl','boy']){
  t.env.sex=sex;t.run("S.sex=sex;for(const n of ['modular-'+sex+'-body','modular-'+sex+'-heads','modular-accessories'])paintedAssets[n]={ready:true,image:n}");
  for(const hs of t.run('Object.keys(HAIRSTYLES)'))for(const [dx,dy]of [[0,1],[1,0],[-1,0],[0,-1]])for(let frame=0;frame<4;frame++){
   calls.length=0;t.env.hs=hs;t.env.face={dx,dy};t.env.time=frame/8;
   t.run('S.outfit.hairstyle=hs;drawStorybookCharacter(g,0,0,1,time,true,face)');
   const body=calls.findIndex(a=>a[0]==='modular-'+sex+'-body');
   const heads=calls.map((a,i)=>({a,i})).filter(v=>v.a[0]==='modular-'+sex+'-heads');
   if(dy===-1){assert.equal(heads.length,1);assert.ok(heads[0].i>body);assert.equal(heads[0].a[4],180);}
   else{
    assert.equal(heads.length,2);const [rear,front]=heads;
    assert.ok(rear.i<body);assert.ok(front.i>body);
    // Rear starts exactly at the body's neck; upper hair ends at the same seam.
    assert.equal(rear.a[6],-100);assert.ok(Math.abs(front.a[6]+front.a[8]+100)<1e-9);
    assert.ok(Math.abs(rear.a[4]+front.a[4]-180)<1e-9);
    assert.ok(Math.abs(front.a[2]+front.a[4]-rear.a[2])<1e-9);
   }
  }
 }
});

test('rear hair dye does not leave a brown rectangle where a neck would be in front views',async()=>{
 const t=await setup(),width=432,height=1080,data=new Uint8ClampedArray(width*height*4);
 const put=(x,y,r,g,b)=>data.set([r,g,b,255],(y*width+x)*4);
 put(72,75,155,80,36);put(360,75,155,80,36);put(360,80,230,170,120);
 const canvas={width,height,getContext:()=>({drawImage(){},getImageData:()=>({data}),putImageData(){}})};
 t.env.document.createElement=()=>canvas;t.env.img={naturalWidth:width,naturalHeight:height};
 t.run("paintedAssets['modular-girl-heads']={ready:true,image:img};tintPainted('modular-girl-heads','hair',HAIRS.black.c)");
 const at=(x,y)=>Array.from(data.slice((y*width+x)*4,(y*width+x)*4+3));
 assert.deepEqual(at(72,75),[155,80,36]);assert.notDeepEqual(at(360,75),[155,80,36]);
 assert.deepEqual(at(360,80),[230,170,120]);
});
