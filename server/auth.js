import { createHmac, timingSafeEqual } from 'node:crypto';
const age = 60*60*24*30;
export function sign(value,secret=process.env.MAP_ACCESS_SECRET) {return createHmac('sha256',secret).update(value).digest('base64url');}
export function ticket(purpose,seconds,secret=process.env.MAP_ACCESS_SECRET) { const value=`${purpose}.${Math.floor(Date.now()/1000)+seconds}`;return `${value}.${sign(value,secret)}`; }
export function valid(token,purpose) {
  if(!process.env.MAP_ACCESS_SECRET || typeof token!=='string') return false;
  const [p,expiry,sig,...rest] = token.split('.');
  if(rest.length || p!==purpose || !/^\d+$/.test(expiry||'') || Number(expiry)<=Date.now()/1000 || Number(expiry)>Date.now()/1000+(purpose==='launch'?600:age)+5) return false;
  const expected=sign(`${p}.${expiry}`);const a=Buffer.from(sig||'');const b=Buffer.from(expected);
  return a.length===b.length && timingSafeEqual(a,b);
}
export function authorized(req) { return valid(req.headers.get('cookie')?.split('; ').find(x=>x.startsWith('map_session='))?.slice(12),'session'); }
export function sessionCookie() {return `map_session=${ticket('session',age)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${age}`;}
