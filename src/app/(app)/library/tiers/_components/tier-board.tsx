"use client";

import {
  type Announcements,
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
  KeyboardSensor,
  MouseSensor,
  type ScreenReaderInstructions,
  TouchSensor,
  type UniqueIdentifier,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import Image from "next/image";
import Link from "next/link";
import { useAction } from "next-safe-action/hooks";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { routes } from "@/config/routes";
import { SCORE_STARS } from "@/features/tracking/lib/entry-format";
import {
  applyPendingScores,
  failScore,
  type PendingScores,
  queueScore,
  settleScore,
} from "@/features/tracking/lib/pending-scores";
import {
  groupIntoTiers,
  type ScoreTier,
  TIER_BOARD,
  tierIdForScore,
} from "@/features/tracking/lib/score-tiers";
import type { TierEntry } from "@/features/tracking/server/library.queries";
import { saveEntry } from "@/features/tracking/server/tracking.actions";
import { useFinePointer } from "@/hooks/use-fine-pointer";
import { cn } from "@/lib/utils";

/**
 * Le clavier va **d'un palier au suivant**, une flèche à la fois.
 *
 * `sortableKeyboardCoordinates`, celui du mode réorganisation des listes, ne convient pas ici : il
 * déplace la carte de quelques pixels puis reprend la zone de dépôt la plus proche. Quand les zones
 * sont des jaquettes, cela donne bien un pas d'une voisine à l'autre ; quand ce sont des **lignes**,
 * et surtout la réserve, plus haute que le pas, la carte reste dans sa propre ligne autant de fois
 * qu'on appuie — vu à l'écran le 7 septembre 2026, deux flèches sans quitter « Non notées ».
 *
 * On vise donc le palier voisin dans `TIER_BOARD` et on renvoie le centre de sa ligne : une touche
 * égale un cran, quelle que soit la hauteur des lignes, et les bornes du plateau arrêtent le
 * mouvement au lieu de l'emmener dans le vide.
 */
const coordinateGetter: KeyboardCoordinateGetter = (
  event,
  { context: { active, collisionRect, droppableRects, over } },
) => {
  const step =
    event.code === "ArrowUp" ? -1 : event.code === "ArrowDown" ? 1 : 0;

  /*
    Gauche et droite sont **avalées sans rien faire** : l'ordre à l'intérieur d'un cran n'existe pas
    (`score-tiers.ts`), donc elles n'ont rien à déplacer — mais sans ce `preventDefault` elles font
    défiler la page de côté pendant qu'on tient une carte.
  */
  if (event.code === "ArrowLeft" || event.code === "ArrowRight") {
    event.preventDefault();
    return;
  }

  if (step === 0 || !active || !collisionRect) return;

  event.preventDefault();

  /*
    La ligne de départ est celle que dnd-kit survole déjà. Le repli par géométrie ne sert qu'au tout
    premier appui, si la détection de collision n'a pas encore désigné de zone : sans lui, la
    première flèche ne ferait rien et se lirait comme un clavier mort.
  */
  const center = collisionRect.top + collisionRect.height / 2;
  const fromId: UniqueIdentifier | undefined =
    over?.id ??
    TIER_BOARD.find((tier) => {
      const rect = droppableRects.get(tier.id);
      return rect && center >= rect.top && center <= rect.top + rect.height;
    })?.id;

  const fromIndex = TIER_BOARD.findIndex((tier) => tier.id === fromId);
  if (fromIndex === -1) return;

  const target = TIER_BOARD[fromIndex + step];
  const rect = target ? droppableRects.get(target.id) : undefined;
  /* Aux deux bouts du plateau, on ne bouge pas : il n'y a pas de cran au-dessus de 5. */
  if (!rect) return;

  return {
    x: collisionRect.left,
    y: rect.top + rect.height / 2 - collisionRect.height / 2,
  };
};

/**
 * Le plateau — **déposer une œuvre sur un palier écrit sa note.**
 *
 * C'est le seul écran du produit où l'on note en comparant plutôt qu'en jugeant dans le vide : les
 * paliers sont les crans de la note (`score-tiers.ts`), donc la place d'une jaquette *est* sa note,
 * et deux œuvres voisines sur une ligne sont deux œuvres qu'on a décidé d'égaler.
 *
 * **Les cartes sont `draggable`, les paliers `droppable`, et rien n'est `sortable`.** L'ordre à
 * l'intérieur d'un palier n'existe pas — il n'est pas stocké et se déduit de la note exacte —, donc
 * un `SortableContext` ferait payer une mécanique d'insertion pour une information qu'on jette. Le
 * clavier suit la même idée : `coordinateGetter` ci-dessus vise les **lignes**, donc une flèche vaut
 * un cran. Espace saisit, les flèches changent de palier, Espace dépose, Échap annule.
 *
 * Un seul îlot client pour tout le plateau : la page, ses titres et sa rangée de types restent des
 * composants serveur.
 */
export function TierBoard({
  entries: initialEntries,
}: {
  entries: TierEntry[];
}) {
  /*
    Les notes affichées vivent ici et bougent **avant** la réponse du serveur : une carte qui
    attendrait l'aller-retour reviendrait à sa place le temps de la requête, ce qui est exactement
    la sensation qu'un glisser-déposer doit éviter (même raison que le mode réorganisation des
    listes).
  */
  const [entries, setEntries] = useState(initialEntries);

  /*
    Les notes posées à l'écran dont l'écriture n'est pas revenue (`pending-scores.ts`). Une table et
    non une seule variable : deux déplacements peuvent se chevaucher, et une variable unique ferait
    revenir la mauvaise carte.

    Déclarée **avant** le recalage ci-dessous, qui la lit pendant le rendu.
  */
  const pending = useRef<PendingScores>(new Map());

  /*
    **Mais le serveur reste la vérité, et son dernier mot écrase l'état local.**

    Sans ce recalage, changer le filtre de type ne changeait rien à l'écran (constaté le 7 septembre
    2026) : la navigation rend le **même** composant avec de nouvelles props, et un `useState` ne
    relit jamais sa valeur initiale — le plateau restait figé sur les œuvres du premier rendu.
    C'est le motif « ajuster l'état pendant le rendu » de la documentation React : comparer les props
    à celles d'avant, et se remettre à jour tout de suite plutôt que dans un effet, qui ferait
    afficher une image périmée le temps d'une frame.

    Ça vaut aussi après une écriture : `revalidatePath` renvoie des lignes fraîches, et les reprendre
    corrige au passage une note posée depuis un autre onglet.
  */
  const [lastServerEntries, setLastServerEntries] = useState(initialEntries);
  if (lastServerEntries !== initialEntries) {
    setLastServerEntries(initialEntries);
    /*
      **Mais pas par-dessus une note qu'on vient de poser.** Chaque écriture déclenche un
      `revalidatePath`, donc les lignes fraîches du premier dépôt arrivent alors que le second n'y
      est pas encore : les reprendre telles quelles renvoyait sa carte à son ancien cran, le temps
      d'un aller-retour (constaté le 7 septembre 2026 en enchaînant deux dépôts).
    */
    setEntries(applyPendingScores(initialEntries, pending.current));
  }

  const { execute } = useAction(saveEntry, {
    onError: ({ error, input }) => {
      toast.error(
        error.serverError ?? "La note n'a pas été enregistrée. Réessayez.",
      );

      /*
        `failScore` rend `null` quand rien n'est en vol pour cette œuvre — ce qui n'est pas la même
        chose qu'une œuvre non notée, et les confondre effacerait une note posée depuis un autre
        onglet. Il périme d'un coup toutes les écritures en vol de l'œuvre : elles partaient d'un
        état que le serveur n'a jamais confirmé.
      */
      const failed = failScore(pending.current, input.mediaId);
      if (!failed) return;

      setEntries((current) =>
        current.map((entry) =>
          entry.mediaId === input.mediaId
            ? { ...entry, score: failed.previous }
            : entry,
        ),
      );
    },
    /* `onError` passe avant : `settleScore` sur une œuvre déjà oubliée ne fait rien. */
    onSettled: ({ input }) => {
      settleScore(pending.current, input.mediaId);
    },
  });

  /*
    Le regroupement est **dérivé**, jamais stocké : une seule liste d'œuvres décide de tout, et il
    n'y a donc aucun moyen qu'un palier et la note d'une carte se contredisent.
  */
  const groups = useMemo(() => groupIntoTiers(entries), [entries]);

  /*
    **L'œuvre qu'on porte, pour l'aperçu et pour lui seul.** Le plateau n'en a pas besoin
    autrement : c'est `over` qui décide du dépôt, pas cet état.
  */
  const [activeId, setActiveId] = useState<number | null>(null);
  const activeEntry =
    activeId === null
      ? null
      : (entries.find((entry) => entry.mediaId === activeId) ?? null);

  /*
    La réserve est la dernière ligne de `TIER_BOARD`, et elle se rend à part. On la découpe ici
    plutôt que de la reconnaître à `stars === null` dans le rendu : le contrat d'ordre est déjà dans
    le module pur, et deux endroits qui décident lequel est le dernier finissent par diverger.
  */
  const rated = groups.slice(0, -1);
  const reserve = groups.at(-1);

  /*
    Les trois capteurs de `list-reorder-grid.tsx`, et pour les mêmes raisons : à la souris on saisit
    tout de suite, au doigt un appui de 200 ms distingue le déplacement du défilement, et sans le
    clavier l'écran demanderait une souris.
  */
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter }),
  );

  /**
   * Poser une œuvre sur un palier — **le seul chemin d'écriture de l'écran**.
   *
   * Le glisser et le menu contextuel y arrivent tous les deux : deux gestes pour un même effet, mais
   * une seule règle de « ce que ça écrit » et un seul retour en arrière en cas d'échec. Les écrire
   * deux fois aurait donné deux façons de se tromper.
   */
  const moveToTier = (mediaId: number, tierId: UniqueIdentifier) => {
    const tier = TIER_BOARD.find((row) => row.id === tierId);
    const moved = entries.find((entry) => entry.mediaId === mediaId);
    if (!tier || !moved) return;

    /*
      **Reposer une carte sur son propre palier n'écrit rien.** Une note importée d'AniList vaut 87
      sur une ligne qui en vaut 90 : sans cette garde, le moindre glissement de huit pixels
      normaliserait une note qu'on n'a pas voulu toucher. Le recalage se fait en déplaçant, qui est
      un geste qu'on décide.
    */
    if (tierIdForScore(moved.score) === tier.id) return;

    queueScore(pending.current, mediaId, tier.score, moved.score);
    setEntries((current) =>
      current.map((entry) =>
        entry.mediaId === mediaId ? { ...entry, score: tier.score } : entry,
      ),
    );

    execute({ mediaId, score: tier.score });
  };

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(Number(active.id));
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over) return;

    moveToTier(Number(active.id), over.id);
  };

  return (
    <DndContext
      accessibility={{
        announcements: announcementsFor(entries),
        screenReaderInstructions: INSTRUCTIONS,
      }}
      /*
        Les paliers sont les seules zones de dépôt, et ils tiennent toute la largeur : le plus proche
        du centre de la carte saisie est celui qu'on vise. `pointerWithin` serait plus fin à la
        souris, mais ne rend rien au clavier, qui n'a pas de pointeur.
      */
      collisionDetection={closestCenter}
      /*
        **Un identifiant fixe, sinon l'hydratation casse.** dnd-kit fabrique le `aria-describedby` de
        chaque carte avec un compteur de module (`useUniqueId`) : le serveur repart de zéro à chaque
        rendu, le client continue le sien, et React signalait donc un `DndDescribedBy-0` promis contre
        un `DndDescribedBy-28` rendu (7 septembre 2026). Le prop `id` court-circuite ce compteur —
        c'est exactement ce pour quoi il existe. Il n'y a qu'un plateau par page, donc une constante
        suffit.
      */
      id="tier-board"
      onDragCancel={() => setActiveId(null)}
      onDragEnd={handleDragEnd}
      onDragStart={handleDragStart}
      sensors={sensors}
    >
      {/*
        **Le plateau d'un côté, la réserve de l'autre**, séparés par un vrai écart (7 septembre 2026).
        Collée en douzième ligne, la réserve se lisait comme un palier de plus — le pire de tous,
        puisqu'elle est en bas — alors qu'elle est le contraire d'un rang : c'est ce qui n'est pas
        jugé. L'écart le dit sans un mot de plus.
      */}
      <div className="flex flex-col gap-6">
        {/*
          **Les crans, d'un seul tenant et sans écart entre les lignes** — la forme de TierMaker.
          Des cartes séparées faisaient onze objets à lire ; collées, elles font un tableau, et c'est
          la répartition d'ensemble qu'on vient y voir.
        */}
        <ol className="overflow-clip rounded-lg border border-border bg-card">
          {rated.map(({ tier, items }, index) => (
            /*
              Seule la première ligne charge ses jaquettes en priorité : c'est elle qui porte le plus
              grand élément visible au chargement, et Next avertit — à raison — qu'une image de LCP
              chargée en différé retarde l'affichage. Les autres lignes restent paresseuses, sinon on
              préchargerait deux cents vignettes pour en montrer douze.
            */
            <TierRow
              eager={index === 0}
              items={items}
              key={tier.id}
              onMove={moveToTier}
              tier={tier}
            />
          ))}
        </ol>

        {reserve ? (
          <ol className="overflow-clip rounded-lg border border-border bg-card">
            <TierRow
              eager={false}
              items={reserve.items}
              onMove={moveToTier}
              tier={reserve.tier}
            />
          </ol>
        ) : null}
      </div>

      {/*
        **L'aperçu est ce qui répare le glisser** (7 septembre 2026). Les deux blocs du plateau
        portent `overflow-clip` pour que leurs coins arrondis coupent les jaquettes des première et
        dernière lignes — mais une carte simplement translatée est alors rognée dès qu'elle sort de
        son bloc, et piocher dans la réserve pour remonter au cran 5 se faisait à l'aveugle sur tout
        le trajet. `DragOverlay` rend la carte en `position: fixed`, dont le bloc conteneur est la
        fenêtre : aucun `overflow` d'ancêtre ne l'atteint.

        `dropAnimation={null}` : l'animation par défaut ramène l'aperçu vers la carte **d'origine**,
        alors que le dépôt vient justement de l'envoyer ailleurs. Elle montrerait donc le contraire
        de ce qui vient de se passer, et le rendu optimiste est déjà instantané.
      */}
      <DragOverlay dropAnimation={null}>
        {activeEntry ? (
          <div
            className={cn(
              CARD_SHELL,
              "cursor-grabbing shadow-lg ring-2 ring-ring",
            )}
          >
            <TierCardFace alwaysShowTitle entry={activeEntry} eager={false} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/**
 * Une ligne du plateau : son cran à gauche, ses œuvres à droite.
 *
 * La ligne **entière** est la zone de dépôt, pas seulement la bande des jaquettes : viser une
 * gouttière de huit pixels entre deux paliers au doigt est perdu d'avance, et une cible qui occupe
 * toute la largeur ne se rate pas. Elle reste affichée quand elle est vide — c'est le vide qui
 * montre qu'un cran n'est pas utilisé, et un plateau dont les lignes apparaissent au fil des dépôts
 * est un plateau dont les cibles bougent sous le doigt.
 */
function TierRow({
  tier,
  items,
  onMove,
  eager,
}: {
  tier: ScoreTier;
  items: TierEntry[];
  onMove: (mediaId: number, tierId: string) => void;
  /** La ligne est-elle celle du haut, dont les jaquettes se chargent sans attendre ? */
  eager: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: tier.id });
  const count = items.length;

  return (
    <li
      className="flex items-stretch border-border border-b last:border-b-0"
      ref={setNodeRef}
    >
      <div
        className={cn(
          /*
            La bande colorée pleine hauteur, à gauche : c'est elle qui fait lire le plateau comme un
            rang plutôt que comme onze listes. Le texte y est **noir en clair comme en sombre** — le
            dégradé ne s'inverse pas avec le thème (`score-tiers.ts`), donc un `text-foreground`
            deviendrait blanc sur jaune pâle à la première bascule.
          */
          "flex w-14 shrink-0 flex-col items-center justify-center px-1 py-3 text-center sm:w-20",
          tier.color ? "text-[#111]" : "bg-muted text-foreground",
        )}
        style={tier.color ? { backgroundColor: tier.color } : undefined}
      >
        {/*
          L'étiquette **suit le défilement** à l'intérieur de sa bande. Sans cela, la réserve — deux
          mille pixels de jaquettes depuis qu'elle ne défile plus toute seule — centrait son nom au
          milieu de nulle part : on arrivait sur un bloc de deux cents vignettes sans rien qui dise
          ce que c'était. `top-16` dégage l'en-tête, qui est collé lui aussi. Sur une ligne courte,
          rien ne bouge : il n'y a pas de quoi défiler.
        */}
        <div className="sticky top-16 flex flex-col items-center gap-0.5">
          <span
            className={cn(
              "font-semibold leading-none tabular-nums",
              /* « Non notées » n'est pas un chiffre : il lui faut deux lignes et un corps plus petit. */
              tier.stars === null ? "text-xs leading-tight" : "text-xl",
            )}
          >
            {tier.label}
          </span>
          {/*
            « /5 » sous le cran plutôt qu'à côté : la bande est étroite, et l'échelle ne se lit qu'une
            fois — c'est le nombre qu'on compare d'une ligne à l'autre. La réserve, elle, n'a pas
            d'échelle : elle n'est pas une note.
          */}
          {tier.stars === null ? null : (
            <span className="text-[10px] opacity-70">/{SCORE_STARS}</span>
          )}
          {/*
            Le compte du palier, parce que recaler c'est **répartir** : « quatorze en 4 et rien en
            3,5 » est précisément l'anomalie qu'on vient chercher, et elle ne se voit pas en comptant
            des jaquettes des yeux. Un palier vide n'affiche rien plutôt qu'un zéro — sa ligne le dit
            déjà en toutes lettres.
          */}
          {count > 0 ? (
            <span className="text-[11px] opacity-70 tabular-nums">{count}</span>
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          /*
            `gap-px` et non un vrai écart : les jaquettes se touchent, comme sur TierMaker, et c'est
            ce qui fait qu'un palier se lit comme un bloc dont on jauge la masse.
          */
          "flex min-h-24 flex-1 flex-wrap gap-px p-px transition-colors",
          /*
            **L'alignement dépend du contenu, et il le faut** (7 septembre 2026) : `content-start`
            tasse les jaquettes en haut d'une ligne haute, mais sur une ligne vide il écrase la
            ligne flex à la hauteur du texte, et `m-auto` n'a alors plus rien à centrer — le message
            se collait à 1 px du bord haut et se lisait comme le pied du palier au-dessus.
          */
          items.length === 0
            ? "items-center justify-center"
            : "content-start items-start",
          /*
            **Aucune ligne ne défile, la réserve comprise** (7 septembre 2026). Elle a d'abord été
            bornée à deux rangées, ce qui l'empêchait d'écraser le plateau — mais elle est l'endroit
            où l'on pioche, et piocher dans deux rangées sur seize revient à choisir parmi ce que le
            hasard de l'ordre a mis en haut. C'est l'écart qui sépare désormais la réserve du plateau,
            pas une hauteur maximale.
          */
          /* La ligne visée s'éclaire : sans retour, on dépose au jugé. */
          isOver && "bg-muted",
        )}
      >
        {items.length === 0 ? (
          <p className="px-3 text-muted-foreground text-sm">
            {/*
              **Court**, parce que la phrase se répète sur autant de lignes qu'il y a de crans
              inutilisés — six d'affilée sur une bibliothèque réelle. L'invitation à déposer est
              déjà portée par la description de la page et par les instructions du lecteur d'écran.
            */}
            {tier.stars === null ? "Tout est noté." : "Rien à ce cran."}
          </p>
        ) : (
          items.map((item, index) => (
            /* Une douzaine suffit : au-delà, la ligne déborde sous la ligne de flottaison. */
            <TierCard
              entry={item}
              eager={eager && index < EAGER_COVERS}
              key={item.mediaId}
              onMove={onMove}
            />
          ))
        )}
      </div>
    </li>
  );
}

/**
 * Les classes de la coquille d'une jaquette — **partagées entre la carte en place et l'aperçu qui
 * suit le curseur**. Deux listes de classes pour un même objet finiraient par diverger, et c'est
 * précisément l'objet dont l'aperçu doit être la copie exacte.
 *
 * Quatre jaquettes par ligne au téléphone plutôt que deux : comparer suppose de **voir ensemble**,
 * et un palier qu'on parcourt en six rangées ne se compare plus, il se feuillette.
 */
const CARD_SHELL =
  "group relative aspect-2/3 w-14 shrink-0 overflow-hidden bg-muted sm:w-20";

/**
 * Ce qu'on voit d'une jaquette : l'image, et le nom qui la tranche.
 *
 * Séparé de `TierCard` parce que l'aperçu de glisser doit montrer exactement la même chose sans
 * rien de ce qui rend la carte déplaçable — ni poignée, ni focus, ni menu.
 *
 * `alwaysShowTitle` sert à ce seul aperçu : le nom n'y apparaît pas au survol, puisqu'on ne survole
 * pas ce qu'on tient — et savoir ce qu'on transporte au-dessus de onze paliers est tout l'intérêt.
 */
function TierCardFace({
  entry,
  eager,
  alwaysShowTitle = false,
}: {
  entry: TierEntry;
  eager: boolean;
  alwaysShowTitle?: boolean;
}) {
  return (
    <>
      {entry.cover ? (
        <Image
          alt=""
          className="object-cover"
          fill
          priority={eager}
          sizes="(min-width: 640px) 80px, 56px"
          src={entry.cover}
        />
      ) : null}

      {/*
        Le nom au survol et au focus, en bas de la jaquette : il ne coûte aucune hauteur au plateau,
        et il tranche le doute quand deux saisons d'une même série ont presque la même image. Une
        œuvre sans jaquette l'affiche en permanence — sinon sa case serait une tuile grise anonyme.
      */}
      <span
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 line-clamp-3 bg-background/85 px-1 py-0.5 text-[10px] leading-tight",
          entry.cover &&
            !alwaysShowTitle &&
            "opacity-0 transition-opacity group-focus-visible:opacity-100 group-hover:opacity-100",
        )}
      >
        {entry.title}
      </span>
    </>
  );
}

