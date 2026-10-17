import assert from 'node:assert/strict';
const base='http://127.0.0.1:5173';
for(const route of ['/','/sample/your-local-pro','/sample/not-found','/service-owner.webp']){
 const r=await fetch(base+route); assert.equal(r.status,200,route);console.log('PASS',route,r.status);
 if(route==='/'){const html=await r.text();assert.match(html,/Let AI handle/);assert.match(html,/What’s eating up your time/);}
}
const valid={name:'Local QA Test',business:'Test Plumbing',location:'Austin, TX',phone:'2025550148',task:'Test missed call automation',source:'local-qa',consent:true};
for(const [data,status,label] of [[{...valid,phone:'12'},400,'invalid phone'],[{...valid,consent:false},400,'missing consent'],[{...valid,website:'spam'},400,'honeypot'],[valid,201,'valid inquiry']]){
 const r=await fetch(base+'/api/inquiries',{method:'POST',headers:{'Content-Type':'application/json','Origin':base},body:JSON.stringify(data)});const result=await r.json();assert.equal(r.status,status,JSON.stringify(result));console.log('PASS',label,r.status);
}
const cross=await fetch(base+'/api/inquiries',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://unrelated.example'},body:JSON.stringify(valid)});assert.equal(cross.status,403);console.log('PASS cross-origin rejection');
