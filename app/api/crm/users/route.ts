import { getDb } from "@/db";
import { crmAdmin,crmSessions } from "@/db/schema";
import { getCrmAdmin,hex,passwordHash } from "@/lib/crm-auth";
import { eq } from "drizzle-orm";
import { z } from "zod";
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"no-store"}});
const id=z.number().int().min(2);
const password=z.string().min(12).max(128);
const input=z.discriminatedUnion("action",[
 z.object({action:z.literal("create"),email:z.string().trim().email().max(200),password}),
 z.object({action:z.literal("enabled"),id,enabled:z.boolean()}),
 z.object({action:z.literal("resetPassword"),id,password}),
 z.object({action:z.literal("delete"),id}),
]);
export async function GET(){
 if((await getCrmAdmin())?.role!=="super_admin")return json({error:"Super admin access required."},403);
 const users=await getDb().select({id:crmAdmin.id,email:crmAdmin.email,enabled:crmAdmin.enabled,lockedUntil:crmAdmin.lockedUntil}).from(crmAdmin).orderBy(crmAdmin.id);
 return json({users:users.map(u=>({...u,role:u.id===1?"Super admin":"Admin"}))});
}
export async function POST(request:Request){
 if((await getCrmAdmin())?.role!=="super_admin")return json({error:"Super admin access required."},403);
 if(request.headers.get("origin")!==new URL(request.url).origin)return json({error:"Request origin not allowed."},403);
 const raw=await request.text();if(raw.length>3000)return json({error:"Request too large."},413);
 let data;try{data=input.parse(JSON.parse(raw));}catch{return json({error:"Check the email and password (12–128 characters). The super admin cannot be changed here."},400);}
 const db=getDb();
 if(data.action==="create"){
  const salt=hex(crypto.getRandomValues(new Uint8Array(32)).buffer);
  const created=await db.insert(crmAdmin).values({email:data.email.toLowerCase(),salt,passwordHash:await passwordHash(data.password,salt)}).onConflictDoNothing().returning({id:crmAdmin.id});
  return created.length?json({ok:true},201):json({error:"An account with this email already exists."},409);
 }
 const [target]=await db.select({id:crmAdmin.id}).from(crmAdmin).where(eq(crmAdmin.id,data.id));
 if(!target)return json({error:"Admin not found."},404);
 const revoke=db.delete(crmSessions).where(eq(crmSessions.adminId,data.id));
 if(data.action==="enabled")await db.batch([revoke,db.update(crmAdmin).set({enabled:data.enabled,failedAttempts:0,lockedUntil:0}).where(eq(crmAdmin.id,data.id))]);
 if(data.action==="delete")await db.batch([revoke,db.delete(crmAdmin).where(eq(crmAdmin.id,data.id))]);
 if(data.action==="resetPassword"){
  const salt=hex(crypto.getRandomValues(new Uint8Array(32)).buffer);
  await db.batch([revoke,db.update(crmAdmin).set({salt,passwordHash:await passwordHash(data.password,salt),failedAttempts:0,lockedUntil:0}).where(eq(crmAdmin.id,data.id))]);
 }
 return json({ok:true});
}
