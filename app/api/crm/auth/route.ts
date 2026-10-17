import { cookies } from "next/headers";
import { env } from "cloudflare:workers";
import { getDb } from "@/db";
import { crmAdmin, crmSessions } from "@/db/schema";
import { digest, equalHash, hex, passwordHash, sessionCookie } from "@/lib/crm-auth";
import { eq, lt, sql } from "drizzle-orm";
import { z } from "zod";
const json=(body:unknown,status=200,headers:Record<string,string>={})=>Response.json(body,{status,headers:{"Cache-Control":"no-store",...headers}});
function localSetup(request:Request){return import.meta.env.DEV&&["127.0.0.1","localhost","[::1]"].includes(new URL(request.url).hostname);}
export async function GET(request:Request){
 const admin=await getDb().select({id:crmAdmin.id}).from(crmAdmin);
 return json({needsSetup:!admin.length,localSetup:localSetup(request)});
}
export async function POST(request:Request){
 if(request.headers.get("origin")!==new URL(request.url).origin)return json({error:"Request origin not allowed."},403);
 const raw=await request.text();if(raw.length>3000)return json({error:"Request too large."},413);
 let body;try{body=z.object({action:z.enum(["login","setup","logout"]),email:z.string().email().max(200).optional(),password:z.string().min(12).max(128).optional(),setupToken:z.string().max(256).optional()}).parse(JSON.parse(raw));}catch{return json({error:"Enter a valid email and a password of 12–128 characters."},400);}
 const db=getDb(),now=Date.now();
 const cookieOptions=`Path=/; HttpOnly; SameSite=Strict${import.meta.env.DEV?"":"; Secure"}`;
 if(body.action==="logout"){
  const token=(await cookies()).get(sessionCookie)?.value;
  if(token)await db.delete(crmSessions).where(eq(crmSessions.tokenHash,await digest(token)));
  return json({ok:true},200,{"Set-Cookie":`${sessionCookie}=; ${cookieOptions}; Max-Age=0`});
 }
 if(!body.email||!body.password)return json({error:"Email and password are required."},400);
 const email=body.email.trim().toLowerCase();
 const [admin]=await db.select().from(crmAdmin).where(body.action==="setup"?eq(crmAdmin.id,1):eq(crmAdmin.email,email));
 let adminId=1;
 let authenticatedHash="";
 if(body.action==="setup"){
  if(admin)return json({error:"An administrator already exists. Please sign in."},409);
  const setupToken=(env as unknown as {CRM_SETUP_TOKEN?:string}).CRM_SETUP_TOKEN;
  if(!localSetup(request)&&(!setupToken||!body.setupToken||!equalHash(await digest(setupToken),await digest(body.setupToken))))return json({error:"An owner-provided setup token is required."},403);
  const salt=hex(crypto.getRandomValues(new Uint8Array(32)).buffer);
  authenticatedHash=await passwordHash(body.password,salt);
  const inserted=await db.insert(crmAdmin).values({id:1,email,salt,passwordHash:authenticatedHash}).onConflictDoNothing().returning({id:crmAdmin.id});
  if(!inserted.length)return json({error:"An administrator already exists."},409);
 }else{
  if(!admin||!admin.enabled){await passwordHash(body.password,"unavailable-account-timing-salt");return json({error:"Incorrect email or password."},401);}
  adminId=admin.id;
  authenticatedHash=admin.passwordHash;
  if(admin.lockedUntil>now)return json({error:"Too many attempts. Try again in 15 minutes."},429);
  const hash=await passwordHash(body.password,admin.salt);
  if(!equalHash(hash,admin.passwordHash)){
   await db.update(crmAdmin).set({failedAttempts:sql`${crmAdmin.failedAttempts}+1`,lockedUntil:sql`CASE WHEN ${crmAdmin.failedAttempts}+1 >= 5 THEN ${now+900000} ELSE 0 END`}).where(eq(crmAdmin.id,admin.id));
   return json({error:"Incorrect email or password."},401);
  }
  await db.update(crmAdmin).set({failedAttempts:0,lockedUntil:0}).where(eq(crmAdmin.id,admin.id));
 }
 const token=hex(crypto.getRandomValues(new Uint8Array(32)).buffer);
 // A concurrent disable, removal, or password reset must also prevent this login.
 const inserted=await db.run(sql`INSERT INTO crm_sessions (token_hash, expires_at, admin_id) SELECT ${await digest(token)}, ${now+28800000}, id FROM crm_admin WHERE id=${adminId} AND enabled=1 AND password_hash=${authenticatedHash}`);
 if(!inserted.meta.changes)return json({error:"Account changed. Please sign in again."},401);
 await db.delete(crmSessions).where(lt(crmSessions.expiresAt,now));
 return json({ok:true},200,{"Set-Cookie":`${sessionCookie}=${token}; ${cookieOptions}; Max-Age=28800`});
}
