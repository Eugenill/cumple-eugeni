"use client";

import { MomentAmbRelacions } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

type Props = {
  moment: MomentAmbRelacions;
  bucketPublicUrl: string;
};

export function MomentCard({ moment, bucketPublicUrl }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [actiu, setActiu] = useState(0);
  const mitjans = moment.mitjans;

  // Mantenim l'índex actiu sincronitzat amb el scroll (quan l'usuari llisca).
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || mitjans.length <= 1) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const idx = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
        setActiu((prev) => (prev === idx ? prev : idx));
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [mitjans.length]);

  function anarA(i: number) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }

  if (mitjans.length === 0) {
    return (
      <div className="polaroid">
        <div className="aspect-[4/3] rounded bg-cream-100 grid place-items-center text-sepia-400">
          <span className="hand text-2xl">sense imatge</span>
        </div>
        <div className="text-center mt-3 hand text-lg">{moment.titol}</div>
      </div>
    );
  }

  return (
    <div className="polaroid rotate-[-0.4deg]">
      <div className="relative rounded overflow-hidden bg-sepia-100">
        <div
          ref={scrollerRef}
          className="flex overflow-x-auto no-scrollbar"
          style={{
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
            touchAction: "pan-y",
          }}
        >
          {mitjans.map((m, i) => {
            const src = `${bucketPublicUrl}/${m.path}`;
            return (
              <div
                key={m.id}
                className="shrink-0 w-full aspect-[4/3]"
                style={{ scrollSnapAlign: "start", scrollSnapStop: "always" }}
                aria-hidden={i !== actiu}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={moment.titol}
                  loading="lazy"
                  draggable={false}
                  className="w-full h-full object-cover select-none"
                />
              </div>
            );
          })}
        </div>

        {mitjans.length > 1 && (
          <>
            {actiu > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  anarA(actiu - 1);
                }}
                aria-label="Anterior"
                className="hidden md:grid absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-cream-50/90 shadow-soft place-items-center text-sepia-700 hover:bg-cream-50"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            )}
            {actiu < mitjans.length - 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  anarA(actiu + 1);
                }}
                aria-label="Següent"
                className="hidden md:grid absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-cream-50/90 shadow-soft place-items-center text-sepia-700 hover:bg-cream-50"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}

            {/* Comptador (pantalles mòbils, molt subtil) */}
            <div className="md:hidden absolute right-2 top-2 text-[11px] px-2 py-0.5 rounded-full bg-sepia-700/60 text-cream-50">
              {actiu + 1} / {mitjans.length}
            </div>
          </>
        )}
      </div>

      {mitjans.length > 1 && (
        <div className="flex flex-wrap justify-center gap-1.5 mt-3 px-1">
          {mitjans.map((x, i) => (
            <button
              key={x.id}
              onClick={() => anarA(i)}
              aria-label={`Veure mitjà ${i + 1}`}
              className={`w-2.5 h-2.5 rounded-full transition ${
                i === actiu ? "bg-accent-rose" : "bg-cream-200 hover:bg-cream-300"
              }`}
            />
          ))}
        </div>
      )}

      <div className="text-center mt-2 hand text-lg text-sepia-600">
        {moment.titol}
      </div>
    </div>
  );
}
