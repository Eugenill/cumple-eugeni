import { createSupabasePublicClient } from "@/lib/supabase/server";
import { UploadForm } from "@/components/UploadForm";
import { obtenirNomUsuari } from "@/lib/auth";

export const revalidate = 0;

async function fetchPersones() {
  const supabase = createSupabasePublicClient();
  const { data } = await supabase
    .from("persones")
    .select("id, nom")
    .order("nom");
  return data ?? [];
}

export default async function PujarPage() {
  const [persones, nomUsuari] = await Promise.all([
    fetchPersones(),
    Promise.resolve(obtenirNomUsuari() ?? ""),
  ]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center">
        <div className="hand text-accent-rose text-xl">comparteix un moment</div>
        <h1 className="font-serif text-4xl mt-1">Afegir un record</h1>
        <p className="text-sepia-500 mt-2">
          Penja una foto, posa-li data i nom, i digues qui hi surt.
          S&apos;afegirà a la línia del temps de seguida.
        </p>
      </div>
      <UploadForm personesSuggerides={persones} nomUsuari={nomUsuari} />
    </div>
  );
}
