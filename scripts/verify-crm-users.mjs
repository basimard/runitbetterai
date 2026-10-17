import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash,randomBytes} from 'node:crypto';
const base='http://127.0.0.1:5173',email=`users-qa-${crypto.randomUUID()}@example.test`,password=randomBytes(24).toString('hex');
const token=randomBytes(32).toString('hex'),hash=createHash('sha256').update(token).digest('hex');
const ownerCookie=`crm_session=${token}`;
function db(sql){return execFileSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','dist/server/wrangler.json','--persist-to','.wrangler/state','--command',sql],{stdio:'pipe',windowsHide:true});}
// Create an ephemeral test session, leaving the owner's credentials and sessions intact.
db(`INSERT INTO crm_sessions (token_hash,expires_at,admin_id) SELECT '${hash}',${Date.now()+600000},id FROM crm_admin WHERE id=1 AND enabled=1;`);
const headers=cookie=>({'Content-Type':'application/json',Origin:base,Cookie:cookie});
const action=async(body,cookie=ownerCookie,status=200)=>{const r=await fetch(base+'/api/crm/users',{method:'POST',headers:headers(cookie),body:JSON.stringify(body)});assert.equal(r.status,status,await r.clone().text());return r;};
const login=async(p=password,status=200)=>{const r=await fetch(base+'/api/crm/auth',{method:'POST',headers:headers(''),body:JSON.stringify({action:'login',email,password:p})});assert.equal(r.status,status,await r.clone().text());return r.headers.get('set-cookie')?.split(';')[0];};
const access=async(cookie,status)=>assert.equal((await fetch(base+'/api/crm',{headers:headers(cookie)})).status,status);
try{
 assert.equal((await fetch(base+'/api/crm/users')).status,403);
 await action({action:'create',email,password},ownerCookie,201);
 const data=await (await fetch(base+'/api/crm/users',{headers:headers(ownerCookie)})).json();const user=data.users.find(u=>u.email===email);assert.ok(user.id>1);assert.equal(user.role,'Admin');assert.equal(data.users.find(u=>u.id===1).role,'Super admin');assert.ok(!('passwordHash' in user));
 await action({action:'create',email:email.toUpperCase(),password},ownerCookie,409);
 let cookie=await login();await access(cookie,200);
 assert.equal((await fetch(base+'/api/crm/users',{headers:headers(cookie)})).status,403);
 for(const body of [{action:'delete',id:1},{action:'enabled',id:1,enabled:false},{action:'resetPassword',id:1,password}]){await action(body,cookie,403);await action(body,ownerCookie,400);}
 await action({action:'create',email:'forbidden@example.test',password},cookie,403);
 execFileSync(process.execPath,['scripts/verify-crm-browser.mjs'],{env:{...process.env,CRM_SESSION_COOKIE:ownerCookie,CRM_TEST_USERS:'1'},stdio:'inherit',windowsHide:true});
 await action({action:'enabled',id:user.id,enabled:false});await access(cookie,403);await login(password,401);
 await action({action:'enabled',id:user.id,enabled:true});await access(cookie,403);cookie=await login();await access(cookie,200);
 const replacement=randomBytes(24).toString('hex');await action({action:'resetPassword',id:user.id,password:replacement});await access(cookie,403);await login(password,401);cookie=await login(replacement);
 await action({action:'delete',id:user.id});await access(cookie,403);await login(replacement,401);
 console.log('PASS: super-admin-only user management, create, duplicate email, regular admin login/CRM access, role enforcement, owner protection, disable/re-enable, password reset, removal, session revocation, and browser user screen.');
}finally{
 db(`DELETE FROM crm_sessions WHERE token_hash='${hash}' OR admin_id IN (SELECT id FROM crm_admin WHERE email='${email}'); DELETE FROM crm_admin WHERE email='${email}';`);
 console.log('Removed only the temporary QA admin and test sessions; owner account preserved.');
}
