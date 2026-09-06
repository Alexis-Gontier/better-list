import { ListPlusIcon } from "lucide-react";

import { CreateListDialog } from "@/app/(app)/lists/_components/create-list-dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

/**
 * L'écran d'un membre qui n'a encore aucune liste.
 *
 * C'est le premier des états vides que le dépôt dessine — les trois écrans livrés n'ont toujours
 * pas les leurs (docs/STATE.md), et celui-ci arrive d'abord parce qu'il n'a **qu'un** cas à dire.
 * Une bibliothèque vide et une recherche sans résultat en ont trois à distinguer, c'est ce qui les
 * a fait reporter ; « aucune liste » ne se confond avec rien.
 *
 * **Le geste de création y est, et il n'y a été posé qu'une fois qu'il marchait.** Le plan
 * prévoyait de poser le bouton inerte à la passe précédente pour le brancher à celle-ci ; c'est
 * exactement ce que le dépôt venait de retirer deux fois — le menu à trois points de la fiche, et
 * « Ajouter à une liste ». Un bouton qui ne fait rien apprend au membre que l'écran est cassé.
 *
 * Le bouton est le même qu'en tête d'écran, sans réglage : `CreateListDialog` n'en accepte plus
 * depuis qu'il est plein des deux côtés (décision d'Alexis, 6 septembre 2026).
 */
export function ListsEmpty() {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ListPlusIcon />
        </EmptyMedia>
        <EmptyTitle>Aucune liste pour l'instant</EmptyTitle>
        <EmptyDescription>
          Une liste rassemble ce qu'aucun statut ne sait dire : un classement,
          une sélection à faire découvrir, la pile de la saison prochaine.
        </EmptyDescription>
      </EmptyHeader>

      <EmptyContent>
        <CreateListDialog />
      </EmptyContent>
    </Empty>
  );
}
