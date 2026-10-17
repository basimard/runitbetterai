import {spawn} from 'node:child_process';
import {writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
await mkdir('.sites-runtime/browser',{recursive:true});
const proc=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--disable-extensions','--no-first-run','--no-default-browser-check','--remote-debugging-port=9337','--user-data-dir='+process.cwd()+'/.sites-runtime/browser-business-final','about:blank'],{windowsHide:true,stdio:'ignore'});
let ws;
try{
 let info;for(let i=0;i<40;i++){try{const r=await fetch('http://127.0.0.1:9337/json');info=await r.json();break;}catch{await new Promise(r=>setTimeout(r,250));}}
 assert.ok(info,'Browser started');ws=new WebSocket(info.find(t=>t.type==='page' && t.url==='about:blank').webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let id=0;const pending=new Map();ws.addEventListener('message',e=>{const d=JSON.parse(e.data);if(d.id){pending.get(d.id)?.(d);pending.delete(d.id);}});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;const timer=setTimeout(()=>reject(new Error('CDP timeout: '+method)),15000);timer.unref();pending.set(n,d=>d.error?reject(d.error):resolve(d.result));ws.send(JSON.stringify({id:n,method,params}));});
 const evaluate=async expression=>(await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})).result.value;
 await send('Page.enable');await send('Runtime.enable');await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url:'http://127.0.0.1:5174/'});
 for(let i=0;i<40;i++){if(await evaluate('document.querySelectorAll(".automation-card").length===3'))break;await new Promise(r=>setTimeout(r,250));}await new Promise(r=>setTimeout(r,2500));

 await evaluate('document.querySelector(".opportunity-factory").scrollIntoView({block:"center",behavior:"instant"})');await new Promise(r=>setTimeout(r,200));
 for(let i=0;i<2;i++){
  await evaluate('window.previousTrack=document.querySelector(".pipeline-track");document.querySelectorAll(".comparison-tabs button")[1].click()');
  assert.equal(await evaluate('document.querySelector(".opportunity-factory").classList.contains("phase-1")'),true,'First automation step starts immediately');
  assert.equal(await evaluate('document.querySelector(".pipeline-track")!==window.previousTrack'),true,'CSS animations restart on every click');
  assert.equal(await evaluate('document.querySelectorAll(".comparison-tabs button")[1].getAttribute("aria-pressed")'),'true');
  await new Promise(r=>setTimeout(r,6200));
  assert.equal(await evaluate('document.querySelector(".opportunity-factory").classList.contains("phase-2")'),true,'Sequence advances normally');
 }
 await evaluate('document.querySelectorAll(".comparison-tabs button")[0].click()');
 assert.equal(await evaluate('document.querySelector(".opportunity-factory").classList.contains("phase-0")'),true,'Before still restarts the problem scene');
 console.log('PASS Immediate automation restart, repeated clicks, subsequent progression, and Before reset');
}finally{ws?.close();proc.kill();}
