import * as T from './vendor/three.module.js';
import { CELL, WIDTH, ROWS, HALF, layerAt } from './earth-model.mjs';

export function createEarthView(scene, earth) {
  const visibleRows = 18;
  const geometry = new T.BoxGeometry(1, 1, 1);
  const material = new T.MeshStandardMaterial({ roughness: .94 });
  const mesh = new T.InstancedMesh(geometry, material, WIDTH * WIDTH * visibleRows);
  const dummy = new T.Object3D(), color = new T.Color();
  mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
  mesh.receiveShadow = true; mesh.frustumCulled = false; mesh.count = 0;
  scene.add(mesh);
  let clipRow = 0;
  function refresh(depth) {
    clipRow = Math.min(ROWS - 1, Math.max(0, Math.floor(depth / CELL) - 2));
    let count = 0;
    earth.exposed(clipRow, visibleRows, (id, x, row, z) => {
      const px = (x + .5) * CELL - HALF, pz = (z + .5) * CELL - HALF;
      dummy.position.set(px, -(row + .5) * CELL, pz); dummy.scale.setScalar(CELL - .025); dummy.updateMatrix();
      mesh.setMatrixAt(count, dummy.matrix);
      color.set(layerAt((row + .5) * CELL).color);
      if (row === 0) {
        const road = Math.abs(pz - 21) < 6.6 || Math.abs(px + 22) < 5;
        color.set(road ? '#788888' : Math.abs(px) < 14 && Math.abs(pz) < 12 ? '#ccd0c7' : '#91a99b');
        if (road && Math.abs(pz - 21) < 1.6 && x % 3 !== 0) color.set('#ebe7c9');
        if (Math.abs(px + 22) < 5 && pz > 12 && pz < 17 && x % 2 === 0) color.set('#ebe7c9');
      }
      color.multiplyScalar(.9 + ((id * 16807) % 97) / 485);
      mesh.setColorAt(count++, color);
    });
    mesh.count = count; mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    material.emissive.set(layerAt(depth).color);
    material.emissiveIntensity = depth > 65 && depth < 500 ? .24 : 0;
  }
  refresh(0);
  return {
    refresh,
    raycast(ray) { return earth.raycast(ray.origin, ray.direction, clipRow, visibleRows); },
    dispose() { scene.remove(mesh); geometry.dispose(); material.dispose(); },
  };
}
