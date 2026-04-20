import { cookies } from "next/headers";
import Link from "next/link";
import { createSupabaseAdminClient, BUCKET } from "@/lib/supabase/server";
import { MomentAmbRelacions } from "@/lib/utils";
import { EditForm } from "@/components/EditForm";

export const revalidate = 0;

type Props = {
  params: { id: string };
  searchParams: { codi?: string };
};

export default async function EditarPage({ params, searchParams }: Props) {
  const admin = createSupabaseAdminClient();
  const esAdmin = cookies().get("eugeni_admin")?.value === "ok";
  const codi = searchParams.codi ?? "";

  // Carreguem el moment amb el seu token per validar
  const { data: moment } = await admin
    .from("moments")
    .select("id, titol, descripcio, data_moment, pujat_per, edit_token, creat_el")
    .eq("id", params.id)
    .single();

  if (!moment) {
    return (
      <div className="card p-10 text-center">
        <h1 className="font-serif text-3xl">Aquest record no existeix</h1>
        <p className="text-sepia-500 mt-2">
          Potser ja s&apos;ha esborrat o l&apos;enllaç és incorrecte.
        </p>
        <Link href="/" className="ink-btn-outline mt-6 inline-flex">
          Tornar a la línia del temps
        </Link>
      </div>
    );
  }

  const tokenCoincideix = moment.edit_token === codi;
  if (!esAdmin && !tokenCoincideix) {
    return (
      <div className="card p-10 text-center">
        <div className="hand text-accent-rose text-xl">uix…</div>
        <h1 className="font-serif text-3xl mt-1">No pots editar aquest record</h1>
        <p className="text-sepia-500 mt-2 max-w-md mx-auto">
          Aquest enllaç no és vàlid o ha caducat. Només la persona que va
          pujar el record (o l&apos;Eugeni amb contrasenya d&apos;admin) pot
          modificar-lo.
        </p>
        <Link href="/" className="ink-btn-outline mt-6 inline-flex">
          Tornar
        </Link>
      </div>
    );
  }

  // Carreguem la vista completa per tenir persones + mitjans
  const { data: vista } = await admin
    .from("vista_moments")
    .select("*")
    .eq("id", params.id)
    .single();

  const dades = (vista ?? {
    ...moment,
    persones: [],
    mitjans: [],
  }) as MomentAmbRelacions;

  // Totes les persones conegudes (per suggerir)
  const { data: personesSuggerides } = await admin
    .from("persones")
    .select("id, nom")
    .order("nom");

  const bucketPublicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}`;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center">
        <div className="hand text-accent-rose text-xl">
          {esAdmin ? "mode administrador" : "gestionar el teu record"}
        </div>
        <h1 className="font-serif text-4xl mt-1">Editar record</h1>
        <p className="text-sepia-500 mt-2">
          Fes els canvis que necessitis o esborra&apos;l del tot.
        </p>
      </div>

      <EditForm
        moment={dades}
        codi={codi}
        bucketPublicUrl={bucketPublicUrl}
        personesSuggerides={personesSuggerides ?? []}
      />
    </div>
  );
}
