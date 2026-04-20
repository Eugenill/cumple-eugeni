"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef, useEffect, useState } from "react";
import { MomentAmbRelacions } from "@/lib/utils";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] grid place-items-center text-sepia-400 hand text-xl">
      Dibuixant les connexions…
    </div>
  ),
});

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
  const [size, setSize] = useState({ w: 600, h: 420 });

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      for (const e of entries) {
        setSize({ w: e.contentRect.width, h: Math.max(360, Math.min(520, e.contentRect.width * 0.55)) });
      }
    });
    obs.observe(containerRef.current);
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
      // Crea arestes entre cada parella de persones del mateix moment
      for (let i = 0; i < m.persones.length; i++) {
        for (let j = i + 1; j < m.persones.length; j++) {
          const a = m.persones[i].id;
          const b = m.persones[j].id;
          const key = a < b ? `${a}|${b}` : `${b}|${a}`;
          const existing = linkMap.get(key);
          if (existing) existing.value++;
          else linkMap.set(key, { source: a < b ? a : b, target: a < b ? b : a, value: 1 });
        }
      }
    }

    return {
      nodes: Array.from(nodeMap.values()),
      links: Array.from(linkMap.values()),
    };
  }, [moments]);

  if (nodes.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="hand text-accent-rose text-xl">ningú encara…</div>
        <p className="text-sepia-500 mt-1">
          Quan afegiu records amb persones, aquí apareixerà la xarxa.
        </p>
      </div>
    );
  }

  const maxCount = Math.max(...nodes.map((n) => n.count), 1);

  return (
    <div ref={containerRef} className="card overflow-hidden">
      <div className="px-5 pt-4 pb-2 flex items-end justify-between">
        <div>
          <div className="hand text-accent-rose text-lg">qui hi surt</div>
          <h3 className="font-serif text-2xl">Xarxa de persones</h3>
        </div>
        <div className="text-xs text-sepia-400">
          {nodes.length} persones · {links.length} connexions
        </div>
      </div>
      <ForceGraph2D
        width={size.w}
        height={size.h}
        graphData={{ nodes, links }}
        backgroundColor="#FBF7F0"
        linkColor={() => "rgba(184, 149, 93, 0.35)"}
        linkWidth={(l: any) => 0.6 + Math.log((l.value || 1) + 1)}
        nodeRelSize={5}
        cooldownTicks={80}
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const label = node.nom as string;
          const r = 6 + (node.count / maxCount) * 12;
          // Cercle
          ctx.beginPath();
          ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
          const grad = ctx.createRadialGradient(node.x, node.y, 1, node.x, node.y, r);
          grad.addColorStop(0, "#C97B63");
          grad.addColorStop(1, "#8F6A3A");
          ctx.fillStyle = grad;
          ctx.fill();
          ctx.strokeStyle = "#FBF7F0";
          ctx.lineWidth = 1.5;
          ctx.stroke();
          // Etiqueta
          const fontSize = Math.max(10, 12 / globalScale);
          ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
          ctx.fillStyle = "#4A321A";
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillText(label, node.x, node.y + r + 2);
        }}
      />
    </div>
  );
}
