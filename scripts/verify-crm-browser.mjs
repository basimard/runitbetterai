import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const proc=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--disable-extensions','--no-first-run','--no-default-browser-check','--remote-debugging-port=9338','--user-data-dir='+process.cwd()+'/.sites-runtime/browser-crm','about:blank'],{windowsHide:true,stdio:'ignore'});
let ws;
try {
 let pages;for(let i=0;i<40;i++){try{pages=await (await fetch('http://127.0.0.1:9338/json')).json();break;}catch{await new Promise(r=>setTimeout(r,250));}}
 assert.ok(pages);ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
 let id=0;const pending=new Map();ws.addEventListener('message',e=>{const d=JSON.parse(e.data);if(d.id){pending.get(d.id)?.(d);pending.delete(d.id);}});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;const timer=setTimeout(()=>reject(new Error(method+' timeout')),15000);timer.unref();pending.set(n,d=>{clearTimeout(timer);d.error?reject(d.error):resolve(d.result);});ws.send(JSON.stringify({id:n,method,params}));});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 assert.ok(process.env.CRM_SESSION_COOKIE,'Set CRM_SESSION_COOKIE to an authenticated test session.');
 const [cookieName,cookieValue]=process.env.CRM_SESSION_COOKIE.split('=');
 await send('Page.enable');await send('Network.enable');await send('Network.setCookie',{name:cookieName,value:cookieValue,url:'http://127.0.0.1:5173'});
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:950,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url:'http://127.0.0.1:5173/admin'});
 for(let i=0;i<60;i++){if(await evaluate('!!document.querySelector(".crm-card")'))break;await new Promise(r=>setTimeout(r,250));}
 assert.equal(await evaluate('document.querySelectorAll(".crm-column").length'),6);
 await evaluate('document.querySelector(".crm-contact-link").click()');await new Promise(r=>setTimeout(r,400));assert.equal(await evaluate('!!document.querySelector("[role=dialog]")'),true);
 await evaluate('document.querySelector(".crm-close").click()');await evaluate('Array.from(document.querySelectorAll(".crm-nav button")).find(b=>b.textContent.startsWith("Calls")).click()');await new Promise(r=>setTimeout(r,300));assert.match(await evaluate('document.querySelector(".crm-main").textContent'),/Display timezone/);
 await evaluate('document.querySelector(".crm-nav button").click()');await new Promise(r=>setTimeout(r,300));await mkdir('outputs',{recursive:true});const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile('outputs/crm-desktop.png',Buffer.from(shot.data,'base64'));
 for(const width of [390,320]){await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});await new Promise(r=>setTimeout(r,300));assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,'Mobile overflow '+width);}
 if(process.env.CRM_TEST_USERS){
  await send('Page.navigate',{url:'http://127.0.0.1:5173/admin/users'});
  for(let i=0;i<40;i++){if(await evaluate('document.querySelectorAll("tbody tr").length>1'))break;await new Promise(r=>setTimeout(r,250));}
  assert.match(await evaluate('document.body.textContent'),/Manage administrators/);
  assert.match(await evaluate('document.body.textContent'),/Your account · Protected/);
  assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,'User management mobile overflow');
  await evaluate('Array.from(document.querySelectorAll("button")).find(b=>b.textContent==="Reset password").click()');
  await new Promise(r=>setTimeout(r,200));assert.match(await evaluate('document.body.textContent'),/Save new password/);
 }
 console.log('PASS: rendered pipeline, contact detail, calls view, desktop screenshot, mobile widths 390/320, optional user-management screen.');
}finally{ws?.close();proc.kill();}
