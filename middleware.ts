import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = ["/login", "/signup"];
const ROLE_HOME: Record<string, string> = {
  student: "/student",
  teacher: "/teacher",
  admin: "/admin",
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // Supabase 환경변수 미설정 시 보호 경로는 /login으로 리다이렉트
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseUrl.startsWith("http") || !supabaseKey) {
    if (!isPublicPath) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  // 세션 쿠키 갱신
  const response = await updateSession(request);

  // 세션에서 유저 확인
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: () => {},
    },
  });
  const { data: { user } } = await supabase.auth.getUser();

  // 비로그인 → 보호된 경로 접근 시 /login으로
  if (!user && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 로그인 상태 → auth 페이지 접근 시 역할별 홈으로
  if (user && isPublicPath) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const home = ROLE_HOME[profile?.role ?? "student"];
    return NextResponse.redirect(new URL(home, request.url));
  }

  // 로그인 상태 → 루트(/) 접근 시 역할별 홈으로
  if (user && pathname === "/") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const home = ROLE_HOME[profile?.role ?? "student"];
    return NextResponse.redirect(new URL(home, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
