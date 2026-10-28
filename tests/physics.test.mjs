import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../src/vendor/three.module.js';
import {createRigidDebris} from '../src/rigid-debris.mjs';
import {createEarth} from '../src/earth-model.mjs';

const spec={id:'hammer',radius:2};
const piece=(y,x=0)=>({s:new T.Vector3(1,1,1),home:new T.Vector3(x,y,0),q:new T.Quaternion(),floor:0,kind:'shell',state:1,debris:null});
const advance=(physics,seconds)=>{for(let i=0;i<seconds*60;i++) physics.step(1/60);};

test('rigid chunks fall under gravity, collide with terrain and retain an undoable pose',()=>{
  const physics=createRigidDebris(createEarth(),()=>{}),p=piece(12);
  physics.spawn([p],new T.Vector3(0,12,0),spec,true);
  advance(physics,1);assert.ok(p.debris.position.y<9);
  const saved=physics.snapshot(),old=p.debris.position.clone();
  advance(physics,8);assert.ok(p.debris.position.y>.4&&p.debris.position.y<.9);
  physics.restore(saved);assert.ok(p.debris.position.distanceTo(old)<1e-6);
  physics.dispose();assert.equal(p.debris,null);
});

test('chunks land on intact slabs and fall into newly excavated holes',()=>{
  const earth=createEarth(),physics=createRigidDebris(earth,()=>{}),p=piece(10);
  const slab={...piece(3),s:new T.Vector3(8,.2,8),kind:'slab',state:0};
  physics.syncStructure([slab],p=>p.state===0);
  physics.spawn([p],p.home,spec,true);advance(physics,8);
  assert.ok(p.debris.position.y>3.4&&p.debris.position.y<4);
  slab.state=1;physics.syncStructure([slab],p=>p.state===0);
  earth.carve({x:0,y:-3,z:0},9,1);physics.refreshGround();advance(physics,6);
  assert.ok(p.debris.position.y< -3,`chunk must enter the hole: ${p.debris.position.y}`);
  physics.dispose();
});

test('debris collides with other debris and the mobile simulation stays bounded',()=>{
  const physics=createRigidDebris(createEarth(),()=>{},true),a=piece(2),b=piece(4);
  physics.spawn([a],a.home,spec,true);physics.spawn([b],b.home,spec,true);advance(physics,8);
  assert.ok(a.debris.position.distanceTo(b.debris.position)>.8);
  assert.ok(a.debris.position.y>.4&&b.debris.position.y>.4);
  for(let i=0;i<310;i++) {const p=piece(20+i%5,i%35-17);physics.spawn([p],p.home,spec);}
  assert.ok(physics.count<=260);physics.clear();assert.equal(physics.count,0);physics.dispose();
});
