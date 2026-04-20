import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({ password: "" }));
  const expected = process.env.SITE_PASSWORD ?? "eugeni30";

  if (password !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("eugeni_auth", "ok", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 90, // 90 dies
  });
  return res;
}