/**
 * Une jaquette qu'on déplace d'un palier à l'autre.
 *
 * **La carte entière est la poignée**, comme en mode réorganisation : viser une prise de
 * vingt-quatre pixels sur une vignette de quatre-vingts en demande trop au doigt.
 *
 * **Le titre n'est plus écrit dessous** (7 septembre 2026, style TierMaker). Il prenait deux lignes
 * sous chaque jaquette, donc un tiers de la hauteur du plateau pour une information que la jaquette
 * porte déjà — et c'est la hauteur qui décide si l'on voit deux paliers ensemble ou un seul.
 *
 * Il est **masqué à l'œil, pas retiré** : le nom reste dans le DOM et ne fait que passer à
 * `opacity-0`, donc il nomme toujours la carte pour un lecteur d'écran — un `hidden` ou un rendu
 * conditionnel aurait laissé une image sans texte, c'est-à-dire une case qu'on ne peut pas déplacer
 * sans la voir. Le survol et le focus le rallument.
 *
 * **Et elle a un menu au clic droit** (7 septembre 2026), qui donne la même chose que le glisser
 * sans traverser l'écran : sur onze paliers, remonter une œuvre de la réserve jusqu'au cran 5
 * demandait un geste d'un bout à l'autre de la page. Le menu ouvre aussi la fiche, seul chemin vers
 * le reste du suivi depuis ce plateau.
 */
