import test from 'node:test';
import assert from 'node:assert/strict';
import {createEarth, CELL, WIDTH, ROWS, WORLD_DEPTH, LAYERS, layerAt, travelKm} from '../src/earth-model.mjs';
import {TOOLS} from '../src/tools.mjs';

test('fine hits remove the touched ground and undo restores the same surface', () => {
  const earth=createEarth(), origin={x:1.5,y:12,z:1.5}, direction={x:0,y:-1,z:0};
  const first=earth.raycast(origin,direction);
  assert.ok(Math.abs(first.point.y)<.001);
  const changes=earth.carve(first.point,.58,1.8);
  assert.ok(changes.length>0&&changes.length<10);
  assert.equal(earth.count,changes.length);
  assert.ok(earth.raycast(origin,direction).point.y<=-CELL);
  earth.restore(changes);
  assert.equal(earth.count,0);assert.equal(earth.deepest,0);
  assert.equal(earth.raycast(origin,direction).index,first.index);
});

test('continuous drilling passes every layer and exits the opposite surface', () => {
  const earth=createEarth(), drill=TOOLS.find(t=>t.id==='drill'), visited=new Set();
  let strokes=0;
  while(!earth.through&&strokes<300){
    const clip=Math.max(0,Math.floor(Math.max(0,earth.deepest-6)/CELL)-2);
    const hit=earth.raycast({x:1.5,y:-clip*CELL+10,z:1.5},{x:0,y:-1,z:0},clip,18);
    assert.ok(hit,'The next solid floor stays reachable');
    const changed=earth.carve({...hit.point,y:hit.point.y-drill.offset},drill.radius,drill.vertical);
    assert.ok(changed.length>0);
    for(const id of changed)visited.add(layerAt(-earth.center(id).y).name);
    strokes++;
  }
  assert.ok(earth.through);assert.equal(earth.deepest,WORLD_DEPTH);
  assert.deepEqual([...visited],LAYERS.map(l=>l.name));
  assert.equal(travelKm(earth.deepest),12742);
  assert.ok(strokes<100,'Traversal is playable rather than thousands of repeated clicks');
  assert.equal(earth.raycast({x:1.5,y:10,z:1.5},{x:0,y:-1,z:0}),null);
  assert.ok(earth.raycast({x:40,y:10,z:40},{x:0,y:-1,z:0}),'Surrounding land remains breakable after breakthrough');
});

test('all surrounding terrain can be removed, restored and reset without a permanent floor', () => {
  const earth=createEarth();
  const changes=earth.carve({x:0,y:-WORLD_DEPTH/2,z:0},1000);
  assert.equal(earth.count,WIDTH*WIDTH*ROWS);
  let visible=0;earth.exposed(0,ROWS,()=>visible++);assert.equal(visible,0);
  earth.restore(changes);assert.equal(earth.count,0);assert.equal(earth.through,false);
  earth.carve({x:-40,y:0,z:36},8);earth.reset();assert.equal(earth.count,0);assert.equal(earth.deepest,0);
});

test('undoing deep and shallow hits in reverse order restores the reached depth', () => {
  const earth=createEarth();const a=earth.carve({x:0,y:0,z:0},5);const first=earth.deepest;
  const b=earth.carve({x:0,y:-8,z:0},7);const deep=earth.deepest;
  const c=earth.carve({x:30,y:0,z:30},3);
  earth.restore(c);assert.equal(earth.deepest,deep);
  earth.restore(b);assert.equal(earth.deepest,first);
  earth.restore(a);assert.equal(earth.deepest,0);assert.equal(earth.count,0);
});

test('cutaway picking matches the visible clipped terrain, including side and grazing rays', () => {
  const earth=createEarth();
  const hit=earth.raycast({x:1,y:20,z:1},{x:0,y:-1,z:0},50,18);
  assert.ok(Math.abs(hit.point.y+50*CELL)<.001);
  assert.equal(earth.raycast({x:100,y:5,z:100},{x:0,y:-1,z:0}),null);
  assert.ok(earth.raycast({x:-100,y:-10,z:0},{x:1,y:0,z:0}));
  assert.equal(earth.raycast({x:-100,y:10,z:0},{x:1,y:0,z:0}),null);
});

test('every tool can damage ground and broad tools remove more than precise tools', () => {
  const counts={};
  for(const tool of TOOLS){const earth=createEarth();counts[tool.id]=earth.carve({x:1.5,y:-(tool.offset||0),z:1.5},tool.radius,tool.vertical).length;assert.ok(counts[tool.id]>0,tool.id);}
  assert.equal(TOOLS.length,9);assert.ok(counts.blackhole>counts.bomb);assert.ok(counts.bomb>counts.laser);assert.ok(counts.drill>counts.hammer);
});

test('the default angled camera can drill continuously without drifting outside the world',()=>{
  const earth=createEarth(),elevation=1.1,distance=115,azimuth=-1;
  let view=0,hits=0;
  for(;hits<150&&!earth.through;hits++){
    const origin={x:Math.sin(azimuth)*distance*Math.cos(elevation),y:-view+Math.sin(elevation)*distance,z:Math.cos(azimuth)*distance*Math.cos(elevation)};
    const direction={x:-origin.x/distance,y:(-view-origin.y)/distance,z:-origin.z/distance};
    const hit=earth.raycast(origin,direction,Math.max(0,Math.floor(view/CELL)-2),18);
    assert.ok(hit);
    earth.carve({...hit.point,y:hit.point.y-3.5},2.2,2.8);
    view=Math.max(view,earth.deepest-6);
  }
  assert.ok(earth.through);
});
