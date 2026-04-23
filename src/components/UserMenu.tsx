"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  nom: string;
};

export function UserMenu({ nom }: Props) {
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  async function sortir() {
    setLoggingOut(true);
    await fetch("/api/logout", {
      method: "POST",
      credentials: "same-origin",
    }).catch(() => {});
    window.location.assign("/login");
  }

  // Inicials a partir del nom (màxim 2 lletres)
  const inicials = nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full border border-cream-200 bg-cream-50 hover:bg-cream-100 transition-colors shadow-soft"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="w-7 h-7 rounded-full bg-accent-rose/15 text-accent-rose grid place-items-center font-serif text-sm">
          {inicials || "?"}
        </span>
        <span className="hidden sm:inline text-sm text-sepia-700 max-w-[8rem] truncate">
          {nom}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] min-w-[220px] card p-3 shadow-soft z-40"
        >
          <div className="px-2 py-1.5 border-b border-cream-200 mb-2">
            <div className="text-xs uppercase tracking-wider text-sepia-400">
              Sessió
            </div>
            <div className="font-serif text-lg text-sepia-700 truncate">
              {nom}
            </div>
          </div>
          <button
            type="button"
            onClick={sortir}
            disabled={loggingOut}
            className="w-full text-left rounded-md px-2 py-2 text-sm text-sepia-700 hover:bg-accent-rose/10 hover:text-accent-rose transition-colors disabled:opacity-60"
          >
            {loggingOut ? "Sortint…" : "Tancar sessió"}
          </button>
        </div>
      )}
    </div>
  );
}
