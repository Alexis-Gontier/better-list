import { ListIcon } from "lucide-react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ListCard } from "@/features/lists/components/list-card";
import { getMyLists } from "@/features/lists/server/lists.queries";

/**
 * Mes listes.
 *
 * La carte vit dans `features/lists/components/` depuis que l'accueil en affiche aussi une rangée :
 * cet écran ne décide plus que du cadrage — toutes mes listes, en grille, la plus récemment
 * modifiée en tête.
 */
export async function ListsOverview() {
  const lists = await getMyLists();

  if (lists.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ListIcon />
          </EmptyMedia>
          <EmptyTitle>Aucune liste</EmptyTitle>
          <EmptyDescription>
            Une liste rassemble des œuvres pour une raison qui n'appartient qu'à
            vous : un classement, une envie de saison, ce qu'il faut faire
            découvrir à quelqu'un.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  // Un seul instant de référence pour toute la page : calculer `new Date()` par carte donnerait des
  // ancienneté mesurées à des millisecondes différentes, ce qui ne se voit pas mais ne veut rien dire.
  const now = new Date();

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {lists.map((list) => (
        <li key={list.id}>
          <ListCard list={list} now={now} />
        </li>
      ))}
    </ul>
  );
}
