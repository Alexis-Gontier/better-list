"use client";

import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { routes } from "@/config/routes";
import { deleteList } from "@/features/lists/server/lists.actions";
import type { ListDetail } from "@/features/lists/server/lists.queries";

/**
 * Supprimer une liste — **en tapant son nom**.
 *
 * Un « Êtes-vous sûr ? » suivi d'un bouton rouge se clique par réflexe : c'est deux clics au même
 * endroit, et la deuxième fenêtre est déjà lue comme une formalité au bout de la troisième fois.
 * Faire recopier le nom impose de **regarder ce qu'on détruit** et rend l'erreur de visée
 * impossible — on ne supprime pas la mauvaise liste en cliquant vite.
 *
 * C'est réservé à ce geste-ci, et c'est ce qui lui garde sa force : le retrait d'une œuvre d'une
 * liste se recoche, et il n'aura jamais cette fenêtre. Une friction posée partout ne freine plus
 * rien.
 *
 * **Ce que la fenêtre dit avant de demander quoi que ce soit** : combien d'œuvres partent, et ce
 * qui ne part pas. `ListItem` tombe en cascade et l'ordre ne se reconstitue pas ; les œuvres, elles,
 * vivent dans le miroir partagé et restent dans le catalogue comme dans les autres listes.
 */
export function DeleteListDialog({
  list,
  open,
  onOpenChange,
}: {
  list: ListDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const inputId = useId();
  const [typed, setTyped] = useState("");

  /*
    Le champ repart vide **à l'ouverture** et pas à la fermeture : une fenêtre Radix reste montée le
    temps de son animation de sortie, et la vider en sortant se verrait.
  */
  useEffect(() => {
    if (open) setTyped("");
  }, [open]);

  const { execute, isPending } = useAction(deleteList, {
    /*
      On repart vers `/lists` : la page qu'on regarde affiche la liste qu'on vient de supprimer, donc
      y rester donnerait un 404 au prochain rafraîchissement. `revalidatePath` ne peut rien pour une
      page dont la donnée n'existe plus — c'est une navigation qu'il faut, pas une purge de cache.
    */
    onSuccess: () => {
      onOpenChange(false);
      toast.success(`« ${list.title} » a été supprimée.`);
      router.push(routes.lists.root);
    },
    onError: ({ error }) =>
      toast.error(
        error.serverError ?? "La suppression n'a pas abouti. Réessayez.",
      ),
  });

  /*
    `trim()` des deux côtés, et rien de plus : on pardonne l'espace de trop que colle un
    copier-coller, pas une casse ou un accent différents. Comparer sans tenir compte de la casse
    reviendrait à accepter « top 10 anime » pour « Top 10 Anime » — deux listes qui peuvent
    parfaitement coexister ici, et c'est précisément la confusion que cette fenêtre existe pour
    empêcher.
  */
  const matches = typed.trim() === list.title.trim();

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer « {list.title} » ?</AlertDialogTitle>
          <AlertDialogDescription>
            {deletionWarning(list.itemCount)} Les œuvres restent dans le
            catalogue et dans vos autres listes ; c'est la liste et son ordre
            qui disparaissent, sans retour possible.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/*
          Un vrai `<form>` : c'est lui qui fait marcher la touche Entrée. Sans lui, on tape le nom
          puis on doit viser un bouton à la souris, ce qui casse le geste au moment précis où il
          demande de l'attention.
        */}
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (matches && !isPending) execute({ listId: list.id });
          }}
        >
          {/*
            **Le libellé est visible, et il porte le nom à recopier.** Le mettre en `placeholder`
            l'aurait fait disparaître à la première frappe — c'est-à-dire au moment exact où on en a
            besoin pour vérifier ce qu'on tape.
          */}
          <Label className="flex-wrap gap-1.5" htmlFor={inputId}>
            Pour confirmer, tapez
            {/*
              Le nom dans une puce bordée, en chasse fixe : en médium sur le fond de la fenêtre, il
              ne se distinguait pas d'un mot mis en valeur, et on ne voyait plus où commençait et
              finissait la chaîne à recopier. **`bg-muted` seul ne suffisait pas** — vu à l'écran, il
              est trop proche du fond d'une `popover` en thème sombre pour dessiner quoi que ce soit ;
              d'où le liseré, et le fond de page plutôt que la surface. Les espaces d'un titre qui en
              porte deux à la suite deviennent visibles ainsi, ce qui est exactement ce qu'il faut
              quand on demande une correspondance exacte.

              `select-all` : un clic sélectionne le nom entier. On ne bloque pas le copier-coller —
              la friction recherchée est de **regarder** ce qu'on détruit, pas de faire une dictée.
            */}
            <span className="select-all rounded border bg-background px-1.5 py-0.5 font-mono font-normal text-foreground">
              {list.title}
            </span>
          </Label>
          <Input
            /*
              Aucune aide du navigateur : la saisie doit être un geste conscient, pas une
              complétion. `autoComplete="off"` écarte l'historique, les trois autres écartent la
              correction et la majuscule automatique des claviers mobiles — qui transformeraient
              « top 10 » en « Top 10 » et feraient échouer une comparaison sensible à la casse.
            */
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            id={inputId}
            onChange={(event) => setTyped(event.target.value)}
            spellCheck={false}
            value={typed}
          />
        </form>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
          {/*
            Désarmé tant que le nom ne correspond pas, **et pas seulement refusé au clic** : un
            bouton qui accepte le clic pour répondre « ce n'est pas le bon nom » fait deviner la
            règle après coup. Ici l'état du bouton est la règle, lisible avant d'essayer.

            `preventDefault` sur le clic : sans lui, Radix referme la fenêtre au choix, donc le
            composant serait démonté avant la fin de l'appel — l'attente ne se verrait nulle part, et
            un échec afficherait son toast au-dessus d'une fenêtre déjà fermée.
          */}
          <AlertDialogAction
            className={buttonVariants({ variant: "destructive" })}
            disabled={!matches || isPending}
            onClick={(event) => {
              event.preventDefault();
              execute({ listId: list.id });
            }}
          >
            {isPending ? <Spinner /> : null}
            Supprimer définitivement
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** « Cette liste est vide. » / « Cette liste contient 17 œuvres. » — le chiffre avant la décision. */
function deletionWarning(count: number): string {
  if (count === 0) return "Cette liste est vide.";
  return count === 1
    ? "Cette liste contient 1 œuvre."
    : `Cette liste contient ${count} œuvres.`;
}
