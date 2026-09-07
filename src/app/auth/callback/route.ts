import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        // Mirror the role routing in loginUser() and the home page —
        // an ADMIN used to be dropped on the client dashboard instead.
        if (profile?.role === "SPEAKER") {
          return NextResponse.redirect(`${origin}/speaker/dashboard`);
        }
        if (profile?.role === "ADMIN") {
          return NextResponse.redirect(`${origin}/admin/dashboard`);
        }
        return NextResponse.redirect(`${origin}/client/dashboard`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
