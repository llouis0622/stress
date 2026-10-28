import * as T from './vendor/three.module.js';
import {buildHospital} from './hospital-model.mjs';
import {createEarth, CELL, WORLD_DEPTH, layerAt, travelKm} from './earth-model.mjs';
import {createEarthView} from './earth-view.mjs';
import {createFragments} from './fragments.mjs';
import {TOOL_BY_ID} from './tools.mjs';
import {panelParts} from './fracture.mjs';
import {buildInterior} from './hospital-interior.mjs';
import {createPeople} from './hospital-people.mjs';
import {createStructure} from './structure.mjs';
import {createRigidDebris} from './rigid-debris.mjs';
import {FLOOR_HEIGHT, floorAt, visiblePiece} from './hospital-plan.mjs';

export async function createGame(mount, onChange) {
  const mobile = matchMedia('(max-width: 700px)').matches;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.3:1.8));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
  renderer.localClippingEnabled=true;
  mount.appendChild(renderer.domElement);
  const scene=new T.Scene();scene.background=new T.Color('#c9dbe5');scene.fog=new T.Fog('#c9dbe5',100,240);
  const camera=new T.PerspectiveCamera(38,1,.1,350);
  const target=new T.Vector3(0,21,0);let az=-1.0,el=.16,distance=mobile?102:83,tool='hammer',orbit=false,sound=true,disposed=false,raf=0;
  let history=[],pending=null;let hits=0,broken=0,combo=0,score=0,lastHit=-10000,shake=0;
  const ray=new T.Raycaster(),mouse=new T.Vector2(),dummy=new T.Object3D(),pieces=[],groups=[];
  const geometry=new T.BoxGeometry(1,1,1),materialResources=[],textureResources=[];
  const random=(a,b)=>a+Math.random()*(b-a);
  function texture(draw,w=512,h=512){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=renderer.capabilities.getMaxAnisotropy();textureResources.push(t);return t;}
  const wallTexture=texture((c,w,h)=>{c.fillStyle='#edede7';c.fillRect(0,0,w,h);for(let i=0;i<24000;i++){const n=Math.random();c.fillStyle=`rgba(${n>.5?'80,84,81':'255,255,255'},${random(.015,.08)})`;c.fillRect(Math.random()*w,Math.random()*h,random(.4,1.8),random(.4,1.8));}c.strokeStyle='#b5b8b0';c.globalAlpha=.24;c.strokeRect(.5,.5,w-1,h-1);});
  const envTexture=texture((c,w,h)=>{const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#92b4cf');g.addColorStop(.48,'#e7eff0');g.addColorStop(.52,'#b2bbb6');g.addColorStop(1,'#777d73');c.fillStyle=g;c.fillRect(0,0,w,h);c.fillStyle='#f9f8ea';c.beginPath();c.ellipse(w*.7,h*.3,45,23,0,0,Math.PI*2);c.fill();for(let i=0;i<50;i++){const x=(i*123.78)%w;c.fillStyle=i%2?'#566a74':'#a0adb0';c.fillRect(x,h*.48-random(0,38),random(8,30),random(25,60));}},1024,512);
  envTexture.mapping=T.EquirectangularReflectionMapping;const pmrem=new T.PMREMGenerator(renderer);const environment=pmrem.fromEquirectangular(envTexture);scene.environment=environment.texture;pmrem.dispose();
  scene.add(new T.HemisphereLight('#d9e9f7','#b5ad98',1.3));
  const sun=new T.DirectionalLight('#fff5e4',2.3);sun.position.set(-35,65,42);sun.castShadow=true;sun.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);Object.assign(sun.shadow.camera,{left:-35,right:35,top:45,bottom:-35,near:1,far:150});sun.shadow.normalBias=.04;sun.shadow.bias=-.00005;sun.shadow.radius=3;sun.target.position.set(0,12,0);scene.add(sun,sun.target);
  const fill=new T.DirectionalLight('#bfd7ed',.8);fill.position.set(25,20,-30);scene.add(fill);
  const mat=(opts)=>{const m=new T.MeshStandardMaterial(opts);materialResources.push(m);return m;};
  const white=mat({map:wallTexture,roughness:.86,color:'#f3f2ec'}),gray=mat({color:'#9ea9aa',roughness:.75}),glass=mat({color:'#7d9aa3',metalness:.65,roughness:.17,envMapIntensity:1.3}),darkGlass=mat({color:'#4f6874',metalness:.65,roughness:.21}),metal=mat({color:'#bbc6c7',metalness:.7,roughness:.3}),inner=mat({color:'#bbb9ad',roughness:.92}),roof=mat({color:'#9aaca0',roughness:.9});
  const earth = createEarth();
  const terrain = createEarthView(scene, earth);
  const fragments = createFragments(scene, earth, mobile);
  const building = new T.Group(); scene.add(building);
  const pools = new Map();
  const lastAim = new T.Vector3(0, 0, 0);
  let viewDepth = -1, following = true, lastAttack = -10000, cutaway=false, selectedFloor=-1;
  const ceiling=new T.Plane(new T.Vector3(0,-1,0),1000);
  function add(s, position, material, floor = 0, rotation = 0, options = {}) {
    const parent=options.parent||null, kind=parent?.kind||options.kind||'shell';
    let pool = pools.get(material);
    if (!pool) { pool = { material, items: [] }; pools.set(material, pool); }
    const q = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), rotation);
    const p = { s: new T.Vector3(...s), home: new T.Vector3(...position), q, inverse: q.clone().invert(), floor:parent?parent.floor:kind==='slab'?floor:floorAt(position[1]), kind, parent, children: null, state: parent ? 1 : 0, mass: parent ? parent.mass / 4 : kind==='furniture'?.15:1, index: pool.items.length, pool, debris:null };
    pool.items.push(p); pieces.push(p); return p;
  }
  try { await Promise.race([document.fonts.load('800 64px "Noto Sans KR"'), new Promise(resolve => setTimeout(resolve, 1800))]); } catch {}
  await buildHospital({ add, mat, texture, materials: { white, gray, glass, darkGlass, metal, inner, roof }, textureResources, renderer });
  buildInterior({add,mat,texture});
  const roots=[...pieces], total=roots.reduce((sum,p)=>sum+p.mass,0);
  const structure=createStructure(roots,earth);
  const live = p => p.state === 0 && (!p.parent || p.parent.state === 2);
  function writePiece(p) {
    dummy.position.copy(p.debris?.position||p.home); dummy.quaternion.copy(p.debris?.quaternion||p.q); dummy.scale.copy(p.s).multiplyScalar(p.debris?.scale??1);
    if ((!live(p)&&!p.debris)||!visiblePiece(p,cutaway,selectedFloor)) dummy.scale.setScalar(0);
    dummy.updateMatrix(); p.pool.mesh.setMatrixAt(p.index, dummy.matrix);
    p.pool.mesh.boundingSphere=null;
    p.pool.mesh.instanceMatrix.needsUpdate = true;
    const photo = p.pool.material.userData.photo;
    if (photo&&!p.photoWritten) {
      const { axis, range } = photo, a = axis === 'x' ? p.home.x : p.home.z, size = axis === 'x' ? p.s.x : p.s.z;
      p.pool.rect.setXYZW(p.index, (a - size / 2 - range[0]) / (range[1] - range[0]), (p.home.y - p.s.y / 2 - range[2]) / (range[3] - range[2]), size / (range[1] - range[0]), p.s.y / (range[3] - range[2]));
      p.pool.rect.needsUpdate = true;
      p.photoWritten=true;
    }
  }
  for (const pool of pools.values()) {
    pool.material.clippingPlanes=[ceiling];pool.material.clipShadows=true;
    const capacity = pool.items.length * 5;
    const g = pool.material.userData.photo ? geometry.clone() : geometry;
    if (pool.material.userData.photo) { pool.rect = new T.InstancedBufferAttribute(new Float32Array(capacity * 4), 4); g.setAttribute('photoRect', pool.rect); }
    pool.mesh = new T.InstancedMesh(g, pool.material, capacity); pool.mesh.count = pool.items.length;
    pool.mesh.instanceMatrix.setUsage(T.DynamicDrawUsage); pool.mesh.castShadow = true; pool.mesh.receiveShadow = true; pool.mesh.frustumCulled = false;
    pool.mesh.userData.pool = pool; groups.push(pool.mesh); building.add(pool.mesh); pool.items.forEach(writePiece);
  }
  const physics=createRigidDebris(earth,writePiece,mobile);
  physics.syncStructure(pieces,live);
  const people=createPeople(scene);
  function record(tx, p) { if (!tx.before.has(p)) tx.before.set(p, p.state); }
  function split(tx, p) {
    if (p.parent) return null;
    const parts = panelParts(p.s, p.home, p.q);
    if (!parts.length) return null;
    if (!p.children) {
      p.children = [];
      for (const {size, position} of parts) {
        const child = add(size.toArray(), position.toArray(), p.pool.material, p.floor, 0, {parent:p});
        child.q.copy(p.q); child.inverse.copy(p.inverse); p.children.push(child);
      }
      p.pool.mesh.count = p.pool.items.length;
    }
    record(tx, p); p.state = 2; writePiece(p);
    for (const child of p.children) { record(tx, child); child.state = 0; writePiece(child); }
    return p.children;
  }
  const local = new T.Vector3();
  function intersects(p, point, radius, vertical) {
    local.subVectors(point, p.home).applyQuaternion(p.inverse);
    const x = Math.max(0, Math.abs(local.x) - p.s.x / 2), y = Math.max(0, Math.abs(local.y) - p.s.y / 2) / vertical, z = Math.max(0, Math.abs(local.z) - p.s.z / 2);
    return x * x + y * y + z * z <= radius * radius;
  }
  function breakPiece(tx, p, spec) {
    record(tx, p); p.state = 1; broken += p.mass; writePiece(p);
    tx.detached.push(p);
    if (tx.particles++ < 24) fragments.spawn(p.home, p.pool.material.color, spec.radius + 5, spec.id === 'blackhole' ? tx.center : null, mobile ? 7 : 12);
  }
  const vfx = [];
  function clearVfx() { for (const e of vfx) { scene.remove(e.mesh); e.mesh.geometry.dispose(); e.mesh.material.dispose(); } vfx.length = 0; }
  function ring(point, spec) {
    const mesh = new T.Mesh(new T.RingGeometry(.75, 1, 40), new T.MeshBasicMaterial({ color: spec.color, side: T.DoubleSide, transparent: true, opacity: .75, depthWrite: false }));
    mesh.rotation.x = -Math.PI / 2; mesh.position.copy(point); scene.add(mesh);
    vfx.push({ mesh, age: 0, life: .55, kind: 'ring', radius: spec.radius });
  }
  function beam(point, spec) {
    const start = camera.position.clone().add(new T.Vector3(-2, -2, 0)), direction = point.clone().sub(start);
    const mesh = new T.Mesh(new T.CylinderGeometry(.04, spec.id === 'drill' ? .28 : .08, direction.length(), 7), new T.MeshBasicMaterial({ color: spec.color, transparent: true, opacity: .8, depthWrite: false }));
    mesh.position.copy(start.add(point).multiplyScalar(.5)); mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), direction.normalize()); scene.add(mesh);
    vfx.push({ mesh, age: 0, life: .15, kind: 'beam' });
  }
  function launch(point, spec) {
    const black = spec.id === 'blackhole', iron = spec.id === 'wrecking';
    const geometry = black ? new T.SphereGeometry(2, 20, 12) : iron ? new T.SphereGeometry(1.8, 16, 12) : new T.IcosahedronGeometry(spec.id === 'bomb' ? .8 : 1.6, 1);
    const mesh = new T.Mesh(geometry, new T.MeshStandardMaterial({ color: black ? '#130e26' : spec.color, metalness: iron ? .85 : .15, roughness: .4, emissive: black ? '#523687' : spec.color, emissiveIntensity: black ? .7 : iron ? 0 : 1.3 }));
    const start = point.clone().add(black ? new T.Vector3(0, 0, 0) : iron ? new T.Vector3(-18, 4, 0) : new T.Vector3(10, 30, -8));
    mesh.position.copy(start); scene.add(mesh);
    vfx.push({ mesh, age: 0, life: spec.delay, kind: black ? 'hole' : 'flight', start, end: point.clone() });
    if (black) ring(point, spec);
    pending = { point: point.clone(), spec, at: performance.now() + spec.delay * 1000 }; publish();
  }
  let audio = null;
  function impactAudio(power) {
    if (!sound) return;
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)(); audio.resume();
      const t = audio.currentTime, n = Math.floor(audio.sampleRate * .2), buffer = audio.createBuffer(1, n, audio.sampleRate), data = buffer.getChannelData(0);
      for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2;
      const source = audio.createBufferSource(), filter = audio.createBiquadFilter(), gain = audio.createGain();
      source.buffer = buffer; filter.type = 'lowpass'; filter.frequency.value = power > 5 ? 500 : 1400;
      gain.gain.setValueAtTime(.09, t); gain.gain.exponentialRampToValueAtTime(.001, t + .2);
      source.connect(filter); filter.connect(gain); gain.connect(audio.destination); source.start();
    } catch {}
  }
  function publish() {
    const depth = earth.deepest;
    onChange({ percent: Math.min(100, Math.floor(broken / total * 100 + 1e-6)), hits, combo, score, finished: earth.through, canUndo: history.length > 0 || !!pending, depth: travelKm(depth), viewDepth: Math.max(0, viewDepth), maxDepth: Math.max(0, depth - CELL), layer: layerAt(Math.max(0, viewDepth)).name, underground: viewDepth >= 0, earthPercent: Math.round(earth.count / earth.total * 1000) / 10, earthBlocks: earth.count, journey: Math.round(depth / WORLD_DEPTH * 100), pending: !!pending, cutaway, selectedFloor, people:people.total, evacuated:people.evacuated, evacuating:people.evacuating });
  }
  function refreshWorld() { terrain.refresh(Math.max(0, viewDepth)); building.visible = viewDepth < 0; people.view(viewDepth<0,cutaway?selectedFloor:-1); }
  function focusDig() { viewDepth = Math.max(0, earth.deepest - CELL * 2); following = true; el = 1.1; distance = mobile ? 150 : 115; refreshWorld(); publish(); }
  function setDepth(depth) { viewDepth = T.MathUtils.clamp(depth, 0, Math.max(0, earth.deepest - CELL)); following = false; el = 1.1; refreshWorld(); publish(); }
  function surface() { viewDepth = -1; el = cutaway?.35:.16; az = -1; resize(); refreshWorld(); publish(); }
  function setInterior(value) {
    cutaway=value;ceiling.constant=cutaway&&selectedFloor>=0?(selectedFloor+1)*FLOOR_HEIGHT-.12:1000;
    pieces.forEach(writePiece);surface();
  }
  function setFloor(value) {selectedFloor=Math.max(-1,Math.min(17,Math.round(value)));setInterior(true);}
  function applyHit(point, spec) {
    const now = performance.now();
    const center = point.clone(); center.y -= spec.offset || 0;
    const tx = { before: new Map(), terrain: [], detached:[], particles: 0, center, hits, broken, score, combo, lastAim: lastAim.clone(), physics:physics.snapshot(), people:people.snapshot() };
    const moved=physics.blast(center,spec);
    const candidates = pieces.filter(p => live(p) && Math.abs(p.home.y - center.y) <= spec.radius * spec.vertical + p.s.y / 2 && intersects(p, center, spec.radius, spec.vertical));
    for (const p of candidates) {
      const children = split(tx, p);
      if (children) { for (const child of children) if (intersects(child, center, spec.radius, spec.vertical)) breakPiece(tx, child, spec); }
      else breakPiece(tx, p, spec);
    }
    tx.terrain = earth.carve(center, spec.radius, spec.vertical);
    const directlyHit=tx.detached.length;
    for(const p of structure.unsupported(live)) breakPiece(tx,p,spec);
    if (!tx.before.size && !tx.terrain.length&&!moved) return;
    people.evacuate();
    physics.syncStructure(pieces,live);
    if(tx.terrain.length) physics.refreshGround();
    physics.spawn(tx.detached.slice(0,directlyHit),center,spec);
    physics.spawn(tx.detached.slice(directlyHit),center,spec,true);
    for (let i = 0; i < tx.terrain.length; i += Math.max(1, Math.ceil(tx.terrain.length / 22))) {
      const p = earth.center(tx.terrain[i]); fragments.spawn(new T.Vector3(p.x, p.y, p.z), layerAt(-p.y).color, spec.radius + 5, spec.id === 'blackhole' ? center : null, mobile ? 6 : 10);
    }
    history.push(tx); if (history.length > 10) history.shift();
    combo = now - lastHit < 1600 ? combo + 1 : 1; lastHit = now; hits++;
    score += Math.round((broken - tx.broken) * 9 + tx.terrain.length * 7) + combo * 5;
    if (viewDepth < 0 || !following || Math.hypot(point.x - lastAim.x, point.z - lastAim.z) > 12) { lastAim.copy(point); lastAim.y = 0; }
    if (spec.id === 'laser' || spec.id === 'drill') beam(point, spec); else ring(point, spec);
    shake = reduced ? 0 : Math.min(.45, spec.radius * .03); impactAudio(spec.radius);
    if (navigator.vibrate) navigator.vibrate(10);
    if (viewDepth >= 0 && following) viewDepth = Math.max(viewDepth, Math.max(0, earth.deepest - CELL * 2));
    refreshWorld(); publish();
  }
  function attack(point) {
    const spec = TOOL_BY_ID[tool], now = performance.now();
    if (pending || now - lastAttack < spec.cooldown) return;
    lastAttack = now;
    if (spec.delay) launch(point, spec); else applyHit(point, spec);
  }
  function undo() {
    if (pending) { pending = null; clearVfx(); publish(); return; }
    const tx = history.pop(); if (!tx) return;
    for (const [p, state] of tx.before) p.state = state;
    earth.restore(tx.terrain); hits = tx.hits; broken = tx.broken; score = tx.score; combo = tx.combo; lastAim.copy(tx.lastAim); lastAttack = lastHit = -10000;
    physics.restore(tx.physics);physics.refreshGround();physics.syncStructure(pieces,live);people.restore(tx.people);
    pieces.forEach(writePiece);
    if (viewDepth >= 0) viewDepth = Math.min(viewDepth, Math.max(0, earth.deepest - CELL));
    clearVfx(); fragments.clear(); refreshWorld(); publish();
  }
  function at(x, y) {
    const rect = mount.getBoundingClientRect(); mouse.set((x - rect.left) / rect.width * 2 - 1, -(y - rect.top) / rect.height * 2 + 1); ray.setFromCamera(mouse, camera);
    const buildingHit = building.visible ? ray.intersectObjects(groups, false).find(hit => {
      const p=hit.object.userData.pool.items[hit.instanceId];return (live(p)||p.debris)&&visiblePiece(p,cutaway,selectedFloor)&&hit.point.y<=ceiling.constant;
    }) : null;
    const earthHit = terrain.raycast(ray.ray);
    if (buildingHit && (!earthHit || buildingHit.distance < earthHit.distance)) attack(buildingHit.point);
    else if (earthHit) attack(new T.Vector3(earthHit.point.x, earthHit.point.y, earthHit.point.z));
  }
  const goal = new T.Vector3();
  function updateCamera() {
    goal.set(viewDepth < 0 ? 0 : lastAim.x, viewDepth < 0 ? (cutaway&&selectedFloor>=0?selectedFloor*FLOOR_HEIGHT+1:21) : -viewDepth, viewDepth < 0 ? 0 : lastAim.z); target.lerp(goal, reduced ? 1 : .16);
    const c = Math.cos(el); camera.position.set(target.x + Math.sin(az) * distance * c, target.y + Math.sin(el) * distance, target.z + Math.cos(az) * distance * c);
    if (shake) { camera.position.x += random(-shake, shake); camera.position.y += random(-shake, shake); }
    camera.lookAt(target); sun.position.set(target.x - 35, target.y + 65, target.z + 42); sun.target.position.copy(target); fill.position.set(target.x + 25, target.y + 20, target.z - 30);
    const underground = viewDepth > 12;
    scene.background.set(underground ? '#272835' : '#c9dbe5'); scene.fog.color.copy(scene.background);
  }
  function resize() {
    const { width, height } = mount.getBoundingClientRect(); renderer.setSize(width, height); camera.aspect = width / height;
    const header=mount.parentElement.querySelector('.game-header')?.getBoundingClientRect().height||64;
    const dock=mount.parentElement.querySelector('.bottom-area')?.getBoundingClientRect().height||180;
    const tabs=mount.parentElement.querySelector('.mobile-panels')?.getBoundingClientRect().height||0;
    camera.setViewOffset(width,height,0,(dock-header-tabs)/2,width,height);
    camera.updateProjectionMatrix();
    if (viewDepth >= 0) distance = width < 700 ? 150 : 115;
    else if(cutaway&&selectedFloor>=0) distance=width<700?70:48;
    else distance=Math.max(width<700?28/(2*Math.tan(19*Math.PI/180)*(width/height)*.9):83,48/(2*Math.tan(19*Math.PI/180))*height/Math.max(100,height-header-tabs-dock-36));
    updateCamera();
  }
  const ro = new ResizeObserver(resize); ro.observe(mount); resize();
  const pointers = new Map(); let down = null, pinch = 0;
  const pointerDown = e => {
    if (e.button !== 0 && e.pointerType !== 'touch') return;
    renderer.domElement.setPointerCapture(e.pointerId); pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) down = { x: e.clientX, y: e.clientY, lastX: e.clientX, lastY: e.clientY, start: performance.now(), moved: false, hit: false };
    else { if (down) down.moved = true; const p = [...pointers.values()]; pinch = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); }
  };
  const pointerMove = e => {
    if (e.pointerType === 'mouse' && e.buttons === 0) { pointers.delete(e.pointerId); down = null; return; }
    if (!pointers.has(e.pointerId)) return; pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size > 1) { const p = [...pointers.values()], d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); if (pinch) distance = T.MathUtils.clamp(distance * pinch / Math.max(1, d), 32, 260); pinch = d; return; }
    if (!down) return;
    const dx = e.clientX - down.lastX, dy = e.clientY - down.lastY;
    if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 7) down.moved = true;
    if (down.moved || orbit) { az -= dx * .005; el = T.MathUtils.clamp(el + dy * .003, -.05, 1.35); }
    down.lastX = e.clientX; down.lastY = e.clientY;
  };
  const pointerUp = e => { if (down && !down.moved && !down.hit && !orbit && pointers.size === 1) at(e.clientX, e.clientY); pointers.delete(e.pointerId); down = null; pinch = 0; };
  const clearInput = () => { down = null; pointers.clear(); pinch = 0; };
  const wheel = e => { e.preventDefault(); distance = T.MathUtils.clamp(distance + e.deltaY * .045, 32, 260); };
  const contextLost = e => { e.preventDefault(); mount.dispatchEvent(new CustomEvent('game-error', { bubbles: true })); };
  renderer.domElement.addEventListener('pointerdown', pointerDown); renderer.domElement.addEventListener('pointermove', pointerMove); renderer.domElement.addEventListener('pointerup', pointerUp); renderer.domElement.addEventListener('pointercancel', clearInput); renderer.domElement.addEventListener('wheel', wheel, { passive: false }); renderer.domElement.addEventListener('webglcontextlost', contextLost);
  window.addEventListener('blur', clearInput); document.addEventListener('visibilitychange', clearInput);
  let previous = performance.now();
  function frame(time) {
    if (disposed) return; raf = requestAnimationFrame(frame);
    const dt = Math.min((time - previous) / 1000, .04); previous = time; if (document.hidden) return;
    if (down && !down.moved && !orbit && pointers.size === 1 && time - down.start > 240) { at(down.x, down.y); down.hit = true; }
    if (pending && time >= pending.at) { const event = pending; pending = null; applyHit(event.point, event.spec); publish(); }
    for (let i = vfx.length - 1; i >= 0; i--) {
      const e = vfx[i]; e.age += dt; const t = Math.min(1, e.age / e.life);
      if (e.kind === 'flight') { e.mesh.position.lerpVectors(e.start, e.end, t * t); e.mesh.rotation.x += dt * 5; }
      else if (e.kind === 'hole') { e.mesh.scale.setScalar(1 + Math.sin(t * Math.PI) * 2); e.mesh.rotation.y += dt * 3; }
      else if (e.kind === 'ring') { e.mesh.scale.setScalar(1 + t * e.radius); e.mesh.material.opacity = (1 - t) * .7; }
      else e.mesh.material.opacity = (1 - t) * .8;
      if (t >= 1) { scene.remove(e.mesh); e.mesh.geometry.dispose(); e.mesh.material.dispose(); vfx.splice(i, 1); }
    }
    physics.step(dt);if(people.step(dt)) publish();
    fragments.step(dt); shake *= .8; if (shake < .002) shake = 0;
    updateCamera(); renderer.render(scene, camera);
  }
  publish(); raf = requestAnimationFrame(frame);
  return {
    setTool(t) { if (TOOL_BY_ID[t]) tool = t; }, setSound(v) { sound = v; if (!v && audio) audio.suspend(); }, setOrbit(v) { orbit = v; down = null; },
    zoom(v) { distance = T.MathUtils.clamp(distance + v, 32, 260); }, home() { az = -1; el = viewDepth < 0 ? (cutaway?.35:.16) : 1.1; resize(); },
    centerHit() { const r = mount.parentElement.querySelector('.play-overlay').getBoundingClientRect(); at(r.left + r.width / 2, r.top + r.height / 2); },
    focusDig, setDepth, surface, undo, setInterior, setFloor,
    reset() {
      history = []; pending = null; clearVfx(); fragments.clear();physics.clear();people.reset(); earth.reset(); broken = hits = combo = score = 0; lastHit = lastAttack = -10000; down = null; lastAim.set(0, 0, 0); following = true;
      for (const p of pieces) p.state = p.parent ? 1 : 0;
      physics.refreshGround();physics.syncStructure(pieces,live);pieces.forEach(writePiece);surface();
    },
    dispose() {
      disposed = true; cancelAnimationFrame(raf); clearVfx(); ro.disconnect();
      window.removeEventListener('blur', clearInput); document.removeEventListener('visibilitychange', clearInput);
      renderer.domElement.removeEventListener('pointerdown', pointerDown); renderer.domElement.removeEventListener('pointermove', pointerMove); renderer.domElement.removeEventListener('pointerup', pointerUp); renderer.domElement.removeEventListener('pointercancel', clearInput); renderer.domElement.removeEventListener('wheel', wheel); renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      if (audio) audio.close(); terrain.dispose(); fragments.dispose();physics.dispose();people.dispose();
      for (const pool of pools.values()) if (pool.mesh.geometry !== geometry) pool.mesh.geometry.dispose();
      geometry.dispose(); materialResources.forEach(m => m.dispose()); textureResources.forEach(t => t.dispose()); environment.dispose(); renderer.dispose(); renderer.domElement.remove();
    },
  };
}
