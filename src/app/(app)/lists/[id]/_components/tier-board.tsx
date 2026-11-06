"use client";

import {
  type Announcements,
  type CollisionDetection,
  closestCorners,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  KeyboardSensor,
  MouseSensor,
  pointerWithin,
  type ScreenReaderInstructions,
  TouchSensor,
  type UniqueIdentifier,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAction } from "next-safe-action/hooks";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { TierMenu } from "@/app/(app)/lists/[id]/_components/tier-menu";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import {
  CoverImage,
  TIER_COVER_CLASS,
  TIER_COVERS_CLASS,
  type TierCover,
  TierLabel,
} from "@/features/lists/components/tier-rows";
import { groupByTier, type Tier } from "@/features/lists/lib/tier-list";
import { moveTierItem } from "@/features/lists/server/lists.actions";
import { cn } from "@/lib/utils";

const RESERVE = "reserve";
type Columns = Record<string, TierCover[]>;

/**
 * **Le pointeur d'abord, les coins ensuite.** `closestCorners` seul fait gagner les jaquettes du
 * palier voisin sur un palier vide qu'on survole pourtant : ses coins sont loin du pointeur. Au
 * clavier il n'y a pas de pointeur, et `closestCorners` reprend la main.
 */
const collision: CollisionDetection = (args) => {
  const within = pointerWithin(args);
  return within.length > 0 ? within : closestCorners(args);
};

const tierKey = (index: number) => `tier-${index}`;
const tierIndexOf = (key: string) =>
  key === RESERVE ? null : Number(key.slice("tier-".length));

function columnsFrom(tiers: Tier[], items: TierCover[]): Columns {
  const { rows, reserve } = groupByTier(tiers, items);
  return {
    ...Object.fromEntries(rows.map((row, i) => [tierKey(i), row.items])),
    [RESERVE]: reserve,
  };
}

/**
 * L'éditeur d'une tier list (lot 5, maquette A) : une rangée par palier, la réserve dessous.
 *
 * **L'état vit ici et bouge avant la réponse**, comme dans `ListReorderGrid` ; la page remonte le
 * composant (`key`) quand le serveur renvoie autre chose, ce qui le resynchronise sans effet.
 *
 * Deux gestes pour ranger : glisser (souris, appui long, ou Espace puis flèches au clavier), ou
 * cliquer une jaquette — Entrée au clavier — pour le menu « Ranger dans… ». Espace est réservé au
 * glisser, Entrée au menu : sur une même cible, les deux ne se marchent pas dessus.
 */