function TierCard({
  entry,
  onMove,
  eager,
}: {
  entry: TierEntry;
  onMove: (mediaId: number, tierId: string) => void;
  eager: boolean;
}) {
  const { attributes, isDragging, listeners, setNodeRef } = useDraggable({
    id: entry.mediaId,
  });

  /*
    Le menu n'est armé qu'à la souris. Au doigt, Radix l'ouvrirait sur un appui long — le geste que
    le `TouchSensor` réserve déjà au glisser —, et le menu s'afficherait par-dessus une carte saisie.
    Un clic droit, lui, ne se dispute rien (`use-fine-pointer.ts`).
  */
  const finePointer = useFinePointer();

  const card = (
    <div
      className={cn(
        // `touch-manipulation` et non `touch-none` : le navigateur garde le défilement, et c'est le
        // délai du `TouchSensor` qui distingue un balayage d'une saisie.
        CARD_SHELL,
        "cursor-grab touch-manipulation outline-none",
        // L'anneau suit le focus clavier : c'est ce qui rend le déplacement au clavier visible.
        "focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        /*
          La carte reste **en place et pâlie** pendant qu'on la porte : c'est l'aperçu qui voyage.
          Le creux dit d'où elle vient, ce qui rend l'annulation lisible.
        */
        isDragging && "opacity-40",
      )}
      ref={setNodeRef}
      title={entry.title}
      {...attributes}
      {...listeners}
    >
      <TierCardFace entry={entry} eager={eager} />
    </div>
  );

  if (!finePointer) return card;

  return (
    <ContextMenu>
      {/*
        `asChild` : le menu se greffe sur la jaquette elle-même plutôt que d'ajouter un conteneur
        entre la ligne et la carte — une enveloppe de plus casserait la grille serrée du plateau, et
        dnd-kit tient déjà cette carte par sa référence.
      */}
      <ContextMenuTrigger asChild>{card}</ContextMenuTrigger>

      <ContextMenuContent className="w-56">
        {/* Le titre en tête : sur une grille de jaquettes sans nom, c'est lui qui dit sur quoi on a cliqué. */}
        <ContextMenuLabel className="truncate">{entry.title}</ContextMenuLabel>
        <ContextMenuSeparator />

        <ContextMenuGroup>
          <ContextMenuItem asChild>
            <Link href={routes.media(entry.mediaId)}>Ouvrir la fiche</Link>
          </ContextMenuItem>
        </ContextMenuGroup>

        <ContextMenuSeparator />

        {/*
          Un groupe **radio** et non douze commandes : la note est un choix unique, et le point noir
          en face du cran courant est ce qui répond à « elle est notée combien, déjà ? » sans quitter
          le menu. `TIER_BOARD` porte la réserve en dernier, donc « Non notées » est ici la façon
          d'effacer une note — la même case que sur le plateau, pas une action de plus à inventer.
        */}
        <ContextMenuLabel>Noter</ContextMenuLabel>
        <ContextMenuRadioGroup
          onValueChange={(tierId) => onMove(entry.mediaId, tierId)}
          value={tierIdForScore(entry.score)}
        >
          {TIER_BOARD.map((tier) => (
            <ContextMenuRadioItem key={tier.id} value={tier.id}>
              {tier.stars === null
                ? "Retirer la note"
                : `${tier.label} / ${SCORE_STARS}`}
            </ContextMenuRadioItem>
          ))}
        </ContextMenuRadioGroup>
      </ContextMenuContent>
    </ContextMenu>
  );
}

