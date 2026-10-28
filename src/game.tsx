import { useEffect, useRef, useState } from 'react';
import { Hammer, Zap, RotateCcw, Volume2, VolumeX, LockKeyhole, Move, Crosshair, Minus, Plus, Heart, X, CircleHelp, Maximize2, LoaderCircle, Flame, Activity, Undo2, Drill, Bomb, CircleDot, Orbit, ArrowDown, Building2 } from 'lucide-react';
import { TOOLS } from './tools.mjs';

type Stats = { percent:number; hits:number; combo:number; score:number; finished:boolean; canUndo:boolean; depth:number; viewDepth:number; maxDepth:number; layer:string; underground:boolean; earthPercent:number; earthBlocks:number; journey:number; pending:boolean };
type Engine = { setTool:(tool:string)=>void; undo:()=>void; reset:()=>void; home:()=>void; zoom:(n:number)=>void; setSound:(v:boolean)=>void; setOrbit:(v:boolean)=>void; centerHit:()=>void; focusDig:()=>void; setDepth:(n:number)=>void; surface:()=>void; dispose:()=>void };
const icons = [Hammer, Zap, Crosshair, Flame, Activity, Drill, Bomb, CircleDot, Orbit];
const initial:Stats = { percent:0, hits:0, combo:0, score:0, finished:false, canUndo:false, depth:0, viewDepth:0, maxDepth:0, layer:'지각', underground:false, earthPercent:0, earthBlocks:0, journey:0, pending:false };

