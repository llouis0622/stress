import { env } from 'cloudflare:workers';
import { verifySession } from './session.mjs';
export async function sessionIsValid(value?: string) { return verifySession(value, env.SESSION_SECRET, env.GAME_PASSWORD); }
export function sameOrigin(request: Request) { const origin=request.headers.get('Origin');return !!origin&&origin===new URL(request.url).origin; }
export const noStore = {'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow, noarchive'};
