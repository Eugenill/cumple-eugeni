"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import Link from "next/link";
import { MomentAmbRelacions, formatDataCatala } from "@/lib/utils";

type Props = {
  moments: MomentAmbRelacions[];
};

type Node = {
  id: string;
  nom: string;
  count: number;
};

type GraphLink = {
  source: string;
  target: string;
  value: number;
};

export function PeopleGraph({ moments }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(640);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      for (const e of entries) {
        setW(Math.max(320, e.contentRect.width));
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Tanca el dialog amb la tecla Esc
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const { nodes, links } = useMemo(() => {
    const nodeMap = new Map<string, Node>();
    const linkMap = new Map<string, GraphLink>();

    for (const m of moments) {
      for (const p of m.persones) {
        const existing = nodeMap.get(p.id);
        if (existing) existing.count++;
        else nodeMap.set(p.id, { id: p.id, nom: p.nom, count: 1 });
      }
      for (let i = 0; i < m.persones.length; i++) {
        for (let j = i + 1; j < m.persones.length; j++) {
          const a = m.persones[i].id;
          const b = m.persones[j].id;
          const key = a < b ? `${a}|${b}` : `${b}|${a}`;
          const existing = linkMap.get(key);
          if (existing) existing.value++;
          else
            linkMap.set(key, {
              source: a < b ? a : b,
              target: a < b ? b : a,
              value: 1,
            });
        }
      }
    }

    return {
      nodes: Array.from(nodeMap.values()).sort((a, b) => b.count - a.count),
      links: Array.from(linkMap.values()),
    };
  }, [moments]);

  // Ids connectats a la persona seleccionada (ella + veïns directes)
  const connectedIds = useMemo(() => {
    if (!selectedId) return new Set<string>();
    const s = new Set<string>([selectedId]);
    for (const l of links) {
      if (l.source === selectedId) s.add(l.target);
      if (l.target === selectedId) s.add(l.source);
    }
    return s;
  }, [selectedId, links]);

  const personaMoments = useMemo(() => {
    if (!selectedId) return [];
    return [...moments]
      .filter((m) => m.persones.some((p) => p.id === selectedId))
      .sort((a, b) => (a.data_moment < b.data_moment ? 1 : -1));
  }, [moments, selectedId]);

  const selected = selectedId
    ? nodes.find((n) => n.id === selectedId) || null
    : null;

  if (nodes.length === 0) {
    return (
      <div ref={containerRef} className="card p-8 text-center">
        <div className="hand text-accent-rose text-xl">ningú encara…</div>
        <p className="text-sepia-500 mt-1">
          Quan afegiu records amb persones, aquí apareixerà la xarxa.
        </p>
      </div>
    );
  }

  const h = Math.max(360, Math.min(520, Math.round(w * 0.55)));
  const cx = w / 2;
  const cy = h / 2;
  const maxCount = Math.max(...nodes.map((n) => n.count), 1);

  // Posicions: el node més connectat al centre, la resta en cercle al voltant.
  const radius = Math.min(w, h) * 0.38;
  type Pos = { x: number; y: number; r: number; nom: string; count: number };
  const positions = new Map<string, Pos>();

  const [centre, ...resta] = nodes;
  positions.set(centre.id, {
    x: cx,
    y: cy,
    r: 14 + (centre.count / maxCount) * 10,
    nom: centre.nom,
    count: centre.count,
  });

  if (resta.length === 1) {
    positions.set(resta[0].id, {
      x: cx + radius,
      y: cy,
      r: 10 + (resta[0].count / maxCount) * 10,
      nom: resta[0].nom,
      count: resta[0].count,
    });
  } else {
    resta.forEach((n, i) => {
      const angle = (i / resta.length) * Math.PI * 2 - Math.PI / 2;
      positions.set(n.id, {
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        r: 8 + (n.count / maxCount) * 10,
        nom: n.nom,
        count: n.count,
      });
    });
  }

  const hasSelection = selectedId !== null;

  return (
    <div ref={containerRef} className="card overflow-hidden relative">
      <div className="px-5 pt-4 pb-2 flex items-end justify-between gap-3">
        <div>
          <div className="hand text-accent-rose text-lg">qui hi surt</div>
          <h3 className="font-serif text-2xl">Xarxa de persones</h3>
        </div>
        <div className="text-xs text-sepia-400 text-right">
          {nodes.length} {nodes.length === 1 ? "persona" : "persones"} ·{" "}
          {links.length} {links.length === 1 ? "connexió" : "connexions"}
          <div className="hand text-accent-rose/80 mt-0.5">
            prem un nom per veure els seus records
          </div>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        width="100%"
        height={h}
        className="block"
        style={{ background: "#FBF7F0" }}
      >
        <defs>
          <radialGradient id="nodeGrad" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#D68B72" />
            <stop offset="100%" stopColor="#8F6A3A" />
          </radialGradient>
          <radialGradient id="nodeGradActive" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#E8A48C" />
            <stop offset="100%" stopColor="#B5613E" />
          </radialGradient>
        </defs>

        {/* Fons clicable per deseleccionar */}
        <rect
          x={0}
          y={0}
          width={w}
          height={h}
          fill="transparent"
          onClick={() => setSelectedId(null)}
        />

        {/* Links */}
        <g>
          {links.map((l, i) => {
            const a = positions.get(l.source as string);
            const b = positions.get(l.target as string);
            if (!a || !b) return null;
            const involvesSelected =
              hasSelection &&
              (l.source === selectedId || l.target === selectedId);
            const opacity = !hasSelection
              ? 0.45
              : involvesSelected
              ? 0.9
              : 0.08;
            const stroke = involvesSelected
              ? "rgba(214, 139, 114, 1)"
              : "rgba(184, 149, 93, 0.6)";
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={stroke}
                strokeOpacity={opacity}
                strokeWidth={
                  (0.8 + Math.min(3, Math.log(l.value + 1))) *
                  (involvesSelected ? 1.6 : 1)
                }
                strokeLinecap="round"
                style={{ transition: "all 200ms ease" }}
              />
            );
          })}
        </g>

        {/* Nodes */}
        <g>
          {Array.from(positions.entries()).map(([id, p]) => {
            const active = id === selectedId;
            const dimmed = hasSelection && !connectedIds.has(id);
            const groupOpacity = dimmed ? 0.22 : 1;
            return (
              <g
                key={id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedId((cur) => (cur === id ? null : id));
                }}
                style={{
                  cursor: "pointer",
                  opacity: groupOpacity,
                  transition: "opacity 200ms ease",
                }}
              >
                {active && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={p.r + 7}
                    fill="none"
                    stroke="#D68B72"
                    strokeOpacity={0.5}
                    strokeWidth={2}
                  />
                )}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={p.r}
                  fill={active ? "url(#nodeGradActive)" : "url(#nodeGrad)"}
                  stroke="#FBF7F0"
                  strokeWidth={1.5}
                />
                <text
                  x={p.x}
                  y={p.y + p.r + 14}
                  textAnchor="middle"
                  fontSize={active ? 13 : 12}
                  fontWeight={active ? 600 : 400}
                  fontFamily="Inter, system-ui, sans-serif"
                  fill="#4A321A"
                  style={{ userSelect: "none" }}
                >
                  {p.nom}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Dialog amb el resum de la persona seleccionada */}
      {selected && (
        <div
          className="fixed inset-0 z-40 bg-sepia-700/40 backdrop-blur-sm grid place-items-center p-4"
          onClick={() => setSelectedId(null)}
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
              onClick={() => setSelectedId(null)}
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

            <div className="hand text-accent-rose text-lg">moments amb</div>
            <h3 className="font-serif text-3xl leading-tight pr-8">
              {selected.nom}
            </h3>
            <p className="text-sepia-500 text-sm mt-1">
              {personaMoments.length}{" "}
              {personaMoments.length === 1 ? "record" : "records"}
              {connectedIds.size - 1 > 0 && (
                <>
                  {" · "}
                  {connectedIds.size - 1}{" "}
                  {connectedIds.size - 1 === 1
                    ? "persona en comú"
                    : "persones en comú"}
                </>
              )}
            </p>

            {personaMoments.length > 0 && (
              <ul className="mt-4 divide-y divide-cream-200 max-h-64 overflow-y-auto pr-1">
                {personaMoments.slice(0, 6).map((m) => (
                  <li key={m.id} className="py-2">
                    <div className="font-serif text-sepia-700 leading-snug">
                      {m.titol}
                    </div>
                    <div className="text-xs text-sepia-400 hand">
                      {formatDataCatala(m.data_moment)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {personaMoments.length > 6 && (
              <p className="text-xs text-sepia-400 mt-2">
                + {personaMoments.length - 6} més…
              </p>
            )}

            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="ink-btn-outline flex-1"
              >
                Tancar
              </button>
              <Link
                href={`/persona/${selected.id}`}
                className="ink-btn flex-1 justify-center"
              >
                Veure línia del temps →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
