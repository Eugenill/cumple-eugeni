import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const password = String(body?.password ?? "");
  const nom = String(body?.nom ?? "").trim();

  const sitePwd = process.env.SITE_PASSWORD ?? "eugeni30";
  if (password !== sitePwd) {
    return NextResponse.json(
      { ok: false, error: "La contrasenya no és correcta." },
      { status: 401 }
    );
  }

  if (!nom) {
    return NextResponse.json(
      { ok: false, error: "Cal dir-nos com et dius." },
      { status: 400 }
    );
  }

  // Si el nom no existeix encara a `persones`, el donem d'alta — així
  // apareixerà a les llistes i filtres de seguida.
  try {
    const admin = createSupabaseAdminClient();
    const { data: existing } = await admin
      .from("persones")
      .select("id")
      .ilike("nom", nom)
      .maybeSingle();
    if (!existing) {
      await admin.from("persones").insert({ nom });
    }
  } catch (err) {
    // No bloquegem el login si l'upsert falla per qualsevol motiu.
    console.error("No s'ha pogut registrar la persona:", err);
  }

  const res = NextResponse.json({ ok: true });
  const commonOpts = {
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 90, // 90 dies
  };

  res.cookies.set("eugeni_auth", "ok", { ...commonOpts, httpOnly: true });
  res.cookies.set("eugeni_nom", encodeURIComponent(nom), {
    ...commonOpts,
    httpOnly: false, // visible al client si volem mostrar-lo a la UI
  });
  // Netegem cookies antigues d'admin si en quedessin.
  res.cookies.delete("eugeni_admin");
  return res;
}
