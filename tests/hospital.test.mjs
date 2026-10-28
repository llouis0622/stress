import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../src/vendor/three.module.js';
import {buildHospital} from '../src/hospital-model.mjs';
import {buildInterior} from '../src/hospital-interior.mjs';
import {createStructure} from '../src/structure.mjs';
import {createPeople} from '../src/hospital-people.mjs';
import {createEarth} from '../src/earth-model.mjs';
import {FLOOR_COUNT,FLOOR_HEIGHT,FLOORS,floorAt,visiblePiece} from '../src/hospital-plan.mjs';

function piece(s,home,kind='column',floor=0) {return {s:new T.Vector3(...s),home:new T.Vector3(...home),q:new T.Quaternion(),kind,floor,state:0,children:null};}
const live=p=>p.state===0;

test('loss of a load-bearing connection releases the upper structure',()=>{
  const column=piece([1,2,1],[0,1,0]),slab=piece([4,.2,4],[0,2.1,0],'slab',1),wall=piece([.2,2,4],[1,3.2,0],'partition',1);
  const structure=createStructure([column,slab,wall],createEarth());
  assert.equal(structure.unsupported(live).length,0);
  column.state=1;
  assert.deepEqual(structure.unsupported(live),[slab,wall]);
});

test('furniture cannot support a disconnected upper floor and excavated foundations collapse',()=>{
  const foundation=piece([2,.2,2],[0,.1,0],'slab'),cabinet=piece([1,2,1],[0,1.2,0],'furniture'),upper=piece([2,.2,2],[0,2.3,0],'slab',1);
  const earth=createEarth(),structure=createStructure([foundation,cabinet,upper],earth);
  assert.deepEqual(structure.unsupported(live),[upper]);
  earth.carve({x:0,y:-1,z:0},6,2);
  assert.equal(structure.unsupported(live).length,3);
});

test('subdivided panels do not leave disconnected quarters floating',()=>{
  const column=piece([1,2,1],[0,1,0]);
  const panel=piece([4,.2,2],[1.5,2.1,0],'slab',1);
  const attached=piece([1,.2,2],[0,2.1,0],'slab',1),detached=piece([1,.2,2],[3,2.1,0],'slab',1);
  panel.state=2;panel.children=[attached,detached];
  const structure=createStructure([column,panel],createEarth());
  assert.deepEqual(structure.unsupported(live),[detached]);
});

test('the complete photographic shell and 18 furnished floors are initially supported',async()=>{
  const original=T.TextureLoader.prototype.loadAsync, oldDocument=globalThis.document;
  T.TextureLoader.prototype.loadAsync=async()=>new T.Texture();globalThis.document={baseURI:'https://example.com/'};
  const pieces=[],resources=[];
  const mat=opts=>{const m=new T.MeshStandardMaterial(opts);resources.push(m);return m;};
  const materials=Object.fromEntries(['white','gray','glass','darkGlass','metal','inner','roof'].map(k=>[k,mat({color:'#ddd'})]));
  const add=(s,pos,material,floor=0,rotation=0,options={})=>{
    const p=piece(s,pos,options.kind||'shell',options.kind==='slab'?floor:floorAt(pos[1]));p.q.setFromAxisAngle(new T.Vector3(0,1,0),rotation);pieces.push(p);return p;
  };
  try {
    await buildHospital({add,mat,materials,texture:()=>new T.Texture(),textureResources:[],renderer:{capabilities:{getMaxAnisotropy:()=>1}}});
    buildInterior({add,mat});
    assert.equal(FLOORS.length,FLOOR_COUNT);
    for(let f=0;f<FLOOR_COUNT;f++) {
      assert.ok(pieces.filter(p=>p.kind==='furniture'&&p.floor===f).length>20,`furnished floor ${f+1}`);
      assert.ok(pieces.some(p=>p.kind==='column'&&p.floor===f));
      assert.ok(pieces.some(p=>p.kind==='slab'&&p.floor===f));
    }
    const earth=createEarth(),structure=createStructure(pieces,earth);
    assert.deepEqual(structure.unsupported(live),[]);
    // Cut an entire storey: no upper facade or furniture may hang in mid-air.
    for(const p of pieces) if(p.home.y-p.s.y/2<4*FLOOR_HEIGHT&&p.home.y+p.s.y/2>3*FLOOR_HEIGHT) p.state=1;
    const upper=pieces.filter(p=>live(p)&&p.home.y>4*FLOOR_HEIGHT);
    const falling=new Set(structure.unsupported(live));
    assert.ok(upper.length>1000);
    assert.ok(upper.every(p=>falling.has(p)));
  } finally {T.TextureLoader.prototype.loadAsync=original;globalThis.document=oldDocument;resources.forEach(m=>m.dispose());}
});

test('cutaway reveals interior and limits floors without changing damage',()=>{
  const shell=piece([.2,2,1],[-10,12,0],'shell',5),bed=piece([1,.6,2],[0,12,3],'furniture',5),higher=piece([1,1,1],[0,30,0],'furniture',12);
  assert.equal(visiblePiece(shell,false,-1),true);
  assert.equal(visiblePiece(shell,true,-1),false);
  assert.equal(visiblePiece(bed,true,5),true);
  assert.equal(visiblePiece(higher,true,5),false);
  assert.equal(shell.state,0);assert.equal(bed.state,0);
});

test('all characters evacuate and undo/reset restore their previous positions',()=>{
  const scene=new T.Scene(),people=createPeople(scene),before=people.snapshot();
  assert.equal(people.total,36);people.evacuate();
  for(let i=0;i<900;i++) people.step(1/60);
  assert.equal(people.evacuated,36);
  people.restore(before);assert.equal(people.evacuated,0);assert.equal(people.evacuating,false);
  people.evacuate();people.step(1);people.reset();assert.deepEqual(people.snapshot(),before);
  people.dispose();assert.equal(scene.children.length,0);
});
