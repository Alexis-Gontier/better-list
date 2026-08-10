"use client";

import { BookmarkPlusIcon, PencilIcon, XIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EntryForm } from "@/features/tracking/components/entry-form";
import type { EntryUnit } from "@/features/tracking/lib/entry-format";
import type { EntryState } from "@/features/tracking/lib/entry-transition";

/**
 * Le suivi, modifiable sans quitter la grille.
 *
 * Le « +1 » couvre le geste fréquent (docs/PRODUCT.md §6) ; tout le reste — corriger une
 * progression, noter, changer de statut, dater — demandait jusqu'ici d'ouvrir la fiche et de
 * revenir. Sur un écran qui sert justement à faire le tour de ses séries, ces deux navigations
 * coûtaient plus que le geste.
 *
 * Elle édite **tous** les champs du suivi, pas une sélection : une fenêtre qui n'en aurait su
 * changer que trois sur huit aurait obligé à deviner lequel manque, et à repasser par la fiche pour
 * le reste — soit exactement le détour qu'elle supprime. La disposition, elle, n'est pas celle du
 * panneau de la fiche : en large, les champs tiennent en trois colonnes, et l'enregistrement est
 * explicite (voir `EntryForm`).
 *
 * L'état arrive **déjà chargé** par la page : la vignette le reçoit de la même ligne que sa
 * progression. Ouvrir la fenêtre ne coûte donc aucune requête, au prix de champs sérialisés pour
 * des cartes qu'on n'ouvrira pas — un compromis assumé pour une grille de vingt-quatre.
 */
