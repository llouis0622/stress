import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { sessionIsValid } from '@/lib/game-auth';
import Login from './login';
export const dynamic = 'force-dynamic';
export default async function Home() {
  if (await sessionIsValid((await cookies()).get('minam_session')?.value)) redirect('/play');
  return <Login />;
}
