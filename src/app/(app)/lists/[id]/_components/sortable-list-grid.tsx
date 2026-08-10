"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVerticalIcon } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";

import { MediaGrid } from "@/components/shared/media-grid";
import { reorderListItem } from "@/features/lists/server/lists.actions";
import { cn } from "@/lib/utils";

/**
 * La grille d'une liste, réordonnable (docs/PRODUCT.md §6, V1.5).
 *
 * **Les vignettes sont rendues par le serveur et passées en `children`.** `MediaCard` est un Server
 * Component asynchrone — il lit lui-même la préférence de langue des titres — donc il ne peut pas être
 * appelé d'ici. Le composant ne reçoit que des nœuds déjà rendus, qu'il se contente de réordonner :
 * c'est le motif « passer les Server Components en `children` » d'ARCHITECTURE.md, et c'est ce qui
 * permet de rendre une grille interactive sans faire basculer tout son contenu côté client.
 *
 * `MediaGrid` est réutilisé tel quel plutôt que ses classes recopiées : deux grilles qui divergent
 * d'une colonne, c'est exactement ce que ce fichier partagé existe pour empêcher.
 */

type SortableCard = {
  /** L'id AniList en chaîne — dnd-kit veut des identifiants, l'action veut un nombre. */
  id: string;
  card: ReactNode;
};

export function SortableListGrid({
  listId,
  items,
}: {
  listId: string;
  items: SortableCard[];
}) {
  const serverOrder = items.map((item) => item.id);
  const serverKey = serverOrder.join("|");

  const [order, setOrder] = useState(serverOrder);
  const [syncedKey, setSyncedKey] = useState(serverKey);

  /**
   * L'ordre affiché est optimiste, puis le serveur reprend la main.
   *
   * Sans cet ajustement, une vignette relâchée reviendrait à sa place le temps de l'aller-retour, puis
   * sauterait à la bonne — le geste paraîtrait avoir échoué. Et sans la resynchronisation, un retrait
   * ou un ajout venu d'ailleurs ne serait jamais pris en compte. C'est le motif React d'ajustement
   * d'état pendant le rendu, préférable à un `useEffect` qui rendrait une frame de trop.
   */
  if (syncedKey !== serverKey) {
    setSyncedKey(serverKey);
    setOrder(serverOrder);
  }

  const { execute } = useAction(reorderListItem, {
    onError: () => {
      // Le serveur n'a pas bougé : y revenir suffit à défaire l'optimisme.
      setOrder(serverOrder);
      toast.error("L'ordre n'a pas pu être enregistré.");
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      /**
       * Huit pixels avant qu'un appui devienne un glissement. La poignée est posée **sur** la
       * jaquette, qui est un lien : sans ce seuil, tout clic un peu tremblé ouvrirait une fiche au
       * lieu de déplacer, ou l'inverse.
       */
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;

    const fromIndex = order.indexOf(String(active.id));
    const toIndex = order.indexOf(String(over.id));
    if (fromIndex === -1 || toIndex === -1) return;

    setOrder(arrayMove(order, fromIndex, toIndex));

    // On envoie **la position, pas le rang** : le serveur relit l'ordre réel et calcule la clé
    // lui-même (voir `lists.actions.ts`). `toIndex` est déjà la place visée après déplacement, la
    // convention que `rankAfterMove` attend.
    execute({ listId, mediaId: Number(active.id), toIndex });
  }

  const cards = new Map(items.map((item) => [item.id, item.card]));

  return (
    <DndContext
      /**
       * Les annonces par défaut de dnd-kit sont en anglais, et ce sont les seules informations qu'un
       * lecteur d'écran reçoit d'un geste par définition visuel.
       */
      accessibility={{
        announcements: {
          onDragStart: ({ active }) =>
            `Déplacement commencé, position ${order.indexOf(String(active.id)) + 1} sur ${order.length}.`,
          onDragOver: ({ over }) =>
            over
              ? `Position ${order.indexOf(String(over.id)) + 1} sur ${order.length}.`
              : undefined,
          onDragEnd: ({ over }) =>
            over
              ? `Déposé en position ${order.indexOf(String(over.id)) + 1} sur ${order.length}.`
              : "Déplacement annulé.",
          onDragCancel: () => "Déplacement annulé, l'ordre est inchangé.",
        },
      }}
      collisionDetection={closestCenter}
      // La vignette ne sort pas de la grille : rien n'est déposable ailleurs, donc l'y emmener
      // ne ferait que suggérer une cible qui n'existe pas.
      modifiers={[restrictToParentElement]}
      onDragEnd={handleDragEnd}
      sensors={sensors}
    >
      <SortableContext items={order} strategy={rectSortingStrategy}>
        <MediaGrid>
          {order.map((id) => (
            <SortableItem key={id} id={id}>
              {cards.get(id)}
            </SortableItem>
          ))}
        </MediaGrid>
      </SortableContext>
    </DndContext>
  );
}

/**
 * Une vignette déplaçable.
 *
 * **La poignée est un bouton dédié, pas la carte entière.** La jaquette est déjà un lien et porte un
 * bouton « retirer » ; y ajouter un troisième comportement au même endroit rendrait les trois
 * ambigus. Un bouton distinct donne aussi une cible au clavier — dnd-kit fournit alors espace pour
 * saisir, les flèches pour déplacer, espace pour déposer.
 */
function SortableItem({ id, children }: { id: string; children: ReactNode }) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  return (
    <li
      // Groupe **nommé** : `MediaCard` pose déjà un `group` sur son conteneur, et un survol de la
      // jaquette ne doit pas révéler la poignée d'une autre vignette.
      className={cn(
        "group/sort relative touch-none",
        isDragging && "z-10 opacity-70",
      )}
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      {children}

      {/*
        Coin haut-gauche : le bouton « retirer » occupe déjà le coin droit, et la position ne dépend
        pas de la hauteur du titre, qui fait une ou deux lignes selon l'œuvre.
      */}
      <button
        aria-label="Déplacer dans la liste"
        className="absolute top-1.5 left-1.5 flex size-7 cursor-grab items-center justify-center rounded-full bg-background/90 text-muted-foreground opacity-0 shadow-sm transition-opacity focus-visible:opacity-100 group-hover/sort:opacity-100 active:cursor-grabbing max-sm:opacity-100"
        type="button"
        {...attributes}
        {...listeners}
      >
        <GripVerticalIcon className="size-4" />
      </button>
    </li>
  );
}
