import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabasePublicClient, BUCKET } from "@/lib/supabase/server";
import { Timeline } from "@/components/Timeline";
import { MomentAmbRelacions } from "@/lib/utils";
import { obtenirNomUsuari } from "@/lib/auth";

export const revalidate = 0;

export default async function PersonaPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createSupabasePublicClient();

  // Busca la persona
  const { data: persona } = await supabase
    .from("persones")
    .select("id, nom")
    .eq("id", params.id)
    .maybeSingle();

  if (!persona) {
    notFound();
  }

  // Tots els moments i filtrem pels que contenen aquesta persona
  const { data } = await supabase
    .from("vista_moments")
    .select("*")
    .order("data_moment", { ascending: false });

  const moments = ((data ?? []) as MomentAmbRelacions[]).filter((m) =>
    m.persones.some((p) => p.id === params.id)
  );

  const { data: totesPersones } = await supabase
    .from("persones")
    .select("id, nom")
    .order("nom");

  // Persones en comú (unió de persones que apareixen als seus moments, excepte ella)
  const comunsMap = new Map<string, { id: string; nom: string; count: number }>();
  for (const m of moments) {
    for (const p of m.persones) {
      if (p.id === params.id) continue;
      const ex = comunsMap.get(p.id);
      if (ex) ex.count++;
      else comunsMap.set(p.id, { id: p.id, nom: p.nom, count: 1 });
    }
  }
  const comuns = Array.from(comunsMap.values()).sort(
    (a, b) => b.count - a.count
  );

  const bucketPublicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}`;
  const nomUsuari = obtenirNomUsuari() ?? "";

  const totalFotos = moments.reduce((s, m) => s + m.mitjans.length, 0);

  return (
    <div className="space-y-10">
      <section className="text-center">
        <div className="hand text-accent-rose text-xl">moments amb</div>
        <h1 className="font-serif text-5xl md:text-6xl text-sepia-700">
          {persona.nom}
        </h1>
        <p className="text-sepia-500 mt-3 max-w-xl mx-auto">
          Una línia del temps dels records on hi surt {persona.nom}.
        </p>

        <div className="flex justify-center gap-4 mt-6 flex-wrap">
          <div className="card px-5 py-3">
            <div className="font-serif text-3xl text-sepia-700">
              {moments.length}
            </div>
            <div className="text-xs uppercase tracking-wider text-sepia-400">
              {moments.length === 1 ? "Record" : "Records"}
            </div>
          </div>
          <div className="card px-5 py-3">
            <div className="font-serif text-3xl text-sepia-700">
              {totalFotos}
            </div>
            <div className="text-xs uppercase tracking-wider text-sepia-400">
              {totalFotos === 1 ? "Foto" : "Fotos"}
            </div>
          </div>
          <div className="card px-5 py-3">
            <div className="font-serif text-3xl text-sepia-700">
              {comuns.length}
            </div>
            <div className="text-xs uppercase tracking-wider text-sepia-400">
              {comuns.length === 1 ? "Persona" : "Persones"} en comú
            </div>
          </div>
        </div>

        <div className="mt-6">
          <Link href="/" className="ink-btn-outline">
            ← Tornar a l&apos;àlbum
          </Link>
        </div>
      </section>

      {comuns.length > 0 && (
        <section className="card p-5">
          <div className="hand text-accent-rose text-lg">qui hi apareix també</div>
          <h2 className="font-serif text-2xl mb-3">Persones en comú</h2>
          <div className="flex flex-wrap gap-2">
            {comuns.map((p) => (
              <Link
                key={p.id}
                href={`/persona/${p.id}`}
                className="chip hover:bg-accent-rose/10 transition-colors"
                title={`${p.count} ${p.count === 1 ? "record" : "records"} compartits`}
              >
                {p.nom}{" "}
                <span className="text-sepia-400">· {p.count}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        {moments.length === 0 ? (
          <div className="card p-10 text-center">
            <div className="hand text-accent-rose text-2xl">encara buit…</div>
            <p className="text-sepia-500 mt-2">
              No hi ha cap record amb {persona.nom} de moment.
            </p>
          </div>
        ) : (
          <Timeline
            moments={moments}
            bucketPublicUrl={bucketPublicUrl}
            personesSuggerides={totesPersones ?? []}
            nomUsuari={nomUsuari}
          />
        )}
      </section>
    </div>
  );
}
