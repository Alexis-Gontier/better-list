"use client";

import { PlusIcon } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { startTransition, useEffect, useOptimistic, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ShelfStatusLine } from "@/features/collection/components/shelf-status-line";
import {
  applyVolumeRange,
  volumeGaps,
} from "@/features/collection/lib/volume-ranges";
import { setOwnedRange } from "@/features/collection/server/collection.actions";
import { cn } from "@/lib/utils";

/**
 * Le tableau des tomes — **la grille EST le contrôle** : un clic pose un tome, un glissé pose une
 * plage.
 *
 * Retenu le 19 septembre 2026 contre une fenêtre « du tome … au tome … », sur un critère
 * d'Alexis : **un seul clic pour ajouter**. La saisie par plage (docs/PRODUCT.md §8 item 9) n'est
 * donc pas un mode à part, c'est le même geste tenu plus longtemps — et l'action reçoit deux
 * bornes dans les deux cas, `from === to` pour un clic.
 *
 * Le prix assumé : un îlot client, un repli clavier sur chaque case, et `touch-action: pan-y` pour
 * que le défilement vertical reste à la page sur téléphone.
 */
export function VolumeBoard({
  mediaId,
  total,
  owned,
  isReleasing,
}: {
  mediaId: number;
  /**
   * Le nombre de tomes de l'édition, ou `null` tant qu'il n'est pas saisi.
   *
   * AniList ne le donne que pour les séries terminées, et ignore la notion d'édition (§9). Sans
   * lui, la grille s'arrête au dernier tome possédé : on ne dessine pas des cases vides pour une
   * fin de série qu'on ignore.
   */
  total: number | null;
  owned: number[];
  /**
   * La parution continue-t-elle ? La phrase d'état en a besoin pour dire « à jour » plutôt que
   * « complète » — un total saisi sur une série qui paraît encore vieillit en silence.
   */
  isReleasing: boolean;
}) {
  /**
   * L'étagère telle qu'elle s'affiche — **optimiste, adossée à ce que le serveur a rendu.**
   *
   * `useOptimistic` plutôt qu'un `useState` initialisé sur la prop : un `useState` ne se
   * réinitialise pas quand le serveur renvoie une nouvelle valeur après `revalidatePath`, donc la
   * grille garderait indéfiniment son état local — et mentirait après un échec d'écriture ou une
   * modification venue d'un autre onglet. Ici, la valeur retombe sur celle du serveur dès que la
   * transition se termine.
   *
   * La règle appliquée est **la même que côté serveur** (`applyVolumeRange`, testée) : un écart
   * entre ce qu'on montre pendant l'aller-retour et ce que la base écrit ferait clignoter la
   * grille au retour.
   */
  const [shelf, addOptimistic] = useOptimistic(
    owned,
    (current: number[], range: { from: number; to: number; owned: boolean }) =>
      applyVolumeRange(current, range),
  );

  /**
   * Le glissé en cours : d'où il est parti, où il en est, et la valeur qu'il pose.
   *
   * **La plage se calcule sur les numéros, jamais sur les cases survolées** — correction d'un
   * défaut vu à l'écran le 19 septembre 2026. Peindre case par case au `pointerenter` marchait
   * tant que la grille tenait sur une ligne ; dès qu'elle enveloppe, passer du dernier tome d'une
   * rangée au premier de la suivante fait balayer au curseur toute la rangée à rebours, et la
   * plage écrivait des tomes qu'on n'avait jamais visés.
   *
   * En repartant de l'ancre, ce que la souris traverse n'a plus d'importance : seules comptent les
   * deux bornes. C'est aussi ce qui rend l'aperçu honnête — on voit la plage qu'on obtiendra.
   */
  const [drag, setDrag] = useState<{
    anchor: number;
    cursor: number;
    value: boolean;
  } | null>(null);

  const { executeAsync } = useAction(setOwnedRange, {
    onError: () => toast.error("Les tomes n'ont pas pu être enregistrés."),
  });

  function commit(from: number, to: number, isOwned: boolean) {
    startTransition(async () => {
      addOptimistic({ from, to, owned: isOwned });
      await executeAsync({ mediaId, from, to, owned: isOwned });
    });
  }

  /*
    Le relâchement compte **partout**, pas seulement sur la grille : on lâche souvent le bouton en
    dehors. Sans ce guetteur global, le composant resterait en train de peindre et le survol
    suivant écrirait sans qu'on ait rien pressé. C'est aussi lui qui valide la plage.
  */
  useEffect(() => {
    if (drag === null) return;

    const stop = () => {
      commit(
        Math.min(drag.anchor, drag.cursor),
        Math.max(drag.anchor, drag.cursor),
        drag.value,
      );
      setDrag(null);
    };

    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);

    return () => {
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  });

  /**
   * Jusqu'où la grille va.
   *
   * **Le maximum des trois, et pas simplement le total** : un tome possédé au-delà du total
   * déclaré doit rester visible, sinon il devient impossible à décocher tout en continuant de
   * compter. Le cas arrive pour de vrai — on saisit les tomes d'une série en cours, puis AniList
   * publie un `volumes` plus court que ce qu'on a sur l'étagère, parce qu'il ne compte pas la même
   * édition (docs/PRODUCT.md §9).
   *
   * Et au moins une case, pour qu'une série vierge ait quelque chose à cliquer.
   */
  const lastNumber = Math.max(total ?? 0, ...shelf, 1);

  /**
   * Le tome que la case d'après ajoutera.
   *
   * Le suivant du **dernier possédé**, et non de la dernière case : sur une étagère vierge, la
   * grille affiche déjà une case 1, et repartir de là ferait poser le tome 2 en laissant un trou
   * au tome 1 dès le premier clic.
   */
  const nextNumber = Math.max(0, ...shelf) + 1;
  const present = new Set(shelf);

  /** Ce que la case affiche : l'aperçu du glissé s'il la couvre, sinon l'étagère. */
  function isFilled(number: number) {
    if (drag === null) return present.has(number);

    const from = Math.min(drag.anchor, drag.cursor);
    const to = Math.max(drag.anchor, drag.cursor);

    return number >= from && number <= to ? drag.value : present.has(number);
  }

  const numbers = Array.from({ length: lastNumber }, (_, index) => index + 1);
  const filled = numbers.filter(isFilled);
  const { missing, extra, isComplete } = volumeGaps(filled, total);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          Cliquez un tome, ou glissez pour une plage.
        </p>

        {/*
          Les deux raccourcis ne sont offerts que quand le total est connu : « tout cocher » sur
          une édition dont on ignore le nombre de tomes n'a pas de borne, donc pas de sens.
        */}
        {total === null ? null : (
          <div className="flex gap-2">
            <Button
              onClick={() => commit(1, total, true)}
              size="sm"
              variant="outline"
            >
              Tout cocher
            </Button>
            <Button
              onClick={() => commit(1, total, false)}
              size="sm"
              variant="outline"
            >
              Tout décocher
            </Button>
          </div>
        )}
      </div>

      {/*
        `touch-pan-y` : le défilement vertical reste à la page, l'horizontale sert à peindre. Sans
        lui, la grille avalerait le défilement sur téléphone — c'est-à-dire sur l'appareil où cet
        écran se consulte.

        `select-none` parce qu'un glissé sur des numéros sélectionne le texte sous le doigt.
      */}
      <div className="flex touch-pan-y select-none flex-wrap gap-1">
        {numbers.map((number) => {
          const filled = isFilled(number);

          return (
            <button
              aria-label={`Tome ${number}`}
              aria-pressed={filled}
              className={cn(
                /*
                  44 px sur téléphone, 36 au-dessus de `sm` : c'est le seuil tactile, et cet écran
                  se consulte debout dans un rayon.
                */
                "inline-flex size-11 items-center justify-center rounded-md border text-xs tabular-nums transition-colors sm:size-9",
                filled
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:bg-muted",
              )}
              key={number}
              /*
                Tout passe par les évènements de pointeur, et le clavier a sa propre porte. Un
                `onClick` en plus double-déclencherait à la souris : le clic arrive après le
                `pointerdown`, qui a déjà ouvert le glissé d'une seule case.
              */
              onKeyDown={(event) => {
                if (event.key !== " " && event.key !== "Enter") return;
                event.preventDefault();
                commit(number, number, !filled);
              }}
              onPointerDown={() =>
                setDrag({
                  anchor: number,
                  cursor: number,
                  value: !present.has(number),
                })
              }
              onPointerEnter={() =>
                setDrag((current) =>
                  current === null ? null : { ...current, cursor: number },
                )
              }
              type="button"
            >
              {number}
            </button>
          );
        })}

        {/*
          **La case d'après, quand la série est en cours.**

          AniList ne donne un nombre de volumes que pour les séries **terminées** (§9) : One Piece
          et Berserk répondent `null`. Sans cette case, la grille s'arrêtait au dernier tome
          possédé et le tome suivant était inatteignable — il fallait passer par le menu saisir un
          total à la main, sur une série qui n'en a pas encore. C'était un cul-de-sac, relevé le
          19 septembre 2026.

          Elle ne paraît que lorsque le total est inconnu : dès qu'il est su, la grille contient
          déjà toutes les cases et il n'y a plus de « suite » à ouvrir.
        */}
        {total === null ? (
          <button
            aria-label={`Ajouter le tome ${nextNumber}`}
            className="inline-flex size-11 items-center justify-center rounded-md border border-dashed text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground sm:size-9"
            onClick={() => commit(nextNumber, nextNumber, true)}
            type="button"
          >
            <PlusIcon className="size-4" />
          </button>
        ) : null}
      </div>

      {/*
        La même phrase que la rangée de `/collection` et que l'en-tête, au mot près : elle vit
        dans `shelf-status-line.tsx`. Ici elle est recalculée à chaque clic sur l'état optimiste,
        donc elle bouge avant même que le serveur ait répondu.
      */}
      <ShelfStatusLine
        className="text-sm"
        extra={extra}
        isComplete={isComplete}
        isReleasing={isReleasing}
        /*
          Recalculé sur l'état optimiste, pas reçu du serveur : la phrase doit suivre le clic,
          comme les trous juste à côté.
        */
        lastOwned={filled.length > 0 ? Math.max(...filled) : null}
        missing={missing}
        ownedCount={filled.length}
        volumesTotal={total}
      />
    </div>
  );
}
