import { NextResponse } from "next/server";
import { createSupabaseAdminClient, BUCKET } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 60;

// ---------- POST: afegir una o més imatges a un moment existent ----------
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const admin = createSupabaseAdminClient();

  const { data: mom, error: momErr } = await admin
    .from("moments")
    .select("titol")
    .eq("id", params.id)
    .single();

  if (momErr || !mom) {
    return NextResponse.json(
      { error: "No s'ha trobat el record." },
      { status: 404 }
    );
  }

  const form = await req.formData();
  const fitxers = form
    .getAll("fitxers")
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (fitxers.length === 0) {
    return NextResponse.json(
      { error: "No s'ha rebut cap fitxer." },
      { status: 400 }
    );
  }

  const { data: existents } = await admin
    .from("mitjans")
    .select("ordre")
    .eq("moment_id", params.id)
    .order("ordre", { ascending: false })
    .limit(1);

  let ordreBase =
    existents && existents.length > 0 ? (existents[0].ordre ?? 0) + 1 : 0;
  const basePath = `${params.id}/${slugify(mom.titol ?? "") || "moment"}`;
  const nousMitjans: { id: string; path: string; tipus: "imatge" }[] = [];

  for (let i = 0; i < fitxers.length; i++) {
    const f = fitxers[i];

    if (!f.type.startsWith("image/")) {
      return NextResponse.json(
        { error: `Només s'accepten imatges. Fitxer no vàlid: ${f.name}` },
        { status: 400 }
      );
    }

    const ext = (
      (f.name.split(".").pop() || f.type.split("/")[1] || "jpg").toLowerCase()
    ).replace("jpeg", "jpg");
    const path = `${basePath}/${Date.now()}-${i}-add.${ext}`;
    const buffer = Buffer.from(await f.arrayBuffer());

    const { error: upErr } = await admin.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: f.type || undefined,
        upsert: false,
      });

    if (upErr) {
      return NextResponse.json(
        { error: `Error pujant ${f.name}: ${upErr.message}` },
        { status: 500 }
      );
    }

    const { data: creat, error: miErr } = await admin
      .from("mitjans")
      .insert({
        moment_id: params.id,
        path,
        tipus: "imatge",
        ordre: ordreBase + i,
      })
      .select("id, path, tipus")
      .single();

    if (miErr || !creat) {
      await admin.storage.from(BUCKET).remove([path]).catch(() => {});
      return NextResponse.json(
        { error: miErr?.message || "No s'ha pogut crear el mitjà" },
        { status: 500 }
      );
    }

    nousMitjans.push({
      id: creat.id,
      path: creat.path,
      tipus: "imatge",
    });
  }

  return NextResponse.json({ ok: true, mitjans: nousMitjans });
}
