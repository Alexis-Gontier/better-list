"use client";

import {
  type Announcements,
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  type ScreenReaderInstructions,
  TouchSensor,
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
import { GripVerticalIcon, XIcon } from "lucide-react";
import Image from "next/image";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";

import { CatalogueGrid } from "@/components/shared/catalogue-grid";
import {
  removeFromList,
  reorderListItem,
} from "@/features/lists/server/lists.actions";
import { cn } from "@/lib/utils";

/**
 * Le mode réorganisation d'une liste — **glisser, ou déplacer au clavier**.
 *
 * C'est le seul écran du produit où l'on manipule un ordre, et il est **derrière un mode** plutôt
 * qu'actif en permanence : une grille où chaque jaquette part au moindre glissement est une grille
 * qu'on n'ose plus parcourir, surtout au doigt, où faire défiler et déplacer sont le même geste.
 * Le mode vit dans l'URL (`?mode=reorder`), comme la disposition de la bibliothèque : il se partage,
 * il survit au retour arrière, et il n'a coûté aucun état client.
 *
 * **La carte est allégée exprès.** Pas de pastille de statut, pas de bouton d'édition rapide, pas de
 * lien vers la fiche : en mode réorganisation, la seule chose qu'on puisse faire d'une jaquette est
 * la déplacer, et tout ce qui prétendrait autre chose serait un piège. C'est aussi ce qui autorise
 * une carte cliente ici alors que le mode consultation garde `MediaCard`, serveur.
 *
 * **Le clavier n'est pas une option.** `KeyboardSensor` avec `sortableKeyboardCoordinates` rend
 * chaque jaquette focalisable : Espace saisit, les flèches déplacent, Espace repose, Échap annule.
 * Sans lui, réordonner deviendrait impossible sans souris — et une liste ordonnée est précisément ce
 * qu'on relit longtemps après l'avoir faite. Les annonces ci-dessous sont en français parce que
 * celles de dnd-kit ne le sont pas.
 */

type ReorderItem = {
  mediaId: number;
  cover: string | null;
  title: string;
};

export function ListReorderGrid({
  listId,
  items: initialItems,
}: {
  listId: string;
  items: ReorderItem[];
}) {
  /*
    L'ordre affiché vit ici, et il bouge **avant** la réponse du serveur : un déplacement qui
    attendrait l'aller-retour ferait revenir la jaquette à sa place le temps de la requête, ce qui
    est exactement la sensation qu'un glisser-déposer doit éviter. On garde donc l'ordre d'avant
    pour pouvoir y revenir si l'écriture échoue.
  */
  const [items, setItems] = useState(initialItems);

  const { execute } = useAction(reorderListItem, {
    onError: ({ error, input }) => {
      toast.error(
        error.serverError ??
          "Le déplacement n'a pas été enregistré. Réessayez.",
      );
      // On ne devine pas l'ordre corrigé : on redemande au serveur celui qui fait foi.
      setItems(initialItems);
      console.error("[reorderListItem]", input);
    },
  });

  /*
    **Trois capteurs, et la souris n'est pas le doigt.**

    Un `PointerSensor` unique traitait les deux de la même façon, et il exigeait `touch-action: none`
    sur chaque jaquette pour que le navigateur ne vole pas le geste. Vu en 390, ça donnait une grille
    **impossible à faire défiler** : elle est presque entièrement faite de jaquettes, donc plus aucun
    endroit où poser le doigt pour descendre — et donc aucun moyen d'atteindre la dix-huitième œuvre
    pour la déplacer. Le remède était pire que le mal.

    - `MouseSensor`, seuil de **8 px** : à la souris on saisit tout de suite, et le seuil empêche
      seulement qu'un clic tremblé compte pour un déplacement.
    - `TouchSensor`, appui de **200 ms** : en dessous c'est un défilement, et le navigateur le garde ;
      au-delà, c'est une intention de déplacer. `tolerance: 8` laisse le doigt bouger un peu pendant
      l'appui sans annuler — un doigt posé n'est jamais parfaitement immobile.
    - `KeyboardSensor`, sans lequel réordonner demanderait une souris.
  */
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  /*
    **Retirer, sans confirmation** — la règle du dépôt pour ce geste : l'œuvre se rajoute en un
    clic, seule sa place est perdue. La jaquette part avant la réponse, et revient si l'écriture
    échoue.
  */
  const remove = useAction(removeFromList, {
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Le retrait n'a pas abouti. Réessayez.");
      setItems(initialItems);
    },
  });

  const handleRemove = (item: ReorderItem) => {
    setItems((current) => current.filter((i) => i.mediaId !== item.mediaId));
    remove.execute({ listId, mediaId: item.mediaId });
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;

    const from = items.findIndex((item) => item.mediaId === active.id);
    const to = items.findIndex((item) => item.mediaId === over.id);
    if (from === -1 || to === -1) return;

    setItems((current) => arrayMove(current, from, to));

    /*
      **On envoie une position, pas un rang.** Le serveur relit l'ordre réel et calcule la clé
      lui-même (`rankAfterMove`) : une clé fabriquée ici serait calculée à partir d'un ordre qui
      peut avoir changé depuis le rendu, et n'importe quoi pourrait être écrit dans la colonne.

      `to` est la place visée dans la liste **telle qu'elle sera après le déplacement** — la
      convention de dnd-kit, et celle que `reorderListItemSchema` attend.
    */
    execute({ listId, mediaId: Number(active.id), toIndex: to });
  };

  return (
    <DndContext
      /*
        Un `id` stable : sans lui, dnd-kit numérote ses descriptions d'accessibilité avec un compteur
        qui diffère entre le serveur et le navigateur, et l'hydratation ne correspond plus.
      */
      accessibility={{
        announcements: ANNOUNCEMENTS,
        screenReaderInstructions: INSTRUCTIONS,
      }}
      collisionDetection={closestCenter}
      id={`reorder-${listId}`}
      /* Rien ne sort de la grille : un déplacement est un échange de places, pas un déménagement. */
      modifiers={[restrictToParentElement]}
      onDragEnd={handleDragEnd}
      sensors={sensors}
    >
      <SortableContext
        items={items.map((item) => item.mediaId)}
        /* La stratégie des grilles : les voisins se décalent en deux dimensions, pas seulement en hauteur. */
        strategy={rectSortingStrategy}
      >
        <CatalogueGrid>
          {items.map((item, index) => (
            <SortableCover
              index={index}
              item={item}
              key={item.mediaId}
              onRemove={() => handleRemove(item)}
              total={items.length}
            />
          ))}
        </CatalogueGrid>
      </SortableContext>
    </DndContext>
  );
}

