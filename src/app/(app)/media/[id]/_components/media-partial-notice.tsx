"use client";

import { CloudOffIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { NOTICE_SLOT_ID } from "@/components/layout/notice-slot";

/**
 * L'avis de coupure : cette fiche vient du miroir local, pas d'AniList.
 *
 * **C'est un état réel du produit, pas une exception** (spec du 2 septembre). AniList a coupé son
 * API en pleine journée le 15 août 2026, et de nouveau le 5 septembre : sans cet écran, la fiche
 * serait une page d'erreur, et le suivi — qui n'a besoin de rien d'AniList — deviendrait
 * inatteignable pour la durée de la panne.
 *
 * Le bandeau se pose **au-dessus de l'en-tête**, dans la fente ouverte par le layout : l'incident
 * ne concerne pas cette page mais l'application entière, et le dire dans la colonne de contenu le
 * ferait passer pour un défaut de l'œuvre affichée. Le pourquoi du portail est dans
 * `components/layout/notice-slot.tsx`.
 *
 * Le ton est factuel et non alarmiste : rien n'est cassé chez nous, il manque seulement le
 * synopsis et les sections lourdes. Aucune couleur non plus — un bandeau d'accent pour une panne
 * d'API tierce donnerait à l'incident la place que prend l'action en cours.
 */
export function MediaPartialNotice() {
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  // Le portail a besoin du DOM : la cible n'existe qu'après le montage, jamais au rendu serveur.
  useEffect(() => setSlot(document.getElementById(NOTICE_SLOT_ID)), []);

  if (!slot) return null;

  return createPortal(
    /*
      `aria-live` parce que le bandeau **arrive après l'hydratation** : pour un lecteur d'écran,
      c'est une nouveauté apparue en cours de route et non un élément présent au chargement, donc
      rien ne l'annoncerait. `polite` et pas `assertive` : la panne mérite d'être dite, pas de
      couper la parole à ce qui est en train d'être lu.

      L'attribut plutôt que `role="status"`, qui dit la même chose : Biome demande alors l'élément
      `<output>`, dont le sens — le résultat d'un calcul — ne décrit pas un avis d'incident.
    */
    <p
      aria-live="polite"
      className="flex items-center justify-center gap-2.5 border-b border-border bg-surface-raised px-4 py-2.5 text-center text-sm text-muted-foreground"
    >
      <CloudOffIcon aria-hidden className="size-4 shrink-0" />
      {/* Espace fine insécable avant le deux-points : c'est la règle typographique française. */}
      <span>
        AniList ne répond pas. Les fiches sont servies depuis la copie
        locale&#8239;: le suivi reste utilisable, mais les synopsis et les
        sections détaillées manquent jusqu'au retour du service.
      </span>
    </p>,
    slot,
  );
}
