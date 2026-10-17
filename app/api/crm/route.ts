import { getDb } from "@/db";
import { calls, contactNotes, inquiries } from "@/db/schema";
import { isCrmAdmin } from "@/lib/crm-auth";
import { resolveCallTime, stages, validZone } from "@/lib/crm-time";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
const zone = z.string().max(100).refine(validZone, "Invalid timezone");
const id = z.string().uuid();
const contact = z.object({name:z.string().trim().min(2).max(100),business:z.string().trim().max(150),location:z.string().trim().max(150),phone:z.string().trim().max(30),email:z.union([z.string().email().max(200),z.literal("")]),task:z.string().trim().max(2500),timezone:zone,stage:z.enum(stages)});
const input = z.discriminatedUnion("action", [
 z.object({action:z.literal("deleteContact"),id}),
 z.object({action:z.literal("deleteCall"),id}),
 z.object({action:z.literal("deleteNote"),id}),
 z.object({action:z.literal("create"),contact:contact.refine(c => !!(c.phone || c.email), "Enter a phone or email")}),
 z.object({action:z.literal("update"),id,contact:contact.refine(c => !!(c.phone || c.email), "Enter a phone or email")}),
 z.object({action:z.literal("stage"),id,stage:z.enum(stages)}),
 z.object({action:z.literal("note"),id,body:z.string().trim().min(1).max(5000)}),
 z.object({action:z.literal("call"),id,callId:id.optional(),local:z.string(),timezone:zone,duration:z.number().int().min(5).max(240),agenda:z.string().trim().max(1000)}),
 z.object({action:z.literal("callStatus"),id,status:z.enum(["Scheduled","Completed","Cancelled"])}),
]);
const json = (data:unknown, status=200) => Response.json(data,{status,headers:{"Cache-Control":"no-store"}});
export async function GET() {
 if (!await isCrmAdmin()) return json({error:"Administrator access required."},403);
 try {
  const db=getDb();
  const [contacts,scheduledCalls,notes]=await Promise.all([db.select().from(inquiries).orderBy(desc(inquiries.createdAt)),db.select().from(calls).orderBy(calls.startsAt),db.select().from(contactNotes).orderBy(desc(contactNotes.createdAt))]);
  return json({contacts,calls:scheduledCalls,notes});
 } catch { return json({error:"Unable to load CRM. Check database migrations."},503); }
}
export async function POST(request:Request) {
 if (!await isCrmAdmin()) return json({error:"Administrator access required."},403);
 if(request.headers.get("origin")!==new URL(request.url).origin) return json({error:"Request origin not allowed."},403);
 const raw=await request.text();
 if(raw.length>16000) return json({error:"Request too large."},413);
 let data;
 try { data=input.parse(JSON.parse(raw)); } catch { return json({error:"Please check the required fields, email, and timezone."},400); }
 try {
  const db=getDb(), now=Date.now();
  if(data.action==="create") {
   await db.insert(inquiries).values({...data.contact,id:crypto.randomUUID(),source:"Manual",createdAt:now});
  } else if(data.action==="deleteCall"||data.action==="deleteNote") {
   const table=data.action==="deleteCall"?calls:contactNotes;
   const changed=await db.delete(table).where(eq(table.id,data.id)).returning({id:table.id});
   if(!changed.length)return json({error:"Record not found."},404);
  } else if(data.action==="callStatus") {
   const changed=await db.update(calls).set({status:data.status}).where(eq(calls.id,data.id)).returning({id:calls.id});
   if(!changed.length) return json({error:"Call not found."},404);
  } else {
   if(!(await db.select({id:inquiries.id}).from(inquiries).where(eq(inquiries.id,data.id))).length) return json({error:"Contact not found."},404);
   if(data.action==="deleteContact") await db.batch([db.delete(calls).where(eq(calls.contactId,data.id)),db.delete(contactNotes).where(eq(contactNotes.contactId,data.id)),db.delete(inquiries).where(eq(inquiries.id,data.id))]);
   if(data.action==="update") await db.update(inquiries).set(data.contact).where(eq(inquiries.id,data.id));
   if(data.action==="stage") await db.update(inquiries).set({stage:data.stage}).where(eq(inquiries.id,data.id));
   if(data.action==="note") await db.insert(contactNotes).values({id:crypto.randomUUID(),contactId:data.id,body:data.body,createdAt:now});
   if(data.action==="call") {
    let startsAt;
    try { startsAt=resolveCallTime(data.local,data.timezone); } catch(e) { return json({error:(e as Error).message},400); }
    if(startsAt<=now) return json({error:"Choose a future time."},400);
    const values={startsAt,timezone:data.timezone,duration:data.duration,agenda:data.agenda,status:"Scheduled"};
    if(data.callId) {
     const existing=await db.select().from(calls).where(eq(calls.id,data.callId));
     if(existing[0]?.contactId!==data.id) return json({error:"Call not found for this contact."},404);
     await db.update(calls).set(values).where(eq(calls.id,data.callId));
    } else await db.insert(calls).values({...values,id:crypto.randomUUID(),contactId:data.id,createdAt:now});
   }
  }
  return json({ok:true});
 } catch { return json({error:"Unable to save. Please try again."},503); }
}
