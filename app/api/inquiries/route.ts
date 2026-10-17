import { getDb } from "@/db";
import { inquiries } from "@/db/schema";
import { z } from "zod";
const schema = z.object({
 name:z.string().trim().min(2).max(100), business:z.string().trim().min(2).max(150), location:z.string().trim().min(2).max(150),
 phone:z.string().trim().max(30).refine(v=>v.replace(/\D/g, "").length>=10 && v.replace(/\D/g, "").length<=15),
 email:z.union([z.string().email().max(200),z.literal("")]).optional(), task:z.string().trim().min(3).max(2500), currentProcess:z.string().trim().max(2500).optional(),
 source:z.string().max(100), consent:z.literal(true), website:z.string().max(0).optional()
});
export async function POST(request:Request) {
 if(request.headers.get("origin") && request.headers.get("origin")!==new URL(request.url).origin) return Response.json({error:"Request origin not allowed."},{status:403});
 const raw=await request.text();
 if(raw.length>12000) return Response.json({error:"Request too large."},{status:413});
 let body;
 try {body=schema.safeParse(JSON.parse(raw));} catch {return Response.json({error:"Invalid request."},{status:400});}
 if(!body.success) return Response.json({error:"Please check your details, phone number, and permission to respond."},{status:400});
 const {consent,website,...data}=body.data;
 try {
  const id=crypto.randomUUID();
  await getDb().insert(inquiries).values({...data,id,createdAt:Date.now()});
  return Response.json({id},{status:201,headers:{"Cache-Control":"no-store"}});
 } catch {return Response.json({error:"We couldn’t save your request. Please try again in a moment."},{status:503});}
}
