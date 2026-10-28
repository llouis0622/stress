import { noStore, sameOrigin } from '@/lib/game-auth';
export async function POST(request: Request) {
  if(!sameOrigin(request))return new Response(null,{status:403,headers:noStore});
  return Response.json({ok:true},{headers:{...noStore,'Set-Cookie':`minam_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${new URL(request.url).protocol==='https:'?'; Secure':''}`}});
}
