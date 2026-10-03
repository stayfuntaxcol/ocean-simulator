import { sculptKey, SCULPT_CELL_SIZE } from './VolumeSculpt.js';

export const SCULPT_SECTOR_CELLS=4;
export const SCULPT_CHUNK_CELLS=8;
export const SCULPT_DENSITY_THRESHOLD=.18;
export const SCULPT_BUDGETS=Object.freeze({chunk:12000,lowChunk:3000,desktop:150000,mobile:70000});
export const SCULPT_FACE_NEIGHBORS=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];

// Density is authoritative. Render data and dirty flags are derived, never saved.
export class SculptChunkManager {
  constructor({cellSize=SCULPT_CELL_SIZE,chunkCells=SCULPT_CHUNK_CELLS}={}){
    this.cellSize=cellSize;this.chunkCells=chunkCells;
    this.cells=new Map();this.chunks=new Map();this.sectors=new Map();this.dirty=new Set();
  }
  keyFor(ix,iy,iz,size=this.chunkCells){return sculptKey(Math.floor(ix/size),Math.floor(iy/size),Math.floor(iz/size));}
  setCell(ix,iy,iz,density){
    const key=sculptKey(ix,iy,iz),chunkKey=this.keyFor(ix,iy,iz),sectorKey=this.keyFor(ix,iy,iz,SCULPT_SECTOR_CELLS);
    if((this.cells.get(key)||0)===(density>=.02?density:0))return false;
    if(density>=.02){
      this.cells.set(key,density);
      if(!this.chunks.has(chunkKey)){
        const index=chunkKey.split(',').map(Number);
        this.chunks.set(chunkKey,{key:chunkKey,index,min:index.map(n=>n*this.chunkCells),cells:new Set()});
      }
      this.chunks.get(chunkKey).cells.add(key);
      if(!this.sectors.has(sectorKey))this.sectors.set(sectorKey,new Set());
      this.sectors.get(sectorKey).add(key);
    }else{
      this.cells.delete(key);this.chunks.get(chunkKey)?.cells.delete(key);this.sectors.get(sectorKey)?.delete(key);
      if(!this.chunks.get(chunkKey)?.cells.size)this.chunks.delete(chunkKey);
      if(!this.sectors.get(sectorKey)?.size)this.sectors.delete(sectorKey);
    }
    // One-sample halo, including corners, for meshing/gradients across boundaries.
    for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++)
      this.dirty.add(this.keyFor(ix+dx,iy+dy,iz+dz));
    return true;
  }
  load(cells,cellSize=this.cellSize){
    for(const key of this.chunks.keys())this.dirty.add(key);
    this.cells.clear();this.chunks.clear();this.sectors.clear();this.cellSize=cellSize;
    for(const cell of cells)this.setCell(cell.ix,cell.iy,cell.iz,cell.density);
  }
  markAllDirty(){for(const key of this.chunks.keys())this.dirty.add(key);}
  surfaceCells(chunk,threshold=.02){
    const out=[];
    for(const key of chunk.cells){
      const density=this.cells.get(key),[ix,iy,iz]=key.split(',').map(Number);
      if(density>=threshold&&SCULPT_FACE_NEIGHBORS.some(([dx,dy,dz])=>(this.cells.get(sculptKey(ix+dx,iy+dy,iz+dz))||0)<threshold))
        out.push({key,ix,iy,iz,density});
    }
    return out;
  }
}
