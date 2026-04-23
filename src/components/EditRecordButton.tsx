"use client";

import Link from "next/link";

type Props = {
  momentId: string;
  /** Text visible a l'enllaç. */
  label?: string;
  /** Classes de l'enllaç. Per defecte, enllaç subtil. */
  className?: string;
  /** Acceptat per compatibilitat (ja no s'utilitza). */
  personesSuggerides?: { id: string; nom: string }[];
};

/**
 * Enllaç directe a la pàgina d'edició d'un record. Ja no hi ha diàleg de
 * comprovació: qualsevol persona autenticada a la web pot editar qualsevol
 * record.
 */
export function EditRecordButton({ momentId, label = "Editar", className }: Props) {
  return (
    <Link
      href={`/record/${momentId}/editar`}
      onClick={(e) => e.stopPropagation()}
      className={
        className ??
        "text-xs text-sepia-500 hover:text-accent-rose underline underline-offset-2 decoration-dotted"
      }
    >
      {label}
    </Link>
  );
}
