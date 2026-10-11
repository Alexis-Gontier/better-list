"use client";

import { ArrowDownWideNarrowIcon, ArrowUpNarrowWideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

type SortDirection = "ASC" | "DESC";

/**
 * Le sens du tri, **croissant ou décroissant**.
 *
 * Un bouton plutôt qu'un troisième sélecteur : il n'y a que deux valeurs, et une liste déroulante
 * de deux items coûte deux clics là où une bascule en demande un. L'icône dit l'état courant — la
 * flèche descendante pour « du plus grand au plus petit » —, et le nom accessible dit ce que le
 * clic fera, parce qu'une flèche seule ne distingue pas l'état de l'action.
 *
 * Promu de `/search` le 11 octobre 2026, quand `/library` a voulu renverser ses tris à son tour.
 * Il ne connaît que les deux mots du sens, que les deux contrats écrivent de la même façon.
 */
export function SortDirectionButton({
  direction,
  available = true,
  onToggle,
}: {
  direction: SortDirection;
  /**
   * Un tri sans pendant inverse (la pertinence de `/search`) laisse le bouton **affiché mais
   * éteint** plutôt que de le faire disparaître : une rangée dont un contrôle s'absente selon le
   * tri choisi se réorganise sous l'œil à chaque changement.
   */
  available?: boolean;
  onToggle: (direction: SortDirection) => void;
}) {
  const descending = direction === "DESC";
  const Icon = descending ? ArrowDownWideNarrowIcon : ArrowUpNarrowWideIcon;

  return (
    <Button
      aria-label={
        descending ? "Trier par ordre croissant" : "Trier par ordre décroissant"
      }
      disabled={!available}
      onClick={() => onToggle(descending ? "ASC" : "DESC")}
      size="icon"
      title={descending ? "Décroissant" : "Croissant"}
      type="button"
      variant="outline"
    >
      <Icon />
    </Button>
  );
}
