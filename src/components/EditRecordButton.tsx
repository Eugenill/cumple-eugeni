"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  momentId: string;
  personesSuggerides: { id: string; nom: string }[];
  /** Text visible al botó. */
  label?: string;
  /** Classes del botó disparador. Per defecte, enllaç subtil. */
  className?: string;
};

/**
 * Botó que obre un diàleg «Qui ets tu?» i, si el nom triat coincideix amb
 * el pujat_per del moment (o si ets admin), et porta a la pàgina d'edició
 * amb el token corresponent.
 */
export function EditRecordButton({
  momentId,
  personesSuggerides,
  label = "Editar",
  className,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nom, setNom] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading]);

  async function confirmar() {
    const n = nom.trim();
    if (!n) {
      setError("Tria el teu nom per continuar.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/moments/${momentId}/autoritza`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom: n }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "No s'ha pogut autoritzar.");
        setLoading(false);
        return;
      }
      router.push(
        `/record/${momentId}/editar?codi=${encodeURIComponent(
          data.edit_token
        )}`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error inesperat";
      setError(msg);
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={
          className ??
          "text-xs text-sepia-500 hover:text-accent-rose underline underline-offset-2 decoration-dotted"
        }
      >
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-sepia-700/40 backdrop-blur-sm grid place-items-center p-4"
          onClick={() => !loading && setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="card w-full max-w-md p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Tancar"
              onClick={() => !loading && setOpen(false)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full grid place-items-center text-sepia-500 hover:text-accent-rose hover:bg-cream-100 transition-colors"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            <div className="hand text-accent-rose text-lg">per continuar</div>
            <h3 className="font-serif text-3xl leading-tight pr-8">
              Qui ets tu?
            </h3>
            <p className="text-sepia-500 text-sm mt-1">
              Només qui va pujar aquest record el pot modificar. Tria el teu
              nom.
            </p>

            <div className="mt-4">
              <label className="label" htmlFor="nom-editor">
                El teu nom
              </label>
              <input
                id="nom-editor"
                className="input"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                list="persones-editar"
                placeholder="Ex: Iraïs"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    confirmar();
                  }
                }}
              />
              <datalist id="persones-editar">
                {personesSuggerides.map((p) => (
                  <option key={p.id} value={p.nom} />
                ))}
              </datalist>
            </div>

            {personesSuggerides.length > 0 && (
              <div className="mt-3">
                <div className="text-xs text-sepia-400 mb-1">
                  O tria ràpidament:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {personesSuggerides.slice(0, 14).map((p) => {
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

            {error && (
              <div className="bg-accent-rose/10 border border-accent-rose/30 text-accent-rose rounded-lg px-3 py-2 text-sm mt-4">
                {error}
              </div>
            )}

            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="ink-btn-outline flex-1"
              >
                Cancel·lar
              </button>
              <button
                type="button"
                onClick={confirmar}
                disabled={loading}
                className="ink-btn flex-1 justify-center"
              >
                {loading ? "Comprovant…" : "Continuar →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
