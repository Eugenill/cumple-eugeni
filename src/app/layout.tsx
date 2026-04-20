import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "30 anys d'Eugeni",
  description:
    "Un àlbum col·lectiu de moments, fotos i vídeos per celebrar els 30 anys de l'Eugeni.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ca">
      <body>
        <Header />
        <main className="max-w-6xl mx-auto px-4 md:px-6 pb-24 pt-6">
          {children}
        </main>
        <footer className="text-center text-sepia-400 text-sm py-8">
          Fet amb <span className="text-accent-rose">♥</span> per celebrar 30 anys plens de moments.
        </footer>
      </body>
    </html>
  );
}