export function TierBoard({
  listId,
  tiers,
  items,
}: {
  listId: string;
  tiers: Tier[];
  items: TierCover[];
}) {
  const initial = columnsFrom(tiers, items);
  const [columns, setColumns] = useState(initial);
  const snapshot = useRef(initial);
  const origin = useRef<{ key: string; index: number } | null>(null);
  // Un clic qui termine un glisser n'est pas une demande de menu.
  const justDragged = useRef(false);
  const [menuFor, setMenuFor] = useState<number | null>(null);

  const { execute } = useAction(moveTierItem, {
    onError: ({ error }) => {
      toast.error(
        error.serverError ?? "Le rangement n'a pas été enregistré. Réessayez.",
      );
      setColumns(snapshot.current);
    },
  });

  // Les capteurs de `ListReorderGrid`, et leurs raisons : seuil à la souris, appui long au doigt.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: {
        start: ["Space"],
        cancel: ["Escape"],
        end: ["Space", "Enter"],
      },
    }),
  );

  const find = (id: UniqueIdentifier, from: Columns = columns) =>
    typeof id === "string" && id in from
      ? id
      : Object.keys(from).find((key) =>
          from[key]?.some((item) => item.mediaId === id),
        );

  const place = (mediaId: number, key: string, toIndex: number) => {
    execute({ listId, mediaId, tierIndex: tierIndexOf(key), toIndex });
  };

  /** Le geste rapide : en fin de palier, comme un glisser lâché sur la rangée. */
  const moveTo = (item: TierCover, key: string) => {
    const from = find(item.mediaId);
    setMenuFor(null);
    if (!from || from === key) return;
    snapshot.current = columns;
    const target = columns[key] ?? [];
    setColumns({
      ...columns,
      [from]: (columns[from] ?? []).filter((i) => i.mediaId !== item.mediaId),
      [key]: [...target, item],
    });
    place(item.mediaId, key, target.length);
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    const from = find(active.id);
    const to = find(over.id);
    if (!from || !to || from === to) return;

    setColumns((current) => {
      const moved = current[from]?.find((i) => i.mediaId === active.id);
      if (!moved) return current;
      const target = current[to] ?? [];
      const overIndex = target.findIndex((i) => i.mediaId === over.id);
      const at = overIndex === -1 ? target.length : overIndex;
      return {
        ...current,
        [from]: (current[from] ?? []).filter((i) => i.mediaId !== active.id),
        [to]: [...target.slice(0, at), moved, ...target.slice(at)],
      };
    });
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    const start = origin.current;
    origin.current = null;
    setTimeout(() => {
      justDragged.current = false;
    });
    const key = find(active.id);
    if (!start || !key) return;

    let next = columns;
    const column = columns[key] ?? [];
    const from = column.findIndex((i) => i.mediaId === active.id);
    const overIndex = over
      ? column.findIndex((i) => i.mediaId === over.id)
      : -1;
    if (overIndex !== -1 && overIndex !== from) {
      next = { ...columns, [key]: arrayMove(column, from, overIndex) };
      setColumns(next);
    }

    const index = (next[key] ?? []).findIndex((i) => i.mediaId === active.id);
    if (key === start.key && index === start.index) return;
    place(Number(active.id), key, index);
  };

  const tierRows = tiers.map((tier, index) => ({
    tier,
    index,
    key: tierKey(index),
  }));
  const reserve = columns[RESERVE] ?? [];

  const cover = (item: TierCover) => (
    <SortableTierCover
      item={item}
      key={item.mediaId}
      menu={
        <CoverMenu
          item={item}
          onMove={(key) => moveTo(item, key)}
          tiers={tierRows}
        />
      }
      menuOpen={menuFor === item.mediaId}
      onMenuOpenChange={(open) => {
        if (open && justDragged.current) return;
        setMenuFor(open ? item.mediaId : null);
      }}
    />
  );

  return (
    <DndContext
      accessibility={{
        announcements: announcementsFor(columns, tiers),
        screenReaderInstructions: INSTRUCTIONS,
      }}
      collisionDetection={collision}
      // Un `id` stable : sans lui, l'hydratation ne correspond plus (voir `ListReorderGrid`).
      id={`tiers-${listId}`}
      onDragCancel={() => setColumns(snapshot.current)}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragStart={({ active }) => {
        snapshot.current = columns;
        justDragged.current = true;
        const key = find(active.id);
        origin.current = key
          ? {
              key,
              index: (columns[key] ?? []).findIndex(
                (i) => i.mediaId === active.id,
              ),
            }
          : null;
      }}
      sensors={sensors}
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-0.5 overflow-hidden rounded-lg">
          {tierRows.map(({ tier, index, key }) => (
            <section
              aria-label={`Palier ${tier.label}`}
              className="flex bg-card"
              key={key}
            >
              <TierLabel tier={tier} />
              <DropZone id={key} items={columns[key] ?? []}>
                {(columns[key] ?? []).map(cover)}
              </DropZone>
              <TierMenu
                index={index}
                listId={listId}
                tier={tier}
                tierCount={tiers.length}
              />
            </section>
          ))}
        </div>

        <section
          aria-labelledby="reserve-title"
          className="flex flex-col gap-3 rounded-lg bg-card p-3"
        >
          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between">
            <h2 className="font-medium text-sm" id="reserve-title">
              Pas encore classées{" "}
              <span className="text-muted-foreground tabular-nums">
                {reserve.length}
              </span>
            </h2>
            <p className="text-muted-foreground text-xs">
              <span className="pointer-coarse:hidden">
                Glissez une jaquette sur un palier, ou cliquez-la
              </span>
              <span className="hidden pointer-coarse:inline">
                Touchez une jaquette pour la ranger
              </span>
            </p>
          </div>
          <DropZone className="p-0" id={RESERVE} items={reserve}>
            {reserve.map(cover)}
          </DropZone>
        </section>
      </div>
    </DndContext>
  );
}

/** Une rangée qui reçoit des jaquettes, **même vide** : sans `useDroppable`, un palier vide refuserait tout. */
function DropZone({
  id,
  items,
  className,
  children,
}: {
  id: string;
  items: TierCover[];
  className?: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <SortableContext
      id={id}
      items={items.map((item) => item.mediaId)}
      strategy={rectSortingStrategy}
    >
      <ul
        className={cn(
          TIER_COVERS_CLASS,
          "transition-colors",
          isOver && "bg-muted/40",
          className,
        )}
        ref={setNodeRef}
      >
        {children}
      </ul>
    </SortableContext>
  );
}

