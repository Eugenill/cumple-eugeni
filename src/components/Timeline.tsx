import { MomentAmbRelacions, formatDataCatala, obtenirAny } from "@/lib/utils";
import { MomentCard } from "./MomentCard";

type Props = {
  moments: MomentAmbRelacions[];
  bucketPublicUrl: string;
};

export function Timeline({ moments, bucketPublicUrl }: Props) {
  if (moments.length === 0) {
    return (
      <div className="card p-10 text-center">
        <div className="hand text-accent-rose text-2xl">encara buit…</div>
        <h2 className="font-serif text-3xl mt-2">
          Sigues el primer a afegir un record
        </h2>
        <p className="text-sepia-500 mt-2 max-w-md mx-auto">
          Una foto, un vídeo, una història. Tot compta per dibuixar 30 anys de
          vida compartida.
        </p>
      </div>
    );
  }

  // Ordena per data descendent (ja ve així de la query, però ho assegurem)
  const ordenats = [...moments].sort((a, b) =>
    a.data_moment < b.data_moment ? 1 : -1
  );

  // Agrupa per any
  const grups = new Map<number, MomentAmbRelacions[]>();
  for (const m of ordenats) {
    const any = obtenirAny(m.data_moment);
    if (!grups.has(any)) grups.set(any, []);
    grups.get(any)!.push(m);
  }

  const anysOrdenats = Array.from(grups.keys()).sort((a, b) => b - a);

  return (
    <div className="relative">
      <div className="rail" aria-hidden />
      <div className="space-y-16 md:space-y-20 relative">
        {anysOrdenats.map((any) => (
          <section key={any}>
            <div className="flex md:justify-center mb-8 md:mb-10">
              <div className="ml-10 md:ml-0 bg-sepia-600 text-cream-50 rounded-full px-5 py-1.5 font-serif text-xl shadow-soft">
                {any}
              </div>
            </div>

            <div className="space-y-10 md:space-y-14">
              {grups.get(any)!.map((m, idx) => {
                const esquerra = idx % 2 === 0;
                return (
                  <div
                    key={m.id}
                    className="relative grid md:grid-cols-2 gap-6 md:gap-10 items-start"
                  >
                    {/* Dot sobre la via */}
                    <div
                      className="absolute left-5 md:left-1/2 -translate-x-1/2 top-5 w-3 h-3 rounded-full bg-accent-rose ring-4 ring-cream-50 shadow z-10"
                      aria-hidden
                    />

                    <div className={`pl-10 md:pl-0 ${esquerra ? "md:order-1 md:text-right" : "md:order-2"}`}>
                      <div className="hand text-accent-rose text-xl">
                        {formatDataCatala(m.data_moment)}
                      </div>
                      <h3 className="font-serif text-2xl md:text-3xl leading-tight mt-1">
                        {m.titol}
                      </h3>
                      {m.descripcio && (
                        <p className="text-sepia-500 mt-2 leading-relaxed">
                          {m.descripcio}
                        </p>
                      )}
                      <div className={`flex flex-wrap gap-1.5 mt-3 ${esquerra ? "md:justify-end" : ""}`}>
                        {m.persones.map((p) => (
                          <span key={p.id} className="chip">
                            {p.nom}
                          </span>
                        ))}
                      </div>
                      {m.pujat_per && (
                        <div className="text-xs text-sepia-400 mt-3">
                          Pujat per {m.pujat_per}
                        </div>
                      )}
                    </div>

                    <div className={`pl-10 md:pl-0 ${esquerra ? "md:order-2" : "md:order-1"}`}>
                      <MomentCard moment={m} bucketPublicUrl={bucketPublicUrl} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
