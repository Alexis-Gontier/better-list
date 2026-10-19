"use client";

import { CheckIcon, CopyIcon, LinkIcon, RotateCwIcon } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";
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
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { routes } from "@/config/routes";
import { shareList, unshareList } from "@/features/lists/server/lists.actions";
import type { ListDetail } from "@/features/lists/server/lists.queries";

/**
 * Partager une liste par lien non listé, et cesser de la partager (docs/conception.md §4.4).
 *
 * **Deux états, et un seul fait qui les distingue** : la liste porte un jeton, ou elle n'en porte
 * pas. Il n'y a pas d'énumération de visibilité — elle a été retirée par migration parce que deux
 * colonnes pour un fait finissent par se contredire. La fenêtre ne montre donc jamais un
 * interrupteur « privé / partagé » à côté d'un lien : le lien **est** l'état.
 *
 * **Le jeton n'entre jamais par ici.** `shareList` le fabrique côté serveur et le renvoie ; ce
 * composant ne fait que l'afficher. C'est ce qui garantit qu'il est imprévisible et que personne ne
 * peut se choisir une adresse.
 */
export function ShareListDialog({
  list,
  open,
  onOpenChange,
}: {
  list: ListDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [token, setToken] = useState(list.shareToken);
  const [copied, setCopied] = useState(false);
  const [confirmingRotation, setConfirmingRotation] = useState(false);

  /* La prop refait autorité : `revalidatePath` renvoie l'état réel après chaque écriture. */
  useEffect(() => setToken(list.shareToken), [list.shareToken]);

  const share = useAction(shareList, {
    onSuccess: ({ data }) => {
      if (data) setToken(data.shareToken);
      setConfirmingRotation(false);
    },
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Le partage n'a pas abouti. Réessayez."),
  });

  const unshare = useAction(unshareList, {
    onSuccess: () => {
      setToken(null);
      toast.success("Le lien a été révoqué. Il ne mène plus à rien.");
    },
    onError: ({ error }) =>
      toast.error(
        error.serverError ?? "La révocation n'a pas abouti. Réessayez.",
      ),
  });

  /*
    L'adresse se compose **dans le navigateur**, à partir de son propre origine : le serveur ne
    connaît pas l'hôte par lequel on l'atteint — localhost en développement, le domaine en
    production —, et coder une base en dur donnerait un lien qui ne marche que d'un côté.
  */
  const url = token
    ? `${window.location.origin}${routes.share.detail(token)}`
    : null;

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      // Le témoin retombe seul : un bouton qui reste « Copié » ment dès le geste suivant.
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // `navigator.clipboard` échoue hors HTTPS et sans permission. Le champ reste sélectionnable.
      toast.error("La copie a échoué. Sélectionnez le lien à la main.");
    }
  };

  return (
    <>
      <Dialog onOpenChange={onOpenChange} open={open}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Partager « {list.title} »</DialogTitle>
            <DialogDescription>
              {token
                ? "Toute personne qui a ce lien peut voir la liste, sans compte. Elle ne peut rien y modifier."
                : "Un lien non listé donne accès à cette liste sans compte. Il n'est pas indexé, mais il n'est protégé que par son adresse : n'envoyez que ce que vous acceptez de voir recopié."}
            </DialogDescription>
          </DialogHeader>

          {token && url ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                {/*
                  Le lien est **lisible et sélectionnable**, pas caché derrière un seul bouton
                  « Copier » : quand la copie automatique échoue — et elle échoue hors HTTPS —, il
                  reste la sélection à la main. `readOnly` plutôt que `disabled` : un champ désactivé
                  ne se sélectionne pas.
                */}
                <Input
                  aria-label="Lien de partage"
                  className="font-mono text-xs"
                  onFocus={(event) => event.currentTarget.select()}
                  readOnly
                  value={url}
                />
                <Button
                  aria-label="Copier le lien de partage"
                  onClick={copy}
                  size="icon"
                  variant="outline"
                >
                  {copied ? <CheckIcon /> : <CopyIcon />}
                </Button>
              </div>

              <p className="text-muted-foreground text-sm">
                Le lien ne dit pas qui le consulte, et rien ne le rend
                introuvable une fois recopié ailleurs. Révoquez-le dès qu'il n'a
                plus lieu d'être.
              </p>
            </div>
          ) : null}

          <DialogFooter>
            {token ? (
              <>
                {/*
                  **Régénérer est destructif**, et ça ne se voit pas : le geste tue l'ancien lien
                  sans rien afficher de ce qui était en cours. D'où une confirmation, comme pour la
                  révocation — c'est le même effet vu de l'autre côté.
                */}
                <Button
                  disabled={share.isPending || unshare.isPending}
                  onClick={() => setConfirmingRotation(true)}
                  variant="outline"
                >
                  {share.isPending ? (
                    <Spinner />
                  ) : (
                    <RotateCwIcon data-icon="inline-start" />
                  )}
                  Nouveau lien
                </Button>
                <Button
                  disabled={unshare.isPending || share.isPending}
                  onClick={() => unshare.execute({ listId: list.id })}
                  variant="destructive"
                >
                  {unshare.isPending ? <Spinner /> : null}
                  Ne plus partager
                </Button>
              </>
            ) : (
              <Button
                disabled={share.isPending}
                onClick={() => share.execute({ listId: list.id })}
              >
                {share.isPending ? (
                  <Spinner />
                ) : (
                  <LinkIcon data-icon="inline-start" />
                )}
                Créer un lien
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        onOpenChange={setConfirmingRotation}
        open={confirmingRotation}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remplacer le lien actuel ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'adresse d'aujourd'hui cessera aussitôt de fonctionner, y compris
              pour les personnes à qui vous l'avez déjà envoyée. Il n'y a pas
              d'historique : l'ancien lien ne revient pas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={share.isPending}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              disabled={share.isPending}
              onClick={(event) => {
                event.preventDefault();
                share.execute({ listId: list.id });
              }}
            >
              {share.isPending ? <Spinner /> : null}
              Remplacer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
