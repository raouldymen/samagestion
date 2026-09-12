import { NextResponse } from "next/server";
import { safePostAuthNext } from "@/lib/auth/paths";
import { getFirstMembership, getPostAuthPath } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const origin = url.origin;
  const loginError = new URL("/login?error=oauth", origin);

  if (url.searchParams.get("error")) {
    return NextResponse.redirect(loginError);
  }

  if (!code || !isSupabaseConfigured()) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(loginError);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(loginError);
  }

  const membership = await getFirstMembership(supabase, user.id);
  const safeNext = safePostAuthNext(url.searchParams.get("next"));

  if (membership?.kind === "suspended") {
    return NextResponse.redirect(new URL("/suspended", origin));
  }

  if (safeNext) {
    return NextResponse.redirect(new URL(safeNext, origin));
  }

  const next = await getPostAuthPath(supabase, user.id, membership);
  return NextResponse.redirect(new URL(next, origin));
}
