import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const proc=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--disable-extensions','--no-first-run','--remote-debugging-port=9339','--user-data-dir='+process.cwd()+'/.sites-runtime/browser-logo','about:blank'],{windowsHide:true,stdio:'ignore'});
let ws;
try{
 let pages;for(let i=0;i<40;i++){try{pages=await(await fetch('http://127.0.0.1:9339/json')).json();break;}catch{await new Promise(r=>setTimeout(r,250));}}
 ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let id=0;const pending=new Map();ws.addEventListener('message',e=>{const d=JSON.parse(e.data);if(d.id){pending.get(d.id)?.(d);pending.delete(d.id);}});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,d=>d.error?reject(d.error):resolve(d.result));ws.send(JSON.stringify({id:n,method,params}));});
 const evaluate=async expression=>(await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})).result.value;
 await send('Page.enable');await mkdir('outputs',{recursive:true});
 for(const [path,width] of [['/',1440],['/',390],['/',320],['/admin/login',390]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<720});await send('Page.navigate',{url:'http://127.0.0.1:5173'+path});
  for(let i=0;i<40;i++){if(await evaluate('!!document.querySelector(".brand-lockup img")?.complete'))break;await new Promise(r=>setTimeout(r,250));}await new Promise(r=>setTimeout(r,700));
  assert.ok(await evaluate('document.querySelector(".brand-lockup img").naturalWidth>0'));
  assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,'No overflow '+path+width);
  const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(`outputs/logo-${path==='/'?'site':'login'}-${width}.png`,Buffer.from(shot.data,'base64'));
 }
 await send('Emulation.setDeviceMetricsOverride',{width:600,height:160,deviceScaleFactor:2,mobile:false});await send('Page.navigate',{url:'http://127.0.0.1:5173/runitbetterai-logo.svg'});await new Promise(r=>setTimeout(r,500));const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile('outputs/logo-preview.png',Buffer.from(shot.data,'base64'));
 console.log('PASS: logo assets loaded, desktop and mobile website/login layouts, screenshots saved.');
}finally{ws?.close();proc.kill();}
