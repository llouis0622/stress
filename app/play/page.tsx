import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { sessionIsValid } from '@/lib/game-auth';
import Game from './game';
export const dynamic='force-dynamic';
export default async function Play(){
  if(!await sessionIsValid((await cookies()).get('minam_session')?.value))redirect('/');
  return <Game/>;
}
