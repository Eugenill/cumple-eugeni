import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseAdminClient, BUCKET } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function verificarAcces(
  req: Request,
  id: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const admin = createSupabaseAdminClient();

  // Cookie d'admin → accés total
  const esAdmin = cookies().get("eugeni_admin")?.value === "ok";
  if (esAdmin) return { ok: true };

  // Si no és admin, ha de dur el codi (edit_token)
  const url = new URL(req.url);
  const codi = url.searchParams.get("codi") || req.headers.get("x-edit-codi");
  if (!codi) {
    return { ok: false, status: 403, error: "Falta el codi d'edició." };
  }

  const { data, error } = await admin
    .from("moments")
    .select("edit_token")
    .eq("id", id)
    .single();

  if (error || !data) {
    return { ok: false, status: 404, error: "No s'ha trobat el record." };
  }
  if (data.edit_token !== codi) {
    return { ok: false, status: 403, error: "El codi no és correcte." };
  }
  return { ok: true };
}

// ---------- PATCH ----------
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const acc = await verificarAcces(req, params.id);
  if (!acc.ok) {
    return NextResponse.json({ error: acc.error }, { status: acc.status });
  }

  const admin = createSupabaseAdminClient();
  const body = await req.json().catch(() => ({}));

  const camps: Record<string, unknown> = {};
  if (typeof body.titol === "string") camps.titol = body.titol.trim();
  if (typeof body.descripcio === "string")
    camps.descripcio = body.descripcio.trim() || null;
  if (typeof body.data_moment === "string")
    camps.data_moment = body.data_moment;
  if (typeof body.pujat_per === "string")
    camps.pujat_per = body.pujat_per.trim() || null;

  if (Object.keys(camps).length > 0) {
    const { error } = await admin
      .from("moments")
      .update(camps)
      .eq("id", params.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Actualitzar persones si s'han enviat
  if (Array.isArray(body.persones)) {
    const noms: string[] = body.persones
      .map((n: unknown) => String(n).trim())
      .filter(Boolean);

    // Esborra els vincles actuals
    await admin
      .from("moment_persones")
      .delete()
      .eq("moment_id", params.id);

    if (noms.length > 0) {
      const { data: existents } = await admin
        .from("persones")
        .select("id, nom")
        .in("nom", noms);

      const existentsSet = new Set(
        (existents ?? []).map((p) => p.nom.toLowerCase())
      );
      const nous = noms.filter((n) => !existentsSet.has(n.toLowerCase()));

      let insertades: { id: string; nom: string }[] = [];
      if (nous.length > 0) {
        const { data: noves, error: pErr } = await admin
          .from("persones")
          .insert(nous.map((nom) => ({ nom })))
          .select();
        if (pErr) {
          return NextResponse.json({ error: pErr.message }, { status: 500 });
        }
        insertades = noves ?? [];
      }

      const totes = [...(existents ?? []), ...insertades];
      if (totes.length > 0) {
        const { error: linkErr } = await admin
          .from("moment_persones")
          .insert(
            totes.map((p) => ({ moment_id: params.id, persona_id: p.id }))
          );
        if (linkErr) {
          return NextResponse.json(
            { error: linkErr.message },
            { status: 500 }
          );
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}

// ---------- DELETE ----------
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const acc = await verificarAcces(req, params.id);
  if (!acc.ok) {
    return NextResponse.json({ error: acc.error }, { status: acc.status });
  }

  const admin = createSupabaseAdminClient();

  // 1. Llegim els fitxers a esborrar del Storage
  const { data: mitjans } = await admin
    .from("mitjans")
    .select("path")
    .eq("moment_id", params.id);

  // 2. Esborrem la fila (cascade neteja mitjans i moment_persones)
  const { error } = await admin.from("moments").delete().eq("id", params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 3. Esborrem els fitxers de Storage (best-effort)
  if (mitjans && mitjans.length > 0) {
    await admin.storage
      .from(BUCKET)
      .remove(mitjans.map((m) => m.path))
      .catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
