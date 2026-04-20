import { NextResponse } from "next/server";
import { createSupabaseAdminClient, BUCKET } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const titol = String(form.get("titol") || "").trim();
    const descripcio = String(form.get("descripcio") || "").trim() || null;
    const data_moment = String(form.get("data_moment") || "").trim();
    const pujat_per = String(form.get("pujat_per") || "").trim() || null;
    const persones_raw = String(form.get("persones") || "").trim();

    if (!titol || !data_moment) {
      return NextResponse.json(
        { error: "Falten dades obligatòries (títol i data)." },
        { status: 400 }
      );
    }

    const noms = persones_raw
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean);

    const fitxers = form.getAll("fitxers").filter((f): f is File => f instanceof File && f.size > 0);

    const admin = createSupabaseAdminClient();

    // 1. Crear el moment
    const { data: moment, error: momentErr } = await admin
      .from("moments")
      .insert({ titol, descripcio, data_moment, pujat_per })
      .select()
      .single();

    if (momentErr || !moment) {
      return NextResponse.json(
        { error: momentErr?.message || "No s'ha pogut crear el moment." },
        { status: 500 }
      );
    }

    // 2. Upsert de persones i vincles
    if (noms.length > 0) {
      const { data: personesExistents } = await admin
        .from("persones")
        .select("id, nom")
        .in("nom", noms);

      const existents = new Map(
        (personesExistents ?? []).map((p) => [p.nom.toLowerCase(), p])
      );

      const nomsNous = noms.filter((n) => !existents.has(n.toLowerCase()));
      let insertades: { id: string; nom: string }[] = [];
      if (nomsNous.length > 0) {
        const { data: noves, error: persErr } = await admin
          .from("persones")
          .insert(nomsNous.map((nom) => ({ nom })))
          .select();
        if (persErr) {
          return NextResponse.json({ error: persErr.message }, { status: 500 });
        }
        insertades = noves ?? [];
      }

      const totes = [
        ...(personesExistents ?? []),
        ...insertades,
      ].filter((p): p is { id: string; nom: string } => !!p);

      if (totes.length > 0) {
        const { error: linkErr } = await admin
          .from("moment_persones")
          .insert(
            totes.map((p) => ({ moment_id: moment.id, persona_id: p.id }))
          );
        if (linkErr) {
          return NextResponse.json({ error: linkErr.message }, { status: 500 });
        }
      }
    }

    // 3. Pujar fitxers (només imatges) i crear mitjans
    if (fitxers.length > 0) {
      const basePath = `${moment.id}/${slugify(titol) || "moment"}`;
      for (let i = 0; i < fitxers.length; i++) {
        const f = fitxers[i];

        if (!f.type.startsWith("image/")) {
          return NextResponse.json(
            { error: `Només s'accepten imatges. Fitxer no vàlid: ${f.name}` },
            { status: 400 }
          );
        }

        const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${basePath}/${Date.now()}-${i}.${ext}`;
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

        const { error: miErr } = await admin
          .from("mitjans")
          .insert({ moment_id: moment.id, path, tipus: "imatge", ordre: i });

        if (miErr) {
          return NextResponse.json({ error: miErr.message }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ ok: true, id: moment.id });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Error inesperat" },
      { status: 500 }
    );
  }
}
