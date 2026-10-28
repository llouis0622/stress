import * as T from './vendor/three.module.js';
import {CELL, HALF} from './earth-model.mjs';

const transmits = p => p.kind !== 'furniture';

// Static contact graph. Broken parts are filtered at traversal time. Furniture
// can rest on a slab, but cannot hold up a floor or bridge two broken walls.
export function createStructure(roots, earth) {
  const cachedBoxes=new WeakMap();
  function bounds(p) {
    if(cachedBoxes.has(p)) return cachedBoxes.get(p);
    const matrix = new T.Matrix4().compose(p.home,p.q,new T.Vector3(1,1,1));
    const box=new T.Box3(p.s.clone().multiplyScalar(-.5),p.s.clone().multiplyScalar(.5)).applyMatrix4(matrix).expandByScalar(.085);
    cachedBoxes.set(p,box);return box;
  }
  const boxes = roots.map(bounds);
  const buckets = new Map(), links = roots.map(()=>[]);
  boxes.forEach((b,i) => {
    const seen = new Set();
    for(let x=Math.floor(b.min.x/3);x<=Math.floor(b.max.x/3);x++)
      for(let y=Math.floor(b.min.y/3);y<=Math.floor(b.max.y/3);y++)
        for(let z=Math.floor(b.min.z/3);z<=Math.floor(b.max.z/3);z++) {
          const key=`${x},${y},${z}`, list=buckets.get(key)||[];
          for(const j of list) if(!seen.has(j)) {
            seen.add(j);
            if((transmits(roots[i])||transmits(roots[j])) && b.intersectsBox(boxes[j])) {links[i].push(j);links[j].push(i);}
          }
          list.push(i); buckets.set(key,list);
        }
  });
  const slabs=roots.map((p,i)=>({p,i})).filter(({p})=>p.kind==='slab');
  roots.forEach((p,i)=>{
    if(transmits(p)) return;
    for(const {p:slab,i:j} of slabs) {
      if(slab.floor!==p.floor||slab.home.y>p.home.y) continue;
      if(Math.abs(p.home.x-slab.home.x)<(p.s.x+slab.s.x)/2 && Math.abs(p.home.z-slab.home.z)<(p.s.z+slab.s.z)/2) links[j].push(i);
    }
  });
  function grounded(p,b) {
    if(b.min.y>.3) return false;
    for(const x of [p.home.x,b.min.x+.1,b.max.x-.1]) for(const z of [p.home.z,b.min.z+.1,b.max.z-.1])
      if(earth.solid(Math.floor((x+HALF)/CELL),0,Math.floor((z+HALF)/CELL))) return true;
    return false;
  }
  function unsupported(live) {
    const parts=roots.map(p=>live(p)?[p]:p.state===2?p.children.filter(live):[]);
    const reached=new Set(),queue=[];
    parts.forEach((list,i)=>{for(const p of list) if(transmits(p)&&grounded(p,bounds(p))) {reached.add(p);queue.push({p,i});}});
    for(let head=0;head<queue.length;head++) {
      const {p,i}=queue[head], b=bounds(p);
      for(const j of [i,...links[i]]) for(const neighbor of parts[j]) {
        if(reached.has(neighbor)) continue;
        const restsOnSlab=p.kind==='slab'&&neighbor.kind==='furniture'&&p.floor===neighbor.floor&&p.home.y<=neighbor.home.y&&Math.abs(p.home.x-neighbor.home.x)<(p.s.x+neighbor.s.x)/2&&Math.abs(p.home.z-neighbor.home.z)<(p.s.z+neighbor.s.z)/2;
        if(!restsOnSlab&&!b.intersectsBox(bounds(neighbor))) continue;
        reached.add(neighbor);if(transmits(neighbor)) queue.push({p:neighbor,i:j});
      }
    }
    return parts.flat().filter(p=>!reached.has(p));
  }
  return {unsupported};
}
