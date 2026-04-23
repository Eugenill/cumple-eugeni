"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

type Persona = { id: string; nom: string };

type Props = {
  persones: Persona[];
};

export function LoginForm(props: Props) {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginFormInner {...props} />
    </Suspense>
  );
}

function LoginFallback() {
  return (
    <div className="min-h-[70vh] grid place-items-center">
      <div className="card p-8 w-full max-w-md text-center text-sepia-400">
        Carregant…
      </div>
    </div>
  );
}

function LoginFormInner({ persones }: Props) {
  const params = useSearchParams();
  const redirect = params.get("redirect") || "/";
  const [nom, setNom] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nom.trim()) {
      setError("Cal dir-nos com et dius.");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, nom: nom.trim() }),
      credentials: "same-origin",
    });
    if (res.ok) {
      // Forcem un full reload perquè el middleware i els Server Components
      // vegin la cookie nova sense cap retard ni caché de client.
      window.location.assign(redirect || "/");
      return;
    }
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    setError(
      data?.error ||
        "No s'ha pogut entrar. Comprova la contrasenya i el nom."
    );
  }

  return (
    <div className="min-h-[70vh] grid place-items-center">
      <div className="card p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="hand text-accent-rose text-2xl">benvingut/da</div>
          <h1 className="font-serif text-4xl">Un àlbum dels 30 anys de l&apos;Eugeni</h1>
          <p className="text-sepia-500 mt-2">
            30 anys mereixen generen molts records. Digues qui ets i introdueix
            la contrasenya que t&apos;hem enviat per entrar.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="nom">
              El teu nom
            </label>
            <input
              id="nom"
              type="text"
              className="input"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              list="persones-login"
              placeholder="Ex: Iraïs"
              autoFocus
              required
            />
            <datalist id="persones-login">
              {persones.map((p) => (
                <option key={p.id} value={p.nom} />
              ))}
            </datalist>
            {persones.length > 0 && (
              <div className="mt-2">
                <div className="text-xs text-sepia-400 mb-1">
                  O tria ràpidament:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {persones.slice(0, 20).map((p) => {
                    const actiu =
                      nom.trim().toLowerCase() === p.nom.toLowerCase();
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
          <div>
            <label className="label" htmlFor="password">
              Contrasenya
            </label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-accent-rose">{error}</p>}
          <button className="ink-btn w-full justify-center" disabled={loading}>
            {loading ? "Entrant…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
