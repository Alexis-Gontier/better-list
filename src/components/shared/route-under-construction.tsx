import { ConstructionIcon } from "lucide-react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

type RouteUnderConstructionProps = {
  /** Le nom de l'écran, tel qu'il s'affichera quand il sera reconstruit. */
  title: string;
  /** Ce que l'écran fera — au présent, parce que l'intention, elle, n'a pas été supprimée. */
  description: string;
};

/**
 * L'écran d'attente d'une route vidée par la mise à blanc du 5 septembre 2026.
 *
 * Cinq routes ont perdu toute leur présentation (`docs/STATE.md`), mais **aucune n'a perdu son
 * `page.tsx`** : `routes.home` est la cible de redirection après connexion, le repli du proxy et
 * le `callbackURL` GitHub ; `config/navigation.ts` et la palette `⌘K` pointent vers les quatre
 * autres, et les Server Actions de `lists` et `tracking` y adressent seize `revalidatePath()`.
 * Supprimer les fichiers plutôt que les vider aurait fait atterrir toute connexion sur un 404.
 *
 * Ce composant est donc un échafaudage assumé, avec une date de péremption : il disparaît quand la
 * dernière des cinq routes est reconstruite. S'il reste ici après ça, c'est un oubli.
 */
export function RouteUnderConstruction({
  title,
  description,
}: RouteUnderConstructionProps) {
  return (
    <Empty className="min-h-[60vh]">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ConstructionIcon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
        <EmptyDescription className="text-xs">
          Cet écran est en cours de refonte.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
