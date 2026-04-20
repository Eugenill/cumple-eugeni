import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/login", "/favicon.ico", "/_next", "/public"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Deixa passar rutes públiques i assets estàtics
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get("eugeni_auth")?.value;
  if (cookie === "ok") {
    return NextResponse.next();
  }

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("redirect", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
