import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { obtenirNomUsuari } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * Afegeix o treu una reacció (emoji) per a un moment. La identitat s'agafa de
 * la sessió (cookie `eugeni_nom`). Si la persona ja havia posat aquest emoji,
 * es treu. Altrament, s'afegeix.
 *
 * Les reaccions són públiques: qualsevol usuari autenticat pot veure-les i
 * n'hi pot afegir les seves.
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const nom = obtenirNomUsuari();
  if (!nom) {
    return NextResponse.json({ error: "Cal iniciar sessió." }, { status: 401 });
  }

  let body: { emoji?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invàlid." }, { status: 400 });
  }

  const emoji = (body.emoji || "").trim();
  if (!emoji) {
    return NextResponse.json({ error: "Cal un emoji." }, { status: 400 });
  }
  // Limitem la llargada per seguretat (evitem que s'hi enviï text llarg).
  if (emoji.length > 16) {
    return NextResponse.json({ error: "Emoji massa llarg." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  // Comprovem que el moment existeixi
  const { data: moment } = await admin
    .from("moments")
    .select("id")
    .eq("id", params.id)
    .maybeSingle();

  if (!moment) {
    return NextResponse.json(
      { error: "El record no existeix." },
      { status: 404 }
    );
  }

  // Busquem si ja hi ha una reacció d'aquesta persona amb aquest emoji
  // (insensible a majúscules en el nom).
  const { data: existing } = await admin
    .from("reaccions")
    .select("id")
    .eq("moment_id", params.id)
    .eq("emoji", emoji)
    .ilike("persona_nom", nom)
    .maybeSingle();

  if (existing) {
    const { error: delErr } = await admin
      .from("reaccions")
      .delete()
      .eq("id", existing.id);
    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, action: "removed", emoji });
  }

  const { error: insErr } = await admin.from("reaccions").insert({
    moment_id: params.id,
    persona_nom: nom,
    emoji,
  });

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, action: "added", emoji });
}
