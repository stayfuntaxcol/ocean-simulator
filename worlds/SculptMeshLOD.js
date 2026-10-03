// Conservative edge collapse. Boundary vertices never move, so mixed LOD chunks
// retain identical seams. The manifold link condition preserves tunnel topology.
export function simplifySculptSurface(surface,{min,max,cellSize=3,ratio=.5,gridOrigin=[0,0,0],boundarySides=[[true,true],[true,true],[true,true]]}={}){
  const positions=surface.positions.slice(),normals=surface.normals.slice();
  const faces=[];for(let i=0;i<surface.indices.length;i+=3)faces.push(surface.indices.slice(i,i+3));
  const count=positions.length/3,adj=Array.from({length:count},()=>new Set()),incident=Array.from({length:count},()=>new Set());
  const locked=Array.from({length:count},(_,v)=>{
    const cube=surface.vertexKeys?.[v]?.split(',').map(Number);
    return [0,1,2].some(a=>
      (boundarySides[a][0]&&(cube?cube[a]*cellSize-gridOrigin[a]<=min[a]-cellSize:positions[v*3+a]<=min[a]+cellSize))||
      (boundarySides[a][1]&&(cube?cube[a]*cellSize-gridOrigin[a]>=max[a]-cellSize:positions[v*3+a]>=max[a]-cellSize)));
  });
  const add=(id)=>{const f=faces[id];if(!f)return;for(const v of f){incident[v].add(id);for(const w of f)if(w!==v)adj[v].add(w);}};
  faces.forEach((f,i)=>add(i));
  const candidates=[];
  for(let a=0;a<count;a++)if(!locked[a])for(const b of adj[a])if(b>a&&!locked[b]){
    const distance=[0,1,2].reduce((sum,i)=>sum+(positions[a*3+i]-positions[b*3+i])**2,0);
    if(distance<=cellSize*cellSize*2.25)candidates.push({a,b,distance});
  }
  candidates.sort((a,b)=>a.distance-b.distance);let total=faces.length;
  const faceNormal=(f,replacement=null)=>{
    const p=f.map(v=>v===replacement?.id?replacement.point:positions.slice(v*3,v*3+3));
    const u=p[1].map((v,i)=>v-p[0][i]),w=p[2].map((v,i)=>v-p[0][i]);
    return [u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]];
  };
  const removed=new Set();
  for(const {a,b} of candidates){
    if(total<=faces.length*ratio)break;
    if(removed.has(a)||removed.has(b)||!adj[a].has(b))continue;
    const common=[...adj[a]].filter(v=>adj[b].has(v));
    const shared=[...incident[a]].filter(id=>faces[id]?.includes(b));
    if(shared.length!==2||common.length!==2)continue;
    const dot=[0,1,2].reduce((sum,i)=>sum+normals[a*3+i]*normals[b*3+i],0);if(dot<.90)continue;
    const affected=new Set([...incident[a],...incident[b]]),point=[0,1,2].map(i=>(positions[a*3+i]+positions[b*3+i])*.5);
    let safe=true;
    for(const id of affected){
      const f=faces[id];if(!f||shared.includes(id))continue;
      const before=faceNormal(f),after=faceNormal(f.map(v=>v===b?a:v),{id:a,point});
      const lengths=Math.hypot(...before)*Math.hypot(...after);
      if(lengths<1e-9||before.reduce((sum,v,i)=>sum+v*after[i],0)/lengths<.75){safe=false;break;}
    }
    if(!safe)continue;
    const neighborhood=new Set([a,b,...adj[a],...adj[b]]);
    for(const id of affected){const f=faces[id];if(f)for(const v of f)incident[v].delete(id);}
    for(const id of affected){
      if(shared.includes(id)){faces[id]=null;total--;}
      else faces[id]=faces[id].map(v=>v===b?a:v);
    }
    for(let i=0;i<3;i++)positions[a*3+i]=point[i];
    const normal=[0,1,2].map(i=>normals[a*3+i]+normals[b*3+i]),length=Math.hypot(...normal)||1;
    for(let i=0;i<3;i++)normals[a*3+i]=normal[i]/length;
    removed.add(b);incident[b].clear();
    for(const id of affected)if(faces[id])for(const v of faces[id])incident[v].add(id);
    for(const v of neighborhood){adj[v].clear();for(const id of incident[v])for(const w of faces[id])if(w!==v)adj[v].add(w);}
  }
  const remap=new Map(),out={positions:[],normals:[],indices:[],stats:{}};
  for(const f of faces)if(f)for(const v of f){
    if(!remap.has(v)){remap.set(v,remap.size);out.positions.push(...positions.slice(v*3,v*3+3));out.normals.push(...normals.slice(v*3,v*3+3));}
    out.indices.push(remap.get(v));
  }
  out.stats={vertices:out.positions.length/3,triangles:out.indices.length/3};return out;
}
