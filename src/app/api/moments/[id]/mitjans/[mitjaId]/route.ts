import { NextResponse } from "next/server";
import { createSupabaseAdminClient, BUCKET } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 60;

// ---------- DELETE: esborra una imatge individual ----------
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; mitjaId: string } }
) {
  const admin = createSupabaseAdminClient();

  const { data: mitja, error: mErr } = await admin
    .from("mitjans")
    .select("id, moment_id, path")
    .eq("id", params.mitjaId)
    .single();

  if (mErr || !mitja) {
    return NextResponse.json(
      { error: "No s'ha trobat la imatge." },
      { status: 404 }
    );
  }
  if (mitja.moment_id !== params.id) {
    return NextResponse.json(
      { error: "La imatge no pertany a aquest record." },
      { status: 403 }
    );
  }

  const { error: delErr } = await admin
    .from("mitjans")
    .delete()
    .eq("id", params.mitjaId);
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  // Best-effort al Storage
  await admin.storage.from(BUCKET).remove([mitja.path]).catch(() => {});

  return NextResponse.json({ ok: true });
}

// ---------- PUT: reemplaça el contingut d'una imatge (nou enquadrat) ----------
export async function PUT(
  req: Request,
  { params }: { params: { id: string; mitjaId: string } }
) {
  const admin = createSupabaseAdminClient();

  const { data: mitja, error: mErr } = await admin
    .from("mitjans")
    .select("id, moment_id, path")
    .eq("id", params.mitjaId)
    .single();

  if (mErr || !mitja) {
    return NextResponse.json(
      { error: "No s'ha trobat la imatge." },
      { status: 404 }
    );
  }
  if (mitja.moment_id !== params.id) {
    return NextResponse.json(
      { error: "La imatge no pertany a aquest record." },
      { status: 403 }
    );
  }

  const form = await req.formData();
  const fitxer = form.get("fitxer");
  if (!(fitxer instanceof File) || fitxer.size === 0) {
    return NextResponse.json(
      { error: "No s'ha rebut cap fitxer." },
      { status: 400 }
    );
  }
  if (!fitxer.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "El fitxer ha de ser una imatge." },
      { status: 400 }
    );
  }

  // Carreguem el títol per mantenir l'estructura del path coherent.
  const { data: mom } = await admin
    .from("moments")
    .select("titol")
    .eq("id", params.id)
    .single();
  const base = `${params.id}/${slugify(mom?.titol ?? "") || "moment"}`;
  const ext = (fitxer.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
  const novaPath = `${base}/${Date.now()}-crop.${ext}`;

  const buffer = Buffer.from(await fitxer.arrayBuffer());
  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(novaPath, buffer, {
      contentType: fitxer.type || "image/jpeg",
      upsert: false,
    });
  if (upErr) {
    return NextResponse.json(
      { error: `Error pujant la imatge: ${upErr.message}` },
      { status: 500 }
    );
  }

  const { error: updErr } = await admin
    .from("mitjans")
    .update({ path: novaPath })
    .eq("id", params.mitjaId);
  if (updErr) {
    await admin.storage.from(BUCKET).remove([novaPath]).catch(() => {});
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  if (mitja.path && mitja.path !== novaPath) {
    await admin.storage.from(BUCKET).remove([mitja.path]).catch(() => {});
  }

  return NextResponse.json({ ok: true, path: novaPath });
}
