import test from 'node:test';
import assert from 'node:assert/strict';
import {HEX,SIDES,apothem,axialPosition,fixedHexMeta,containsHex,exitSide,arrivalPosition,connectionSeed} from '../worlds/HexWorld.js';
import {createTerrainBlend,createHexTerrainGeometry} from '../worlds/HexTerrain.js';
import {createWorldTravel,validateWorldRecord} from '../worlds/WorldTravel.js';
const record=(name,ownerId='me')=>({name,ownerId,visibility:'link',world:{version:4,worldHalf:144,cells:[],terrain:[]}});
const a={hexQ:0,hexR:0};
test('fixed hex area, six shared edges and opposite arrival entrances',()=>{
 assert.equal(fixedHexMeta(null).outerRadius,144);
 assert.equal(fixedHexMeta({outerRadius:900,innerScale:.3}).innerScale,Math.sqrt(.9));
 assert.ok(Math.abs(HEX.innerScale**2-.9)<1e-12);
 for(const [side,s] of SIDES.entries()){
  const b={hexQ:s.q,hexR:s.r},c=axialPosition(s.q,s.r),p={x:s.nx*(apothem(144)+.3),y:-22,z:s.nz*(apothem(144)+.3)};
  assert.equal(exitSide({x:0,z:0},p),side);
  const next=arrivalPosition(a,b,p);assert.ok(containsHex(next));assert.equal(next.y,-22);
  assert.ok(next.x*s.nx+next.z*s.nz<0);
  assert.ok(Math.hypot(next.x+c.x-p.x,next.z+c.z-p.z)<1);
  assert.ok(!containsHex({x:c.x,z:c.z}));
 }
 assert.equal(connectionSeed('A','B'),connectionSeed('B','A'));
});
test('shared terrain preserves both inner areas and agrees along six seams and a triple corner',()=>{
 for(const s of SIDES){
  const items=[{id:'A',...a,height:()=>-29},{id:'B',hexQ:s.q,hexR:s.r,height:()=>-9}];
  const blend=createTerrainBlend(items),backwards=createTerrainBlend([...items].reverse()),c=axialPosition(s.q,s.r);
  assert.equal(blend('A',0,0),-29);assert.equal(blend('B',0,0),-9);
  for(let t=-65;t<=65;t+=5){const x=s.nx*apothem(144)-s.nz*t,z=s.nz*apothem(144)+s.nx*t;
   assert.ok(Math.abs(blend('A',x,z)-blend('B',x-c.x,z-c.z))<1e-8);
   assert.equal(blend('A',x,z),backwards('A',x,z));
  }
 }
 const items=[{id:'A',...a,height:()=>-25},{id:'B',hexQ:1,hexR:0,height:()=>-9},{id:'C',hexQ:1,hexR:-1,height:()=>-17}],blend=createTerrainBlend(items);
 for(const w of items){const c=axialPosition(w.hexQ,w.hexR);assert.ok(Math.abs(blend(w.id,144-c.x,-c.z)-blend('A',144,0))<1e-8);}
 const g=createHexTerrainGeometry((x,z)=>blend('A',x,z));
 assert.ok(g.attributes.position.array.every(Number.isFinite));
 for(let i=0;i<g.attributes.normal.count;i++)assert.ok(g.attributes.normal.getY(i)>0);
 g.dispose();
});
test('legacy records accepted; malformed and incompatible data rejected before activation',()=>{
 for(const v of [1,2,3,4])assert.ok(validateWorldRecord({world:{version:v,cells:[{key:'-1,2',type:'coral'}]}}));
 for(const world of [{version:4,cells:[{key:'bad'}]},{version:4,cells:[],terrain:[{key:'0,0',offset:NaN}]},{version:4,cells:[],worldHalf:200}])assert.throws(()=>validateWorldRecord({world}));
});
test('own draft survives foreign visit; entry rechecks access and positions never overlap',async()=>{
 const db={A:record('A'),B:record('B','other')};let active=structuredClone(db.A),reads=0,denied=false;
 const e=createWorldTravel({readWorld:async id=>{reads++;if(denied)throw Error('permission_denied');return structuredClone(db[id]);},capture:()=>active,getUserId:()=> 'me',activate:async(id,r)=>active=r});
 e.setCurrent('A',active,a);e.setPosition('B',{hexQ:0,hexR:-1});assert.throws(()=>e.setPosition('C',a));
 active.world.cells.push({key:'0,0',layers:[{type:'coral',id:1}]});
 await e.prefetch('B');denied=true;
 assert.equal(await e.travelTo('B',{x:0,y:-12,z:-125}),false);assert.equal(e.current.id,'A');assert.equal(active.world.cells.length,1);
 denied=false;assert.equal(await e.travelTo('B',{x:0,y:-12,z:-125}),true);assert.equal(active.ownerId,'other');
 assert.equal(await e.travelTo('A',{x:0,y:-12,z:125}),true);assert.equal(active.world.cells.length,1);assert.equal(db.A.world.cells.length,0);assert.ok(reads>=4);
 e.dispose();
});
test('failed activation rolls back; duplicate travel and timed out responses cannot replace the current world',async()=>{
 let active=record('A'),calls=[];
 const e=createWorldTravel({readWorld:async()=>record('B'),capture:()=>active,getUserId:()=> 'me',activate:async(id,r,p,c)=>{calls.push(id);active=r;if(!c.rollback)throw Error('renderer failed');}});
 e.setCurrent('A',active,a);e.setPosition('B',{hexQ:0,hexR:-1});
 const trip=e.travelTo('B',{x:0,y:-12,z:-125});assert.equal(await e.travelTo('B',{x:0,y:-12,z:-125}),false);assert.equal(await trip,false);assert.equal(e.current.id,'A');assert.equal(active.name,'A');assert.deepEqual(calls,['B','A']);e.dispose();
 let resolve;const slow=createWorldTravel({readWorld:()=>new Promise(r=>resolve=r),capture:()=>record('A'),activate:()=>assert.fail(),timeout:5});
 slow.setCurrent('A',record('A'),a);slow.setPosition('B',{hexQ:0,hexR:-1});assert.equal(await slow.travelTo('B',{x:0,y:0,z:-125}),false);resolve(record('B'));await new Promise(r=>setTimeout(r,5));assert.equal(slow.current.id,'A');assert.equal(slow.cached('B'),null);slow.dispose();
});
test('cache stays bounded and a fresh read follows an in-flight prefetch',async()=>{
 let reads=0;const e=createWorldTravel({readWorld:async id=>{reads++;return record(id);},capture:()=>record('A'),activate:()=>{}});
 e.setCurrent('A',record('A'),a);await Promise.all([e.prefetch('B'),e.prefetch('B',{fresh:true})]);assert.equal(reads,2);
 for(let i=0;i<12;i++)await e.prefetch('world'+i);assert.equal(e.cacheSize,7);assert.ok(e.cached('A'));e.dispose();
});
