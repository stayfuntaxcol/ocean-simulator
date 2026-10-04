import * as THREE from 'three';
import {containsHex,HEX} from '../worlds/HexWorld.js';
// Swept body sections cover the body, swept tail and both fins, including turns.
export function animalPathClear(record,from,to,extent,phase,{terrain=()=>-18,rocks=[],sculptHit=()=>false}={}){
 if(phase!=='migrate'&&!containsHex(to,HEX.radius-extent.x-1))return false;
 const yaw=record.heading||0,c=Math.cos(yaw),s=Math.sin(yaw),steps=Math.max(1,Math.ceil(from.distanceTo(to)/1.5));
 const parts=[[-.72,0,.32],[0,0,.66],[.65,0,.48],[.05,.82,.20],[.05,-.82,.20],[-.08,0,.15,.72]];
 for(let i=0;i<=steps;i++){const t=i/steps,center=from.clone().lerp(to,t);
 for(const [x,z,k,y=0] of parts){const radius=Math.min(extent.y,extent.z)*k,p=center.clone().add(new THREE.Vector3(x*extent.x*c-z*extent.z*s,y*extent.y,x*extent.x*s+z*extent.z*c));
 if(p.y-radius<terrain(p.x,p.z)+.15)return false;
 if(phase==='cruise'||phase==='migrate'){if(p.y+radius>19.55)return false;}
 for(const rock of rocks){const nearest=rock.clampPoint(p,new THREE.Vector3());if(nearest.distanceToSquared(p)<radius*radius)return false;}
 const old=from.clone().add(p.clone().sub(center));if(sculptHit(old,p,radius))return false;
 }}return true;
}
