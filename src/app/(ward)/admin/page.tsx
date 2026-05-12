import { isBishop } from "@/lib/serverRoles";
import { redirect } from "next/navigation";
import { AdminClient } from "./AdminClient";

export default async function AdminPage() {
  if (!(await isBishop())) {
    redirect("/dashboard");
  }
  return <AdminClient />;
}
