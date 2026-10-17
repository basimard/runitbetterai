import {getCrmAdmin} from "@/lib/crm-auth";
import {redirect} from "next/navigation";
import Users from "./users";
export const dynamic="force-dynamic";
export const metadata={title:"Manage admins | RunItBetterAI",robots:{index:false,follow:false}};
export default async function UsersPage(){
 const user=await getCrmAdmin();if(!user)redirect("/admin/login");if(user.role!=="super_admin")redirect("/admin");
 return <Users/>;
}
