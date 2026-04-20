import { createSupabasePublicClient, BUCKET } from "@/lib/supabase/server";
import { MomentAmbRelacions } from "@/lib/utils";
import { Timeline } from "@/components/Timeline";
import { PeopleGraph } from "@/components/PeopleGraph";
import Link from "next/link";

export const revalidate = 0;

async function fetchMoments(): Promise<MomentAmbRelacions[]> {
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase
    .from("vista_moments")
    .select("*")
    .order("data_moment", { ascending: false });
  if (error) {
    console.error(error);
    return [];
  }
  return (data ?? []) as MomentAmbRelacions[];
}

export default async function HomePage() {
  const moments = await fetchMoments();
  const bucketPublicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}`;

  const totalMoments = moments.length;
  const totalPersones = new Set(
    moments.flatMap((m) => m.persones.map((p) => p.id))
  ).size;
  const totalMitjans = moments.reduce((acc, m) => acc + m.mitjans.length, 0);

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="text-center pt-6 pb-2">
        <div className="hand text-accent-rose text-2xl">30 anys d&apos;històries</div>
        <h1 className="font-serif text-5xl md:text-6xl leading-tight mt-1">
          Un àlbum col·lectiu dels moments viscuts amb l&apos;Eugeni
        </h1>
        <p className="text-sepia-500 max-w-2xl mx-auto mt-4">
          Deixa un record — una foto, una descripció i les persones que hi van participar. Entre tots dibuixarem
          tres dècades de viatges, dinars, sopars, riures i moments que ens han
          fet com som.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link href="/pujar" className="ink-btn">Afegir un record</Link>
          <a href="#linia-del-temps" className="ink-btn-outline">Veure línia del temps</a>
        </div>
      </section>

      {/* Stats */}
      {totalMoments > 0 && (
        <section className="grid grid-cols-3 gap-3 md:gap-6 max-w-2xl mx-auto">
          <Stat nom="Moments" valor={totalMoments} />
          <Stat nom="Persones" valor={totalPersones} />
          <Stat nom="Fotos" valor={totalMitjans} />
        </section>
      )}

      {/* Graph */}
      <section id="xarxa">
        <PeopleGraph moments={moments} />
      </section>

      {/* Timeline */}
      <section id="linia-del-temps" className="pt-4">
        <div className="text-center mb-10">
          <div className="hand text-accent-rose text-xl">any rere any</div>
          <h2 className="font-serif text-4xl">La línia del temps</h2>
        </div>
        <Timeline moments={moments} bucketPublicUrl={bucketPublicUrl} />
      </section>
    </div>
  );
}

function Stat({ nom, valor }: { nom: string; valor: number }) {
  return (
    <div className="card px-4 py-5 text-center">
      <div className="font-serif text-4xl text-sepia-700">{valor}</div>
      <div className="text-xs uppercase tracking-wider text-sepia-400 mt-1">
        {nom}
      </div>
    </div>
  );
}
