"use client";

import { PlusIcon } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { startTransition, useEffect, useOptimistic, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  applyVolumeRange,
  formatVolumeRanges,
  volumeGaps,
} from "@/features/collection/lib/volume-ranges";
import {
  addNextVolume,
  setOwnedRange,
} from "@/features/collection/server/collection.actions";
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

  const { executeAsync: executeNext } = useAction(addNextVolume, {
    onError: () => toast.error("Le tome n'a pas pu être ajouté."),
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
   * Jusqu'où la grille va — **le plus grand des deux, jamais le seul total.**
   *
   * Le total borne la série, mais un tome possédé au-delà existe quand même : c'est le cas après
   * une correction du total à la baisse, et pendant le battement optimiste du bouton « tome
   * suivant », qui pose le tome avant que le serveur ne remonte le total. S'en tenir au total
   * masquerait ces tomes — donc les rendrait impossibles à décocher.
   */
  const lastNumber = Math.max(total ?? 0, ...shelf, 0);
  const present = new Set(shelf);

  /** Ce que la case affiche : l'aperçu du glissé s'il la couvre, sinon l'étagère. */
  function isFilled(number: number) {
    if (drag === null) return present.has(number);

    const from = Math.min(drag.anchor, drag.cursor);
    const to = Math.max(drag.anchor, drag.cursor);

    return number >= from && number <= to ? drag.value : present.has(number);
  }

  const numbers = Array.from({ length: lastNumber }, (_, index) => index + 1);
  const { missing, isComplete } = volumeGaps(numbers.filter(isFilled), total);

  /**
   * La case en pointillés du bout de grille — « le tome suivant est paru, et je l'ai ».
   *
   * Elle ne paraît que quand il **n'y a plus rien à combler à l'intérieur** : total inconnu, ou
   * série complète. Sur une série de 110 tomes dont on en possède 59, la fin est connue et les
   * cases manquantes sont déjà là — une case de plus au bout ne voudrait rien dire.
   *
   * C'est la réponse à « ça se passe comment si un nouveau tome sort ? » (19 septembre 2026).
   * Sans elle, une série **en cours** — donc sans total, AniList ne le donnant que pour les
   * séries terminées — n'offrait aucune case au-delà du dernier tome possédé : un cul-de-sac.
   */
  const showNext = total === null || isComplete;
  const nextNumber = lastNumber + 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          Cliquez un tome, ou glissez pour une plage.
          {showNext
            ? " La case « + » ajoute le tome qui vient de paraître."
            : null}
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

        {showNext ? (
          <button
            aria-label={`Ajouter le tome ${nextNumber}, paru depuis`}
            /*
              **Un « + », et non le numéro du tome.** En pointillés avec son numéro, la case se
              lisait exactement comme un tome manquant — même fond, même teinte — et sur une série
              complète elle ressemblait à un trou en bout de rangée. Le signe dit le geste ; le
              numéro, lui, est dans l'étiquette d'accessibilité et dans la phrase au-dessus.
            */
            className="inline-flex size-11 items-center justify-center rounded-md border border-dashed border-muted-foreground/40 text-muted-foreground transition-colors hover:border-foreground/50 hover:text-foreground sm:size-9"
            /*
              Hors du glissé, délibérément : elle n'a ni `onPointerDown` ni `onPointerEnter`. Une
              plage qui s'étendrait jusqu'à une case qui n'existe pas encore n'a pas de sens, et
              laisser le curseur la traverser en peignant ferait naître un tome par accident.
            */
            onClick={() => {
              startTransition(async () => {
                addOptimistic({
                  from: nextNumber,
                  to: nextNumber,
                  owned: true,
                });
                await executeNext({ mediaId });
              });
            }}
            type="button"
          >
            <PlusIcon className="size-4" />
          </button>
        ) : null}
      </div>

      <p className="text-sm">
        {isComplete ? (
          <span className="text-muted-foreground">
            Série complète, {total} tomes.
          </span>
        ) : missing.length > 0 ? (
          <>
            <span className="text-muted-foreground">Il me manque : </span>
            <span className="tabular-nums">{formatVolumeRanges(missing)}</span>
          </>
        ) : (
          <span className="text-muted-foreground">
            {total === null
              ? "Renseignez le nombre de tomes de l'édition pour voir ce qui manque."
              : "Rien ne manque."}
          </span>
        )}
      </p>
    </div>
  );
}
