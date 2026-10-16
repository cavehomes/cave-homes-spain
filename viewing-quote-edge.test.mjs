import {test} from 'node:test';
import assert from 'node:assert/strict';
globalThis.Deno={env:{get:key=>key==='SUPABASE_URL'?'https://database.example.invalid':key==='SUPABASE_SERVICE_ROLE_KEY'?'server-only-test-key':undefined},serve:()=>{}};
const {handler}=await import('./supabase/functions/viewing-quote/index.ts');
const token='ab'.repeat(32);
const request=(body,origin='https://cavehomesspain.com')=>new Request('https://function.example.invalid',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(body)});
test('rejects an unrelated origin before accessing the database',async()=>{const r=await handler(request({action:'read',token},'https://untrusted.example.invalid'));assert.equal(r.status,403)});
test('invalid token and missing consent cannot access quote data',async()=>{assert.equal((await handler(request({action:'read',token:'invalid'}))).status,400);assert.equal((await handler(request({action:'accept',token,name:'Test'}))).status,400)});
test('bounds request bodies',async()=>{assert.equal((await handler(request({action:'read',token,padding:'x'.repeat(3000)}))).status,413)});
test('hashes capabilities and only forwards approved acceptance fields',async()=>{
 const nativeFetch=globalThis.fetch;let sent;
 globalThis.fetch=async(url,options)=>{sent={url,options};return new Response(JSON.stringify({status:'accepted',accepted_at:'2026-10-16T12:00:00Z'}),{status:200})};
 try{
  const r=await handler(request({action:'accept',token,name:'  Test Customer  ',agreed:true,price:1,stage:'booked'}));assert.equal(r.status,200);
  const data=JSON.parse(sent.options.body);assert.equal(data.p_name,'Test Customer');assert.match(data.p_token_hash,/^[a-f0-9]{64}$/);assert.notEqual(data.p_token_hash,token);assert.deepEqual(Object.keys(data).sort(),['p_name','p_token_hash']);assert.ok(sent.url.endsWith('/rpc/accept_viewing_quote'));assert.equal(r.headers.get('Cache-Control'),'no-store');assert.ok(!(await r.text()).includes('server-only-test-key'));
 }finally{globalThis.fetch=nativeFetch}
});
