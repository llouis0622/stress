import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeSession,verifySession,SESSION_TTL} from '../lib/session.mjs';
const secret='test-only-key-not-used-in-production',password='test-only-password',now=Date.now();
test('only an untampered, unexpired signature authorizes access',async()=>{
 const token=await makeSession(secret,password,now);
 assert.equal(await verifySession(token,secret,password,now),true);
 assert.equal(await verifySession(undefined,secret,password,now),false);
 assert.equal(await verifySession('anything',secret,password,now),false);
 assert.equal(await verifySession(token.slice(0,-1)+(token.endsWith('0')?'1':'0'),secret,password,now),false);
 assert.equal(await verifySession(token,'wrong-key',password,now),false);
 assert.equal(await verifySession(token,secret,'changed-password',now),false);
 assert.equal(await verifySession(token,secret,password,now+(SESSION_TTL+1)*1000),false);
 assert.equal(await verifySession(token,undefined,password,now),false);
});
test('each successful login creates a distinct session',async()=>assert.notEqual(await makeSession(secret,password,now),await makeSession(secret,password,now)));
