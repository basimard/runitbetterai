import { cookies } from "next/headers";
import { getDb } from "@/db";
import { crmAdmin, crmSessions } from "@/db/schema";
import { and, eq, gt } from "drizzle-orm";
export const sessionCookie = "crm_session";
export const hex = (bytes:ArrayBuffer) => Array.from(new Uint8Array(bytes), b=>b.toString(16).padStart(2,"0")).join("");
export async function digest(value:string) { return hex(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value))); }
export async function passwordHash(password:string,salt:string) {
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveBits"]);
 return hex(await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:new TextEncoder().encode(salt),iterations:100000},key,256));
}
export function equalHash(a:string,b:string) {let diff=a.length^b.length;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}
export async function getCrmAdmin() {
 const token=(await cookies()).get(sessionCookie)?.value;
 if(!token||!/^[a-f0-9]{64}$/.test(token))return null;
 const [user]=await getDb().select({id:crmAdmin.id,email:crmAdmin.email}).from(crmSessions).innerJoin(crmAdmin,eq(crmAdmin.id,crmSessions.adminId)).where(and(eq(crmSessions.tokenHash,await digest(token)),gt(crmSessions.expiresAt,Date.now()),eq(crmAdmin.enabled,true)));
 return user?{...user,role:user.id===1?"super_admin" as const:"admin" as const}:null;
}
export async function isCrmAdmin() { return !!await getCrmAdmin(); }
