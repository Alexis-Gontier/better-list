"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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

/**
 * Publier une liste derrière un lien non listé, ou reprendre ce lien (docs/PRODUCT.md §4.4).
 *
 * **Sa propre fenêtre, séparée de « Modifier ».** Renommer une liste et l'exposer hors du cercle
 * n'ont ni la même portée ni le même défaire ; les mettre dans le même formulaire ferait
 * d'« Enregistrer » un bouton dont on ne mesure plus les conséquences. C'est aussi pour ça que le
 * partage a ses propres actions plutôt qu'un champ de `updateList`.
 *
 * La fenêtre dit **ce que le lien permet**, en toutes lettres : qui l'a peut lire, sans compte. Un
 * partage qu'on ne comprend pas est un partage qu'on regrette.
 */
export function ShareListDialog({
  listId,
  shareToken,
  open,
  onOpenChange,
}: {
  listId: string;
  /** Le jeton actuel, ou `null` si la liste n'est pas partagée. C'est la seule marque du partage. */
  shareToken: string | null;
  /** Contrôlé depuis `ListActions` — voir `EditListDialog` pour la raison. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [copied, setCopied] = useState(false);

  const share = useAction(shareList, {
    onError: () => toast.error("Le lien n'a pas pu être créé."),
  });

  const unshare = useAction(unshareList, {
    onSuccess: () => toast.success("Le lien ne fonctionne plus."),
    onError: () => toast.error("Le partage n'a pas pu être retiré."),
  });

  /**
   * Le jeton de la réponse prend le pas sur celui du serveur, le temps que la page revalide : sans
   * ça, créer un lien laisserait la fenêtre afficher « pas encore partagée » alors qu'elle vient de
   * l'être.
   */
  const token = share.result?.data?.shareToken ?? shareToken;
  const isShared = token !== null && !unshare.result?.data?.unshared;

  /**
   * L'URL est assemblée **dans le navigateur**, à partir de l'origine réelle de la page.
   *
   * La construire côté serveur aurait demandé de faire descendre `NEXT_PUBLIC_APP_URL` jusqu'ici,
   * et cette variable vaut l'adresse de production : en développement, on aurait copié un lien qui
   * ne mène pas à la machine sur laquelle on le teste.
   */
  const url =
    isShared && token && typeof window !== "undefined"
      ? `${window.location.origin}${routes.share.detail(token)}`
      : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      // Le retour à l'icône initiale dit que la commande est de nouveau disponible ; sans lui, un
      // second copier n'aurait aucun signe visible.
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // `navigator.clipboard` échoue hors HTTPS et quand la permission est refusée. Le champ est en
      // lecture, pas désactivé : il reste sélectionnable à la main, et c'est ce que dit le message.
      toast.error("Copie impossible — sélectionnez le lien pour le copier.");
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Partager cette liste</DialogTitle>
          <DialogDescription>
            {isShared
              ? "Toute personne qui a ce lien peut voir la liste, sans compte. Elle n'apparaît nulle part ailleurs et n'est pas indexée par les moteurs de recherche."
              : "Un lien non listé rend cette liste lisible par qui le possède, sans compte. Vous pourrez le retirer à tout moment."}
          </DialogDescription>
        </DialogHeader>

        {isShared ? (
          <div className="flex items-center gap-2">
            <Input
              aria-label="Lien de partage"
              className="font-mono text-xs"
              onFocus={(event) => event.currentTarget.select()}
              readOnly
              value={url}
            />

            <Button
              aria-label="Copier le lien"
              onClick={copy}
              size="icon"
              variant="outline"
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
            </Button>
          </div>
        ) : null}

        <DialogFooter>
          {isShared ? (
            <Button
              disabled={unshare.isPending}
              onClick={() => unshare.execute({ listId })}
              variant="outline"
            >
              {unshare.isPending ? <Spinner /> : null}
              Ne plus partager
            </Button>
          ) : (
            <Button
              disabled={share.isPending}
              onClick={() => share.execute({ listId })}
            >
              {share.isPending ? <Spinner /> : null}
              Créer un lien
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
