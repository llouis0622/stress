import * as T from './vendor/three.module.js';
import {FLOORS, FLOOR_HEIGHT} from './hospital-plan.mjs';

export function createPeople(scene) {
  const group=new T.Group();scene.add(group);
  const actors=FLOORS.flatMap(({index:floor})=>[0,1].map(i=>({floor,role:(floor+i)%3,x:-5+i*7,z:-.35+i*.7,phase:floor*.7+i*2,stage:'idle',clock:0})));
  const total=actors.length, dummy=new T.Object3D(), material=new T.MeshStandardMaterial({roughness:.8});
  const boxes=new T.InstancedMesh(new T.BoxGeometry(1,1,1),material,total*6);
  const heads=new T.InstancedMesh(new T.SphereGeometry(1,9,7),material,total);
  for(const mesh of [boxes,heads]) {mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.castShadow=true;group.add(mesh);}
  const outfits=['#fcfaf3','#62aaad','#deae9a'], skin=new T.Color('#d9aa87');
  let evacuating=false, floorLimit=-1, colored=false;
  function draw() {
    actors.forEach((a,i)=>{
      const shown=a.stage!=='safe'&&a.stage!=='stairs'&&(floorLimit<0||a.floor<=floorLimit), y=a.floor*FLOOR_HEIGHT+.18;
      const moving=a.stage==='walking'||a.stage==='idle', swing=moving?Math.sin(a.phase*6)*.32:0;
      const parts=[[[.36,.5,.23],[0,.75,0],0],[[.15,.44,.16],[-.25,.76,0],swing],[[.15,.44,.16],[.25,.76,0],-swing],[[.14,.45,.17],[-.1,.26,0],-swing],[[.14,.45,.17],[.1,.26,0],swing],[[.24,.05,.25],[0,1.23,0],0]];
      parts.forEach(([size,offset,angle],j)=>{
        dummy.position.set(a.x+offset[0],y+offset[1],a.z+offset[2]);dummy.rotation.set(angle,0,0);dummy.scale.set(...size).multiplyScalar(shown?1:0);dummy.updateMatrix();boxes.setMatrixAt(i*6+j,dummy.matrix);
        if(!colored) boxes.setColorAt(i*6+j,new T.Color(j===3||j===4?'#677d87':j===5?(a.role===1?'#e9f1ee':'#4b4541'):outfits[a.role]));
      });
      dummy.position.set(a.x,y+1.08,a.z);dummy.rotation.set(0,0,0);dummy.scale.setScalar(shown?.19:0);dummy.updateMatrix();heads.setMatrixAt(i,dummy.matrix);if(!colored) heads.setColorAt(i,skin);
    });
    boxes.instanceMatrix.needsUpdate=heads.instanceMatrix.needsUpdate=true;
    if(!colored) {boxes.instanceColor.needsUpdate=true;heads.instanceColor.needsUpdate=true;colored=true;}
  }
  function step(dt) {
    let changed=false;
    for(const a of actors) {
      a.phase+=dt;a.clock+=dt;
      if(a.stage==='idle') a.x+=Math.cos(a.phase*.65)*dt*.18;
      if(a.stage==='walking') {
        const target=a.x<7.8?{x:8,z:.05}:{x:8,z:-4.2};
        const dx=target.x-a.x,dz=target.z-a.z,distance=Math.hypot(dx,dz), step=dt*3.3;
        if(distance>step) {a.x+=dx/distance*step;a.z+=dz/distance*step;}
        else {a.x=target.x;a.z=target.z;if(a.z< -4){a.stage='stairs';a.clock=0;}}
      } else if(a.stage==='stairs'&&a.clock>1.2+a.floor*.12) {a.stage='safe';changed=true;}
    }
    draw();return changed;
  }
  function evacuate() {if(evacuating) return;evacuating=true;for(const a of actors){a.stage='walking';a.clock=0;}}
  function snapshot() {return {evacuating,actors:actors.map(a=>({...a}))};}
  const initial=snapshot();
  function restore(s) {evacuating=s.evacuating;s.actors.forEach((a,i)=>Object.assign(actors[i],a));draw();}
  draw();
  return {step,evacuate,snapshot,restore,reset(){restore(initial);},view(visible,floor=-1){group.visible=visible;floorLimit=floor;draw();},get total(){return total;},get evacuated(){return actors.filter(a=>a.stage==='safe').length;},get evacuating(){return evacuating;},dispose(){scene.remove(group);boxes.geometry.dispose();heads.geometry.dispose();material.dispose();}};
}
