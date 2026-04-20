import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  createSupabasePublicClient,
  createSupabaseAdminClient,
  BUCKET,
} from "@/lib/supabase/server";
import { MomentAmbRelacions, formatDataCatala } from "@/lib/utils";

export const revalidate = 0;

export default async function AdminPage() {
  const esAdmin = cookies().get("eugeni_admin")?.value === "ok";
  if (!esAdmin) {
    notFound();
  }

  const supabase = createSupabasePublicClient();
  const { data } = await supabase
    .from("vista_moments")
    .select("*")
    .order("data_moment", { ascending: false });

  const moments = (data ?? []) as MomentAmbRelacions[];

  // Per tenir els edit_tokens, consulta explícita al admin client
  const adminClient = createSupabaseAdminClient();
  const { data: tokens } = await adminClient
    .from("moments")
    .select("id, edit_token");
  const tokensPerId = new Map<string, string>(
    (tokens ?? []).map((t) => [t.id, t.edit_token])
  );

  const bucketPublicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}`;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="text-center">
        <div className="hand text-accent-rose text-xl">mode administrador</div>
        <h1 className="font-serif text-4xl">Tots els records</h1>
        <p className="text-sepia-500 mt-2">
          {moments.length} {moments.length === 1 ? "record" : "records"} en
          total. Pots editar o esborrar qualsevol.
        </p>
      </div>

      {moments.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-sepia-500">
            Encara no hi ha cap record. Quan algú en pugi el primer, apareixerà aquí.
          </p>
        </div>
      ) : (
        <div className="card divide-y divide-cream-200">
          {moments.map((m) => {
            const token = tokensPerId.get(m.id) ?? "";
            const primerMitja = m.mitjans[0];
            return (
              <div
                key={m.id}
                className="flex items-center gap-4 p-4"
              >
                <div className="w-16 h-16 rounded-md overflow-hidden bg-cream-100 shrink-0">
                  {primerMitja ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`${bucketPublicUrl}/${primerMitja.path}`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-sepia-400 hand">
                      —
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-serif text-lg text-sepia-700 truncate">
                    {m.titol}
                  </div>
                  <div className="text-xs text-sepia-400">
                    {formatDataCatala(m.data_moment)}
                    {m.pujat_per ? ` · pujat per ${m.pujat_per}` : ""}
                    {" · "}
                    {m.persones.length}{" "}
                    {m.persones.length === 1 ? "persona" : "persones"}
                    {" · "}
                    {m.mitjans.length}{" "}
                    {m.mitjans.length === 1 ? "foto" : "fotos"}
                  </div>
                </div>
                <Link
                  href={`/record/${m.id}/editar?codi=${token}`}
                  className="ink-btn-outline whitespace-nowrap"
                >
                  Gestionar
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
