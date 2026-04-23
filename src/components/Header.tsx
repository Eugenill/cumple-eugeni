import Link from "next/link";
import { obtenirNomUsuari } from "@/lib/auth";
import { UserMenu } from "./UserMenu";

export function Header() {
  const nom = obtenirNomUsuari();

  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-cream-50/80 border-b border-cream-200">
      <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-3 group min-w-0">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-rose to-sepia-400 grid place-items-center text-white font-serif text-lg shadow-soft shrink-0">
            E
          </div>
          <div className="leading-tight min-w-0">
            <div className="font-serif text-xl text-sepia-700 truncate">
              30 anys d&apos;Eugeni
            </div>
            <div className="hand text-accent-rose text-sm -mt-1 truncate">
              un àlbum col·lectiu
            </div>
          </div>
        </Link>

        <nav className="flex items-center gap-2">
          <Link href="/records" className="ink-btn-outline">
            <span className="hidden sm:inline">Els meus records</span>
            <span className="sm:hidden">Records</span>
          </Link>
          <Link href="/pujar" className="ink-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span className="hidden sm:inline">Afegir record</span>
            <span className="sm:hidden">Afegir</span>
          </Link>
          {nom && <UserMenu nom={nom} />}
        </nav>
      </div>
    </header>
  );
}
