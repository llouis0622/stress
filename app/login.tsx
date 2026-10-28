'use client';
import { useState } from 'react';
import { ArrowRight, LockKeyhole, Heart, LoaderCircle } from 'lucide-react';
export default function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function unlock(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const r = await fetch('/api/unlock', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({password}) });
      const data = await r.json() as {error?: string};
      if (r.ok) { window.location.assign('/play'); return; }
      setError(data.error || '입장하지 못했어요. 다시 시도해 주세요.'); setPassword('');
    } catch { setError('연결을 확인한 뒤 다시 시도해 주세요.'); }
    setBusy(false);
  }
  return <main className="entry">
    <header className="entry-header"><a href="/" className="wordmark">MINAM<span>BREAK</span><i /></a><span className="edition">A LITTLE BREAK, JUST FOR YOU</span></header>
    <div className="entry-orbit orbit-one"/><div className="entry-orbit orbit-two"/>
    <section className="entry-content">
      <span className="eyebrow"><span className="status-dot"/> ONLY FOR YOU</span>
      <h1>오늘도,<br/>정말 수고했어<span className="coral">.</span></h1>
      <p className="entry-copy">꾹 참았던 마음은 잠깐 내려놓고.<br/>오늘의 스트레스, 여기서 시원하게 부숴 버려.</p>
      <form className="entry-form" onSubmit={unlock}>
        <label htmlFor="password"><LockKeyhole size={15}/> 우리만 아는 비밀번호</label>
        <div className="password-row"><input autoComplete="current-password" id="password" type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} minLength={4} required value={password} onChange={e=>setPassword(e.target.value.replace(/\D/g,''))} placeholder="네 자리 숫자" aria-describedby="login-error" disabled={busy}/><button disabled={busy||password.length!==4} type="submit" aria-label="입장하기">{busy?<LoaderCircle className="spin"/>:<ArrowRight/>}</button></div>
        <p id="login-error" className="login-error" aria-live="polite">{error || '\u00a0'}</p>
      </form>
      <div className="entry-note"><Heart size={13}/> 너를 위한 공간이야. 마음껏 즐겨.</div>
    </section>
    <div className="entry-bottom"><span>TAKE A BREATH. MAKE A BREAK.</span><span>MADE WITH ♥</span></div>
    <div className="entry-backdrop" aria-hidden="true">BREAK.</div>
  </main>;
}
