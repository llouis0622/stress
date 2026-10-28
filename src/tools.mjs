export const TOOLS = [
  { id: 'hammer', name: '망치', hint: '톡톡, 맞은 곳을 잘게 부숴요. 꾹 누르면 연속 타격!', radius: 1.55, vertical: 1, cooldown: 170, color: '#e98762' },
  { id: 'wave', name: '충격파', hint: '넓게 퍼지는 충격으로 벽과 지면을 밀어내요.', radius: 5.4, vertical: .8, cooldown: 450, color: '#5eabb2' },
  { id: 'laser', name: '레이저', hint: '꾹 눌러 벽을 잘게 자르고 좁은 구멍을 뚫어요.', radius: .58, vertical: 1.8, cooldown: 95, color: '#85e4fa' },
  { id: 'meteor', name: '운석', hint: '선택한 곳에 운석이 떨어져 커다란 구덩이를 만들어요.', radius: 8.5, vertical: 1.3, cooldown: 1000, delay: .55, color: '#f78c42' },
  { id: 'quake', name: '지진', hint: '현재 지층을 넓게 흔들어 바닥부터 허물어요.', radius: 10, vertical: .6, cooldown: 1200, color: '#c4b06c' },
  { id: 'drill', name: '드릴', hint: '꾹 눌러 깊이 파고들어요. 굴착 지점으로 시점이 따라가요.', radius: 2.2, vertical: 2.8, offset: 3.5, cooldown: 130, color: '#f2ca63' },
  { id: 'bomb', name: '폭탄', hint: '폭탄을 던지면 잠시 뒤 사방으로 터져요.', radius: 7, vertical: 1.1, cooldown: 850, delay: .4, color: '#fa9a74' },
  { id: 'wrecking', name: '쇠공', hint: '무거운 쇠공이 옆에서 날아와 두꺼운 벽을 부숴요.', radius: 4.6, vertical: 1, cooldown: 650, delay: .35, color: '#a9bdcc' },
  { id: 'blackhole', name: '블랙홀', hint: '주변 건물과 지층을 끌어당겨 작은 파편으로 삼켜요.', radius: 11, vertical: 1, cooldown: 1400, delay: .7, color: '#bb95fb' },
];
export const TOOL_BY_ID = Object.fromEntries(TOOLS.map(tool => [tool.id, tool]));
