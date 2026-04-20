"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { MomentAmbRelacions } from "@/lib/utils";

type Props = {
  moments: MomentAmbRelacions[];
};

type Node = {
  id: string;
  nom: string;
  count: number;
};

type Link = {
  source: string;
  target: string;
  value: number;
};

export function PeopleGraph({ moments }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(640);

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

  const { nodes, links } = useMemo(() => {
    const nodeMap = new Map<string, Node>();
    const linkMap = new Map<string, Link>();

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

  return (
    <div ref={containerRef} className="card overflow-hidden">
      <div className="px-5 pt-4 pb-2 flex items-end justify-between">
        <div>
          <div className="hand text-accent-rose text-lg">qui hi surt</div>
          <h3 className="font-serif text-2xl">Xarxa de persones</h3>
        </div>
        <div className="text-xs text-sepia-400">
          {nodes.length} {nodes.length === 1 ? "persona" : "persones"} ·{" "}
          {links.length} {links.length === 1 ? "connexió" : "connexions"}
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
        </defs>

        {/* Links */}
        <g>
          {links.map((l, i) => {
            const a = positions.get(l.source as string);
            const b = positions.get(l.target as string);
            if (!a || !b) return null;
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="rgba(184, 149, 93, 0.45)"
                strokeWidth={0.8 + Math.min(3, Math.log(l.value + 1))}
                strokeLinecap="round"
              />
            );
          })}
        </g>

        {/* Nodes */}
        <g>
          {Array.from(positions.entries()).map(([id, p]) => (
            <g key={id}>
              <circle
                cx={p.x}
                cy={p.y}
                r={p.r}
                fill="url(#nodeGrad)"
                stroke="#FBF7F0"
                strokeWidth={1.5}
              />
              <text
                x={p.x}
                y={p.y + p.r + 14}
                textAnchor="middle"
                fontSize={12}
                fontFamily="Inter, system-ui, sans-serif"
                fill="#4A321A"
              >
                {p.nom}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
