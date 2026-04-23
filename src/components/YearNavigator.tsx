"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  /** Anys ordenats (típicament descendent) que apareixen a la línia del temps. */
  anys: number[];
  /** Nombre de records per any, indexat per any (opcional). */
  recomptes?: Record<number, number>;
  /** Offset en px des del top del viewport per calcular l'any visible.
   *  Ha de coincidir amb l'alçada del header fix + un petit marge. */
  offsetTop?: number;
};

/**
 * Ribbon horitzontal d'anys, enganxat a sota del header. Fa scroll-spy
 * sobre els blocs d'any (ids `any-<YYYY>`) i ressalta l'any actiu mentre
 * l'usuari baixa per la línia del temps. Clic → salta a aquell any.
 */
export function YearNavigator({
  anys,
  recomptes = {},
  offsetTop = 80,
}: Props) {
  const [actiu, setActiu] = useState<number | null>(anys[0] ?? null);
  const ribbonRef = useRef<HTMLDivElement>(null);

  // Scroll-spy: detecta quin bloc d'any és dalt del viewport
  useEffect(() => {
    if (anys.length === 0) return;

    function calcular() {
      let millorAny: number | null = null;
      let millorDist = Infinity;
      for (const a of anys) {
        const el = document.getElementById(`any-${a}`);
        if (!el) continue;
        const top = el.getBoundingClientRect().top - offsetTop;
        // Considerem "actiu" l'any amb el top més a prop per sobre
        // (o just a l'alçada del threshold).
        if (top <= 20) {
          const dist = Math.abs(top);
          if (dist < millorDist) {
            millorDist = dist;
            millorAny = a;
          }
        }
      }
      // Si encara no hem arribat a cap any (estem per sobre de tot),
      // ressaltem el primer.
      if (millorAny == null) millorAny = anys[0];
      setActiu((prev) => (prev === millorAny ? prev : millorAny));
    }

    calcular();
    window.addEventListener("scroll", calcular, { passive: true });
    window.addEventListener("resize", calcular);
    return () => {
      window.removeEventListener("scroll", calcular);
      window.removeEventListener("resize", calcular);
    };
  }, [anys, offsetTop]);

  // Quan canvia l'any actiu, centrem el chip dins el ribbon (si cal)
  useEffect(() => {
    if (actiu == null) return;
    const ribbon = ribbonRef.current;
    if (!ribbon) return;
    const chip = ribbon.querySelector<HTMLElement>(`[data-any="${actiu}"]`);
    if (!chip) return;
    const r = ribbon.getBoundingClientRect();
    const c = chip.getBoundingClientRect();
    // Només fem scroll si el chip està parcialment fora del contenidor.
    if (c.left < r.left + 8 || c.right > r.right - 8) {
      chip.scrollIntoView({
        inline: "center",
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [actiu]);

  function saltarA(any: number) {
    const el = document.getElementById(`any-${any}`);
    if (!el) return;
    const y =
      el.getBoundingClientRect().top + window.scrollY - offsetTop + 1;
    window.scrollTo({ top: y, behavior: "smooth" });
  }

  if (anys.length <= 1) return null;

  return (
    <div className="sticky top-16 z-20 -mx-4 md:-mx-6 px-4 md:px-6 py-2 bg-cream-50/90 backdrop-blur border-b border-cream-200">
      <div className="flex items-center gap-2">
        <span className="hand text-accent-rose text-sm hidden md:inline shrink-0">
          salta a
        </span>
        <div
          ref={ribbonRef}
          className="flex gap-1.5 overflow-x-auto no-scrollbar flex-1"
          role="tablist"
          aria-label="Navegació per anys"
        >
          {anys.map((a) => {
            const es = a === actiu;
            const n = recomptes[a];
            return (
              <button
                key={a}
                data-any={a}
                onClick={() => saltarA(a)}
                role="tab"
                aria-selected={es}
                title={n ? `${a} · ${n} ${n === 1 ? "record" : "records"}` : `${a}`}
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-serif transition ${
                  es
                    ? "bg-sepia-600 text-cream-50 shadow-soft"
                    : "bg-cream-100 text-sepia-600 hover:bg-cream-200"
                }`}
              >
                <span>{a}</span>
                {n != null && (
                  <span
                    className={`text-[10px] rounded-full px-1.5 py-0 tabular-nums ${
                      es
                        ? "bg-cream-50/25 text-cream-50"
                        : "bg-cream-50 text-sepia-500"
                    }`}
                  >
                    {n}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
