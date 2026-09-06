"use client";

import { ListPlusIcon } from "lucide-react";
import Link from "next/link";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { routes } from "@/config/routes";
import {
  addToList,
  removeFromList,
} from "@/features/lists/server/lists.actions";
import type { ListMembership } from "@/features/lists/server/lists.queries";

/**
 * Ranger une œuvre dans mes listes, depuis sa fiche.
 *
 * **Des bascules, et pas un simple ajout** — décision d'Alexis du 6 septembre 2026. Une case cochée
 * veut dire « cette œuvre est dans cette liste » : on voit donc où elle est déjà rangée avant de
 * choisir, et un ajout par erreur se défait en décochant. C'était la condition pour livrer ce
 * chemin : sans elle, il n'y aurait eu **aucun écran** pour retirer une œuvre d'une liste.
 *
 * **La fenêtre ne se referme pas sur un geste**, contrairement à `entry-quick-edit`. On range
 * souvent dans deux listes d'affilée, et une fermeture au premier clic obligerait à la rouvrir.
 *
 * **On ne crée pas de liste ici** — même décision, même jour : une liste naît à un seul endroit,
 * `/lists`, donc il n'y a qu'un formulaire à dessiner et à tenir. C'est ce qui rend le cas
 * « aucune liste » important plutôt qu'anecdotique, et il est traité plus bas.
 *
 * **Pas de route handler**, bien que ce soit un composant client qui affiche une lecture : la fiche
 * est un Server Component, elle appelle `getListMembership` et passe le résultat en prop. La règle
 * de `CLAUDE.md` vise une lecture qu'un composant client doit aller **chercher** ; celui-ci n'a rien
 * à chercher, tout voyage avec le rendu de la page.
 */
export function AddToListDialog({
  mediaId,
  title,
  lists,
}: {
  mediaId: number;
  /** Le titre de l'œuvre — il nomme le bouton pour un lecteur d'écran, pas l'en-tête de la fenêtre. */
  title: string;
  lists: ListMembership[];
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {/*
          Le bouton qui existait depuis la refonte et ne faisait rien. Il garde son icône et son
          libellé — c'est le même geste qu'il annonçait, il le tient enfin.
        */}
        <Button aria-label={`Ajouter ${title} à une liste`} variant="outline">
          <ListPlusIcon data-icon="inline-start" />
          Ajouter à une liste
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter à une liste</DialogTitle>
          <DialogDescription>
            Cochez les listes qui doivent contenir cette œuvre. Chaque case est
            enregistrée aussitôt.
          </DialogDescription>
        </DialogHeader>

        {lists.length === 0 ? (
          /*
            **Le cas qui découle directement de « on ne crée pas ici ».** Un membre sans aucune liste
            ouvrirait une fenêtre vide : elle doit donc dire quoi faire et mener à `/lists`, sinon le
            bouton s'ouvre sur du néant.
          */
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ListPlusIcon />
              </EmptyMedia>
              <EmptyTitle>Aucune liste où la ranger</EmptyTitle>
              <EmptyDescription>
                Les listes se créent depuis « Mes listes ». Revenez ensuite ici,
                l'œuvre vous attendra.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild>
                <Link href={routes.lists.root}>Aller à mes listes</Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          /*
            Une liste de cases, pas un menu : on doit pouvoir en cocher plusieurs sans que l'écran
            se referme, et voir d'un coup d'œil celles qui la contiennent déjà.

            `max-h` et défilement : quelques dizaines de listes tiendraient sinon plus haut que la
            fenêtre, et le bas deviendrait inatteignable.
          */
          <ul className="-mx-1 flex max-h-72 flex-col overflow-y-auto px-1">
            {lists.map((list) => (
              <ListToggle key={list.id} list={list} mediaId={mediaId} />
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Une liste, et la case qui dit si l'œuvre y est.
 *
 * **Chaque ligne porte ses propres actions**, et ce n'est pas un excès : cocher deux listes coup sur
 * coup lance deux écritures qui se chevauchent, et un `isPending` partagé désarmerait toute la
 * fenêtre — ou pire, montrerait la seconde ligne en attente pendant que c'est la première qui écrit.
 */
function ListToggle({
  list,
  mediaId,
}: {
  list: ListMembership;
  mediaId: number;
}) {
  const checkboxId = useId();
  const [checked, setChecked] = useState(list.contains);

  /*
    La prop refait autorité quand le serveur a répondu : `revalidatePath` sur la fiche renvoie une
    nouvelle valeur de `contains`, et c'est elle qui fait foi — pas ce que le composant croyait.
  */
  useEffect(() => setChecked(list.contains), [list.contains]);

  const onError = ({ error }: { error: { serverError?: string } }) => {
    toast.error(error.serverError ?? "Le rangement n'a pas abouti. Réessayez.");
    // On revient à l'état d'avant : la case ne doit jamais prétendre une écriture qui n'a pas eu lieu.
    setChecked(list.contains);
  };

  const add = useAction(addToList, { onError });
  const remove = useAction(removeFromList, { onError });
  const pending = add.isPending || remove.isPending;

  /*
    **La case bouge avant la réponse.** Attendre l'aller-retour ferait une case qui se coche une
    demi-seconde après le clic, ce qu'on lit comme un écran qui rame ; en cas d'échec, `onError` la
    remet où elle était et le toast dit pourquoi.
  */
  const toggle = (next: boolean) => {
    setChecked(next);
    const run = next ? add.execute : remove.execute;
    run({ listId: list.id, mediaId });
  };

  return (
    <li>
      {/*
        Le libellé enveloppe la case : toute la ligne devient cliquable, ce qui donne une cible
        largement au-dessus du minimum tactile là où une case seule fait seize pixels.
      */}
      <Label
        className="flex w-full items-center gap-3 rounded-md px-2 py-2.5 font-normal hover:bg-muted/50"
        htmlFor={checkboxId}
      >
        <Checkbox
          checked={checked}
          disabled={pending}
          id={checkboxId}
          onCheckedChange={(value) => toggle(value === true)}
        />
        <span className="min-w-0 flex-1 truncate" title={list.title}>
          {list.title}
        </span>
        {/* La place du témoin est réservée en permanence, sinon le titre sauterait à chaque clic. */}
        <span className="flex size-4 shrink-0 items-center justify-center">
          {pending ? <Spinner /> : null}
        </span>
      </Label>
    </li>
  );
}
