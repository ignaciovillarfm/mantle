import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const res = NextResponse.redirect(
    new URL("/login", process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin),
  );
  res.cookies.delete("ward_session_sig");
  return res;
}
