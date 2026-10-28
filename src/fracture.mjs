import * as T from './vendor/three.module.js';

// Split only the two widest dimensions, preserving thin facade panels and their orientation.
export function panelParts(size, position, rotation) {
  const axes = ['x', 'y', 'z'].sort((a, b) => size[b] - size[a]);
  if (size[axes[1]] < .45) return [];
  const parts = [];
  for (const a of [-1, 1]) for (const b of [-1, 1]) {
    const childSize = size.clone(); childSize[axes[0]] /= 2; childSize[axes[1]] /= 2;
    const offset = new T.Vector3(); offset[axes[0]] = size[axes[0]] * a / 4; offset[axes[1]] = size[axes[1]] * b / 4;
    parts.push({ size: childSize, position: offset.applyQuaternion(rotation).add(position) });
  }
  return parts;
}
