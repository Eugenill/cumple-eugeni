"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { MomentAmbRelacions } from "@/lib/utils";
import { ImageEditor } from "./ImageEditor";

type Mitja = { id: string; path: string; tipus: "imatge" };

type Props = {
  moment: MomentAmbRelacions;
  codi: string;
  bucketPublicUrl: string;
  personesSuggerides: { id: string; nom: string }[];
  /** Nom de la persona que hi ha la sessió oberta. */
  nomUsuari?: string;
};

// Una foto pendent (triada amb "Afegir fotos") abans de ser pujada al servidor
type NovaFoto = {
  localId: string;
  file: File;
  previewUrl: string; // objectURL del fitxer per mostrar la miniatura
};

export function EditForm({
  moment,
  codi,
  bucketPublicUrl,
  personesSuggerides,
  nomUsuari = "",
}: Props) {
  const router = useRouter();
  const [titol, setTitol] = useState(moment.titol);
  const [descripcio, setDescripcio] = useState(moment.descripcio ?? "");
  const [data, setData] = useState(moment.data_moment);
  const [pujatPer, setPujatPer] = useState(
    moment.pujat_per ?? nomUsuari ?? ""
  );
  const [persones, setPersones] = useState<string[]>(
    moment.persones.map((p) => p.nom)
  );
  const [novaPersona, setNovaPersona] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [desat, setDesat] = useState(false);

  // Mitjans ja existents al servidor
  const [mitjans, setMitjans] = useState<Mitja[]>(moment.mitjans);
  const [mitjaEnEdicio, setMitjaEnEdicio] = useState<Mitja | null>(null);
  const [esborrantId, setEsborrantId] = useState<string | null>(null);
  const [cacheBust, setCacheBust] = useState<Record<string, number>>({});

  // Fotos noves pendents de pujar
  const fileRef = useRef<HTMLInputElement>(null);
  const [novesFotos, setNovesFotos] = useState<NovaFoto[]>([]);
  const [novaEnEdicio, setNovaEnEdicio] = useState<NovaFoto | null>(null);
  const [pujantNoves, setPujantNoves] = useState(false);

  async function esborrarMitja(m: Mitja) {
    if (!confirm("Segur que vols esborrar aquesta imatge?")) return;
    setEsborrantId(m.id);
    setError(null);
    try {
      const url = `/api/moments/${moment.id}/mitjans/${m.id}${
        codi ? `?codi=${encodeURIComponent(codi)}` : ""
      }`;
      const res = await fetch(url, { method: "DELETE" });
      const dades = await res.json();
      if (!res.ok) throw new Error(dades?.error || "No s'ha pogut esborrar");
      setMitjans((prev) => prev.filter((x) => x.id !== m.id));
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error inesperat";
      setError(msg);
    } finally {
      setEsborrantId(null);
    }
  }

  async function desarEnquadrat(mitjaId: string, blob: Blob) {
    const fd = new FormData();
    fd.append("fitxer", blob, "enquadrat.jpg");
    const url = `/api/moments/${moment.id}/mitjans/${mitjaId}${
      codi ? `?codi=${encodeURIComponent(codi)}` : ""
    }`;
    const res = await fetch(url, { method: "PUT", body: fd });
    const dades = await res.json();
    if (!res.ok) throw new Error(dades?.error || "No s'ha pogut desar");
    setMitjans((prev) =>
      prev.map((x) =>
        x.id === mitjaId ? { ...x, path: dades.path as string } : x
      )
    );
    setCacheBust((prev) => ({ ...prev, [mitjaId]: Date.now() }));
    setMitjaEnEdicio(null);
    router.refresh();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const nous = Array.from(e.target.files || []).filter((f) =>
      f.type.startsWith("image/")
    );
    const mapped: NovaFoto[] = nous.map((f) => ({
      localId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file: f,
      previewUrl: URL.createObjectURL(f),
    }));
    setNovesFotos((prev) => [...prev, ...mapped]);
    if (fileRef.current) fileRef.current.value = "";
  }

  function treureNovaFoto(localId: string) {
    setNovesFotos((prev) => {
      const trobat = prev.find((x) => x.localId === localId);
      if (trobat) URL.revokeObjectURL(trobat.previewUrl);
      return prev.filter((x) => x.localId !== localId);
    });
  }

  function actualitzarNovaFoto(localId: string, blob: Blob) {
    setNovesFotos((prev) =>
      prev.map((x) => {
        if (x.localId !== localId) return x;
        URL.revokeObjectURL(x.previewUrl);
        const nouFitxer = new File([blob], x.file.name.replace(/\.[^.]+$/, "") + ".jpg", {
          type: "image/jpeg",
        });
        return {
          ...x,
          file: nouFitxer,
          previewUrl: URL.createObjectURL(nouFitxer),
        };
      })
    );
    setNovaEnEdicio(null);
  }

  async function pujarNovesFotos() {
    if (novesFotos.length === 0) return;
    setPujantNoves(true);
    setError(null);
    try {
      const fd = new FormData();
      novesFotos.forEach((n) => fd.append("fitxers", n.file, n.file.name));
      const url = `/api/moments/${moment.id}/mitjans${
        codi ? `?codi=${encodeURIComponent(codi)}` : ""
      }`;
      const res = await fetch(url, { method: "POST", body: fd });
      const dades = await res.json();
      if (!res.ok) throw new Error(dades?.error || "No s'han pogut pujar");
      // Afegim al llistat existent i netejem les pendents
      setMitjans((prev) => [...prev, ...(dades.mitjans as Mitja[])]);
      novesFotos.forEach((n) => URL.revokeObjectURL(n.previewUrl));
      setNovesFotos([]);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error inesperat";
      setError(msg);
    } finally {
      setPujantNoves(false);
    }
  }

  function afegirPersona(nom: string) {
    const n = nom.trim();
    if (!n) return;
    if (persones.some((x) => x.toLowerCase() === n.toLowerCase())) return;
    setPersones([...persones, n]);
    setNovaPersona("");
  }

  function treurePersona(nom: string) {
    setPersones(persones.filter((x) => x !== nom));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setDesat(false);
    try {
      const url = `/api/moments/${moment.id}${codi ? `?codi=${encodeURIComponent(codi)}` : ""}`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titol,
          descripcio,
          data_moment: data,
          pujat_per: pujatPer,
          persones,
        }),
      });
      const dades = await res.json();
      if (!res.ok) throw new Error(dades?.error || "No s'ha pogut desar");
      setDesat(true);
      router.refresh();
      setTimeout(() => setDesat(false), 2500);
    } catch (err: any) {
      setError(err.message || "Error inesperat");
    } finally {
      setLoading(false);
    }
  }

  async function onDelete() {
    if (
      !confirm(
        "Segur que vols esborrar aquest record? Aquesta acció no es pot desfer."
      )
    )
      return;
    setDeleting(true);
    setError(null);
    try {
      const url = `/api/moments/${moment.id}${codi ? `?codi=${encodeURIComponent(codi)}` : ""}`;
      const res = await fetch(url, { method: "DELETE" });
      const dades = await res.json();
      if (!res.ok) throw new Error(dades?.error || "No s'ha pogut esborrar");
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Error inesperat");
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card p-6 md:p-8 space-y-6">
      {/* Galeria de fotos existents */}
      {mitjans.length > 0 && (
        <div>
          <label className="label">Fotos del record</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {mitjans.map((m) => {
              const bust = cacheBust[m.id];
              const src = `${bucketPublicUrl}/${m.path}${
                bust ? `?v=${bust}` : ""
              }`;
              const esborrant = esborrantId === m.id;
              return (
                <div
                  key={m.id}
                  className="relative group rounded-md overflow-hidden shadow-soft bg-sepia-100"
                >
                  <div className="aspect-[4/3]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute inset-0 bg-sepia-700/0 group-hover:bg-sepia-700/45 transition-colors grid place-items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 focus-within:bg-sepia-700/45">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setMitjaEnEdicio(m)}
                        disabled={esborrant}
                        className="rounded-full px-3 py-1.5 text-sm bg-cream-50 text-sepia-700 hover:bg-cream-100 shadow-soft"
                      >
                        Enquadrar
                      </button>
                      <button
                        type="button"
                        onClick={() => esborrarMitja(m)}
                        disabled={esborrant}
                        className="rounded-full px-3 py-1.5 text-sm bg-accent-rose text-white hover:bg-accent-rose/90 shadow-soft disabled:opacity-50"
                      >
                        {esborrant ? "Esborrant…" : "Esborrar"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-sepia-400 mt-2">
            Passa el cursor per sobre d&apos;una foto per retallar-la o
            esborrar-la. L&apos;aspecte 4:3 és el que es veu al timeline.
          </p>
        </div>
      )}

      {/* Afegir noves fotos */}
      <div>
        <label className="label">Afegir fotos</label>
        <div className="border-2 border-dashed border-cream-200 rounded-xl p-5 text-center bg-cream-50/50">
          <input
            ref={fileRef}
            id="noves-fitxers"
            type="file"
            multiple
            accept="image/*"
            onChange={onFileChange}
            className="hidden"
          />
          <label htmlFor="noves-fitxers" className="ink-btn-outline cursor-pointer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Tria més fotos
          </label>
          <div className="text-xs text-sepia-400 mt-2">
            Les fotos noves es pujaran quan premis &quot;Pujar fotos noves&quot;.
          </div>
        </div>

        {novesFotos.length > 0 && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
              {novesFotos.map((n) => (
                <div
                  key={n.localId}
                  className="relative group rounded-md overflow-hidden shadow-soft bg-sepia-100"
                >
                  <div className="aspect-[4/3]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={n.previewUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute inset-0 bg-sepia-700/0 group-hover:bg-sepia-700/45 transition-colors grid place-items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 focus-within:bg-sepia-700/45">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setNovaEnEdicio(n)}
                        className="rounded-full px-3 py-1.5 text-sm bg-cream-50 text-sepia-700 hover:bg-cream-100 shadow-soft"
                      >
                        Enquadrar
                      </button>
                      <button
                        type="button"
                        onClick={() => treureNovaFoto(n.localId)}
                        className="rounded-full px-3 py-1.5 text-sm bg-accent-rose text-white hover:bg-accent-rose/90 shadow-soft"
                      >
                        Treure
                      </button>
                    </div>
                  </div>
                  <div className="absolute top-1 left-1 hand text-[10px] bg-cream-50/85 text-sepia-600 rounded px-1.5 py-0.5">
                    pendent
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-3">
              <button
                type="button"
                onClick={pujarNovesFotos}
                disabled={pujantNoves}
                className="ink-btn"
              >
                {pujantNoves
                  ? "Pujant…"
                  : `Pujar ${novesFotos.length} foto${
                      novesFotos.length === 1 ? "" : "s"
                    } nov${novesFotos.length === 1 ? "a" : "es"}`}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Editor per a mitjans existents al servidor */}
      {mitjaEnEdicio && (
        <ImageEditor
          src={`${bucketPublicUrl}/${mitjaEnEdicio.path}`}
          onClose={() => setMitjaEnEdicio(null)}
          onSave={async (blob) => {
            await desarEnquadrat(mitjaEnEdicio.id, blob);
          }}
        />
      )}

      {/* Editor per a fotos noves pendents */}
      {novaEnEdicio && (
        <ImageEditor
          src={novaEnEdicio.previewUrl}
          onClose={() => setNovaEnEdicio(null)}
          onSave={(blob) => {
            actualitzarNovaFoto(novaEnEdicio.localId, blob);
          }}
          saveLabel="Desar enquadrat"
        />
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="titol">Títol *</label>
          <input
            id="titol"
            className="input"
            value={titol}
            onChange={(e) => setTitol(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="data">Data *</label>
          <input
            id="data"
            type="date"
            className="input"
            value={data}
            onChange={(e) => setData(e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="descripcio">Descripció</label>
        <textarea
          id="descripcio"
          rows={3}
          className="input"
          value={descripcio}
          onChange={(e) => setDescripcio(e.target.value)}
        />
      </div>

      <div>
        <label className="label">Persones</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {persones.map((p) => (
            <span key={p} className="chip">
              {p}
              <button
                type="button"
                onClick={() => treurePersona(p)}
                className="ml-1 text-sepia-400 hover:text-accent-rose"
                aria-label={`Treure ${p}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={novaPersona}
            onChange={(e) => setNovaPersona(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                afegirPersona(novaPersona);
              }
            }}
            className="input flex-1"
            placeholder="Afegir persona"
            list="persones-suggerides-edit"
          />
          <datalist id="persones-suggerides-edit">
            {personesSuggerides.map((p) => (
              <option key={p.id} value={p.nom} />
            ))}
          </datalist>
          <button
            type="button"
            onClick={() => afegirPersona(novaPersona)}
            className="ink-btn-outline"
          >
            Afegir
          </button>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="pujat_per">Pujat per</label>
        <input
          id="pujat_per"
          className="input"
          value={pujatPer}
          onChange={(e) => setPujatPer(e.target.value)}
          list="persones-pujades-per-edit"
        />
        <datalist id="persones-pujades-per-edit">
          {personesSuggerides.map((p) => (
            <option key={p.id} value={p.nom} />
          ))}
        </datalist>
        {personesSuggerides.length > 0 && (
          <div className="mt-2">
            <div className="text-xs text-sepia-400 mb-1">
              O tria ràpidament:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {personesSuggerides.slice(0, 14).map((p) => {
                const actiu = pujatPer.toLowerCase() === p.nom.toLowerCase();
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPujatPer(p.nom)}
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
      {desat && (
        <div className="bg-accent-olive/10 border border-accent-olive/30 text-accent-olive rounded-lg px-4 py-3 text-sm">
          Canvis desats ✓
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-2 border-t border-cream-200">
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting || loading}
          className="rounded-full px-5 py-2.5 font-medium border border-accent-rose/40 text-accent-rose hover:bg-accent-rose hover:text-white transition disabled:opacity-50"
        >
          {deleting ? "Esborrant…" : "Esborrar record"}
        </button>
        <button type="submit" disabled={loading || deleting} className="ink-btn">
          {loading ? "Desant…" : "Desar canvis"}
        </button>
      </div>
    </form>
  );
}
