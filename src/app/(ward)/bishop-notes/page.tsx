import { createClient } from "@/lib/supabase/server";
import { isBishop } from "@/lib/serverRoles";
import { redirect } from "next/navigation";
import { BishopNotesClient } from "./BishopNotesClient";

export default async function BishopNotesPage() {
  if (!(await isBishop())) {
    redirect("/dashboard");
  }
  const supabase = await createClient();
  const { data: members } = await supabase.from("members").select("id, name").order("name");

  return <BishopNotesClient members={members ?? []} />;
}
