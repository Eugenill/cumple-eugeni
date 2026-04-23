import { cookies } from "next/headers";

/**
 * Retorna el nom de la persona que hi ha sessió, o `null` si encara no ha
 * entrat. Llegeix la cookie `eugeni_nom` (URL-encoded).
 */
export function obtenirNomUsuari(): string | null {
  const raw = cookies().get("eugeni_nom")?.value;
  if (!raw) return null;
  try {
    const dec = decodeURIComponent(raw).trim();
    return dec || null;
  } catch {
    return null;
  }
}

/** True si hi ha nom i auth vàlids. */
export function haySessio(): boolean {
  return (
    cookies().get("eugeni_auth")?.value === "ok" &&
    !!obtenirNomUsuari()
  );
}
