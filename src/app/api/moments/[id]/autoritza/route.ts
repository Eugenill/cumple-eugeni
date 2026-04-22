import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * POST /api/moments/:id/autoritza
 * Body: { nom: string }
 *
 * Retorna l'edit_token del moment si:
 *  - l'usuari és admin (cookie eugeni_admin), o
 *  - el `nom` enviat coincideix (case-insensitive) amb el camp pujat_per del moment.
 *
 * Això permet entrar a la pàgina d'edició sense l'enllaç privat.
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await req.json().catch(() => ({}));
  const nom = String(body?.nom || "").trim();

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("moments")
    .select("pujat_per, edit_token")
    .eq("id", params.id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: "No s'ha trobat el record." },
      { status: 404 }
    );
  }

  // Admin → accés total
  const esAdmin = cookies().get("eugeni_admin")?.value === "ok";
  if (esAdmin) {
    return NextResponse.json({ ok: true, edit_token: data.edit_token });
  }

  if (!nom) {
    return NextResponse.json(
      { error: "Cal triar un nom per continuar." },
      { status: 400 }
    );
  }

  const pujatPer = (data.pujat_per || "").trim().toLowerCase();
  if (!pujatPer) {
    return NextResponse.json(
      {
        error:
          "Aquest record no està signat per ningú. Demana a l'Eugeni que l'editi.",
      },
      { status: 403 }
    );
  }

  if (pujatPer !== nom.toLowerCase()) {
    return NextResponse.json(
      {
        error: `Aquest record no el vas pujar tu, ${nom}. Només qui l'ha pujat el pot modificar.`,
      },
      { status: 403 }
    );
  }

  return NextResponse.json({ ok: true, edit_token: data.edit_token });
}
