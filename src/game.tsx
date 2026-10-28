import { useEffect, useRef, useState } from 'react';
import { Hammer, Zap, RotateCcw, Volume2, VolumeX, LockKeyhole, Move, Crosshair, Minus, Plus, Heart, X, CircleHelp, Maximize2, LoaderCircle, Flame, Activity, Undo2, Drill, Bomb, CircleDot, Orbit, ArrowDown, Building2, Layers3, Users, ChevronDown } from 'lucide-react';
import { TOOLS } from './tools.mjs';
import { FLOORS } from './hospital-plan.mjs';

export type Stats = { percent:number; hits:number; combo:number; score:number; finished:boolean; canUndo:boolean; depth:number; viewDepth:number; maxDepth:number; layer:string; underground:boolean; earthPercent:number; earthBlocks:number; journey:number; pending:boolean; cutaway:boolean; selectedFloor:number; people:number; evacuated:number; evacuating:boolean };
type Engine = { setTool:(tool:string)=>void; undo:()=>void; reset:()=>void; home:()=>void; zoom:(n:number)=>void; setSound:(v:boolean)=>void; setOrbit:(v:boolean)=>void; centerHit:()=>void; focusDig:()=>void; setDepth:(n:number)=>void; surface:()=>void; setInterior:(v:boolean)=>void; setFloor:(n:number)=>void; dispose:()=>void };
const icons = [Hammer, Zap, Crosshair, Flame, Activity, Drill, Bomb, CircleDot, Orbit];
export const initial:Stats = { percent:0, hits:0, combo:0, score:0, finished:false, canUndo:false, depth:0, viewDepth:0, maxDepth:0, layer:'지각', underground:false, earthPercent:0, earthBlocks:0, journey:0, pending:false, cutaway:false, selectedFloor:-1, people:36, evacuated:0, evacuating:false };
type HUDProps = {stats:Stats; tool:string; sound:boolean; orbit:boolean; actions:Partial<Engine>; choose:(id:string)=>void; toggleSound:()=>void; toggleOrbit:()=>void; showHelp:()=>void};

