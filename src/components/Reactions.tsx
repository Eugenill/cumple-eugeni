"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Reaccio } from "@/lib/utils";

type Props = {
  momentId: string;
  reaccions: Reaccio[];
  /** Nom de l'usuari de la sessió. Si és buit, mostrem les reaccions en
   * mode només lectura. */
  nomUsuari: string;
  /** Alineació del grup (útil quan la targeta està a la dreta del rail). */
  align?: "left" | "right";
};

const EMOJIS_RAPIDS = [
  "❤️",
  "😂",
  "😍",
  "🥹",
  "🎉",
  "🔥",
  "🙌",
  "👏",
  "🥳",
  "😭",
];

export function Reactions({
  momentId,
  reaccions,
  nomUsuari,
  align = "left",
}: Props) {
  const router = useRouter();
  const [local, setLocal] = useState<Reaccio[]>(reaccions);
  const [pickerObert, setPickerObert] = useState(false);
  const [pendents, setPendents] = useState<Set<string>>(new Set());
  const pickerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Si el servidor ens envia reaccions actualitzades (després d'un refresh),
  // sincronitzem l'estat local.
  useEffect(() => {
    setLocal(reaccions);
  }, [reaccions]);

  // Tanca el picker si l'usuari clica fora.
  useEffect(() => {
    if (!pickerObert) return;
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setPickerObert(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setPickerObert(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [pickerObert]);

  const low = nomUsuari.trim().toLowerCase();

  // Agrupem per emoji mantenint l'ordre d'aparició.
  const grups: { emoji: string; noms: string[] }[] = [];
  const idx = new Map<string, number>();
  for (const r of local) {
    const i = idx.get(r.emoji);
    if (i === undefined) {
      idx.set(r.emoji, grups.length);
      grups.push({ emoji: r.emoji, noms: [r.persona_nom] });
    } else {
      grups[i].noms.push(r.persona_nom);
    }
  }

  async function toggle(emoji: string) {
    if (!low) return;
    if (pendents.has(emoji)) return; // evitem dobles clics

    const jaReaccionat = local.some(
      (r) => r.emoji === emoji && r.persona_nom.trim().toLowerCase() === low
    );

    // Optimistic UI
    setLocal((prev) =>
      jaReaccionat
        ? prev.filter(
            (r) =>
              !(
                r.emoji === emoji &&
                r.persona_nom.trim().toLowerCase() === low
              )
          )
        : [...prev, { emoji, persona_nom: nomUsuari }]
    );
    setPendents((prev) => {
      const n = new Set(prev);
      n.add(emoji);
      return n;
    });
    setPickerObert(false);

    try {
      const res = await fetch(`/api/moments/${momentId}/reaccions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      if (!res.ok) throw new Error("server");
      // Refresh suau perquè altres moments/usuaris vegin el canvi al següent
      // navegar per la pàgina.
      router.refresh();
    } catch {
      // Revertim si falla
      setLocal((prev) =>
        jaReaccionat
          ? [...prev, { emoji, persona_nom: nomUsuari }]
          : prev.filter(
              (r) =>
                !(
                  r.emoji === emoji &&
                  r.persona_nom.trim().toLowerCase() === low
                )
            )
      );
    } finally {
      setPendents((prev) => {
        const n = new Set(prev);
        n.delete(emoji);
        return n;
      });
    }
  }

  const wrapperAlign = align === "right" ? "md:justify-end" : "md:justify-start";

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-wrap items-center gap-1.5 ${wrapperAlign}`}
    >
      {grups.map(({ emoji, noms }) => {
        const jo = noms.some((n) => n.trim().toLowerCase() === low);
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => toggle(emoji)}
            disabled={!low}
            title={noms.join(", ")}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm transition ${
              jo
                ? "bg-accent-rose/15 border-accent-rose/40 text-accent-rose"
                : "bg-cream-50 border-cream-200 text-sepia-600 hover:bg-cream-100"
            } disabled:opacity-70 disabled:cursor-default`}
          >
            <span className="leading-none">{emoji}</span>
            <span className="text-xs tabular-nums">{noms.length}</span>
          </button>
        );
      })}

      {low && (
        <button
          type="button"
          onClick={() => setPickerObert((v) => !v)}
          aria-label="Afegir una reacció"
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-sepia-300 bg-cream-50 px-2 py-0.5 text-sm text-sepia-500 hover:bg-cream-100"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2" />
            <line x1="9" y1="9" x2="9.01" y2="9" />
            <line x1="15" y1="9" x2="15.01" y2="9" />
          </svg>
          <span className="text-xs">+</span>
        </button>
      )}

      {pickerObert && (
        <div
          ref={pickerRef}
          className={`absolute top-full mt-1 z-30 ${
            align === "right" ? "right-0" : "left-0"
          } flex gap-1 rounded-xl border border-cream-200 bg-white/95 p-1.5 shadow-soft backdrop-blur`}
        >
          {EMOJIS_RAPIDS.map((e) => {
            const jo = local.some(
              (r) =>
                r.emoji === e && r.persona_nom.trim().toLowerCase() === low
            );
            return (
              <button
                key={e}
                type="button"
                onClick={() => toggle(e)}
                className={`h-9 w-9 rounded-lg text-xl transition hover:bg-cream-100 ${
                  jo ? "bg-accent-rose/15" : ""
                }`}
                aria-label={`Reaccionar amb ${e}`}
              >
                {e}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
