import { cookies } from 'next/headers';
import { noStore, sessionIsValid } from '@/lib/game-auth';
export const dynamic='force-dynamic';
export async function GET(){const ok=await sessionIsValid((await cookies()).get('minam_session')?.value);return Response.json({ok},{status:ok?200:401,headers:noStore});}
