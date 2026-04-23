import { createSupabasePublicClient, BUCKET } from "@/lib/supabase/server";
import { MomentAmbRelacions } from "@/lib/utils";
import { RecordsBrowser } from "@/components/RecordsBrowser";
import { obtenirNomUsuari } from "@/lib/auth";

export const revalidate = 0;

export default async function RecordsPage() {
  const supabase = createSupabasePublicClient();

  const [{ data: persones }, { data: moments }] = await Promise.all([
    supabase.from("persones").select("id, nom").order("nom"),
    supabase
      .from("vista_moments")
      .select("*")
      .order("data_moment", { ascending: false }),
  ]);

  const nomUsuari = obtenirNomUsuari() ?? "";
  const bucketPublicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}`;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="text-center">
        <div className="hand text-accent-rose text-xl">els teus records</div>
        <h1 className="font-serif text-4xl md:text-5xl">Els meus records</h1>
        <p className="text-sepia-500 mt-2 max-w-xl mx-auto">
          La teva línia del temps: tots els records on hi surts o que has
          pujat tu.
        </p>
      </div>

      <RecordsBrowser
        persones={persones ?? []}
        moments={(moments ?? []) as MomentAmbRelacions[]}
        bucketPublicUrl={bucketPublicUrl}
        nomInicial={nomUsuari}
        nomUsuari={nomUsuari}
      />
    </div>
  );
}
