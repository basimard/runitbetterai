import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash,randomBytes} from 'node:crypto';
const base='http://127.0.0.1:5173';
const email=`qa-${crypto.randomUUID()}@example.test`, password=randomBytes(24).toString('hex');
const headers={'Content-Type':'application/json',Origin:base};
const auth=(body,cookie='')=>fetch(base+'/api/crm/auth',{method:'POST',headers:{...headers,Cookie:cookie},body:JSON.stringify(body)});
const initial=await (await fetch(base+'/api/crm/auth')).json();
assert.ok(initial.needsSetup,'Test requires unconfigured local account; existing accounts are never modified.');
let created=false,cookie='',contactId;const tokens=[];
try {
 assert.equal((await fetch(base+'/api/crm',{headers:{Cookie:'__sites_local_auth=1'}})).status,403);
 assert.equal((await fetch(base+'/admin',{redirect:'manual'})).headers.get('location'),'/admin/login');
 assert.equal((await fetch(base+'/api/crm/auth',{method:'POST',headers:{...headers,Origin:'https://other.test'},body:JSON.stringify({action:'setup',email,password})})).status,403);
 let r=await auth({action:'setup',email,password});assert.equal(r.status,200,await r.clone().text());created=true;cookie=r.headers.get('set-cookie').split(';')[0];tokens.push(cookie.split('=')[1]);assert.match(r.headers.get('set-cookie'),/HttpOnly/);assert.match(r.headers.get('set-cookie'),/SameSite=Strict/);
 assert.equal((await auth({action:'setup',email,password})).status,409);
 assert.equal((await auth({action:'login',email,password:'incorrect-password'})).status,401);
 r=await auth({action:'login',email,password});assert.equal(r.status,200);cookie=r.headers.get('set-cookie').split(';')[0];tokens.push(cookie.split('=')[1]);
 const read=async()=>{const r=await fetch(base+'/api/crm',{headers:{Cookie:cookie}});assert.equal(r.status,200);return r.json();};
 const post=async(body,expected=200)=>{const r=await fetch(base+'/api/crm',{method:'POST',headers:{...headers,Cookie:cookie},body:JSON.stringify(body)});assert.equal(r.status,expected,await r.clone().text());};
 await post({action:'create',contact:{name:email,business:'QA',location:'',phone:'',email,task:'Delete test',timezone:'UTC',stage:'New'}});
 contactId=(await read()).contacts.find(c=>c.email===email).id;
 await post({action:'note',id:contactId,body:'Delete me'});let data=await read();await post({action:'deleteNote',id:data.notes.find(n=>n.contactId===contactId).id});assert.ok(!(await read()).notes.some(n=>n.contactId===contactId));
 await post({action:'call',id:contactId,local:'2030-12-01T12:00',timezone:'UTC',duration:30,agenda:'Delete me'});data=await read();await post({action:'deleteCall',id:data.calls.find(c=>c.contactId===contactId).id});assert.ok(!(await read()).calls.some(c=>c.contactId===contactId));
 await post({action:'call',id:contactId,local:'2030-12-01T12:00',timezone:'UTC',duration:30,agenda:'Cascade test'});await post({action:'note',id:contactId,body:'Cascade test'});
 execFileSync(process.execPath,['scripts/verify-crm-browser.mjs'],{env:{...process.env,CRM_SESSION_COOKIE:cookie},stdio:'inherit',windowsHide:true});
 await post({action:'deleteContact',id:contactId});data=await read();assert.ok(!data.contacts.some(c=>c.id===contactId));assert.ok(!data.calls.some(c=>c.contactId===contactId));assert.ok(!data.notes.some(c=>c.contactId===contactId));
 assert.equal((await auth({action:'logout'},cookie)).status,200);assert.equal((await fetch(base+'/api/crm',{headers:{Cookie:cookie}})).status,403);
 for(let i=0;i<5;i++)assert.equal((await auth({action:'login',email,password:'wrong-password-123'})).status,401);
 assert.equal((await auth({action:'login',email,password})).status,429);
 console.log('PASS: account setup, password login, duplicate setup blocked, legacy cookie blocked, CSRF, logout revocation, lockout, individual deletions, contact cascade, browser dashboard.');
}finally{
 if(created){
  // Remove only this test's generated account, tokens, and contact, preserving all preexisting records.
  const sql=[...tokens.map(t=>`DELETE FROM crm_sessions WHERE token_hash='${createHash('sha256').update(t).digest('hex')}';`),`DELETE FROM calls WHERE contact_id IN (SELECT id FROM inquiries WHERE email='${email}');`,`DELETE FROM contact_notes WHERE contact_id IN (SELECT id FROM inquiries WHERE email='${email}');`,`DELETE FROM inquiries WHERE email='${email}';`,`DELETE FROM crm_admin WHERE email='${email}';`].join('\n');
  execFileSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','dist/server/wrangler.json','--persist-to','.wrangler/state','--command',sql],{stdio:'pipe',windowsHide:true});
  console.log('Removed temporary QA account and records. First-run setup is ready for the owner.');
 }
}