export function GameHUD({stats,tool,sound,orbit,actions,choose,toggleSound,toggleOrbit,showHelp}:HUDProps) {
  const [openPanel,setOpenPanel]=useState<'building'|'earth'|null>(null);
  const selected = TOOLS.find(t => t.id === tool)!;
  const togglePanel=(panel:'building'|'earth')=>setOpenPanel(openPanel===panel?null:panel);
  return <>
    <header className="game-header">
      <div className="brand-block"><a href="./" className="wordmark">MINAM<span>BREAK</span><i/></a><span className="private-badge">너만의 작은 해방구</span></div>
      <div className="top-actions">
        <div className="view-controls"><button className="icon-button zoom-button" aria-label="확대" onClick={()=>actions.zoom?.(-6)}><Plus size={17}/></button><button className="icon-button zoom-button" aria-label="축소" onClick={()=>actions.zoom?.(6)}><Minus size={17}/></button><button className="icon-button" aria-label="처음 시점으로" onClick={()=>actions.home?.()}><Maximize2 size={17}/></button></div>
        <button className="icon-button" onClick={toggleSound} aria-label={sound?'소리 끄기':'소리 켜기'}>{sound?<Volume2 size={18}/>:<VolumeX size={18}/>}</button>
        <button className="icon-button" onClick={showHelp} aria-label="조작 안내"><CircleHelp size={18}/></button>
        <button className="icon-button" aria-label="잠그기" onClick={()=>window.location.reload()}><LockKeyhole size={16}/></button>
      </div>
    </header>
    <div className="play-overlay">
      <div className="mobile-panels" aria-label="게임 정보 패널">
        <button aria-expanded={openPanel==='building'} aria-controls="building-panel" onClick={()=>togglePanel('building')}><Building2 size={15}/>병원 · 내부<ChevronDown size={13}/></button>
        <button aria-expanded={openPanel==='earth'} aria-controls="earth-stack" onClick={()=>togglePanel('earth')}><ArrowDown size={15}/>굴착 · 점수<ChevronDown size={13}/></button>
      </div>
      <div className="panel-columns">
        <div className={`left-stack ${openPanel==='building'?'is-open':''}`} id="building-panel">
          <section className="scene-title"><span className="eyebrow">TODAY’S LITTLE ESCAPE</span><h1>{stats.underground?<>지구 반대편까지,<br/><span>더 깊이.</span></>:<>오늘의 스트레스,<br/><span>시원하게 부숴 봐.</span></>}</h1><p>부산미남병원 · 18층의 작은 세계</p></section>
          <section className="interior-panel panel" aria-label="병원 내부 보기">
            <div className="panel-title"><Building2 size={16}/><strong>부산미남병원</strong><span>18F</span></div>
            <p className="panel-description">벽 너머 병실부터 간호 스테이션까지.</p>
            <div className="segmented"><button aria-pressed={!stats.cutaway} onClick={()=>{actions.setInterior?.(false);}}><Building2 size={14}/>외관</button><button aria-pressed={stats.cutaway} onClick={()=>actions.setInterior?.(true)}><Layers3 size={14}/>내부 단면</button></div>
            <label className="floor-label" htmlFor="hospital-floor">층 둘러보기</label>
            <select id="hospital-floor" value={stats.selectedFloor} onChange={e=>actions.setFloor?.(Number(e.target.value))}>
              <option value={-1}>전체 18층</option>
              {[...FLOORS].reverse().map(f=><option key={f.index} value={f.index}>{f.index+1}F · {f.name}</option>)}
            </select>
            <div className="occupants"><Users size={15}/><div><strong>{stats.evacuating?`대피 완료 ${stats.evacuated} / ${stats.people}`:'환자 · 간호사 · 의료진'}</strong><small>{stats.evacuating?(stats.evacuated===stats.people?'모두 안전한 곳으로 이동했어요.':'계단을 따라 안전한 곳으로 이동 중'):'타격이 시작되면 안전하게 대피해요.'}</small></div></div>
            <small className="interior-note">내부는 게임용으로 꾸민 가상 공간이에요.</small>
          </section>
        </div>
        <div className={`right-stack ${openPanel==='earth'?'is-open':''}`} id="earth-stack">
          <section className="progress-card panel" aria-label="게임 진행 상황">
            <div className="progress-caption"><span>병원 파괴</span><Heart size={14}/></div>
            <div className="progress-number">{stats.percent}<small>%</small></div>
            <div className="progress-track"><span style={{width:`${stats.percent}%`}}/></div>
            <div className="progress-footer"><span>{stats.hits}번의 시원한 한 방</span><b>{stats.score.toLocaleString()} <small>PTS</small></b></div>
            {stats.combo>=3&&<span className="combo">{stats.combo} COMBO</span>}
          </section>
          <section className="earth-panel panel" aria-label="지하 탐험">
            <div className="earth-heading"><span>지구 관통</span><b>{stats.journey}%</b></div>
            <div className="earth-distance"><strong>{stats.depth.toLocaleString()}</strong><span>/ 12,742 km</span></div>
            <div className="earth-track" aria-label={`지구 관통 ${stats.journey}%`}><i style={{left:`${stats.journey}%`}}/></div>
            <div className="earth-layer"><span>{stats.underground?stats.layer:'지표 · 부산미남병원'}</span><small>{stats.earthBlocks.toLocaleString()} 블록 파괴</small></div>
            <div className="earth-actions"><button className={!stats.underground?'active':''} onClick={()=>actions.surface?.()} aria-label="병원 시점"><Building2 size={14}/>병원</button><button className={stats.underground?'active':''} onClick={()=>actions.focusDig?.()} aria-label="굴착 지점 따라가기"><ArrowDown size={14}/>{stats.maxDepth?'굴착 따라가기':'지면 부수기'}</button></div>
            {stats.underground&&<><label className="depth-label" htmlFor="depth">파낸 깊이 안에서 시점 이동</label><input id="depth" type="range" min={0} max={Math.max(3,stats.maxDepth)} step={3} value={stats.viewDepth} disabled={!stats.maxDepth} onChange={e=>actions.setDepth?.(Number(e.target.value))}/><small className="cutaway-note">단면 보기 · 위쪽 지층은 가려져요</small></>}
          </section>
        </div>
      </div>
    </div>
    <div className="bottom-area">
      <p className="play-hint">{orbit?'드래그로 회전 · 두 손가락이나 스크롤로 확대·축소':stats.pending?'곧 터져요…':selected.hint}</p>
      <nav className="tool-dock" aria-label="게임 도구">
        <div className="tool-options">{TOOLS.map(({id,name},i)=>{const Icon=icons[i];return <button key={id} className={`tool-button ${tool===id&&!orbit?'selected '+id:''}`} onClick={()=>choose(id)} aria-pressed={tool===id&&!orbit} aria-label={name}><span className="tool-icon"><Icon size={22}/></span><strong>{name}</strong><kbd>{i+1}</kbd></button>;})}</div>
        <div className="utility-options"><button className={`small-tool ${orbit?'active':''}`} aria-pressed={orbit} onClick={toggleOrbit}><Move size={17}/><span>둘러보기</span></button><button className="small-tool" disabled={!stats.canUndo} onClick={()=>actions.undo?.()}><Undo2 size={17}/><span>되돌리기</span></button><button className="small-tool" onClick={()=>actions.reset?.()}><RotateCcw size={17}/><span>전부 다시 짓기</span></button></div>
      </nav>
      <div className="game-footer"><span><Heart size={10}/>오늘도 정말 고생 많았어.</span><span className="desktop-hint">1–9 도구 · E 지하 · H 병원 · U 되돌리기 · R 복구</span></div>
    </div>
  </>;
}