export function EntryDialog({
  mediaId,
  title,
  image,
  entry,
  total,
  unit,
}: {
  mediaId: number;
  /** Le titre déjà résolu dans la langue du compte : la fenêtre ne relit pas les préférences. */
  title: string;
  /**
   * La bannière de l'œuvre, à défaut sa jaquette. Décoratif, et c'est pour ça que l'appelant a le
   * droit de n'en avoir aucune : la fenêtre s'ouvre alors sur un simple aplat.
   */
  image?: string | null;
  /** `null` tant que l'œuvre n'est pas suivie — la fenêtre sert alors à l'ajouter. */
  entry: EntryState | null;
  total: number | null;
  unit: EntryUnit;
}) {
  const [open, setOpen] = useState(false);

  /**
   * Le déclencheur dit ce que le clic va faire, et les deux cas ne font pas la même chose : l'un
   * corrige un suivi existant, l'autre en crée un. Un « modifier » posé sur une œuvre qu'on ne suit
   * pas annoncerait une correction là où c'est un engagement, et un crayon sur une grille de
   * recherche ne se lit pas comme une invitation à commencer.
   *
   * **Un marque-page, et surtout pas un `+`.** Sur une vignette, le `+` est déjà pris : c'est le
   * « +1 » de `EntryQuickProgress`, qui avance d'un épisode. Les deux boutons ne sont jamais
   * visibles en même temps sur une même carte — l'un remplace l'autre selon que l'œuvre est suivie —
   * mais ils cohabitent dans la même grille, à quelques centimètres, et deux gestes très différents
   * sous la même icône finissent par s'apprendre l'un pour l'autre.
   */
  const label = entry ? `Modifier le suivi de ${title}` : `Suivre ${title}`;

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button
          aria-label={label}
          /**
           * Mêmes classes de révélation que le « +1 » : les deux boutons se découvrent ensemble au
           * survol et restent visibles au doigt, où aucun survol n'existe. Le `secondary` les
           * départage — avancer d'un épisode reste le geste principal, modifier est le recours.
           *
           * **Sur une œuvre non suivie, le bouton est plein et permanent.** Il est seul sur la
           * jaquette, donc il n'a personne à qui céder le premier rôle ; et une grille de résultats
           * est précisément l'endroit où l'on ne sait pas encore qu'on peut suivre quelque chose —
           * une commande qui n'apparaît qu'au survol y resterait invisible pour qui ne survole pas.
           */
          className={
            entry
              ? "size-7 rounded-full opacity-0 shadow-sm transition-opacity focus-visible:opacity-100 group-hover:opacity-100 max-sm:opacity-100"
              : "size-7 rounded-full shadow-sm"
          }
          size="icon"
          title={label}
          type="button"
          variant={entry ? "secondary" : "default"}
        >
          {entry ? <PencilIcon /> : <BookmarkPlusIcon />}
        </Button>
      </DialogTrigger>

      {/*
        Sans rembourrage propre : la bannière touche les bords, et c'est le corps qui porte le sien.
        La fenêtre est plus large que la valeur par défaut pour tenir trois colonnes, et défile
        au-delà de la hauteur d'écran — le bouton d'enregistrement doit rester atteignable sur un
        portable.
      */}
      <DialogContent
        className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-2xl"
        showCloseButton={false}
      >
        <div className="relative">
          {/*
            Une bande d'image, et un dégradé qui la fond dans la fenêtre : sans lui, la limite entre
            la jaquette et le formulaire tombe au hasard des couleurs de l'œuvre, et le titre posé
            juste dessous se retrouve parfois sur un aplat clair.
          */}
          {/*
            **Le fond de la bande est celui du panneau, pas `muted`.** La fenêtre est centrée par
            translation, donc elle tombe sur des demi-pixels : le bord bas du calque de dégradé et
            celui de la bande ne coïncident pas tout à fait, et le fond du conteneur transparaissait
            dans l'interstice — un liseré clair d'un pixel en travers de la fenêtre. Avec la même
            couleur de part et d'autre, l'arrondi du navigateur n'a plus rien à révéler.
          */}
          <div className="relative h-28 w-full overflow-hidden bg-popover sm:h-36">
            {image ? (
              <Image
                alt=""
                className="object-cover"
                fill
                // La fenêtre plafonne à 672 px (`sm:max-w-2xl`) ; au-delà, l'image serait rendue
                // plus grande que sa boîte.
                sizes="(max-width: 672px) 100vw, 672px"
                src={image}
              />
            ) : null}
            {/*
              **Le dégradé atteint l'opacité pleine avant le bas de la bande**, et c'est tout
              l'intérêt des positions d'arrêt. Sans elles, l'image restait visible à 90 % de la
              hauteur puis s'arrêtait net au bord : la rupture se lisait comme un trait en travers
              de la fenêtre, d'autant plus net que la jaquette est claire.
            */}
            <div className="absolute inset-0 bg-linear-to-b from-transparent via-popover/60 via-55% to-popover to-88%" />
          </div>

          {/*
            Fermeture posée sur l'image, avec son propre fond : le bouton par défaut de la fenêtre
            est transparent, et une croix sombre sur une bannière sombre disparaît.
          */}
          <DialogClose asChild>
            <Button
              aria-label="Fermer"
              className="absolute top-2 right-2 rounded-full bg-background/70 backdrop-blur-xs hover:bg-background"
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <XIcon />
            </Button>
          </DialogClose>
        </div>

        <div className="space-y-5 p-5 pt-3">
          <div>
            <DialogTitle className="text-left text-lg leading-tight">
              {title}
            </DialogTitle>
            {/*
              Annoncée mais pas dessinée : la maquette n'a pas de sous-titre — les intitulés des
              champs disent déjà ce que la fenêtre fait —, mais un dialogue sans description laisse
              un lecteur d'écran ouvrir une boîte dont il ne sait rien.
            */}
            <DialogDescription className="sr-only">
              Statut, progression, note, dates et notes personnelles de cette
              œuvre.
            </DialogDescription>
          </div>

          <EntryForm
            entry={entry}
            mediaId={mediaId}
            /**
             * Enregistrer **et** retirer ferment la fenêtre. Le second surtout : elle éditerait
             * sinon un suivi qui n'existe plus, que le premier clic recréerait.
             */
            onRemoved={() => setOpen(false)}
            onSaved={() => setOpen(false)}
            total={total}
            unit={unit}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