export default function Game() {
  const mount = useRef<HTMLDivElement>(null), engine = useRef<Engine|null>(null);
  const [ready,setReady] = useState(false), [error,setError] = useState('');
  const [tool,setTool] = useState('hammer'), [sound,setSound] = useState(true), [orbit,setOrbit] = useState(false);
  const [help,setHelp] = useState(false), [showFinish,setShowFinish] = useState(true), [stats,setStats] = useState<Stats>(initial);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = await import('./game-engine.mjs');
        if (cancelled || !mount.current) return;
        const game = await mod.createGame(mount.current, (s:Stats) => setStats(s));
        if (cancelled) { game.dispose(); return; }
        engine.current = game; setReady(true);
      } catch (e) { console.error(e); setError('3D 화면을 열지 못했어요. 하드웨어 가속이 켜진 최신 Safari 또는 Chrome에서 다시 열어 주세요.'); }
    })();
    const element = mount.current;
    const lost = () => setError('3D 화면 연결이 끊겼어요. 다시 열면 처음부터 즐길 수 있어요.');
    element?.addEventListener('game-error',lost);
    return () => { cancelled = true; element?.removeEventListener('game-error',lost); engine.current?.dispose(); engine.current = null; };
  },[]);
  function choose(id:string) { setTool(id); setOrbit(false); engine.current?.setOrbit(false); engine.current?.setTool(id); }
  function reset() { engine.current?.reset(); setShowFinish(true); }
  useEffect(() => {
    const key = (e:KeyboardEvent) => {
      if (e.repeat || e.altKey || e.ctrlKey || e.metaKey || (e.target as HTMLElement)?.closest('button,a,input,textarea')) return;
      const index = Number(e.key) - 1;
      if (index >= 0 && index < TOOLS.length) choose(TOOLS[index].id);
      if (e.key.toLowerCase() === 'u') engine.current?.undo();
      if (e.key.toLowerCase() === 'r') reset();
      if (e.key.toLowerCase() === 'e') engine.current?.focusDig();
      if (e.key.toLowerCase() === 'h') engine.current?.surface();
      if (e.code === 'Space') { e.preventDefault(); engine.current?.centerHit(); }
      if (e.key === 'Escape') setHelp(false);
    };
    window.addEventListener('keydown',key); return () => window.removeEventListener('keydown',key);
  },[]);
  const selected = TOOLS.find(t => t.id === tool)!;
  return <main className={`game-shell ${stats.underground ? 'is-underground' : ''}`}>
    <div ref={mount} className={`scene ${orbit ? 'is-orbit' : ''}`} aria-label="부산미남병원과 지구 내부 3D 게임. 건물과 지면을 클릭하거나 터치하면 부서집니다." role="application" tabIndex={0}/>
    <header className="game-header">
      <div className="brand-block"><a href="./" className="wordmark">MINAM<span>BREAK</span><i/></a><span className="header-divider"/><span className="private-badge"><LockKeyhole size={11}/>우리만의 공간</span></div>
      <div className="top-actions">
        <button className="icon-button" onClick={() => { setSound(!sound); engine.current?.setSound(!sound); }} aria-label={sound ? '소리 끄기' : '소리 켜기'}>{sound ? <Volume2 size={19}/> : <VolumeX size={19}/>}</button>
        <button className="icon-button" onClick={() => setHelp(true)} aria-label="조작 안내"><CircleHelp size={19}/></button>
        <button className="lock-button" aria-label="잠그기" onClick={() => window.location.reload()}><LockKeyhole size={15}/><span>잠그기</span></button>
      </div>
    </header>
    <section className="scene-title"><span className="eyebrow">{stats.underground ? 'ALL THE WAY THROUGH' : 'TODAY’S LITTLE ESCAPE'}</span><h1>{stats.underground ? <>지구 반대편까지,<br/>시원하게 <span>뚫어 봐.</span></> : <>오늘의 스트레스,<br/>시원하게 <span>부숴 봐.</span></>}</h1><p>{stats.underground ? '지각, 맨틀, 외핵, 내핵. 끝까지 가 보자.' : '건물도, 주변 땅도. 마음 가는 대로.'}</p></section>
    <aside className="progress-card" aria-label="게임 진행 상황">
      <div className="progress-caption"><span>병원 파괴</span><Heart size={14}/></div>
      <div className="progress-number">{stats.percent}<small>%</small></div>
      <div className="progress-track"><span style={{width:`${stats.percent}%`}}/></div>
      <div className="progress-footer"><span>{stats.hits}번의 시원한 한 방</span><b>{stats.score.toLocaleString()} <small>PTS</small></b></div>
    </aside>
    <aside className="earth-panel" aria-label="지하 탐험">
      <div className="earth-heading"><span>지구 관통</span><b>{stats.journey}%</b></div>
      <div className="earth-distance"><strong>{stats.depth.toLocaleString()}</strong><span>/ 12,742 km</span></div>
      <div className="earth-track" aria-label={`지구 관통 ${stats.journey}%`}><i style={{left:`${stats.journey}%`}}/></div>
      <div className="earth-layer"><span>{stats.underground ? stats.layer : '지표 · 부산미남병원'}</span><small>{stats.earthBlocks.toLocaleString()} 블록 파괴</small></div>
      <div className="earth-actions"><button className={!stats.underground?'active':''} onClick={() => engine.current?.surface()} aria-label="병원 시점"><Building2 size={14}/>병원</button><button className={stats.underground?'active':''} onClick={() => engine.current?.focusDig()} aria-label="굴착 지점 따라가기"><ArrowDown size={14}/>{stats.maxDepth ? '굴착 따라가기' : '지면 부수기'}</button></div>
      {stats.underground && <><label className="depth-label" htmlFor="depth">파낸 깊이 안에서 시점 이동</label><input id="depth" type="range" min={0} max={Math.max(3,stats.maxDepth)} step={3} value={stats.viewDepth} disabled={!stats.maxDepth} onChange={e => engine.current?.setDepth(Number(e.target.value))}/><small className="cutaway-note">단면 보기 · 위쪽 지층은 가려져요</small></>}
    </aside>
    {stats.combo >= 3 && <div className="combo" key={stats.combo}><span>아주 좋아!</span><strong>{stats.combo} <i>COMBO</i></strong></div>}
    <div className="view-controls"><button aria-label="확대" onClick={() => engine.current?.zoom(-6)}><Plus size={18}/></button><button aria-label="축소" onClick={() => engine.current?.zoom(6)}><Minus size={18}/></button><span/><button aria-label="처음 시점으로" onClick={() => engine.current?.home()}><Maximize2 size={17}/></button></div>
    <div className="location"><span className="location-dot"/><div><strong>{stats.underground ? stats.layer : '부산미남병원'}</strong><span>{stats.underground ? 'KEEP GOING, A LITTLE DEEPER' : 'BUSAN MINAM HOSPITAL'}</span></div></div>
    <div className="bottom-area">
      <p className="play-hint">{orbit ? '드래그로 회전 · 두 손가락이나 스크롤로 확대·축소' : stats.pending ? '곧 터져요…' : selected.hint}</p>
      <nav className="tool-dock" aria-label="게임 도구">
        <div className="tool-options">{TOOLS.map(({id,name},i) => { const Icon=icons[i]; return <button key={id} className={`tool-button ${tool===id&&!orbit ? 'selected '+id : ''}`} onClick={() => choose(id)} aria-pressed={tool===id&&!orbit} aria-label={name}><span className="tool-icon"><Icon size={22}/></span><strong>{name}</strong><kbd>{i+1}</kbd></button>; })}</div>
        <div className="utility-options"><button className={`small-tool ${orbit?'active':''}`} aria-pressed={orbit} onClick={() => {setOrbit(!orbit); engine.current?.setOrbit(!orbit);}}><Move size={18}/><span>둘러보기</span></button><button className="small-tool" disabled={!stats.canUndo} onClick={() => engine.current?.undo()}><Undo2 size={18}/><span>되돌리기</span></button><button className="small-tool" onClick={reset}><RotateCcw size={18}/><span>전부 다시 짓기</span></button></div>
      </nav>
      <div className="game-footer"><span><Heart size={11}/> 오늘도 정말 고생 많았어.</span><span className="desktop-hint">1–9 도구 · E 지하 · H 병원 · U 되돌리기 · R 복구</span></div>
    </div>
    {!ready&&!error&&<div className="loading-overlay"><LoaderCircle className="spin" size={28}/><strong>너만의 해방구를 준비하고 있어</strong><span>건물과 지구를 만드는 중이에요.</span></div>}
    {error&&<div className="modal-backdrop"><section className="dialog"><h2>잠깐만요</h2><p>{error}</p><button className="primary" onClick={() => window.location.reload()}>다시 열기</button></section></div>}
    {stats.finished&&showFinish&&<div className="modal-backdrop finish-backdrop"><section className="dialog finish"><button className="dialog-close" aria-label="결과 닫기" onClick={() => setShowFinish(false)}><X size={19}/></button><span className="finish-heart"><Orbit size={32}/></span><span className="eyebrow">HELLO, OTHER SIDE</span><h2>지구 반대편까지<br/>시원하게 뚫었어!</h2><p>맨틀과 내핵을 지나 12,742 km.<br/>주변 지층도 계속 부술 수 있어.</p><div className="finish-stats"><span><b>{stats.hits}</b>번의 타격</span><span><b>{stats.score.toLocaleString()}</b>POINTS</span></div><button className="primary" onClick={() => setShowFinish(false)}>계속 더 부수기</button><button className="plain" onClick={reset}>처음부터 다시 즐기기</button></section></div>}
    {help&&<div className="modal-backdrop" onClick={() => setHelp(false)}><section className="dialog help" onClick={e => e.stopPropagation()}><button className="dialog-close" onClick={() => setHelp(false)} aria-label="안내 닫기"><X size={19}/></button><span className="eyebrow">HOW TO TAKE A BREAK</span><h2>건물부터 지구 끝까지.</h2><p>클릭·터치로 타격, 꾹 눌러 연속 파괴.<br/>드래그로 회전하고 스크롤·두 손가락으로 확대해요.</p><dl>{TOOLS.map(({id,name,hint},i) => {const Icon=icons[i];return <div key={id}><dt><Icon size={17}/>{name}</dt><dd>{hint}</dd></div>;})}</dl><p>‘지면 부수기’로 내려간 뒤 땅을 눌러 보세요.<br/>‘굴착 따라가기’는 가장 깊이 파낸 곳을 따라가요.<br/>되돌리기는 최근 10번, 다시 짓기는 건물과 지구 전체를 복구해요.</p><p className="credits">지구 내부는 깊이를 압축한 게임용 단면입니다. 액체인 외핵도 부술 수 있는 블록으로 표현했어요.<br/>건물은 공식 외관 사진을 참고했고, 보이지 않는 부분은 추정했습니다.<br/>아이디어 참고: <a href="https://hong-iron.github.io/SMASH/" target="_blank" rel="noreferrer">SMASH</a> · 외관 사진: <a href="https://minamhospital.com/" target="_blank" rel="noreferrer">부산미남병원</a>.</p></section></div>}
  </main>;
}