/**
 * Ce qu'un lecteur d'écran annonce au fil du déplacement — **en titres et en crans, pas en
 * identifiants**.
 *
 * dnd-kit ne fournit ses annonces qu'en anglais, et il ne connaît que des `id` : « Œuvre 21234
 * déposée sur tier-90 » n'apprend rien à qui ne voit pas le plateau.
 */
function announcementsFor(entries: TierEntry[]): Announcements {
  const titleOf = (id: string | number) =>
    entries.find((entry) => entry.mediaId === Number(id))?.title ??
    "Œuvre inconnue";

  const tierOf = (id: string | number) =>
    TIER_BOARD.find((tier) => tier.id === id)?.label ?? "aucun palier";

  return {
    onDragStart: ({ active }) => `${titleOf(active.id)} saisie.`,
    onDragOver: ({ over }) =>
      over ? `Palier visé : ${tierOf(over.id)}.` : "Hors du plateau.",
    onDragEnd: ({ active, over }) =>
      over
        ? `${titleOf(active.id)} notée ${tierOf(over.id)}.`
        : "Déplacement abandonné, la note ne change pas.",
    onDragCancel: () => "Déplacement annulé, la note ne change pas.",
  };
}

/** Combien de jaquettes du premier palier se chargent sans attendre. */
const EAGER_COVERS = 12;

const INSTRUCTIONS: ScreenReaderInstructions = {
  draggable:
    "Appuyez sur Espace pour saisir cette œuvre. Utilisez les flèches haut et bas pour changer de palier, Espace pour l'y déposer et enregistrer la note, Échap pour annuler.",
};
