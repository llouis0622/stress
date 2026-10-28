const encoder = new TextEncoder();
export const SESSION_TTL = 24 * 60 * 60;
const hex = bytes => Array.from(new Uint8Array(bytes), b=>b.toString(16).padStart(2,'0')).join('');
export async function sign(value, secret) {
  const key = await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return hex(await crypto.subtle.sign('HMAC',key,encoder.encode(value)));
}
export function constantEqual(a,b) {
  if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;
  let diff=0; for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i); return diff===0;
}
export async function makeSession(secret, password, now=Date.now()) {
  const payload = `${Math.floor(now/1000)+SESSION_TTL}.${hex(crypto.getRandomValues(new Uint8Array(16)))}`;
  return `${payload}.${await sign(payload,`${secret}:${password}`)}`;
}
export async function verifySession(value, secret, password, now=Date.now()) {
  if(!value||!secret||!password||value.length>180)return false;
  const m=/^(\d{10})\.([a-f0-9]{32})\.([a-f0-9]{64})$/.exec(value);
  if(!m)return false;
  const exp=Number(m[1]), seconds=Math.floor(now/1000);
  if(exp<=seconds||exp>seconds+SESSION_TTL)return false;
  return constantEqual(m[3],await sign(`${m[1]}.${m[2]}`,`${secret}:${password}`));
}
