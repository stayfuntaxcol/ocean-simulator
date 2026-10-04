import {applyVolumeBrush,sculptKey} from '../../worlds/VolumeSculpt.js';
import {SculptChunkManager} from '../../worlds/SculptChunkManager.js';
import {buildSculptSurfaceNets,sculptRenderChunks} from '../../worlds/SculptSurfaceNets.js';
import {normalizeAnimalDesign,clamp} from './AnimalDesign.js';
// Same volumetric brush and Surface Nets as the rock editor, in object-local units.
const profile=[[-20,.18,.18],[-18,.7,.65],[-15,1.1,1],[-11,2.35,1.9],[-6,3.35,2.85],[0,4,3.5],[6,4.3,3.7],[11,3.7,3.2],[15,2.8,2.65],[18,2.15,2.2],[20,.08,.08]];
function radiusAt(x){for(let i=1;i<profile.length;i++)if(x<=profile[i][0]){const a=profile[i-1],b=profile[i],t=clamp((x-a[0])/(b[0]-a[0]),0,1);return [a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];}return [.08,.08];}
function ellipsoid(x,y,z,c,r){const q=Math.hypot((x-c[0])/r[0],(y-c[1])/r[1],(z-c[2])/r[2]);return (q-1)*Math.min(...r);}
const smoothMin=(a,b,k=.5)=>{const h=clamp(.5+.5*(b-a)/k,0,1);return b+(a-b)*h-k*h*(1-h);};
export function orcaDensity(x,y,z,form){
 const f=form,xx=x*40/f.length,[ry,rz]=radiusAt(xx),head=xx>10?1+(f.head-1)*clamp((xx-10)/8,0,1):1;
 let body=(Math.hypot(y/(ry*f.girth),z/(rz*f.girth*head))-1)*Math.min(ry,rz)*f.girth;
 body=Math.max(body,Math.abs(xx)-20);
 // Swept hydrofoil volumes, narrowing toward swept-back rounded tips.
 for(const side of [-1,1]){
  const span=7.9*f.flippers,t=clamp((side*z-2.1)/span,0,1),cx=7.5-6*t,cy=-1.8-1.7*t;
  const width=2.45*(1-.77*t),thickness=.65*(1-.55*t);
  let fin=(Math.hypot((xx-cx)/width,(y-cy)/thickness)-1)*thickness;
  fin=Math.max(fin,2.1-side*z,side*z-(span+2.1));body=smoothMin(body,fin,.65);
  const tz=side*z,tf=clamp(tz/(6.8*f.flukes),0,1);
  const tail=ellipsoid(xx,y,z,[-18.7-1.8*tf,0,side*3.5*f.flukes],[2.9,.5,3.6*f.flukes]);
  body=smoothMin(body,tail,.5);
 }
 const h=6*f.dorsal,t=clamp((y-3.2)/h,0,1);
 const dorsal=(Math.hypot((xx-(-.5-3.7*t))/(2.6*(1-.88*t)),z/(.7*(1-.65*t)))-1)*.6;
 body=smoothMin(body,Math.max(dorsal,3.2-y,y-(3.2+h)),.4);
 return body;
}
export function buildAnimalCells(input,{cellSize}={}){
 const d=normalizeAnimalDesign(input),s=cellSize||d.resolution,cells=new Map();
 for(let ix=Math.floor(-25/s);ix<=Math.ceil(25/s);ix++)for(let iy=Math.floor(-6/s);iy<=Math.ceil(12/s);iy++)for(let iz=Math.floor(-13/s);iz<=Math.ceil(13/s);iz++){
  const distance=orcaDensity(ix*s,iy*s,iz*s,d.form),density=clamp(.18-distance/(s*2),0,1);if(density>=.02)cells.set(sculptKey(ix,iy,iz),density);
 }
 for(const stroke of d.strokes)applyAnimalBrush(cells,stroke,s);
 return {cells,cellSize:s};
}
export function applyAnimalBrush(cells,stroke,cellSize){
 const points=[stroke.point];if(stroke.mirror&&Math.abs(stroke.point[2])>.05)points.push([stroke.point[0],stroke.point[1],-stroke.point[2]]);
 for(const p of points)applyVolumeBrush(cells,{x:p[0],y:p[1],z:p[2]},{mode:stroke.mode,cellSize,radius:stroke.radius,strength:stroke.strength,accept:c=>Math.abs(c.x)<=30&&Math.abs(c.y)<=20&&Math.abs(c.z)<=20});
}
export function meshAnimalCells({cells,cellSize}){
 const manager=new SculptChunkManager({cellSize});manager.load([...cells].map(([key,density])=>{const [ix,iy,iz]=key.split(',').map(Number);return {ix,iy,iz,density};}));
 const positions=[],normals=[],indices=[],lookup=new Map();
 for(const chunk of sculptRenderChunks(manager).values()){
  const surface=buildSculptSurfaceNets(manager,chunk,{shapeLevel:5}),local=[];
  surface.vertexKeys.forEach((key,i)=>{let v=lookup.get(key);if(v===undefined){v=positions.length/3;lookup.set(key,v);positions.push(...surface.positions.slice(i*3,i*3+3));normals.push(...surface.normals.slice(i*3,i*3+3));}local.push(v);});
  for(const i of surface.indices)indices.push(local[i]);
 }
 if(indices.length/3>110000)throw Error('Sculptuur overschrijdt het detailbudget. Kies een lagere resolutie.');
 return {positions:new Float32Array(positions),normals:new Float32Array(normals),indices:new Uint32Array(indices),stats:{vertices:positions.length/3,triangles:indices.length/3,cells:cells.size,cellSize}};
}
export function buildAnimalSurface(design,options){return meshAnimalCells(buildAnimalCells(design,options));}
