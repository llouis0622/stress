import * as T from './vendor/three.module.js';
import {buildHospital} from './hospital-model.mjs';

export async function createGame(mount, onChange) {
  const mobile = matchMedia('(max-width: 700px)').matches;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.6:2));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
  mount.appendChild(renderer.domElement);
  const scene=new T.Scene();scene.background=new T.Color('#c9dbe5');scene.fog=new T.Fog('#c9dbe5',100,240);
  const camera=new T.PerspectiveCamera(38,1,.1,350);
  const target=new T.Vector3(0,21,0);let az=-1.0,el=.16,distance=mobile?102:83,tool='hammer',orbit=false,sound=true,disposed=false,raf=0;
  let history=[],pendingMeteor=null;let hits=0,broken=0,combo=0,score=0,lastHit=-10000,finished=false,finishTimer=0,shake=0;
  const ray=new T.Raycaster(),mouse=new T.Vector2(),dummy=new T.Object3D(),pieces=[],groups=[],debris=[],effects=[];
  const geometry=new T.BoxGeometry(1,1,1),materialResources=[],textureResources=[];
  const random=(a,b)=>a+Math.random()*(b-a);
  function texture(draw,w=512,h=512){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=renderer.capabilities.getMaxAnisotropy();textureResources.push(t);return t;}
  const wallTexture=texture((c,w,h)=>{c.fillStyle='#edede7';c.fillRect(0,0,w,h);for(let i=0;i<24000;i++){const n=Math.random();c.fillStyle=`rgba(${n>.5?'80,84,81':'255,255,255'},${random(.015,.08)})`;c.fillRect(Math.random()*w,Math.random()*h,random(.4,1.8),random(.4,1.8));}c.strokeStyle='#b5b8b0';c.globalAlpha=.24;c.strokeRect(.5,.5,w-1,h-1);});
  const asphalt=texture((c,w,h)=>{c.fillStyle='#8d9695';c.fillRect(0,0,w,h);for(let i=0;i<24000;i++){c.fillStyle=`rgba(${Math.random()>.5?'210,210,205':'60,70,74'},.13)`;c.fillRect(Math.random()*w,Math.random()*h,1,1);}});
  asphalt.wrapS=asphalt.wrapT=T.RepeatWrapping;asphalt.repeat.set(40,40);
  const envTexture=texture((c,w,h)=>{const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#92b4cf');g.addColorStop(.48,'#e7eff0');g.addColorStop(.52,'#b2bbb6');g.addColorStop(1,'#777d73');c.fillStyle=g;c.fillRect(0,0,w,h);c.fillStyle='#f9f8ea';c.beginPath();c.ellipse(w*.7,h*.3,45,23,0,0,Math.PI*2);c.fill();for(let i=0;i<50;i++){const x=(i*123.78)%w;c.fillStyle=i%2?'#566a74':'#a0adb0';c.fillRect(x,h*.48-random(0,38),random(8,30),random(25,60));}},1024,512);
  envTexture.mapping=T.EquirectangularReflectionMapping;const pmrem=new T.PMREMGenerator(renderer);const environment=pmrem.fromEquirectangular(envTexture);scene.environment=environment.texture;pmrem.dispose();
  scene.add(new T.HemisphereLight('#d9e9f7','#b5ad98',1.3));
  const sun=new T.DirectionalLight('#fff5e4',2.3);sun.position.set(-35,65,42);sun.castShadow=true;sun.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);Object.assign(sun.shadow.camera,{left:-35,right:35,top:45,bottom:-35,near:1,far:150});sun.shadow.normalBias=.04;sun.shadow.bias=-.00005;sun.shadow.radius=3;sun.target.position.set(0,12,0);scene.add(sun,sun.target);
  const fill=new T.DirectionalLight('#bfd7ed',.8);fill.position.set(25,20,-30);scene.add(fill);
  const mat=(opts)=>{const m=new T.MeshStandardMaterial(opts);materialResources.push(m);return m;};
  const white=mat({map:wallTexture,roughness:.86,color:'#f3f2ec'}),gray=mat({color:'#9ea9aa',roughness:.75}),glass=mat({color:'#7d9aa3',metalness:.65,roughness:.17,envMapIntensity:1.3}),darkGlass=mat({color:'#4f6874',metalness:.65,roughness:.21}),metal=mat({color:'#bbc6c7',metalness:.7,roughness:.3}),inner=mat({color:'#bbb9ad',roughness:.92}),roof=mat({color:'#9aaca0',roughness:.9});
  const ground=new T.Mesh(new T.PlaneGeometry(450,450),mat({map:asphalt,roughness:1,color:'#bec4bd'}));ground.rotation.x=-Math.PI/2;ground.position.y=-.22;ground.receiveShadow=true;scene.add(ground);
  function fixedBox(s,p,m){const mesh=new T.Mesh(geometry,m);mesh.scale.set(...s);mesh.position.set(...p);mesh.receiveShadow=true;mesh.castShadow=true;scene.add(mesh);return mesh;}
  fixedBox([29,.22,23],[0,-.11,0],mat({color:'#c4c8c3',roughness:.92}));
  const road=mat({map:asphalt,color:'#9b9e9a',roughness:.99});fixedBox([300,.04,13],[0,-.13,21],road);fixedBox([10,.04,160],[-22,-.13,0],road);
  const curb=mat({color:'#d8d8cd',roughness:.9});for(let i=-32;i<=32;i++){fixedBox([1.98,.23,.45],[i*2,.01,14.2],curb);}const marking=mat({color:'#e4e3cb',roughness:1});for(let x=-100;x<=100;x+=10)fixedBox([4.5,.015,.17],[x,-.1,22],marking);
  for(let i=0;i<8;i++)fixedBox([.5,.02,4.3],[-23.8+i*.9,-.09,16],marking);
  const pavement=mat({color:'#b4b9b2',roughness:1});for(let x=-13;x<14;x+=1.5)for(let z=6.5;z<13;z+=1.5){fixedBox([1.48,.025,1.48],[x,.015,z],pavement);}
  const pools=new Map();
  function add(s,p,m,floor=Math.floor(p[1]/3),rotation=0){let pool=pools.get(m);if(!pool){pool={material:m,items:[]};pools.set(m,pool);}const item={s:new T.Vector3(...s),p:new T.Vector3(...p),home:new T.Vector3(...p),q:new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),rotation),originalQ:null,v:new T.Vector3(),w:new T.Vector3(),floor,broken:false,active:false,age:0,index:pool.items.length,pool};item.originalQ=item.q.clone();pool.items.push(item);pieces.push(item);return item;}
  try{await Promise.race([document.fonts.load('800 64px "Noto Sans KR"'),new Promise(resolve=>setTimeout(resolve,1800))]);}catch{}
  await buildHospital({add,mat,texture,materials:{white,gray,glass,darkGlass,metal,inner,roof},textureResources,renderer});
  for(const pool of pools.values()){
    const g=pool.material.userData.photo?geometry.clone():geometry;
    if(pool.material.userData.photo){const {axis,range}=pool.material.userData.photo,rects=new Float32Array(pool.items.length*4);pool.items.forEach((p,i)=>{const a=axis==='x'?p.home.x:p.home.z,sz=axis==='x'?p.s.x:p.s.z;rects.set([(a-sz/2-range[0])/(range[1]-range[0]),(p.home.y-p.s.y/2-range[2])/(range[3]-range[2]),sz/(range[1]-range[0]),p.s.y/(range[3]-range[2])],i*4);});g.setAttribute('photoRect',new T.InstancedBufferAttribute(rects,4));}
    const mesh=new T.InstancedMesh(g,pool.material,pool.items.length);mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;pool.mesh=mesh;groups.push(mesh);scene.add(mesh);
    pool.items.forEach(p=>{dummy.position.copy(p.p);dummy.scale.copy(p.s);dummy.quaternion.copy(p.q);dummy.updateMatrix();mesh.setMatrixAt(p.index,dummy.matrix);});mesh.instanceMatrix.needsUpdate=true;
  }
  const total=pieces.length;
  function snapshot(){const data=new Float32Array(total*15);for(let i=0;i<total;i++){const p=pieces[i];data.set([p.p.x,p.p.y,p.p.z,p.q.x,p.q.y,p.q.z,p.q.w,p.v.x,p.v.y,p.v.z,p.w.x,p.w.y,p.w.z,p.broken?1:0,p.active?1:0],i*15);}history.push({data,hits,broken,score,combo});if(history.length>10)history.shift();}
  function restore(){if(!history.length)return;const state=history.pop();collapseQueue=[];pendingMeteor=null;finished=false;finishTimer=0;lastHit=-10000;hits=state.hits;broken=state.broken;score=state.score;combo=state.combo;debris.length=0;pieces.forEach((p,i)=>{const d=state.data,k=i*15;p.p.set(d[k],d[k+1],d[k+2]);p.q.set(d[k+3],d[k+4],d[k+5],d[k+6]);p.v.set(d[k+7],d[k+8],d[k+9]);p.w.set(d[k+10],d[k+11],d[k+12]);p.broken=!!d[k+13];p.active=!!d[k+14];p.age=0;if(p.broken)debris.push(p);dummy.position.copy(p.p);dummy.scale.copy(p.s);dummy.quaternion.copy(p.q);dummy.updateMatrix();p.pool.mesh.setMatrixAt(p.index,dummy.matrix);});for(const pool of pools.values())pool.mesh.instanceMatrix.needsUpdate=true;clearVfx();publish();}
  const vfx=[];
  function clearVfx(){for(const e of vfx){scene.remove(e.mesh);e.mesh.geometry.dispose();e.mesh.material.dispose();}vfx.length=0;}
  function ring(point,radius,color='#ffb280'){const mesh=new T.Mesh(new T.RingGeometry(.84,1,64),new T.MeshBasicMaterial({color,side:T.DoubleSide,transparent:true,opacity:.7,depthWrite:false}));mesh.rotation.x=-Math.PI/2;mesh.position.copy(point);mesh.position.y=Math.max(.3,point.y);scene.add(mesh);vfx.push({mesh,age:0,life:.65,radius,kind:'ring'});}
  function beam(point){const start=camera.position.clone().add(new T.Vector3(-2,-2,0)),direction=point.clone().sub(start);const mesh=new T.Mesh(new T.CylinderGeometry(.035,.09,direction.length(),8),new T.MeshBasicMaterial({color:'#80e6fb',transparent:true,opacity:.85,depthWrite:false}));mesh.position.copy(start.add(point).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize());scene.add(mesh);vfx.push({mesh,age:0,life:.18,kind:'beam'});}
  function meteor(point){const start=point.clone().add(new T.Vector3(17,46,-12));const mesh=new T.Mesh(new T.IcosahedronGeometry(1.45,1),new T.MeshStandardMaterial({color:'#dd5c22',emissive:'#ff681d',emissiveIntensity:3,roughness:.8}));mesh.position.copy(start);scene.add(mesh);vfx.push({mesh,age:0,life:.6,kind:'meteor',start,end:point.clone()});pendingMeteor={point:point.clone(),at:performance.now()+600};}

  const dustTexture=texture((c,w,h)=>{const g=c.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);g.addColorStop(0,'#eee9dcbb');g.addColorStop(.3,'#dfdccb88');g.addColorStop(1,'#ddd9c900');c.fillStyle=g;c.fillRect(0,0,w,h);},64,64);
  let audio=null;
  function impactAudio(power){if(!sound)return;try{if(!audio)audio=new (window.AudioContext||window.webkitAudioContext)();audio.resume();const t=audio.currentTime,n=Math.floor(audio.sampleRate*.32),buffer=audio.createBuffer(1,n,audio.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<n;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/n,2);const source=audio.createBufferSource();source.buffer=buffer;const low=audio.createBiquadFilter();low.type='lowpass';low.frequency.value=power>4?650:1500;const gain=audio.createGain();gain.gain.setValueAtTime(power>4?.18:.1,t);gain.gain.exponentialRampToValueAtTime(.001,t+.32);source.connect(low);low.connect(gain);gain.connect(audio.destination);source.start();const osc=audio.createOscillator(),bass=audio.createGain();osc.frequency.setValueAtTime(power>4?80:125,t);osc.frequency.exponentialRampToValueAtTime(35,t+.18);bass.gain.setValueAtTime(.12,t);bass.gain.exponentialRampToValueAtTime(.001,t+.2);osc.connect(bass);bass.connect(audio.destination);osc.start();osc.stop(t+.23);}catch{}}
  const publish=()=>onChange({percent:Math.min(100,Math.round(broken/total*100)),hits,combo,score,finished,canUndo:history.length>0});
  function detach(p,center,force=1){if(p.broken)return;p.broken=true;p.active=true;p.age=0;broken++;score+=9;const dir=p.p.clone().sub(center);if(dir.length()<.1)dir.set(random(-1,1),1,1);dir.normalize();p.v.copy(dir.multiplyScalar(random(3,8)*force));p.v.y+=random(2,6);p.w.set(random(-2,2),random(-2,2),random(-2,2));debris.push(p);}
  function dust(point,power){const count=mobile?7:12;for(let i=0;i<count;i++){const material=new T.SpriteMaterial({map:dustTexture,transparent:true,depthWrite:false,opacity:.6,color:'#e8e1d2'});const sprite=new T.Sprite(material);sprite.position.copy(point).add(new T.Vector3(random(-1,1),random(-1,1),random(-1,1)));sprite.scale.setScalar(random(1.5,3)*power/3);scene.add(sprite);effects.push({sprite,age:0,v:new T.Vector3(random(-2,2),random(1,4),random(-2,2)),life:random(1,2.1)});}}
  let collapseQueue=[],collapseTime=0;
  function smash(point,impact=false){const mode=impact?'meteor':tool;const now=performance.now();const cooldown=mode==='laser'?95:mode==='meteor'?1100:mode==='quake'?1500:mode==='wave'?470:180;if(finished||(!impact&&(pendingMeteor||now-lastHit<cooldown)))return;if(mode==='meteor'&&!impact){meteor(point);return;}const radius=mode==='quake'?15:mode==='meteor'?10.5:mode==='wave'?7.1:mode==='laser'?1.65:3.25;if(mode==='quake')point=new T.Vector3(0,1,0);snapshot();let touched=0;for(const p of pieces){if(!p.broken&&p.p.distanceTo(point)<radius){detach(p,point,mode==='wave'?1.3:1);touched++;}}if(!touched){history.pop();return;}if(mode==='laser')beam(point);if(mode==='wave'||mode==='meteor'||mode==='quake')ring(point,radius);combo=now-lastHit<1400?combo+1:1;lastHit=now;hits++;score+=combo*5;shake=reduced?0:mode==='quake'?.6:mode==='meteor'?.45:mode==='wave'?.25:mode==='laser'?.035:.11;impactAudio(radius);dust(point,radius);if(navigator.vibrate)navigator.vibrate(mode==='wave'?25:12);
    // Heavily damaged floors lose their remaining load-bearing structure.
    const struck=Math.floor(point.y/3.3);const storey=pieces.filter(p=>p.floor===struck);if(storey.length&&storey.filter(p=>p.broken).length/storey.length>.64){for(const p of pieces){if(!p.broken&&p.floor>=struck&&!collapseQueue.includes(p))collapseQueue.push(p);}}
    if(broken/total>.73)collapseQueue=pieces.filter(p=>!p.broken);
    collapseQueue.sort((a,b)=>a.home.y-b.home.y);publish();
  }
  function at(x,y){const rect=renderer.domElement.getBoundingClientRect();mouse.set((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1);ray.setFromCamera(mouse,camera);const intersect=ray.intersectObjects(groups,false).find(hit=>{const pool=[...pools.values()].find(p=>p.mesh===hit.object);return pool&&!pool.items[hit.instanceId]?.broken;});if(intersect)smash(intersect.point);}
  function updateCamera(){const c=Math.cos(el);camera.position.set(target.x+Math.sin(az)*distance*c,target.y+Math.sin(el)*distance,target.z+Math.cos(az)*distance*c);if(shake){camera.position.x+=random(-shake,shake);camera.position.y+=random(-shake,shake);}camera.lookAt(target);}
  function resize(){const {width,height}=mount.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();if(width<700){const fitHeight=44/(2*Math.tan(19*Math.PI/180))*(height/Math.max(195,height-420));const fitWidth=25/(2*Math.tan(19*Math.PI/180)*(width/height)*.85);distance=Math.max(fitHeight,fitWidth);target.y=22;}else{distance=104;target.y=21;}updateCamera();}
  const ro=new ResizeObserver(resize);ro.observe(mount);resize();
  const pointers=new Map();let down=null,pinch=0;
  const pointerDown=e=>{if(e.button!==0&&e.pointerType!=='touch')return;renderer.domElement.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===1)down={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,start:performance.now(),moved:false,hit:false};else{if(down)down.moved=true;const p=[...pointers.values()];pinch=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);}};
  const pointerMove=e=>{if(e.pointerType==='mouse'&&e.buttons===0){pointers.delete(e.pointerId);down=null;return;}if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size>1){const p=[...pointers.values()],d=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(pinch)distance=T.MathUtils.clamp(distance*pinch/Math.max(1,d),36,240);pinch=d;return;}if(!down)return;const dx=e.clientX-down.lastX,dy=e.clientY-down.lastY;if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>7)down.moved=true;if(down.moved||orbit){az-=dx*.005;el=T.MathUtils.clamp(el+dy*.003,-.05,.85);}down.lastX=e.clientX;down.lastY=e.clientY;};
  const pointerUp=e=>{if(down&&!down.moved&&!down.hit&&!orbit&&pointers.size===1)at(e.clientX,e.clientY);pointers.delete(e.pointerId);down=null;pinch=0;};
  const pointerCancel=e=>{pointers.delete(e.pointerId);down=null;pinch=0;};
  const wheel=e=>{e.preventDefault();distance=T.MathUtils.clamp(distance+e.deltaY*.045,36,240);};
  renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('pointermove',pointerMove);renderer.domElement.addEventListener('pointerup',pointerUp);renderer.domElement.addEventListener('pointercancel',pointerCancel);renderer.domElement.addEventListener('wheel',wheel,{passive:false});
  const clearInput=()=>{down=null;pointers.clear();pinch=0;};window.addEventListener('blur',clearInput);document.addEventListener('visibilitychange',clearInput);
  const contextLost=e=>{e.preventDefault();mount.dispatchEvent(new CustomEvent('game-error',{bubbles:true}));};renderer.domElement.addEventListener('webglcontextlost',contextLost);
  let previous=performance.now();
  function frame(time){if(disposed)return;raf=requestAnimationFrame(frame);const dt=Math.min((time-previous)/1000,.04);previous=time;if(document.hidden)return;
    if(down&&!down.moved&&!orbit&&pointers.size===1&&time-down.start>260){at(down.x,down.y);down.hit=true;}
    if(pendingMeteor&&time>pendingMeteor.at){const p=pendingMeteor.point;pendingMeteor=null;smash(p,true);}for(let i=vfx.length-1;i>=0;i--){const e=vfx[i];e.age+=dt;const t=Math.min(1,e.age/e.life);if(e.kind==='meteor'){e.mesh.position.lerpVectors(e.start,e.end,t*t);e.mesh.rotation.x+=dt*4;e.mesh.rotation.z+=dt*3;}else if(e.kind==='ring'){e.mesh.scale.setScalar(1+t*e.radius);e.mesh.material.opacity=(1-t)*.7;}else e.mesh.material.opacity=(1-t)*.85;if(t>=1){scene.remove(e.mesh);e.mesh.geometry.dispose();e.mesh.material.dispose();vfx.splice(i,1);}}
    if(collapseQueue.length&&time-collapseTime>35){collapseTime=time;for(let i=0;i<16&&collapseQueue.length;i++){const p=collapseQueue.shift();if(!p.broken)detach(p,new T.Vector3(0,p.home.y-2,0),.5);}if(Math.random()<.3)dust(new T.Vector3(random(-7,7),Math.max(2,collapseQueue[0]?.home.y||4),3),3);publish();}
    const dirty=new Set();for(const p of debris){if(!p.active)continue;p.age+=dt;p.v.y-=20*dt;p.v.multiplyScalar(1-dt*.12);p.p.addScaledVector(p.v,dt);p.q.multiply(new T.Quaternion().setFromEuler(new T.Euler(p.w.x*dt,p.w.y*dt,p.w.z*dt)));const bottom=.12+Math.min(p.s.x,p.s.y,p.s.z)*.5;
      if(p.p.y<bottom){p.p.y=bottom;p.v.y=Math.abs(p.v.y)*.17;p.v.x*=.76;p.v.z*=.76;p.w.multiplyScalar(.7);if(p.age>1.1&&p.v.length()<.65){p.active=false;p.q.setFromEuler(new T.Euler(Math.PI/2,random(-Math.PI,Math.PI),0));}}
      if(p.age>8)p.active=false;
      dummy.position.copy(p.p);dummy.scale.copy(p.s);dummy.quaternion.copy(p.q);dummy.updateMatrix();p.pool.mesh.setMatrixAt(p.index,dummy.matrix);dirty.add(p.pool.mesh);
    }for(const mesh of dirty)mesh.instanceMatrix.needsUpdate=true;
    for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.age+=dt;e.sprite.position.addScaledVector(e.v,dt);e.sprite.scale.multiplyScalar(1+dt*.6);e.sprite.material.opacity=Math.max(0,.47*(1-e.age/e.life));if(e.age>e.life){scene.remove(e.sprite);e.sprite.material.dispose();effects.splice(i,1);}}
    if(!finished&&broken/total>=.999){finished=true;finishTimer=time+1800;}if(finishTimer&&time>finishTimer){finishTimer=0;publish();}
    shake*=.8;if(shake<.002)shake=0;updateCamera();renderer.render(scene,camera);
  }
  publish();raf=requestAnimationFrame(frame);
  return {
    setTool(t){tool=t;},setSound(v){sound=v;if(!v&&audio)audio.suspend();},setOrbit(v){orbit=v;down=null;},
    zoom(v){distance=T.MathUtils.clamp(distance+v,36,240);},home(){az=-1.0;el=.16;resize();},
    centerHit(){const r=mount.getBoundingClientRect();at(r.left+r.width/2,r.top+r.height/2);},
    undo:restore,reset(){history=[];clearVfx();pendingMeteor=null;collapseQueue=[];broken=0;hits=0;combo=0;score=0;finished=false;finishTimer=0;lastHit=-10000;debris.length=0;down=null;for(const p of pieces){p.p.copy(p.home);p.q.copy(p.originalQ);p.v.set(0,0,0);p.broken=false;p.active=false;dummy.position.copy(p.p);dummy.scale.copy(p.s);dummy.quaternion.copy(p.q);dummy.updateMatrix();p.pool.mesh.setMatrixAt(p.index,dummy.matrix);}for(const pool of pools.values())pool.mesh.instanceMatrix.needsUpdate=true;for(const e of effects){scene.remove(e.sprite);e.sprite.material.dispose();}effects.length=0;publish();},
    dispose(){clearVfx();disposed=true;cancelAnimationFrame(raf);window.removeEventListener('blur',clearInput);document.removeEventListener('visibilitychange',clearInput);ro.disconnect();renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('pointermove',pointerMove);renderer.domElement.removeEventListener('pointerup',pointerUp);renderer.domElement.removeEventListener('pointercancel',pointerCancel);renderer.domElement.removeEventListener('wheel',wheel);renderer.domElement.removeEventListener('webglcontextlost',contextLost);if(audio)audio.close();scene.traverse(o=>{if(o.geometry&&o.geometry!==geometry)o.geometry.dispose();});geometry.dispose();for(const e of effects)e.sprite.material.dispose();materialResources.forEach(m=>m.dispose());textureResources.forEach(t=>t.dispose());environment.dispose();renderer.dispose();renderer.domElement.remove();}
  };
}
