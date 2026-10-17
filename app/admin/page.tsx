import { getCrmAdmin } from "@/lib/crm-auth";
import { redirect } from "next/navigation";
import Dashboard from "./dashboard";
export const dynamic = "force-dynamic";
export const metadata = {title:"Marketing workspace | RunItBetterAI",robots:{index:false,follow:false}};
export default async function AdminPage() {
 const user=await getCrmAdmin();
 if (!user) redirect("/admin/login");
 return <Dashboard isSuperAdmin={user.role==="super_admin"}/>;
}
