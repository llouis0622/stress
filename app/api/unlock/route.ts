import { env } from 'cloudflare:workers';
import { constantEqual, makeSession, sign, SESSION_TTL } from '@/lib/session.mjs';
import { noStore, sameOrigin } from '@/lib/game-auth';
export async function POST(request: Request) {
  if(!sameOrigin(request))return Response.json({error:'접속한 페이지에서 다시 시도해 주세요.'},{status:403,headers:noStore});
  if(!env.GAME_PASSWORD||!env.SESSION_SECRET||!env.DB)return Response.json({error:'입장 준비 중이에요. 잠시 후 다시 와 주세요.'},{status:503,headers:noStore});
  if(Number(request.headers.get('content-length'))>1024)return new Response(null,{status:413,headers:noStore});
  let password: unknown;
  try { const body=await request.text(); if(body.length>1024)return new Response(null,{status:413,headers:noStore}); password=JSON.parse(body).password; }catch{return Response.json({error:'네 자리 숫자를 입력해 주세요.'},{status:400,headers:noStore});}
  const now=Math.floor(Date.now()/1000);
  const ip=await sign(request.headers.get('cf-connecting-ip')||'local',env.SESSION_SECRET);
  const rate=async(key:string,seconds:number)=>env.DB!.prepare(`INSERT INTO login_limits (key,count,reset_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN reset_at<=? THEN 1 ELSE count+1 END, reset_at=CASE WHEN reset_at<=? THEN ? ELSE reset_at END RETURNING count,reset_at`).bind(key,now+seconds,now,now,now+seconds).first<{count:number;reset_at:number}>();
  const perIp=await rate(`ip:${ip}`,900);
  if(perIp&&perIp.count>8)return Response.json({error:'여러 번 시도했어요. 15분 뒤 다시 입력해 주세요.'},{status:429,headers:{...noStore,'Retry-After':String(Math.max(1,perIp.reset_at-now))}});
  const global=await rate('total',3600);
  if(global&&global.count>50)return Response.json({error:'잠시 쉬어가는 중이에요. 한 시간 뒤 다시 시도해 주세요.'},{status:429,headers:{...noStore,'Retry-After':String(Math.max(1,global.reset_at-now))}});
  await env.DB.prepare('DELETE FROM login_limits WHERE reset_at < ?').bind(now-86400).run();
  if(!constantEqual(password,env.GAME_PASSWORD))return Response.json({error:'비밀번호가 달라요. 다시 확인해 주세요.'},{status:401,headers:noStore});
  const token=await makeSession(env.SESSION_SECRET,env.GAME_PASSWORD);
  const secure=new URL(request.url).protocol==='https:'?'; Secure':'';
  return Response.json({ok:true},{headers:{...noStore,'Set-Cookie':`minam_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL}${secure}`}});
}
