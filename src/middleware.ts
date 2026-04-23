import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/api/login",
  "/api/logout",
  "/favicon.ico",
  "/_next",
  "/public",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Deixa passar rutes públiques i assets estàtics
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const auth = req.cookies.get("eugeni_auth")?.value;
  const nom = req.cookies.get("eugeni_nom")?.value;
  if (auth === "ok" && nom) {
    return NextResponse.next();
  }

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  const originalPath = pathname + (req.nextUrl.search || "");
  loginUrl.search = "";
  loginUrl.searchParams.set("redirect", originalPath);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