function SortableTierCover({
  item,
  menu,
  menuOpen,
  onMenuOpenChange,
}: {
  item: TierCover;
  menu: React.ReactNode;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
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
    <Popover onOpenChange={onMenuOpenChange} open={menuOpen}>
      <PopoverAnchor asChild>
        <li
          className={cn(
            TIER_COVER_CLASS,
            // `manipulation` et non `none` : le doigt garde le défilement (voir `ListReorderGrid`).
            "cursor-grab touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isDragging && "z-10 cursor-grabbing opacity-70 ring-2 ring-ring",
          )}
          ref={setNodeRef}
          style={{ transform: CSS.Transform.toString(transform), transition }}
          title={item.title}
          {...attributes}
          {...listeners}
          aria-haspopup="dialog"
          aria-label={item.title}
          onClick={() => onMenuOpenChange(true)}
          onKeyDown={(event) => {
            listeners?.onKeyDown?.(event);
            if (event.key === "Enter" && !isDragging) onMenuOpenChange(true);
          }}
        >
          <CoverImage item={item} />
        </li>
      </PopoverAnchor>
      <PopoverContent align="start" className="w-auto p-2">
        {menu}
      </PopoverContent>
    </Popover>
  );
}

/** « Ranger dans… » (maquette B) : une pastille par palier, puis « Retirer du classement ». */
function CoverMenu({
  item,
  tiers,
  onMove,
}: {
  item: TierCover;
  tiers: { tier: Tier; index: number; key: string }[];
  onMove: (key: string) => void;
}) {
  return (
    <div className="flex w-52 flex-col gap-2">
      <div className="flex items-center gap-2 px-1 pt-1">
        <div className="relative aspect-2/3 w-6 shrink-0 overflow-hidden rounded-xs bg-muted">
          <CoverImage item={item} />
        </div>
        <p className="min-w-0 truncate font-medium text-sm">Ranger dans…</p>
      </div>
      <div className="flex flex-wrap gap-1 px-1">
        {tiers.map(({ tier, index, key }) => (
          <button
            aria-label={`Ranger en ${tier.label}`}
            aria-pressed={item.tierIndex === index}
            className="flex h-8 min-w-8 items-center justify-center rounded-sm px-1.5 font-semibold text-black text-sm ring-offset-2 ring-offset-popover focus-visible:ring-2 focus-visible:ring-ring aria-pressed:ring-2 aria-pressed:ring-foreground"
            key={key}
            onClick={() => onMove(key)}
            style={{ backgroundColor: tier.color }}
            type="button"
          >
            {tier.label}
          </button>
        ))}
      </div>
      <button
        className="rounded-sm px-2 py-1.5 text-left text-muted-foreground text-sm hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        disabled={item.tierIndex === null}
        onClick={() => onMove(RESERVE)}
        type="button"
      >
        Retirer du classement
      </button>
    </div>
  );
}

/** Ce qu'un lecteur d'écran annonce : le palier et la place, pas un identifiant. */
function announcementsFor(columns: Columns, tiers: Tier[]): Announcements {
  const where = (id: UniqueIdentifier) => {
    for (const [key, items] of Object.entries(columns)) {
      const index = items.findIndex((i) => i.mediaId === id);
      if (index !== -1) {
        const tierIndex = tierIndexOf(key);
        const name =
          tierIndex === null
            ? "la réserve"
            : `le palier ${tiers[tierIndex]?.label ?? ""}`;
        return `${name}, position ${index + 1}`;
      }
    }
    return "hors des paliers";
  };
  const title = (id: UniqueIdentifier) =>
    Object.values(columns)
      .flat()
      .find((i) => i.mediaId === id)?.title ?? "L'œuvre";

  return {
    onDragStart: ({ active }) =>
      `${title(active.id)} saisie, dans ${where(active.id)}.`,
    onDragOver: ({ active }) => `Vers ${where(active.id)}.`,
    onDragEnd: ({ active }) =>
      `${title(active.id)} posée dans ${where(active.id)}.`,
    onDragCancel: ({ active }) =>
      `Déplacement annulé, ${title(active.id)} reprend sa place.`,
  };
}

const INSTRUCTIONS: ScreenReaderInstructions = {
  draggable:
    "Espace pour saisir cette œuvre, les flèches pour la changer de palier, Espace pour la poser, Échap pour annuler. Entrée ouvre le menu « Ranger dans… ».",
};
