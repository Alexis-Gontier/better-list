"use client";

import { useState } from "react";

/**
 * Un passage marqué spoiler : masqué, révélé au clic.
 *
 * La seule feuille cliente des pages Personnage et Staff. Le contenu est rendu par le serveur et
 * arrive en `children` : révéler ne demande aucune lecture, seulement de montrer ce qui est déjà là.
 */
export function BioSpoiler({ children }: { children: React.ReactNode }) {
  const [shown, setShown] = useState(false);

  if (shown) return <span>{children}</span>;

  return (
    <button
      className="rounded-sm bg-muted px-1.5 py-0.5 text-muted-foreground text-xs hover:text-foreground"
      onClick={() => setShown(true)}
      type="button"
    >
      Spoiler — afficher
    </button>
  );
}
