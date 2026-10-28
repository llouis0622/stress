// A compressed, playable cross-section through the Earth, not a physical scale model.
export const CELL = 3;
export const WIDTH = 32;
export const ROWS = 188;
export const HALF = WIDTH * CELL / 2;
export const WORLD_DEPTH = ROWS * CELL;
export const LAYERS = [
  { name: '지각', end: 12, km: 35, color: '#987551' },
  { name: '상부 맨틀', end: 66, km: 660, color: '#a55338' },
  { name: '하부 맨틀', end: 162, km: 2890, color: '#c14429' },
  { name: '외핵', end: 240, km: 5150, color: '#ef7835' },
  { name: '내핵', end: 324, km: 7592, color: '#ffd580' },
  { name: '반대편 외핵', end: 402, km: 9852, color: '#ed7630' },
  { name: '반대편 하부 맨틀', end: 498, km: 12082, color: '#bd442d' },
  { name: '반대편 상부 맨틀', end: 552, km: 12707, color: '#a4583c' },
  { name: '반대편 지각', end: WORLD_DEPTH, km: 12742, color: '#967b61' },
];

export function layerAt(depth) {
  return LAYERS.find(layer => depth < layer.end) || LAYERS[LAYERS.length - 1];
}
export function travelKm(depth) {
  const clamped = Math.max(0, Math.min(WORLD_DEPTH, depth));
  let previousDepth = 0, previousKm = 0;
  for (const layer of LAYERS) {
    if (clamped <= layer.end) return Math.round(previousKm + (layer.km - previousKm) * (clamped - previousDepth) / (layer.end - previousDepth));
    previousDepth = layer.end; previousKm = layer.km;
  }
  return 12742;
}

export function createEarth() {
  const plane = WIDTH * WIDTH;
  const removed = new Uint8Array(plane * ROWS);
  const rowCounts = new Uint16Array(ROWS);
  let count = 0, deepest = 0;
  const id = (x, row, z) => row * plane + z * WIDTH + x;
  const solid = (x, row, z) => x >= 0 && x < WIDTH && z >= 0 && z < WIDTH && row >= 0 && row < ROWS && !removed[id(x, row, z)];
  function center(index) {
    const row = Math.floor(index / plane), cell = index % plane;
    return { x: (cell % WIDTH + .5) * CELL - HALF, y: -(row + .5) * CELL, z: (Math.floor(cell / WIDTH) + .5) * CELL - HALF };
  }
  function carve(point, radius, vertical = 1) {
    const changed = [];
    const xmin = Math.max(0, Math.floor((point.x - radius + HALF) / CELL));
    const xmax = Math.min(WIDTH - 1, Math.floor((point.x + radius + HALF) / CELL));
    const zmin = Math.max(0, Math.floor((point.z - radius + HALF) / CELL));
    const zmax = Math.min(WIDTH - 1, Math.floor((point.z + radius + HALF) / CELL));
    const rmin = Math.max(0, Math.floor((-point.y - radius * vertical) / CELL));
    const rmax = Math.min(ROWS - 1, Math.floor((-point.y + radius * vertical) / CELL));
    for (let row = rmin; row <= rmax; row++) for (let z = zmin; z <= zmax; z++) for (let x = xmin; x <= xmax; x++) {
      const index = id(x, row, z);
      if (removed[index]) continue;
      // Distance to the cell's box: even a fine tool can chip the touched face.
      const dx = Math.max(0, Math.abs((x + .5) * CELL - HALF - point.x) - CELL / 2);
      const dy = Math.max(0, Math.abs(-(row + .5) * CELL - point.y) - CELL / 2) / vertical;
      const dz = Math.max(0, Math.abs((z + .5) * CELL - HALF - point.z) - CELL / 2);
      if (dx * dx + dy * dy + dz * dz > radius * radius) continue;
      removed[index] = 1; rowCounts[row]++; count++; changed.push(index);
      deepest = Math.max(deepest, (row + 1) * CELL);
    }
    return changed;
  }
  function restore(indices) {
    for (const index of indices) if (removed[index]) { removed[index] = 0; rowCounts[Math.floor(index / plane)]--; count--; }
    deepest = 0;
    for (let row = ROWS - 1; row >= 0; row--) if (rowCounts[row]) { deepest = (row + 1) * CELL; break; }
  }
  function exposed(clipRow, rowCount, visit) {
    const end = Math.min(ROWS, clipRow + rowCount);
    for (let row = clipRow; row < end; row++) for (let z = 0; z < WIDTH; z++) for (let x = 0; x < WIDTH; x++) {
      if (!solid(x, row, z)) continue;
      if (row === clipRow || !solid(x - 1, row, z) || !solid(x + 1, row, z) || !solid(x, row - 1, z) || !solid(x, row + 1, z) || !solid(x, row, z - 1) || !solid(x, row, z + 1)) visit(id(x, row, z), x, row, z);
    }
  }
  // Exact voxel traversal. Only the visible cutaway can be hit; no hidden floor skipping.
  function raycast(origin, direction, clipRow = 0, visibleRows = ROWS) {
    const o = [(origin.x + HALF) / CELL, -origin.y / CELL, (origin.z + HALF) / CELL];
    const d = [direction.x / CELL, -direction.y / CELL, direction.z / CELL];
    const lo = [0, clipRow, 0], hi = [WIDTH, Math.min(ROWS, clipRow + visibleRows), WIDTH];
    let enter = 0, leave = Infinity;
    for (let axis = 0; axis < 3; axis++) {
      if (Math.abs(d[axis]) < 1e-10) { if (o[axis] < lo[axis] || o[axis] >= hi[axis]) return null; continue; }
      const a = (lo[axis] - o[axis]) / d[axis], b = (hi[axis] - o[axis]) / d[axis];
      enter = Math.max(enter, Math.min(a, b)); leave = Math.min(leave, Math.max(a, b));
    }
    if (leave < enter) return null;
    let t = enter + 1e-6;
    const cell = o.map((v, a) => Math.floor(v + d[a] * t));
    const step = d.map(v => Math.sign(v));
    const delta = d.map(v => v ? Math.abs(1 / v) : Infinity);
    const next = d.map((v, a) => v ? ((cell[a] + (v > 0 ? 1 : 0)) - o[a]) / v : Infinity);
    while (t <= leave + 1e-6 && cell.every((v, a) => v >= lo[a] && v < hi[a])) {
      if (solid(cell[0], cell[1], cell[2])) return { point: { x: origin.x + direction.x * t, y: origin.y + direction.y * t, z: origin.z + direction.z * t }, distance: t, index: id(cell[0], cell[1], cell[2]) };
      const axis = next[0] < next[1] ? (next[0] < next[2] ? 0 : 2) : (next[1] < next[2] ? 1 : 2);
      t = next[axis]; next[axis] += delta[axis]; cell[axis] += step[axis];
    }
    return null;
  }
  return {
    carve, restore, exposed, raycast, center, solid,
    get count() { return count; }, get deepest() { return deepest; }, get through() { return deepest >= WORLD_DEPTH; },
    get total() { return removed.length; },
    reset() { removed.fill(0); rowCounts.fill(0); count = deepest = 0; },
  };
}
