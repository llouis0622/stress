import * as T from './vendor/three.module.js';

export async function createGame(mount, onChange) {
  const mobile = matchMedia('(max-width: 700px)').matches;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.6:2));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
  mount.appendChild(renderer.domElement);
  const scene=new T.Scene();scene.background=new T.Color('#c9dbe5');scene.fog=new T.Fog('#c9dbe5',100,240);
  const camera=new T.PerspectiveCamera(38,1,.1,350);
  const target=new T.Vector3(0,16,0);let az=-.62,el=.18,distance=mobile?102:83,tool='hammer',orbit=false,sound=true,disposed=false,raf=0;
  let hits=0,broken=0,combo=0,score=0,lastHit=-10000,finished=false,finishTimer=0,shake=0;
  const ray=new T.Raycaster(),mouse=new T.Vector2(),dummy=new T.Object3D(),pieces=[],groups=[],debris=[],effects=[];
  const geometry=new T.BoxGeometry(1,1,1),materialResources=[],textureResources=[];
  const random=(a,b)=>a+Math.random()*(b-a);
  function texture(draw,w=512,h=512){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=renderer.capabilities.getMaxAnisotropy();textureResources.push(t);return t;}
  const wallTexture=texture((c,w,h)=>{c.fillStyle='#edede7';c.fillRect(0,0,w,h);for(let i=0;i<24000;i++){const n=Math.random();c.fillStyle=`rgba(${n>.5?'80,84,81':'255,255,255'},${random(.015,.08)})`;c.fillRect(Math.random()*w,Math.random()*h,random(.4,1.8),random(.4,1.8));}c.strokeStyle='#b5b8b0';c.globalAlpha=.24;c.strokeRect(.5,.5,w-1,h-1);});
  const asphalt=texture((c,w,h)=>{c.fillStyle='#8d9695';c.fillRect(0,0,w,h);for(let i=0;i<24000;i++){c.fillStyle=`rgba(${Math.random()>.5?'210,210,205':'60,70,74'},.13)`;c.fillRect(Math.random()*w,Math.random()*h,1,1);}});
  asphalt.wrapS=asphalt.wrapT=T.RepeatWrapping;asphalt.repeat.set(40,40);
  const envTexture=texture((c,w,h)=>{const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#92b4cf');g.addColorStop(.48,'#e7eff0');g.addColorStop(.52,'#b2bbb6');g.addColorStop(1,'#777d73');c.fillStyle=g;c.fillRect(0,0,w,h);c.fillStyle='#f9f8ea';c.beginPath();c.ellipse(w*.7,h*.3,45,23,0,0,Math.PI*2);c.fill();for(let i=0;i<50;i++){const x=(i*123.78)%w;c.fillStyle=i%2?'#566a74':'#a0adb0';c.fillRect(x,h*.48-random(0,38),random(8,30),random(25,60));}},1024,512);
  envTexture.mapping=T.EquirectangularReflectionMapping;const pmrem=new T.PMREMGenerator(renderer);const environment=pmrem.fromEquirectangular(envTexture);scene.environment=environment.texture;pmrem.dispose();
  scene.add(new T.HemisphereLight('#d9e9f7','#b5ad98',2.1));
  const sun=new T.DirectionalLight('#fff5e4',3.6);sun.position.set(-35,65,42);sun.castShadow=true;sun.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);Object.assign(sun.shadow.camera,{left:-35,right:35,top:45,bottom:-35,near:1,far:150});sun.shadow.normalBias=.04;sun.shadow.bias=-.00005;sun.shadow.radius=3;sun.target.position.set(0,12,0);scene.add(sun,sun.target);
  const fill=new T.DirectionalLight('#bfd7ed',.8);fill.position.set(25,20,-30);scene.add(fill);
  const mat=(opts)=>{const m=new T.MeshStandardMaterial(opts);materialResources.push(m);return m;};
  const white=mat({map:wallTexture,roughness:.86,color:'#f3f2ec'}),gray=mat({color:'#9ea9aa',roughness:.75}),glass=mat({color:'#7d9aa3',metalness:.65,roughness:.17,envMapIntensity:1.3}),darkGlass=mat({color:'#4f6874',metalness:.65,roughness:.21}),metal=mat({color:'#bbc6c7',metalness:.7,roughness:.3}),inner=mat({color:'#bbb9ad',roughness:.92}),roof=mat({color:'#9aaca0',roughness:.9}),blue=mat({color:'#203e88',roughness:.45,metalness:.15});
  const ground=new T.Mesh(new T.PlaneGeometry(450,450),mat({map:asphalt,roughness:1,color:'#bec4bd'}));ground.rotation.x=-Math.PI/2;ground.position.y=-.22;ground.receiveShadow=true;scene.add(ground);
  function fixedBox(s,p,m){const mesh=new T.Mesh(geometry,m);mesh.scale.set(...s);mesh.position.set(...p);mesh.receiveShadow=true;mesh.castShadow=true;scene.add(mesh);return mesh;}
  fixedBox([29,.22,23],[0,-.11,0],mat({color:'#c4c8c3',roughness:.92}));
  const road=mat({map:asphalt,color:'#9b9e9a',roughness:.99});fixedBox([300,.04,13],[0,-.13,21],road);fixedBox([10,.04,160],[-22,-.13,0],road);
  const curb=mat({color:'#d8d8cd',roughness:.9});for(let i=-32;i<=32;i++){fixedBox([1.98,.23,.45],[i*2,.01,14.2],curb);}const marking=mat({color:'#e4e3cb',roughness:1});for(let x=-100;x<=100;x+=10)fixedBox([4.5,.015,.17],[x,-.1,22],marking);
  for(let i=0;i<8;i++)fixedBox([.5,.02,4.3],[-23.8+i*.9,-.09,16],marking);
  const pavement=mat({color:'#b4b9b2',roughness:1});for(let x=-13;x<14;x+=1.5)for(let z=6.5;z<13;z+=1.5){fixedBox([1.48,.025,1.48],[x,.015,z],pavement);}
  const pools=new Map();
  function add(s,p,m,floor=Math.floor(p[1]/3),rotation=0){let pool=pools.get(m);if(!pool){pool={material:m,items:[]};pools.set(m,pool);}const item={s:new T.Vector3(...s),p:new T.Vector3(...p),home:new T.Vector3(...p),q:new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),rotation),originalQ:null,v:new T.Vector3(),w:new T.Vector3(),floor,broken:false,active:false,age:0,index:pool.items.length,pool};item.originalQ=item.q.clone();pool.items.push(item);pieces.push(item);return item;}
  // Photographic references: white 11-storey mass, tall offset front planes,
  // narrow dark glazing strips, vertical navy letters, and full-height side fins.
  const W=18,D=12,H=34.2,rows=24,cols=18,dh=H/rows;
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
    const x=-W/2+col+.5,y=(row+.5)*dh;
    const lower=y<6.7,channel=(x>-3.6&&x<-2.5)||(x>-.7&&x<.4)||(x>6.2&&x<7.4);
    const frontMaterial=lower?glass:channel?(row%3===1?darkGlass:glass):white;
    add([.998,dh-.009,channel?.14:.24],[x,y,6+(channel?-.07:0)],frontMaterial);
    if(lower||channel){add([.045,dh,.17],[x-.5,y,6.12],metal);if(row%1===0)add([1,.045,.17],[x,y-dh/2,6.12],metal);}
    const rearWindow=row>1&&row<22&&col%3!==0;
    add([.998,dh-.01,.23],[x,y,-6],rearWindow?glass:white);
  }
  for(let side of [-1,1])for(let row=0;row<rows;row++)for(let col=0;col<12;col++){
    const z=-5.5+col,y=(row+.5)*dh;const isGlass=(side===-1&&y>6.8)||(side===1&&col%3===1);
    add([.22,dh-.009,.995],[side*9,y,z],isGlass?glass:white);
    if(isGlass&&row%1===0)add([.17,.04,1],[side*9.1,y-dh/2,z],metal);
  }
  for(let z=-5.9;z<=6;z+=.45)for(let r=0;r<18;r++)add([.55,1.51,.13],[-9.2,7.1+r*1.5,z],white);
  // Fine glass-block lattice at the double-height podium.
  for(let x=-8.9;x<=9;x+=.33)for(let y=.25;y<6.75;y+=1.4)add([.035,1.38,.11],[x,y+.7,6.18],metal,Math.floor(y/3));
  for(let y=.25;y<6.75;y+=.33)for(let x=-8.5;x<9;x+=2)add([1.98,.035,.11],[x,y,6.18],metal,Math.floor(y/3));
  // Floor plates and internal columns remain visible in the damaged shell.
  for(let floor=0;floor<=11;floor++)for(let ix=0;ix<6;ix++)for(let iz=0;iz<4;iz++)add([2.99,.2,2.99],[-7.5+ix*3,.12+floor*3, -4.5+iz*3],inner,floor);
  for(let f=0;f<11;f++)for(let x of [-7,0,7])for(let z of [-4.2,4.2])add([.38,2.8,.38],[x,1.7+f*3,z],inner,f);
  // Stepped white parapets, roof equipment and a small roof garden.
  for(let x=-8.5;x<=8.5;x+=1){const top=x< -3.5?34.3:x<5?35.3:34.7;add([.995,top-33,.28],[x,(top+33)/2,6.04],white,11);}
  for(let z=-5.5;z<=5.5;z++)add([.32,1.3,.99],[-9.1,33.9,z],white,11);
  for(let z=-5.5;z<=5.5;z++)add([.3,1.0,.99],[9.05,33.7,z],white,11);
  for(let x=-8;x<=8;x+=2)add([1.99,.7,.3],[x,33.65,-6],white,11);
  for(let x=-7;x<-2;x+=1)for(let z=-4;z<4;z++)add([.99,.14,.99],[x,33.35,z],roof,11);
  for(let x of [1.4,4.3]){add([2,.8,2.7],[x,33.6,-2],gray,11);for(let z of [-2.8,-1.3]){add([1.1,.05,.85],[x,34.04,z],metal,11);}}
  for(let z=-4;z<4;z+=.8){add([.22,.65,.2],[-7.8,33.7,z],roof,11);}
  // Distinctive free-standing letters and colored geometric Minam mark.
  function textMaterial(text,color='#263e88',bg=null,w=512,h=512){return mat({map:texture((c,W,H)=>{if(bg){c.fillStyle=bg;c.fillRect(0,0,W,H);}c.fillStyle=color;c.font=`800 ${Math.min(H*.79,W/(text.length*.96))}px 'Noto Sans KR',sans-serif`;c.textAlign='center';c.textBaseline='middle';c.shadowColor='#14294d30';c.shadowOffsetX=3;c.shadowOffsetY=4;c.shadowBlur=1;c.fillText(text,W/2,H*.53);},w,h),transparent:!bg,roughness:.56,metalness:.04,depthWrite:true});}
  // Wait for Korean glyphs so that signs are sharp and stay correct on the textures.
  try{await Promise.race([document.fonts.load('800 64px "Noto Sans KR"'),new Promise(resolve=>setTimeout(resolve,1800))]);}catch{}
  const letters=['부','산','미','남','병','원'];letters.forEach((s,i)=>add([1.48,1.65,.09],[-6.55,26.5-i*2.84,6.2],textMaterial(s),Math.floor((26.5-i*2.84)/3)));
  add([4.0,.9,.08],[-6.3,33.2,6.22],textMaterial('관절·척추'),11);
  const logo=texture((c,w,h)=>{c.fillStyle='#2a398b';c.fillRect(65,50,170,170);c.clearRect(112,98,75,75);c.strokeStyle='#72be42';c.lineWidth=48;c.beginPath();c.moveTo(278,50);c.lineTo(278,195);c.lineTo(415,195);c.lineTo(415,45);c.stroke();c.fillStyle='#f3b126';c.fillRect(250,270,180,165);c.clearRect(298,318,83,68);c.fillStyle='#5c6467';c.font='26px sans-serif';c.fillText('MIN',83,300);c.fillText('NAM',83,335);});
  add([2.3,2.5,.09],[-6.4,30.75,6.22],mat({map:logo,transparent:true,roughness:.55}),10);
  add([4.1,1.8,.08],[-6.1,8.3,6.22],textMaterial('부산미남병원','#f5f7ed','#284d6c',1024,256),2);
  add([8,.95,.18],[-2,4.9,6.35],textMaterial('부산미남병원','#f5f7ed','#234e68',1024,160),1);
  // Recessed entrance, canopy, steps and door handles.
  for(let x=-3;x<3;x++)add([.97,2.8,.1],[x+.5,1.6,6.28],darkGlass,0);
  for(let x=-2;x<=2;x+=2){add([.055,2.7,.15],[x,1.6,6.4],metal,0);add([.05,.7,.1],[x+.18,1.45,6.5],metal,0);}
  for(let x=-4;x<=4;x+=2)add([1.99,.14,2.5],[x,3.35,7],metal,1);
  for(let x=-4;x<=4;x+=2)add([1.99,.15,1.4],[x,.12,6.9],white,0);
  for(const pool of pools.values()){
    const mesh=new T.InstancedMesh(geometry,pool.material,pool.items.length);mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;pool.mesh=mesh;groups.push(mesh);scene.add(mesh);
    pool.items.forEach(p=>{dummy.position.copy(p.p);dummy.scale.copy(p.s);dummy.quaternion.copy(p.q);dummy.updateMatrix();mesh.setMatrixAt(p.index,dummy.matrix);});mesh.instanceMatrix.needsUpdate=true;
  }
  const total=pieces.length;
  const dustTexture=texture((c,w,h)=>{const g=c.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);g.addColorStop(0,'#eee9dcbb');g.addColorStop(.3,'#dfdccb88');g.addColorStop(1,'#ddd9c900');c.fillStyle=g;c.fillRect(0,0,w,h);},64,64);
  let audio=null;
  function impactAudio(power){if(!sound)return;try{if(!audio)audio=new (window.AudioContext||window.webkitAudioContext)();audio.resume();const t=audio.currentTime,n=Math.floor(audio.sampleRate*.32),buffer=audio.createBuffer(1,n,audio.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<n;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/n,2);const source=audio.createBufferSource();source.buffer=buffer;const low=audio.createBiquadFilter();low.type='lowpass';low.frequency.value=power>4?650:1500;const gain=audio.createGain();gain.gain.setValueAtTime(power>4?.18:.1,t);gain.gain.exponentialRampToValueAtTime(.001,t+.32);source.connect(low);low.connect(gain);gain.connect(audio.destination);source.start();const osc=audio.createOscillator(),bass=audio.createGain();osc.frequency.setValueAtTime(power>4?80:125,t);osc.frequency.exponentialRampToValueAtTime(35,t+.18);bass.gain.setValueAtTime(.12,t);bass.gain.exponentialRampToValueAtTime(.001,t+.2);osc.connect(bass);bass.connect(audio.destination);osc.start();osc.stop(t+.23);}catch{}}
  const publish=()=>onChange({percent:Math.min(100,Math.round(broken/total*100)),hits,combo,score,finished});
  function detach(p,center,force=1){if(p.broken)return;p.broken=true;p.active=true;p.age=0;broken++;score+=9;const dir=p.p.clone().sub(center);if(dir.length()<.1)dir.set(random(-1,1),1,1);dir.normalize();p.v.copy(dir.multiplyScalar(random(3,8)*force));p.v.y+=random(2,6);p.w.set(random(-2,2),random(-2,2),random(-2,2));debris.push(p);}
  function dust(point,power){const count=mobile?7:12;for(let i=0;i<count;i++){const material=new T.SpriteMaterial({map:dustTexture,transparent:true,depthWrite:false,opacity:.6,color:'#e8e1d2'});const sprite=new T.Sprite(material);sprite.position.copy(point).add(new T.Vector3(random(-1,1),random(-1,1),random(-1,1)));sprite.scale.setScalar(random(1.5,3)*power/3);scene.add(sprite);effects.push({sprite,age:0,v:new T.Vector3(random(-2,2),random(1,4),random(-2,2)),life:random(1,2.1)});}}
  let collapseQueue=[],collapseTime=0;
  function smash(point){const now=performance.now();if(finished||now-lastHit<(tool==='wave'?470:155))return;const radius=tool==='wave'?7.1:3.25;let touched=0;for(const p of pieces){if(!p.broken&&p.p.distanceTo(point)<radius){detach(p,point,tool==='wave'?1.3:1);touched++;}}if(!touched)return;combo=now-lastHit<1400?combo+1:1;lastHit=now;hits++;score+=combo*5;shake=reduced?0:tool==='wave'?.25:.11;impactAudio(radius);dust(point,radius);if(navigator.vibrate)navigator.vibrate(tool==='wave'?25:12);
    // Heavily damaged floors lose their remaining load-bearing structure.
    const struck=Math.floor(point.y/3);const storey=pieces.filter(p=>p.floor===struck);if(storey.length&&storey.filter(p=>p.broken).length/storey.length>.64){for(const p of pieces){if(!p.broken&&p.floor>=struck&&!collapseQueue.includes(p))collapseQueue.push(p);}}
    if(broken/total>.73)collapseQueue=pieces.filter(p=>!p.broken);
    collapseQueue.sort((a,b)=>a.home.y-b.home.y);publish();
  }
  function at(x,y){const rect=renderer.domElement.getBoundingClientRect();mouse.set((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1);ray.setFromCamera(mouse,camera);const intersect=ray.intersectObjects(groups,false).find(hit=>{const pool=[...pools.values()].find(p=>p.mesh===hit.object);return pool&&!pool.items[hit.instanceId]?.broken;});if(intersect)smash(intersect.point);}
  function updateCamera(){const c=Math.cos(el);camera.position.set(target.x+Math.sin(az)*distance*c,target.y+Math.sin(el)*distance,target.z+Math.cos(az)*distance*c);if(shake){camera.position.x+=random(-shake,shake);camera.position.y+=random(-shake,shake);}camera.lookAt(target);}
  function resize(){const {width,height}=mount.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();if(width<700){const fitHeight=35/(2*Math.tan(19*Math.PI/180))*(height/Math.max(195,height-358));const fitWidth=25/(2*Math.tan(19*Math.PI/180)*(width/height)*.85);distance=Math.max(fitHeight,fitWidth);target.y=20.5;}else{distance=83;target.y=16;}updateCamera();}
  const ro=new ResizeObserver(resize);ro.observe(mount);resize();
  const pointers=new Map();let down=null,pinch=0;
  const pointerDown=e=>{if(e.button!==0&&e.pointerType!=='touch')return;renderer.domElement.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===1)down={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,start:performance.now(),moved:false,hit:false};else{if(down)down.moved=true;const p=[...pointers.values()];pinch=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);}};
  const pointerMove=e=>{if(e.pointerType==='mouse'&&e.buttons===0){pointers.delete(e.pointerId);down=null;return;}if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size>1){const p=[...pointers.values()],d=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(pinch)distance=T.MathUtils.clamp(distance*pinch/Math.max(1,d),36,145);pinch=d;return;}if(!down)return;const dx=e.clientX-down.lastX,dy=e.clientY-down.lastY;if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>7)down.moved=true;if(down.moved||orbit){az-=dx*.005;el=T.MathUtils.clamp(el+dy*.003,-.05,.85);}down.lastX=e.clientX;down.lastY=e.clientY;};
  const pointerUp=e=>{if(down&&!down.moved&&!down.hit&&!orbit&&pointers.size===1)at(e.clientX,e.clientY);pointers.delete(e.pointerId);down=null;pinch=0;};
  const pointerCancel=e=>{pointers.delete(e.pointerId);down=null;pinch=0;};
  const wheel=e=>{e.preventDefault();distance=T.MathUtils.clamp(distance+e.deltaY*.045,36,145);};
  renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('pointermove',pointerMove);renderer.domElement.addEventListener('pointerup',pointerUp);renderer.domElement.addEventListener('pointercancel',pointerCancel);renderer.domElement.addEventListener('wheel',wheel,{passive:false});
  const clearInput=()=>{down=null;pointers.clear();pinch=0;};window.addEventListener('blur',clearInput);document.addEventListener('visibilitychange',clearInput);
  const contextLost=e=>{e.preventDefault();mount.dispatchEvent(new CustomEvent('game-error',{bubbles:true}));};renderer.domElement.addEventListener('webglcontextlost',contextLost);
  let previous=performance.now();
  function frame(time){if(disposed)return;raf=requestAnimationFrame(frame);const dt=Math.min((time-previous)/1000,.04);previous=time;if(document.hidden)return;
    if(down&&!down.moved&&!orbit&&pointers.size===1&&time-down.start>260){at(down.x,down.y);down.hit=true;}
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
    zoom(v){distance=T.MathUtils.clamp(distance+v,36,145);},home(){az=-.62;el=.18;resize();},
    centerHit(){const r=mount.getBoundingClientRect();at(r.left+r.width/2,r.top+r.height/2);},
    reset(){collapseQueue=[];broken=0;hits=0;combo=0;score=0;finished=false;finishTimer=0;lastHit=-10000;debris.length=0;down=null;for(const p of pieces){p.p.copy(p.home);p.q.copy(p.originalQ);p.v.set(0,0,0);p.broken=false;p.active=false;dummy.position.copy(p.p);dummy.scale.copy(p.s);dummy.quaternion.copy(p.q);dummy.updateMatrix();p.pool.mesh.setMatrixAt(p.index,dummy.matrix);}for(const pool of pools.values())pool.mesh.instanceMatrix.needsUpdate=true;for(const e of effects){scene.remove(e.sprite);e.sprite.material.dispose();}effects.length=0;publish();},
    dispose(){disposed=true;cancelAnimationFrame(raf);window.removeEventListener('blur',clearInput);document.removeEventListener('visibilitychange',clearInput);ro.disconnect();renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('pointermove',pointerMove);renderer.domElement.removeEventListener('pointerup',pointerUp);renderer.domElement.removeEventListener('pointercancel',pointerCancel);renderer.domElement.removeEventListener('wheel',wheel);renderer.domElement.removeEventListener('webglcontextlost',contextLost);if(audio)audio.close();scene.traverse(o=>{if(o.geometry&&o.geometry!==geometry)o.geometry.dispose();});geometry.dispose();for(const e of effects)e.sprite.material.dispose();materialResources.forEach(m=>m.dispose());textureResources.forEach(t=>t.dispose());environment.dispose();renderer.dispose();renderer.domElement.remove();}
  };
}
