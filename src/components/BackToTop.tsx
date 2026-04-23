"use client";

import { useEffect, useState } from "react";

/**
 * Botó flotant que apareix quan l'usuari ha baixat prou. Fa scroll suau
 * fins a dalt de tot.
 */
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 600);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Tornar amunt"
      className={`fixed bottom-5 right-5 md:bottom-6 md:right-6 z-30 w-11 h-11 rounded-full bg-sepia-700 text-cream-50 shadow-polaroid grid place-items-center transition-all hover:bg-sepia-800 ${
        visible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-3 pointer-events-none"
      }`}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="18 15 12 9 6 15" />
      </svg>
    </button>
  );
}
