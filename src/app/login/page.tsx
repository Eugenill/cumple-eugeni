"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") || "/";
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push(redirect);
      router.refresh();
    } else {
      setError("La contrasenya no és correcta. Torna-ho a provar.");
    }
  }

  return (
    <div className="min-h-[70vh] grid place-items-center">
      <div className="card p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="hand text-accent-rose text-2xl">benvingut/da</div>
          <h1 className="font-serif text-4xl">Un àlbum per a l&apos;Eugeni</h1>
          <p className="text-sepia-500 mt-2">
            30 anys mereixen 30 anys de records. Introdueix la contrasenya que
            t&apos;hem enviat per entrar.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="password">
              Contrasenya
            </label>
            <input
              id="password"
              type="password"
              className="input"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && (
            <p className="text-sm text-accent-rose">{error}</p>
          )}
          <button className="ink-btn w-full" disabled={loading}>
            {loading ? "Entrant…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
