import test from 'node:test';
import assert from 'node:assert/strict';
import { mapBounds,mapPoint,worldPoint,mapHeading } from '../worlds/MapNavigation.js';
import { SIDES,axialPosition,arrivalPosition,apothem } from '../worlds/HexWorld.js';

test('north, east, south and west landmarks appear in their named map quadrants',()=>{
  const bounds=mapBounds(144,1,{x:90,z:80});
  for(const [point,expected] of [[{x:0,z:-72},{x:200,y:100}],[{x:72,z:0},{x:300,y:200}],
    [{x:0,z:72},{x:200,y:300}],[{x:-72,z:0},{x:100,y:200}]]){
    assert.deepEqual(mapPoint(point,bounds,400,400),expected);
    assert.deepEqual(worldPoint(expected,bounds,400,400),point);
  }
});
test('map click selects the same landmark while zoomed and clamped near each edge',()=>{
  for(const zoom of [1,1.5,2.25,4])for(const center of [{x:0,z:0},{x:-139,z:-139},{x:139,z:139}]){
    const b=mapBounds(144,zoom,center);
    assert.ok(b.minX>=-144&&b.maxX<=144&&b.minZ>=-144&&b.maxZ<=144);
    const northwest=worldPoint({x:0,y:0},b,200,300),southeast=worldPoint({x:200,y:300},b,200,300);
    assert.ok(northwest.x<southeast.x&&northwest.z<southeast.z);
    const pixel={x:53,y:91},roundtrip=mapPoint(worldPoint(pixel,b,200,300),b,200,300);
    assert.ok(Math.abs(roundtrip.x-pixel.x)<1e-10&&Math.abs(roundtrip.y-pixel.y)<1e-10);
  }
});
test('player arrow points up for north, right for east and follows all six atlas directions',()=>{
  const b=mapBounds(400,1,{x:0,z:0});
  for(const s of SIDES){
    const p=axialPosition(s.q,s.r),point=mapPoint(p,b,800,800),angle=mapHeading({x:s.nx,z:s.nz});
    const dx=point.x-400,dy=point.y-400,length=Math.hypot(dx,dy);
    assert.ok(Math.abs(Math.sin(angle)-dx/length)<1e-10);
    assert.ok(Math.abs(-Math.cos(angle)-dy/length)<1e-10);
  }
});
test('north visit exits at map top and arrives at neighbor map bottom; south reverses it',()=>{
  const b=mapBounds(144,1,{x:0,z:0}),origin={hexQ:0,hexR:0};
  for(const side of [0,3]){
    const s=SIDES[side],exit={x:0,y:-12,z:s.nz*(apothem(144)+.2)};
    const arrival=arrivalPosition(origin,{hexQ:s.q,hexR:s.r},exit);
    assert.equal(mapPoint(exit,b,400,400).y<200,side===0);
    assert.equal(mapPoint(arrival,b,400,400).y>200,side===0);
  }
});
