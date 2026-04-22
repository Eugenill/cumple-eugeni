"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MomentAmbRelacions, formatDataCatala } from "@/lib/utils";

type Props = {
  persones: { id: string; nom: string }[];
  moments: MomentAmbRelacions[];
  bucketPublicUrl: string;
};

export function RecordsBrowser({ persones, moments, bucketPublicUrl }: Props) {
  const router = useRouter();
  const [nom, setNom] = useState<string>("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Records pujats per aquesta persona.
  const pujatsPerMi = useMemo(() => {
    if (!nom.trim()) return [];
    const low = nom.trim().toLowerCase();
    return moments.filter(
      (m) => (m.pujat_per || "").trim().toLowerCase() === low
    );
  }, [moments, nom]);

  const apareixoPero = useMemo(() => {
    if (!nom.trim()) return [];
    const low = nom.trim().toLowerCase();
    return moments.filter(
      (m) =>
        (m.pujat_per || "").trim().toLowerCase() !== low &&
        m.persones.some((p) => p.nom.toLowerCase() === low)
    );
  }, [moments, nom]);

  async function obrirEditor(id: string) {
    setLoadingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/moments/${id}/autoritza`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "No s'ha pogut autoritzar.");
        setLoadingId(null);
        return;
      }
      router.push(
        `/record/${id}/editar?codi=${encodeURIComponent(data.edit_token)}`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error inesperat";
      setError(msg);
      setLoadingId(null);
    }
  }

  return (
    <div className="space-y-6">
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
            <div className="text-xs text-sepia-400 mb-1">
              O tria ràpidament:
            </div>
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

      {error && (
        <div className="bg-accent-rose/10 border border-accent-rose/30 text-accent-rose rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {!nom.trim() ? (
        <div className="card p-8 text-center">
          <div className="hand text-accent-rose text-xl">en espera…</div>
          <p className="text-sepia-500 mt-1">
            Tria el teu nom a dalt per veure els teus records.
          </p>
        </div>
      ) : pujatsPerMi.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="hand text-accent-rose text-xl">encara res</div>
          <p className="text-sepia-500 mt-1">
            No hi ha cap record pujat per <strong>{nom}</strong>. Si creus que
            és un error, comprova que l&apos;has escrit igual que quan el vas
            pujar (majúscules, accents…).
          </p>
          {apareixoPero.length > 0 && (
            <p className="text-xs text-sepia-400 mt-3">
              Apareixes en {apareixoPero.length}{" "}
              {apareixoPero.length === 1 ? "record" : "records"} pujats per
              altres persones, però només qui els ha pujat els pot editar.
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="text-sm text-sepia-500">
            {pujatsPerMi.length}{" "}
            {pujatsPerMi.length === 1 ? "record" : "records"} pujats per{" "}
            <strong>{nom}</strong>
          </div>
          <div className="card divide-y divide-cream-200">
            {pujatsPerMi.map((m) => {
              const primerMitja = m.mitjans[0];
              const apareix = m.persones.some(
                (p) => p.nom.toLowerCase() === nom.toLowerCase()
              );
              return (
                <div key={m.id} className="flex items-center gap-4 p-4">
                  <div className="w-16 h-16 rounded-md overflow-hidden bg-cream-100 shrink-0">
                    {primerMitja ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
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
                      {" · "}
                      {m.persones.length}{" "}
                      {m.persones.length === 1 ? "persona" : "persones"}
                      {" · "}
                      {m.mitjans.length}{" "}
                      {m.mitjans.length === 1 ? "foto" : "fotos"}
                      {!apareix && (
                        <span className="ml-2 italic text-accent-rose/70">
                          (no t&apos;hi has tagejat)
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => obrirEditor(m.id)}
                    disabled={loadingId === m.id}
                    className="ink-btn whitespace-nowrap"
                  >
                    {loadingId === m.id ? "Obrint…" : "Editar"}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
