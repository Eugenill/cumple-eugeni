"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

type PersonaSuggerida = { id: string; nom: string };

type Props = {
  personesSuggerides: PersonaSuggerida[];
};

export function UploadForm({ personesSuggerides }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fitxers, setFitxers] = useState<File[]>([]);
  const [persones, setPersones] = useState<string[]>([]);
  const [novaPersona, setNovaPersona] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okId, setOkId] = useState<string | null>(null);

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
    setFitxers((prev) => [...prev, ...nous]);
    if (fileRef.current) fileRef.current.value = "";
  }

  function treureFitxer(idx: number) {
    setFitxers(fitxers.filter((_, i) => i !== idx));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    form.delete("fitxers");
    fitxers.forEach((f) => form.append("fitxers", f));
    form.set("persones", persones.join(","));

    try {
      const res = await fetch("/api/moments", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Error al pujar");
      setOkId(data.id);
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Error inesperat");
    } finally {
      setLoading(false);
    }
  }

  if (okId) {
    return (
      <div className="card p-10 text-center">
        <div className="hand text-3xl text-accent-rose">gràcies ♥</div>
        <h2 className="font-serif text-3xl mt-2">Record afegit!</h2>
        <p className="text-sepia-500 mt-2">
          Tornant a la línia del temps…
        </p>
      </div>
    );
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

        {fitxers.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm">
            {fitxers.map((f, i) => (
              <li key={i} className="flex items-center justify-between bg-white/60 rounded px-3 py-1.5 border border-cream-200">
                <span className="truncate">{f.name}</span>
                <button
                  type="button"
                  onClick={() => treureFitxer(i)}
                  className="text-sepia-400 hover:text-accent-rose ml-3"
                  aria-label="Treure fitxer"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <label className="label" htmlFor="pujat_per">Qui ho puja? (opcional)</label>
        <input
          id="pujat_per"
          name="pujat_per"
          className="input"
          placeholder="El teu nom"
        />
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
