export const FLOOR_COUNT = 18;
export const FLOOR_HEIGHT = 42.9 / FLOOR_COUNT;
export const FLOORS = [
  ['로비 · 접수 · 약국', 'lobby'], ['외래 · 진료실', 'clinic'],
  ['영상 검사실', 'imaging'], ['재활 치료실', 'rehab'],
  ['수술 · 회복실', 'surgery'], ['집중 관찰실', 'icu'],
  ...Array.from({length: 10}, () => ['병동 · 간호 스테이션', 'ward']),
  ['간호사실 · 직원 휴게실', 'staff'], ['특별 병동 · 라운지', 'ward'],
].map(([name, type], index) => ({index, name, type}));

export function floorAt(y) { return Math.max(0, Math.min(FLOOR_COUNT - 1, Math.floor(y / FLOOR_HEIGHT))); }

// The exterior follows the reference photo; this 18-floor interior is fictional.
export function visiblePiece(piece, cutaway, floor) {
  if (!cutaway) return true;
  if (floor >= 0 && piece.home.y - piece.s.y / 2 > (floor + 1) * FLOOR_HEIGHT - .12) return false;
  return piece.kind !== 'shell' || (piece.home.x > -9.1 && piece.home.z < 4.9);
}
