import * as C from 'cannon-es';
import * as T from './vendor/three.module.js';
import {CELL, WIDTH, ROWS, HALF, WORLD_DEPTH} from './earth-model.mjs';

export function createRigidDebris(earth, writePiece, mobile=false) {
  const world = new C.World({gravity:new C.Vec3(0,-9.82,0),allowSleep:true});
  world.broadphase = new C.SAPBroadphase(world);
  world.solver.iterations = 8;
  const material = new C.Material('concrete');
  world.addContactMaterial(new C.ContactMaterial(material,material,{friction:.72,restitution:.12}));
  let entries=[], ground=null;
  const statics=new Map(), limit=mobile?260:420;
  const boxGeometry = new T.Box3(), matrix=new T.Matrix4(), scale=new T.Vector3(1,1,1);
  const position=new C.Vec3(), rotation=new C.Quaternion();

  function refreshGround() {
    if(ground) world.removeBody(ground);
    const data=Array.from({length:WIDTH+1},(_,ix)=>Array.from({length:WIDTH+1},(_,iz)=>{
      const x=Math.min(WIDTH-1,ix), z=Math.max(0,WIDTH-1-iz);
      let row=0; while(row<ROWS&&!earth.solid(x,row,z)) row++;
      return row===ROWS ? -WORLD_DEPTH-12 : -row*CELL;
    }));
    ground=new C.Body({mass:0,material,shape:new C.Heightfield(data,{elementSize:CELL}),collisionFilterGroup:1,collisionFilterMask:2});
    ground.position.set(-HALF,0,HALF); ground.quaternion.setFromEuler(-Math.PI/2,0,0);
    world.addBody(ground);
    for(const {body} of entries) body.wakeUp();
  }
  function syncStructure(pieces,live) {
    const wanted=new Set(pieces.filter(p=>(p.kind==='slab'||p.kind==='column')&&live(p)));
    for(const [p,body] of statics) if(!wanted.has(p)) {world.removeBody(body);statics.delete(p);}
    for(const p of wanted) if(!statics.has(p)) {
      const body=new C.Body({mass:0,material,shape:new C.Box(new C.Vec3(p.s.x/2,p.s.y/2,p.s.z/2)),collisionFilterGroup:1,collisionFilterMask:2});
      body.position.copy(p.home);body.quaternion.copy(p.q); world.addBody(body); statics.set(p,body);
    }
    for(const {body} of entries) body.wakeUp();
  }
  function draw(entry) {
    const {body}=entry;
    const shrink=Math.min(1,Math.max(0,(entry.life-entry.age)/1.5));
    for(const owner of entry.owners) {
      body.quaternion.vmult(owner.offset,position); position.vadd(body.position,position);
      body.quaternion.mult(owner.q,rotation);
      owner.p.debris.position.copy(position); owner.p.debris.quaternion.copy(rotation); owner.p.debris.scale=shrink;
      writePiece(owner.p);
    }
  }
  function remove(entry) {
    world.removeBody(entry.body);
    for(const {p} of entry.owners) {p.debris=null;writePiece(p);}
  }
  function clear() {for(const entry of entries) remove(entry); entries=[]; world.accumulator=0;}
  function createEntry(parts,center,spec,collapse) {
    const bounds=new T.Box3(); let volume=0;
    for(const p of parts) {
      boxGeometry.set(p.s.clone().multiplyScalar(-.5),p.s.clone().multiplyScalar(.5));
      matrix.compose(p.home,p.q,scale);bounds.union(boxGeometry.applyMatrix4(matrix));volume+=p.s.x*p.s.y*p.s.z;
    }
    const size=bounds.getSize(new T.Vector3()), mid=bounds.getCenter(new T.Vector3());
    const body=new C.Body({mass:Math.max(.25,volume*1.4),material,shape:new C.Box(new C.Vec3(Math.max(.04,size.x/2),Math.max(.04,size.y/2),Math.max(.04,size.z/2))),linearDamping:.12,angularDamping:.18,sleepSpeedLimit:.25,sleepTimeLimit:1,collisionFilterGroup:2,collisionFilterMask:3});
    body.position.copy(mid);
    const outward=new T.Vector3().subVectors(mid,center);outward.y*=.25;outward.normalize();
    const power=collapse?.6:Math.min(9,2+spec.radius*.65);
    body.velocity.set(outward.x*power,collapse?-.5:1.6+power*.3,outward.z*power);
    body.angularVelocity.set((Math.random()-.5)*2.4,(Math.random()-.5)*1.5,(Math.random()-.5)*2.4);
    const entry={body,owners:parts.map(p=>({p,offset:new C.Vec3(p.home.x-mid.x,p.home.y-mid.y,p.home.z-mid.z),q:new C.Quaternion(p.q.x,p.q.y,p.q.z,p.q.w)})),age:0,life:22,attractor:spec.id==='blackhole'?new C.Vec3(center.x,center.y,center.z):null};
    for(const {p} of entry.owners) p.debris={position:p.home.clone(),quaternion:p.q.clone(),scale:1};
    world.addBody(body);entries.push(entry);draw(entry);
  }
  function spawn(parts,center,spec,collapse=false) {
    if(!parts.length) return;
    // Nearby fragments share a body during large collapses; rendering retains
    // every original panel and its photo coordinates, within a bounded budget.
    const batches=new Map(), individual=!collapse&&parts.length<45;
    for(let i=0;i<parts.length;i++) {
      const p=parts[i], key=individual?i:`${p.floor}:${Math.floor((p.home.x+10)/5)}:${Math.floor((p.home.z+6)/4)}`;
      if(!batches.has(key)) batches.set(key,[]); batches.get(key).push(p);
    }
    for(const batch of batches.values()) createEntry(batch,center,spec,collapse);
    while(entries.length>limit) {
      const asleep=entries.findIndex(e=>e.body.sleepState===C.Body.SLEEPING);
      const [old]=entries.splice(asleep<0?0:asleep,1);remove(old);
    }
  }
  function blast(center,spec) {
    let touched=0;
    for(const entry of entries) {
      const delta=new C.Vec3(entry.body.position.x-center.x,entry.body.position.y-center.y,entry.body.position.z-center.z);
      const length=delta.length();
      if(length>spec.radius+3) continue;
      delta.normalize();delta.scale(entry.body.mass*(3+spec.radius*.45),delta);delta.y+=entry.body.mass*2;
      entry.body.wakeUp();entry.body.applyImpulse(delta);entry.age=Math.min(entry.age,12);touched++;
      if(spec.id==='blackhole') {entry.attractor=new C.Vec3(center.x,center.y,center.z);entry.age=0;}
    }
    return touched;
  }
  function step(dt) {
    for(const entry of entries) if(entry.attractor&&entry.age<1.4) {
      const force=entry.attractor.vsub(entry.body.position); force.scale(entry.body.mass*18,force);entry.body.applyForce(force);
    }
    world.step(1/60,Math.min(dt,.05),3);
    for(let i=entries.length-1;i>=0;i--) {
      const entry=entries[i];entry.age+=dt;
      if(entry.age>=entry.life||entry.body.position.y< -WORLD_DEPTH-25) {remove(entry);entries.splice(i,1);}
      else draw(entry);
    }
  }
  function snapshot() {
    return entries.map(e=>({owners:e.owners,position:e.body.position.clone(),quaternion:e.body.quaternion.clone(),velocity:e.body.velocity.clone(),angularVelocity:e.body.angularVelocity.clone(),half:e.body.shapes[0].halfExtents.clone(),mass:e.body.mass,age:e.age,life:e.life,attractor:e.attractor?.clone()}));
  }
  function restore(saved) {
    clear();
    for(const s of saved) {
      const body=new C.Body({mass:s.mass,material,shape:new C.Box(s.half.clone()),linearDamping:.12,angularDamping:.18,sleepSpeedLimit:.25,sleepTimeLimit:1,collisionFilterGroup:2,collisionFilterMask:3});
      body.position.copy(s.position);body.quaternion.copy(s.quaternion);body.velocity.copy(s.velocity);body.angularVelocity.copy(s.angularVelocity);
      const e={body,owners:s.owners,age:s.age,life:s.life,attractor:s.attractor?.clone()};
      for(const {p} of e.owners) p.debris={position:p.home.clone(),quaternion:p.q.clone(),scale:1};
      world.addBody(body);entries.push(e);draw(e);
    }
  }
  refreshGround();
  return {spawn,step,blast,clear,snapshot,restore,refreshGround,syncStructure,get count(){return entries.length;},dispose(){clear();for(const body of [...world.bodies]) world.removeBody(body);statics.clear();}};
}
