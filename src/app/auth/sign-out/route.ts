import { getPublicOrigin } from "@/lib/publicOrigin";
import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const res = NextResponse.redirect(new URL("/login", getPublicOrigin(request)));
  res.cookies.delete("ward_session_sig");
  return res;
}