/**
 * Une jaquette qu'on déplace.
 *
 * **La carte entière est la poignée**, et pas une petite prise dans un coin : au doigt, viser
 * vingt-quatre pixels sur une vignette de cent quarante en demande trop, et la cible minimale d'une
 * zone tactile est bien au-dessus. Le chevron n'est donc pas un bouton — c'est le **signe** qu'on
 * peut saisir, posé là où l'œil le cherche.
 */
function SortableCover({
  item,
  index,
  total,
  onRemove,
}: {
  item: ReorderItem;
  index: number;
  total: number;
  onRemove: () => void;
}) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: item.mediaId });

  return (
    <div
      className={cn(
        /*
          `touch-manipulation` et non `touch-none` : le navigateur garde le défilement, et c'est le
          délai du `TouchSensor` qui distingue un balayage d'une saisie. `manipulation` retire quand
          même le délai de double-tap, donc rien n'est ralenti.
        */
        "flex touch-manipulation flex-col gap-2 outline-none",
        // Ce qu'on déplace passe au-dessus de ses voisins, et s'allège pour qu'on voie la place visée.
        isDragging && "z-10 opacity-70",
      )}
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
    >
      <div
        className={cn(
          "relative aspect-2/3 cursor-grab overflow-hidden rounded-md bg-muted ring-1 ring-border ring-inset",
          // L'anneau suit le focus clavier : c'est ce qui rend le déplacement au clavier visible.
          "group-focus-visible:ring-2 focus-visible:ring-2 focus-visible:ring-ring",
          isDragging && "cursor-grabbing ring-2 ring-ring",
        )}
      >
        {item.cover ? (
          <Image
            alt=""
            className="object-cover"
            fill
            sizes="(min-width: 1280px) 12vw, (min-width: 1024px) 16vw, (min-width: 640px) 25vw, 45vw"
            src={item.cover}
          />
        ) : null}

        {/*
          Le voile et le chevron disent « ça se saisit » sans ajouter de cible : `pointer-events-none`
          les laisse traverser, donc c'est toujours la carte qu'on attrape.
        */}
        <div className="pointer-events-none absolute inset-0 flex items-start justify-end bg-gradient-to-b from-background/60 to-transparent p-1.5">
          <GripVerticalIcon className="size-4 text-foreground/80" />
        </div>

        {/*
          La croix est une vraie cible, posée sur la poignée : elle arrête la propagation du
          pointeur et du clavier, sans quoi dnd-kit prendrait le clic pour le début d'un glisser.
        */}
        <button
          aria-label={`Retirer ${item.title} de la liste`}
          className="absolute top-1 left-1 flex size-8 items-center justify-center rounded-md bg-overlay text-foreground/90 transition-colors hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onRemove}
          onKeyDown={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          type="button"
        >
          <XIcon className="size-4" />
        </button>
      </div>

      {/*
        Le rang en toutes lettres à côté du titre : en mode réorganisation, la position **est**
        l'information qu'on manipule, et la lire évite de compter les cases des yeux.
      */}
      <p className="flex min-w-0 items-center gap-1.5 text-sm">
        <span className="shrink-0 text-muted-foreground tabular-nums">
          {index + 1}
        </span>
        <span className="min-w-0 truncate" title={item.title}>
          {item.title}
        </span>
        <span className="sr-only">
          , position {index + 1} sur {total}
        </span>
      </p>
    </div>
  );
}

/** Ce qu'un lecteur d'écran annonce au fil du déplacement. dnd-kit ne les fournit qu'en anglais. */
const ANNOUNCEMENTS: Announcements = {
  onDragStart: ({ active }) => `Œuvre ${active.id} saisie.`,
  onDragOver: ({ over }) =>
    over
      ? `Position visée : celle de l'œuvre ${over.id}.`
      : "Hors de la liste.",
  onDragEnd: ({ over }) =>
    over
      ? `Déposée à la place de l'œuvre ${over.id}.`
      : "Déplacement abandonné.",
  onDragCancel: () => "Déplacement annulé, l'œuvre reprend sa place.",
};

const INSTRUCTIONS: ScreenReaderInstructions = {
  draggable:
    "Appuyez sur Espace pour saisir cette œuvre. Utilisez les flèches pour la déplacer, Espace pour la déposer, Échap pour annuler.",
};
