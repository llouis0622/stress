import * as T from './vendor/three.module.js';
import { CELL, HALF } from './earth-model.mjs';

// One draw call and a fixed pool: repeated explosions never accumulate debris.
export function createFragments(scene, earth, mobile) {
  const limit = mobile ? 480 : 1000;
  const geometry = new T.BoxGeometry(1, 1, 1);
  const material = new T.MeshStandardMaterial({ roughness: .85 });
  const mesh = new T.InstancedMesh(geometry, material, limit);
  const dummy = new T.Object3D(), color = new T.Color(), pull = new T.Vector3();
  const particles = Array.from({ length: limit }, () => ({ p: new T.Vector3(), v: new T.Vector3(), size: 0, age: 99, life: 0, spin: 0, color: '#fff', attractor: null }));
  let cursor = 0;
  mesh.instanceMatrix.setUsage(T.DynamicDrawUsage); mesh.frustumCulled = false; mesh.count = 0;
  scene.add(mesh);
  function spawn(point, tint, power, attractor = null, count = 10) {
    for (let i = 0; i < count; i++) {
      const p = particles[cursor++ % limit];
      p.p.copy(point).add(new T.Vector3((Math.random() - .5) * 1.6, (Math.random() - .5) * 1.2, (Math.random() - .5) * 1.6));
      p.v.set((Math.random() - .5) * power, Math.random() * power * .7 + 2, (Math.random() - .5) * power);
      p.age = 0; p.life = 1.2 + Math.random() * 1.3; p.size = .09 + Math.random() * .27;
      p.spin = Math.random() * 6; p.color = tint; p.attractor = attractor ? attractor.clone() : null;
    }
  }
  function step(dt) {
    let n = 0;
    for (const p of particles) {
      p.age += dt; if (p.age >= p.life) continue;
      if (p.attractor) { p.v.addScaledVector(pull.subVectors(p.attractor, p.p), dt * 24); p.v.multiplyScalar(.92); }
      else p.v.y -= 17 * dt;
      p.p.addScaledVector(p.v, dt);
      const row = Math.floor(-p.p.y / CELL);
      if (!p.attractor && earth.solid(Math.floor((p.p.x + HALF) / CELL), row, Math.floor((p.p.z + HALF) / CELL))) { p.p.y = -row * CELL + .08; p.v.y = Math.abs(p.v.y) * .2; p.v.x *= .75; p.v.z *= .75; }
      dummy.position.copy(p.p); dummy.rotation.set(p.age * p.spin, p.spin, p.age * 2);
      dummy.scale.setScalar(p.size * Math.min(1, (p.life - p.age) * 3)); dummy.updateMatrix();
      mesh.setMatrixAt(n, dummy.matrix); color.set(p.color); mesh.setColorAt(n++, color);
    }
    mesh.count = n; mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }
  return { spawn, step, clear() { for (const p of particles) p.life = 0; mesh.count = 0; }, dispose() { scene.remove(mesh); geometry.dispose(); material.dispose(); } };
}
