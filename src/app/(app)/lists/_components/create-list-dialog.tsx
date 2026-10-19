"use client";

import { PlusIcon } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ListFormDialog } from "@/features/lists/components/list-form-dialog";
import { createList } from "@/features/lists/server/lists.actions";

/**
 * Le geste qui fait naître une liste — **le seul endroit du produit où ça arrive**.
 *
 * Décision d'Alexis du 6 septembre 2026 : la fenêtre « Ajouter à une liste » de la fiche ne créera
 * pas, elle ne fera que ranger dans ce qui existe. Un seul formulaire à dessiner et à tenir.
 *
 * Il est posé deux fois sur le même écran — en tête, et dans l'état vide — parce que ce sont deux
 * moments différents : l'un pour qui a déjà des listes et en veut une de plus, l'autre pour qui n'en
 * a aucune et ne saurait pas où chercher. C'est le même composant, donc pas deux formulaires.
 *
 * **Le bouton est plein aux deux endroits** — décision d'Alexis du 6 septembre 2026, prise à
 * l'écran. Il avait démarré en `outline` en tête de page, par application du principe « la jaquette
 * est la seule chose colorée » ; mais créer une liste est bien l'action que cet écran propose, et
 * c'est l'un des quatre emplois de l'accent que la spec du 2 septembre autorise. Un seul réglage
 * pour les deux emplacements, donc plus de propriété du tout.
 */
export function CreateListDialog() {
  const [open, setOpen] = useState(false);

  /*
    `onSuccess` referme la fenêtre **quand le serveur a répondu**, jamais au clic : refermer au clic
    montrerait une création réussie sur une écriture échouée. C'est le gabarit d'`entry-quick-edit`.

    La grille se rafraîchit toute seule — `createList` appelle `revalidatePath(routes.lists.root)`,
    donc il n'y a rien à recharger à la main ici.
  */
  const { execute, isPending, result } = useAction(createList, {
    onSuccess: () => setOpen(false),
    onError: ({ error }) =>
      toast.error(
        error.serverError ?? "La liste n'a pas été créée. Réessayez.",
      ),
  });

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <PlusIcon data-icon="inline-start" />
        Nouvelle liste
      </Button>

      <ListFormDialog
        fieldErrors={result.validationErrors?.fieldErrors}
        heading="Nouvelle liste"
        onOpenChange={setOpen}
        onSubmit={({ title, description }) =>
          /*
            La description part `undefined` quand elle est vide, et pas chaîne vide : le schéma la
            veut nullable et facultative, et « je n'ai rien écrit » n'est pas « j'ai écrit rien ».
          */
          execute({ title, description: description.trim() || undefined })
        }
        open={open}
        pending={isPending}
        submitLabel="Créer"
      />
    </>
  );
}
