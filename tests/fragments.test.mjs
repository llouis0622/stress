import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../src/vendor/three.module.js';
import {panelParts} from '../src/fracture.mjs';
import {createFragments} from '../src/fragments.mjs';
import {createEarth} from '../src/earth-model.mjs';

test('subdivision keeps facade volume, thickness and texture-space footprint, including rotated panels',()=>{
  for(const size of [new T.Vector3(1,1.35,.18),new T.Vector3(.18,1.35,1),new T.Vector3(2.82,.17,2.7)]){
    const home=new T.Vector3(-10,20,6),q=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.PI/2);
    const parts=panelParts(size,home,q);
    assert.equal(parts.length,4);
    const volume=parts.reduce((sum,p)=>sum+p.size.x*p.size.y*p.size.z,0);
    assert.ok(Math.abs(volume-size.x*size.y*size.z)<1e-8);
    const average=parts.reduce((sum,p)=>sum.add(p.position),new T.Vector3()).multiplyScalar(.25);
    assert.ok(average.distanceTo(home)<1e-8);
    for(const p of parts){
      const relative=p.position.clone().sub(home).applyQuaternion(q.clone().invert());
      for(const axis of ['x','y','z'])assert.ok(Math.abs(relative[axis])+p.size[axis]/2<=size[axis]/2+1e-8);
      assert.equal(Math.min(p.size.x,p.size.y,p.size.z),Math.min(size.x,size.y,size.z));
    }
  }
});

test('mobile fragments remain bounded through repeated explosions and clear on undo/reset',()=>{
  const scene=new T.Scene(),fragments=createFragments(scene,createEarth(),true);
  for(let i=0;i<2000;i++)fragments.spawn(new T.Vector3(0,10,0),'#fff',10,i%2===0?new T.Vector3(0,0,0):null,12);
  fragments.step(.016);
  assert.equal(scene.children.length,1);
  assert.equal(scene.children[0].count,480);
  assert.equal(scene.children[0].instanceMatrix.count,480);
  fragments.clear();fragments.step(.016);assert.equal(scene.children[0].count,0);
  fragments.dispose();assert.equal(scene.children.length,0);
});
