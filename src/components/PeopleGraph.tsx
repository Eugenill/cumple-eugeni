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

const HOVER_DELAY_MS = 1000;
const CLOSE_GRACE_MS = 180;

// --- utilitats de moviment ---
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function drift(id: string, t: number, amp = 4) {
  const h = hashStr(id);
  const phaseX = ((h % 1000) / 1000) * Math.PI * 2;
  const phaseY = (((h >> 4) % 1000) / 1000) * Math.PI * 2;
  const freqX = 0.35 + ((h % 10) / 40); // 0.35 .. 0.6
  const freqY = 0.3 + (((h >> 3) % 10) / 45);
  return {
    dx: Math.sin(t * freqX + phaseX) * amp,
    dy: Math.cos(t * freqY + phaseY) * amp * 0.85,
  };
}

export function PeopleGraph({ moments }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(640);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoverInfoId, setHoverInfoId] = useState<string | null>(null);
  const [t, setT] = useState(() =>
    typeof performance !== "undefined" ? performance.now() / 1000 : 0
  );
  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);

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

  // Loop d'animació: actualitza el temps ~60 vegades/s per fer que
  // els nodes es moguin suaument ("viu").
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      setT(performance.now() / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Tanca el dialog amb la tecla Esc
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Neteja timers en desmuntar
  useEffect(() => {
    return () => {
      if (openTimerRef.current) window.clearTimeout(openTimerRef.current);
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
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

  // activeId: qui estem destacant ara (seleccionat > passatge del cursor)
  const activeId = selectedId ?? hoveredId;
  const hasActive = activeId !== null;

  // Ids connectats a la persona activa (ella + veïns directes)
  const connectedIds = useMemo(() => {
    if (!activeId) return new Set<string>();
    const s = new Set<string>([activeId]);
    for (const l of links) {
      if (l.source === activeId) s.add(l.target);
      if (l.target === activeId) s.add(l.source);
    }
    return s;
  }, [activeId, links]);

  // Ids connectats al node del popover (pot ser diferent del node seleccionat)
  const hoverInfoConnected = useMemo(() => {
    if (!hoverInfoId) return new Set<string>();
    const s = new Set<string>([hoverInfoId]);
    for (const l of links) {
      if (l.source === hoverInfoId) s.add(l.target);
      if (l.target === hoverInfoId) s.add(l.source);
    }
    return s;
  }, [hoverInfoId, links]);

  // Records de la persona seleccionada per al dialog
  const personaMoments = useMemo(() => {
    if (!selectedId) return [];
    return [...moments]
      .filter((m) => m.persones.some((p) => p.id === selectedId))
      .sort((a, b) => (a.data_moment < b.data_moment ? 1 : -1));
  }, [moments, selectedId]);

  const selected = selectedId
    ? nodes.find((n) => n.id === selectedId) || null
    : null;

  const hoverInfoNode = hoverInfoId
    ? nodes.find((n) => n.id === hoverInfoId) || null
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

  // Sense el marc, podem ser més generosos amb l'alçada.
  const h = Math.max(420, Math.min(620, Math.round(w * 0.6)));
  const cx = w / 2;
  const cy = h / 2;
  const maxCount = Math.max(...nodes.map((n) => n.count), 1);

  const radius = Math.min(w, h) * 0.38;

  // Amplitud de moviment: una mica més gran pel centre (és més gran),
  // i una mica menor per l'activa (per llegibilitat sobre el text).
  type Pos = {
    x: number;
    y: number;
    r: number;
    nom: string;
    count: number;
  };
  const positions = new Map<string, Pos>();

  const [centre, ...resta] = nodes;

  // Node central: drift lleuger
  {
    const d = drift(centre.id, t, 3);
    positions.set(centre.id, {
      x: cx + d.dx,
      y: cy + d.dy,
      r: 14 + (centre.count / maxCount) * 10,
      nom: centre.nom,
      count: centre.count,
    });
  }

  if (resta.length === 1) {
    const d = drift(resta[0].id, t, 5);
    positions.set(resta[0].id, {
      x: cx + radius + d.dx,
      y: cy + d.dy,
      r: 10 + (resta[0].count / maxCount) * 10,
      nom: resta[0].nom,
      count: resta[0].count,
    });
  } else {
    resta.forEach((n, i) => {
      const angle = (i / resta.length) * Math.PI * 2 - Math.PI / 2;
      const d = drift(n.id, t, 5);
      positions.set(n.id, {
        x: cx + Math.cos(angle) * radius + d.dx,
        y: cy + Math.sin(angle) * radius + d.dy,
        r: 8 + (n.count / maxCount) * 10,
        nom: n.nom,
        count: n.count,
      });
    });
  }

  // ---- hover timers ----
  function cancelOpen() {
    if (openTimerRef.current) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  }
  function cancelClose() {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }
  function scheduleClose() {
    cancelClose();
    closeTimerRef.current = window.setTimeout(() => {
      setHoverInfoId(null);
    }, CLOSE_GRACE_MS);
  }

  function onNodeEnter(id: string) {
    cancelClose();
    setHoveredId(id);
    cancelOpen();
    if (hoverInfoId && hoverInfoId !== id) {
      setHoverInfoId(null);
    }
    openTimerRef.current = window.setTimeout(() => {
      setHoverInfoId(id);
    }, HOVER_DELAY_MS);
  }

  function onNodeLeave() {
    cancelOpen();
    setHoveredId(null);
    scheduleClose();
  }

  function onPopoverEnter() {
    cancelClose();
  }

  function onPopoverLeave() {
    scheduleClose();
  }

  // Posició del popover (dins del SVG, en coordenades de viewBox)
  const popoverPos = hoverInfoNode ? positions.get(hoverInfoNode.id) : null;
  const popoverWidth = 220;
  const popoverLeft = popoverPos
    ? Math.max(8, Math.min(w - popoverWidth - 8, popoverPos.x - popoverWidth / 2))
    : 0;
  // Si el node és a la meitat de baix, posa el popover a sobre; si no, a sota
  const popoverBelow = popoverPos ? popoverPos.y < h / 2 : true;
  const popoverTop = popoverPos
    ? popoverBelow
      ? popoverPos.y + popoverPos.r + 12
      : popoverPos.y - popoverPos.r - 12
    : 0;

  return (
    <div ref={containerRef} className="relative">
      {/* Encapçalament centrat — sense marc al voltant del graf */}
      <div className="text-center mb-6">
        <div className="hand text-accent-rose text-xl">qui hi surt</div>
        <h2 className="font-serif text-4xl">Xarxa de persones</h2>
        <p className="text-sepia-500 text-sm mt-2">
          {nodes.length} {nodes.length === 1 ? "persona" : "persones"} ·{" "}
          {links.length} {links.length === 1 ? "connexió" : "connexions"}
        </p>
        <p className="hand text-accent-rose/80 text-sm mt-1">
          passa el cursor o prem un nom
        </p>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          width="100%"
          height={h}
          className="block"
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
              const involvesActive =
                hasActive &&
                (l.source === activeId || l.target === activeId);
              const opacity = !hasActive
                ? 0.45
                : involvesActive
                ? 0.9
                : 0.1;
              const stroke = involvesActive
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
                    (involvesActive ? 1.6 : 1)
                  }
                  strokeLinecap="round"
                />
              );
            })}
          </g>

          {/* Nodes */}
          <g>
            {Array.from(positions.entries()).map(([id, p]) => {
              const isSelected = id === selectedId;
              const isHovered = id === hoveredId;
              const isActive = isSelected || isHovered;
              const dimmed = hasActive && !connectedIds.has(id);
              const groupOpacity = dimmed ? 0.22 : 1;
              const extraR = isHovered && !isSelected ? 3 : 0;
              return (
                <g
                  key={id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId((cur) => (cur === id ? null : id));
                  }}
                  onMouseEnter={() => onNodeEnter(id)}
                  onMouseLeave={onNodeLeave}
                  style={{
                    cursor: "pointer",
                    opacity: groupOpacity,
                    transition: "opacity 180ms ease",
                  }}
                >
                  {isActive && (
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={p.r + 7 + extraR}
                      fill="none"
                      stroke="#D68B72"
                      strokeOpacity={isSelected ? 0.5 : 0.35}
                      strokeWidth={2}
                    />
                  )}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={p.r + extraR}
                    fill={isActive ? "url(#nodeGradActive)" : "url(#nodeGrad)"}
                    stroke="#FBF7F0"
                    strokeWidth={1.5}
                  />
                  <text
                    x={p.x}
                    y={p.y + p.r + 14 + extraR}
                    textAnchor="middle"
                    fontSize={isActive ? 13 : 12}
                    fontWeight={isActive ? 600 : 400}
                    fontFamily="Inter, system-ui, sans-serif"
                    fill="#4A321A"
                    style={{
                      userSelect: "none",
                    }}
                  >
                    {p.nom}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Popover al passar el cursor (3s) */}
        {hoverInfoNode && popoverPos && (
          <div
            className="absolute z-10 card px-4 py-3 shadow-soft"
            style={{
              width: popoverWidth,
              left: popoverLeft,
              top: popoverTop,
              transform: popoverBelow ? "none" : "translateY(-100%)",
              pointerEvents: "auto",
            }}
            onMouseEnter={onPopoverEnter}
            onMouseLeave={onPopoverLeave}
          >
            <div className="hand text-accent-rose text-xs">persona</div>
            <div className="font-serif text-lg text-sepia-700 leading-tight truncate">
              {hoverInfoNode.nom}
            </div>
            <div className="text-xs text-sepia-500 mt-0.5">
              {hoverInfoNode.count}{" "}
              {hoverInfoNode.count === 1 ? "record" : "records"}
              {hoverInfoConnected.size > 1 && (
                <>
                  {" · "}
                  {hoverInfoConnected.size - 1}{" "}
                  {hoverInfoConnected.size - 1 === 1 ? "persona" : "persones"}
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedId(hoverInfoNode.id);
                setHoverInfoId(null);
                setHoveredId(null);
              }}
              className="ink-btn w-full mt-3 justify-center text-sm"
            >
              Veure records →
            </button>
          </div>
        )}
      </div>

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
