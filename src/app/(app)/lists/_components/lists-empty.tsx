import { ListPlusIcon } from "lucide-react";

import {
  Empty,
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
 * **Il ne porte pas encore le geste de création.** Le plan prévoyait de poser le bouton inerte ici
 * pour le brancher à la passe suivante ; c'est exactement ce que le dépôt vient de retirer deux
 * fois — le menu à trois points de la fiche, et « Ajouter à une liste ». Un bouton qui ne fait rien
 * apprend au membre que l'écran est cassé. Il arrive donc avec `createList`, pas avant.
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
    </Empty>
  );
}
