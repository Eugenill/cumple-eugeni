"use client";

import { useMemo, useState } from "react";
import { MomentAmbRelacions } from "@/lib/utils";
import { Timeline } from "./Timeline";

type Props = {
  persones: { id: string; nom: string }[];
  moments: MomentAmbRelacions[];
  bucketPublicUrl: string;
};

export function RecordsBrowser({ persones, moments, bucketPublicUrl }: Props) {
  const [nom, setNom] = useState<string>("");

  // Records on la persona apareix (tagejada) o que ha pujat ella mateixa.
  const recordsMeus = useMemo(() => {
    const low = nom.trim().toLowerCase();
    if (!low) return [] as MomentAmbRelacions[];
    return moments.filter((m) => {
      const esAutor = (m.pujat_per || "").trim().toLowerCase() === low;
      const estaTagejat = m.persones.some(
        (p) => p.nom.toLowerCase() === low
      );
      return esAutor || estaTagejat;
    });
  }, [moments, nom]);

  const pujatsPerMi = useMemo(
    () =>
      recordsMeus.filter(
        (m) => (m.pujat_per || "").trim().toLowerCase() === nom.trim().toLowerCase()
      ).length,
    [recordsMeus, nom]
  );
  const nomesTagejat = recordsMeus.length - pujatsPerMi;
  const totalFotos = recordsMeus.reduce((s, m) => s + m.mitjans.length, 0);

  return (
    <div className="space-y-8">
      <div className="card p-5">
        <label className="label" htmlFor="nom-select">
          Tria el teu nom
        </label>
        <div className="flex gap-2 items-stretch">
          <input
            id="nom-select"
            list="persones-records"
            className="input flex-1"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Ex: Iraïs"
          />
          <datalist id="persones-records">
            {persones.map((p) => (
              <option key={p.id} value={p.nom} />
            ))}
          </datalist>
          {nom && (
            <button
              type="button"
              onClick={() => setNom("")}
              className="ink-btn-outline"
            >
              Netejar
            </button>
          )}
        </div>
        {persones.length > 0 && (
          <div className="mt-3">
            <div className="text-xs text-sepia-400 mb-1">O tria ràpidament:</div>
            <div className="flex flex-wrap gap-1.5">
              {persones.map((p) => {
                const actiu = nom.toLowerCase() === p.nom.toLowerCase();
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setNom(p.nom)}
                    className={`chip transition ${
                      actiu
                        ? "bg-accent-rose/15 border-accent-rose/40 text-accent-rose"
                        : "hover:bg-cream-200"
                    }`}
                  >
                    {p.nom}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {!nom.trim() ? (
        <div className="card p-8 text-center">
          <div className="hand text-accent-rose text-xl">en espera…</div>
          <p className="text-sepia-500 mt-1">
            Tria el teu nom a dalt per veure la teva línia del temps.
          </p>
        </div>
      ) : recordsMeus.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="hand text-accent-rose text-xl">encara res</div>
          <p className="text-sepia-500 mt-1">
            No hi ha cap record amb <strong>{nom}</strong> de moment. Comprova
            que l&apos;has escrit igual que a la resta del lloc (majúscules,
            accents…).
          </p>
        </div>
      ) : (
        <>
          <section className="text-center">
            <div className="hand text-accent-rose text-xl">la línia del temps de</div>
            <h2 className="font-serif text-4xl md:text-5xl text-sepia-700">
              {nom}
            </h2>
            <div className="flex justify-center gap-4 mt-5 flex-wrap">
              <div className="card px-5 py-3">
                <div className="font-serif text-3xl text-sepia-700">
                  {recordsMeus.length}
                </div>
                <div className="text-xs uppercase tracking-wider text-sepia-400">
                  {recordsMeus.length === 1 ? "Record" : "Records"}
                </div>
              </div>
              <div className="card px-5 py-3">
                <div className="font-serif text-3xl text-sepia-700">
                  {pujatsPerMi}
                </div>
                <div className="text-xs uppercase tracking-wider text-sepia-400">
                  {pujatsPerMi === 1 ? "Pujat per tu" : "Pujats per tu"}
                </div>
              </div>
              <div className="card px-5 py-3">
                <div className="font-serif text-3xl text-sepia-700">
                  {nomesTagejat}
                </div>
                <div className="text-xs uppercase tracking-wider text-sepia-400">
                  Només tagejat
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
            </div>
          </section>

          <Timeline
            moments={recordsMeus}
            bucketPublicUrl={bucketPublicUrl}
            personesSuggerides={persones}
          />
        </>
      )}
    </div>
  );
}