export default function Game() {
  const mount=useRef<HTMLDivElement>(null), engine=useRef<Engine|null>(null);
  const [ready,setReady]=useState(false),[error,setError]=useState('');
  const [tool,setTool]=useState('hammer'),[sound,setSound]=useState(true),[orbit,setOrbit]=useState(false);
  const [help,setHelp]=useState(false),[showFinish,setShowFinish]=useState(true),[stats,setStats]=useState<Stats>(initial);
  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      try {
        const mod=await import('./game-engine.mjs');
        if(cancelled||!mount.current) return;
        const game=await mod.createGame(mount.current,(s:Stats)=>setStats(s));
        if(cancelled) {game.dispose();return;}
        engine.current=game;setReady(true);
      } catch(e) {console.error(e);setError('3D 화면을 열지 못했어요. 하드웨어 가속이 켜진 최신 Safari 또는 Chrome에서 다시 열어 주세요.');}
    })();
    const element=mount.current;
    const lost=()=>setError('3D 화면 연결이 끊겼어요. 다시 열면 처음부터 즐길 수 있어요.');
    element?.addEventListener('game-error',lost);
    return()=>{cancelled=true;element?.removeEventListener('game-error',lost);engine.current?.dispose();engine.current=null;};
  },[]);
  function choose(id:string) {setTool(id);setOrbit(false);engine.current?.setOrbit(false);engine.current?.setTool(id);}
  function reset() {engine.current?.reset();setShowFinish(true);}
  useEffect(()=>{
    const key=(e:KeyboardEvent)=>{
      if(e.repeat||e.altKey||e.ctrlKey||e.metaKey||(e.target as HTMLElement)?.closest('button,a,input,textarea,select')) return;
      const index=Number(e.key)-1;
      if(index>=0&&index<TOOLS.length) choose(TOOLS[index].id);
      if(e.key.toLowerCase()==='u') engine.current?.undo();
      if(e.key.toLowerCase()==='r') reset();
      if(e.key.toLowerCase()==='e') engine.current?.focusDig();
      if(e.key.toLowerCase()==='h') engine.current?.surface();
      if(e.code==='Space') {e.preventDefault();engine.current?.centerHit();}
      if(e.key==='Escape') setHelp(false);
    };
    window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  },[]);
  return <main className={`game-shell ${stats.underground?'is-underground':''}`}>
    <div ref={mount} className={`scene ${orbit?'is-orbit':''}`} aria-label="부산미남병원과 지구 내부 3D 게임. 건물과 지면을 클릭하거나 터치하면 부서집니다." role="application" tabIndex={0}/>
    <GameHUD stats={stats} tool={tool} sound={sound} orbit={orbit} actions={{...engine.current,reset}} choose={choose} toggleSound={()=>{setSound(!sound);engine.current?.setSound(!sound);}} toggleOrbit={()=>{setOrbit(!orbit);engine.current?.setOrbit(!orbit);}} showHelp={()=>setHelp(true)}/>
    {!ready&&!error&&<div className="loading-overlay"><LoaderCircle className="spin" size={28}/><strong>너만의 해방구를 준비하고 있어</strong><span>18층 병원과 지구를 만드는 중이에요.</span></div>}
    {error&&<div className="modal-backdrop"><section className="dialog"><h2>잠깐만요</h2><p>{error}</p><button className="primary" onClick={()=>window.location.reload()}>다시 열기</button></section></div>}
    {stats.finished&&showFinish&&<div className="modal-backdrop finish-backdrop"><section className="dialog finish"><button className="dialog-close" aria-label="결과 닫기" onClick={()=>setShowFinish(false)}><X size={19}/></button><span className="finish-heart"><Orbit size={32}/></span><span className="eyebrow">HELLO, OTHER SIDE</span><h2>지구 반대편까지<br/>시원하게 뚫었어!</h2><p>맨틀과 내핵을 지나 12,742 km.<br/>주변 지층도 계속 부술 수 있어.</p><div className="finish-stats"><span><b>{stats.hits}</b>번의 타격</span><span><b>{stats.score.toLocaleString()}</b>POINTS</span></div><button className="primary" onClick={()=>setShowFinish(false)}>계속 더 부수기</button><button className="plain" onClick={reset}>처음부터 다시 즐기기</button></section></div>}
    {help&&<div className="modal-backdrop" onClick={()=>setHelp(false)}><section className="dialog help" onClick={e=>e.stopPropagation()}><button className="dialog-close" onClick={()=>setHelp(false)} aria-label="안내 닫기"><X size={19}/></button><span className="eyebrow">HOW TO TAKE A BREAK</span><h2>병실부터 지구 끝까지.</h2><p>클릭·터치로 타격, 꾹 눌러 연속 파괴.<br/>드래그로 회전하고 스크롤·두 손가락으로 확대해요.</p><p>‘내부 단면’과 층 선택으로 병실·간호실·검사실을 둘러보세요. 벽을 부숴도 내부가 드러나요. 캐릭터는 타격이 시작되면 계단으로 대피해요.</p><dl>{TOOLS.map(({id,name,hint},i)=>{const Icon=icons[i];return <div key={id}><dt><Icon size={17}/>{name}</dt><dd>{hint}</dd></div>;})}</dl><p>‘지면 부수기’로 내려간 뒤 땅을 눌러 보세요.<br/>‘굴착 따라가기’는 가장 깊이 파낸 곳을 따라가요.<br/>되돌리기는 최근 10번, 다시 짓기는 건물과 지구 전체를 복구해요.</p><p className="credits">건물 외관은 공식 사진을 참고했습니다. 18층 내부 배치와 캐릭터는 게임용 창작이며 실제 병원 내부와 무관합니다. 지구 깊이도 게임에 맞게 압축했습니다.<br/>아이디어 참고: <a href="https://hong-iron.github.io/SMASH/" target="_blank" rel="noreferrer">SMASH</a> · 외관 사진: <a href="https://minamhospital.com/" target="_blank" rel="noreferrer">부산미남병원</a>.</p></section></div>}
  </main>;
}
