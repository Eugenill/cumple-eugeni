"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ImageEditor } from "./ImageEditor";

type PersonaSuggerida = { id: string; nom: string };

type FotoPendent = {
  localId: string;
  file: File;
  previewUrl: string;
};

type Props = {
  personesSuggerides: PersonaSuggerida[];
};

export function UploadForm({ personesSuggerides }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fotos, setFotos] = useState<FotoPendent[]>([]);
  const [fotoEnEdicio, setFotoEnEdicio] = useState<FotoPendent | null>(null);
  const [persones, setPersones] = useState<string[]>([]);
  const [novaPersona, setNovaPersona] = useState("");
  const [pujatPer, setPujatPer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Netegem els objectURLs quan el component es desmunta
  useEffect(() => {
    return () => {
      fotos.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const nous = Array.from(e.target.files || []).filter((f) =>
      f.type.startsWith("image/")
    );
    const mapped: FotoPendent[] = nous.map((f) => ({
      localId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file: f,
      previewUrl: URL.createObjectURL(f),
    }));
    setFotos((prev) => [...prev, ...mapped]);
    if (fileRef.current) fileRef.current.value = "";
  }

  function treureFoto(localId: string) {
    setFotos((prev) => {
      const trobat = prev.find((x) => x.localId === localId);
      if (trobat) URL.revokeObjectURL(trobat.previewUrl);
      return prev.filter((x) => x.localId !== localId);
    });
  }

  function actualitzarFoto(localId: string, blob: Blob) {
    setFotos((prev) =>
      prev.map((x) => {
        if (x.localId !== localId) return x;
        URL.revokeObjectURL(x.previewUrl);
        const nomBase = x.file.name.replace(/\.[^.]+$/, "");
        const nouFitxer = new File([blob], `${nomBase}.jpg`, {
          type: "image/jpeg",
        });
        return {
          ...x,
          file: nouFitxer,
          previewUrl: URL.createObjectURL(nouFitxer),
        };
      })
    );
    setFotoEnEdicio(null);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    form.delete("fitxers");
    fotos.forEach((f) => form.append("fitxers", f.file, f.file.name));
    form.set("persones", persones.join(","));
    form.set("pujat_per", pujatPer);

    try {
      const res = await fetch("/api/moments", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Error al pujar");
      // Tornem a la home directament — la línia del temps mostrarà el nou record.
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error inesperat";
      setError(msg);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card p-6 md:p-8 space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="titol">Títol del moment *</label>
          <input
            id="titol"
            name="titol"
            className="input"
            placeholder="Ex: Viatge a Lisboa"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="data_moment">Data *</label>
          <input
            id="data_moment"
            name="data_moment"
            type="date"
            className="input"
            required
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="descripcio">Descripció</label>
        <textarea
          id="descripcio"
          name="descripcio"
          rows={3}
          className="input"
          placeholder="Què va passar? Per què és un moment especial?"
        />
      </div>

      <div>
        <label className="label">Persones que hi apareixen</label>
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
            placeholder="Escriu un nom i prem Enter"
            list="persones-suggerides"
          />
          <datalist id="persones-suggerides">
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
        {personesSuggerides.length > 0 && (
          <div className="mt-3">
            <div className="text-xs text-sepia-400 mb-1">
              O tria ràpidament:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {personesSuggerides.slice(0, 20).map((p) => {
                const ja = persones.some(
                  (x) => x.toLowerCase() === p.nom.toLowerCase()
                );
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={ja}
                    onClick={() => afegirPersona(p.nom)}
                    className={`chip transition ${
                      ja
                        ? "opacity-40 cursor-not-allowed"
                        : "hover:bg-cream-200"
                    }`}
                  >
                    + {p.nom}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="label">Fotos</label>
        <div className="border-2 border-dashed border-cream-200 rounded-xl p-6 text-center bg-cream-50/50">
          <input
            ref={fileRef}
            id="fitxers"
            name="fitxers"
            type="file"
            multiple
            accept="image/*"
            onChange={onFileChange}
            className="hidden"
          />
          <label htmlFor="fitxers" className="ink-btn-outline cursor-pointer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Tria fotos
          </label>
          <div className="text-sm text-sepia-400 mt-2">
            Fotos (jpg, png, heic). Pots triar-ne diverses.
          </div>
        </div>

        {fotos.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
            {fotos.map((f) => (
              <div
                key={f.localId}
                className="relative group rounded-md overflow-hidden shadow-soft bg-sepia-100"
              >
                <div className="aspect-[4/3]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={f.previewUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute inset-0 bg-sepia-700/0 group-hover:bg-sepia-700/45 transition-colors grid place-items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 focus-within:bg-sepia-700/45">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFotoEnEdicio(f)}
                      className="rounded-full px-3 py-1.5 text-sm bg-cream-50 text-sepia-700 hover:bg-cream-100 shadow-soft"
                    >
                      Enquadrar
                    </button>
                    <button
                      type="button"
                      onClick={() => treureFoto(f.localId)}
                      className="rounded-full px-3 py-1.5 text-sm bg-accent-rose text-white hover:bg-accent-rose/90 shadow-soft"
                    >
                      Treure
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {fotos.length > 0 && (
          <p className="text-xs text-sepia-400 mt-2">
            Passa el cursor per sobre d&apos;una foto per retallar-la a 4:3 o
            treure-la abans de pujar-la.
          </p>
        )}
      </div>

      {fotoEnEdicio && (
        <ImageEditor
          src={fotoEnEdicio.previewUrl}
          onClose={() => setFotoEnEdicio(null)}
          onSave={(blob) => {
            actualitzarFoto(fotoEnEdicio.localId, blob);
          }}
          saveLabel="Desar enquadrat"
        />
      )}

      <div>
        <label className="label" htmlFor="pujat_per">Qui ho puja?</label>
        <input
          id="pujat_per"
          value={pujatPer}
          onChange={(e) => setPujatPer(e.target.value)}
          className="input"
          placeholder="El teu nom"
          list="persones-pujades-per"
        />
        <datalist id="persones-pujades-per">
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
        <p className="text-xs text-sepia-400 mt-2">
          El teu nom queda lligat a aquest record perquè més tard el puguis
          editar o esborrar des de <span className="italic">Els meus records</span>.
        </p>
      </div>

      {error && (
        <div className="bg-accent-rose/10 border border-accent-rose/30 text-accent-rose rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <button type="submit" disabled={loading} className="ink-btn">
          {loading ? "Pujant…" : "Afegir record"}
        </button>
      </div>
    </form>
  );
}
