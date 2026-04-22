"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MomentAmbRelacions } from "@/lib/utils";

type Props = {
  moment: MomentAmbRelacions;
  codi: string;
  bucketPublicUrl: string;
  personesSuggerides: { id: string; nom: string }[];
};

export function EditForm({
  moment,
  codi,
  bucketPublicUrl,
  personesSuggerides,
}: Props) {
  const router = useRouter();
  const [titol, setTitol] = useState(moment.titol);
  const [descripcio, setDescripcio] = useState(moment.descripcio ?? "");
  const [data, setData] = useState(moment.data_moment);
  const [pujatPer, setPujatPer] = useState(moment.pujat_per ?? "");
  const [persones, setPersones] = useState<string[]>(
    moment.persones.map((p) => p.nom)
  );
  const [novaPersona, setNovaPersona] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [desat, setDesat] = useState(false);

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
      {moment.mitjans.length > 0 && (
        <div>
          <label className="label">Fotos del record</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {moment.mitjans.map((m) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={m.id}
                src={`${bucketPublicUrl}/${m.path}`}
                alt=""
                className="aspect-square object-cover rounded-md shadow-soft"
              />
            ))}
          </div>
          <p className="text-xs text-sepia-400 mt-2">
            Per ara no es poden afegir ni treure fotos individuals. Si vols
            canviar les fotos, esborra el record i torna&apos;l a pujar.
          </p>
        </div>
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
