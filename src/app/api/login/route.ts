import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({ password: "" }));
  const sitePwd = process.env.SITE_PASSWORD ?? "eugeni30";
  const adminPwd = process.env.ADMIN_PASSWORD;

  const esAdmin = !!adminPwd && password === adminPwd;
  const esGuest = password === sitePwd;

  if (!esAdmin && !esGuest) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, admin: esAdmin });
  const commonOpts = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 90, // 90 dies
  };

  res.cookies.set("eugeni_auth", "ok", commonOpts);
  if (esAdmin) {
    res.cookies.set("eugeni_admin", "ok", commonOpts);
  }
  return res;
}
