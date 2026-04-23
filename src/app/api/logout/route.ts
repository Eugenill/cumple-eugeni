import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("eugeni_auth");
  res.cookies.delete("eugeni_nom");
  res.cookies.delete("eugeni_admin");
  return res;
}
