import { StarIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { routes } from "@/config/routes";
import { mediaTitle } from "@/features/media/lib/media-format";
import type { MediaCompact } from "@/features/media/schemas/media.schema";
import { getPreferences } from "@/features/preferences/server/preferences.queries";

/**
 * Vignette d'une œuvre : jaquette, titre sur une ligne, et ce que j'en sais dessous.
 *
 * Typée sur `MediaCompact`, le plus petit denominateur commun — un `Media` complet le satisfait,
 * donc la même carte sert aux résultats de recherche, aux œuvres liées et aux recommandations.
 * C'est la promotion prévue par `docs/ARCHITECTURE.md` : elle a démarré dans le `_components/` de
 * la fiche, un deuxième appelant l'a fait monter ici.
 *
 * **La jaquette est rendue nue.** Ni genres au survol, ni moyenne de la communauté : dans une
 * grille, l'image est ce qui fait s'arrêter, et chaque pastille posée dessus en mangeait un coin
 * pour une information dont on ne se sert qu'après avoir cliqué. Tout ce qui se lit est descendu
 * sous elle, où rien ne se dispute la place — seuls le « 18+ » et la barre de progression restent,
 * l'un parce qu'il qualifie l'image, l'autre parce qu'il se voit sans se lire.
 *
 * `meta` est volontairement une chaîne déjà formatée : la bibliothèque y met « En cours », le
 * tableau de bord « En pause · depuis 8 mois ». La carte ne décide pas de ce qui est pertinent
 * selon le contexte.
 */
/**
 * Elle lit la préférence de titre **elle-même** plutôt que de la recevoir en propriété.
 *
 * Cinq écrans rendent cette carte, dont certains à trois niveaux de profondeur : faire descendre le
 * réglage jusqu'ici traverserait toute l'arborescence pour une chaîne de caractères. `getPreferences`
 * porte le `cache` de React, donc les vingt-quatre cartes d'une page ne coûtent qu'une requête.
 *
 * Ce n'est possible que parce qu'aucun composant client ne rend `MediaCard` — un `await` ici le
 * casserait.
 */
export async function MediaCard({
  media,
  meta,
  action,
  progress,
  score,
}: {
  media: MediaCompact;
  meta?: string | null;
  /**
   * Une commande posée sur la jaquette — le « +1 » de la bibliothèque et du tableau de bord.
   *
   * Elle est rendue **à côté** du lien et non dedans : un bouton imbriqué dans une ancre est du
   * HTML invalide, et les technologies d'assistance n'ont alors aucun moyen d'annoncer deux
   * commandes qui n'en font qu'une. C'est aussi ce qui permet au clic sur le bouton de ne pas
   * ouvrir la fiche.
   */
  action?: ReactNode;
  /**
   * Où j'en suis : en chiffres sous la jaquette, et en barre au ras de son bas.
   *
   * `label` est déjà formaté par l'appelant — « 12 / 24 », ou « 12 » quand le total est inconnu —,
   * comme `meta` et pour la même raison : la carte ne décide pas de la façon de compter. Même forme
   * que `MediaRow`, pour que la bascule entre les deux vues ne perde rien.
   *
   * La barre, elle, exige un dénominateur : sans total il n'y a pas de fraction à dessiner, et une
   * barre à moitié pleine par défaut mentirait.
   */
  progress?: { value: number; total: number | null; label: string | null };
  /**
   * **Ma** note, déjà mise à l'échelle du compte (« 4/5 », « 8/10 »).
   *
   * La moyenne AniList (`media.averageScore`) n'a pas d'équivalent ici : elle reste sur la fiche,
   * où elle est comparable au reste. Dans une grille, le verdict d'une foule qu'on ne connaît pas
   * ne fait pas ouvrir une œuvre, et il occupait la place de ce qui la fait ouvrir.
   *
   * Une chaîne et non un nombre : l'échelle d'affichage est un réglage du domaine `tracking`
   * (docs/PRODUCT.md §4.2), et la faire convertir ici coupleraient la carte à un domaine qu'elle
   * n'a aucune raison de connaître.
   */
  score?: string | null;
}) {
  const { titleLanguage } = await getPreferences();
  const title = mediaTitle(media.title, titleLanguage);

  const ratio =
    progress?.total && progress.total > 0
      ? Math.min(progress.value / progress.total, 1)
      : null;

  return (
    // `group` sur le conteneur et non sur le lien : le survol doit aussi agrandir la jaquette quand
    // la souris est sur le bouton, qui n'est plus un descendant du lien.
    <div className="group relative">
      <Link className="block" href={routes.media(media.id)}>
        {/*
          Un liseré permanent, et **rien de plus au focus** : le contour natif du navigateur cerne
          déjà tout le lien, titre compris, ce qui décrit mieux la cible qu'un anneau posé sur la
          seule jaquette. Doubler les deux donnait deux cadres concentriques sans rien ajouter.
        */}
        <div className="relative aspect-2/3 overflow-hidden rounded-lg bg-muted ring-1 ring-border/60 transition-shadow group-hover:shadow-lg">
          {media.coverImage?.large ? (
            <Image
              alt=""
              className="object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none"
              fill
              /**
               * Ces vignettes ne dépassent jamais ~180 px de large. Sans `sizes`, Next servirait
               * l'image pleine largeur de viewport et téléchargerait bien plus que nécessaire.
               */
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 180px"
              src={media.coverImage.large}
            />
          ) : null}

          {/*
            La seule pastille qui reste sur la jaquette, et elle y est parce qu'elle qualifie
            l'image : c'est ce qu'on veut lire **avant** de la regarder, pas sous elle. Fond opaque,
            comme toute pastille posée sur une image quelconque — le contraste d'un texte blanc sur
            une jaquette claire n'est garanti par rien.
          */}
          {media.isAdult ? (
            <div className="pointer-events-none absolute top-1.5 left-1.5">
              <span className="rounded-md bg-destructive px-1.5 py-0.5 font-semibold text-[10px] text-white shadow-sm">
                18+
              </span>
            </div>
          ) : null}

          {/*
            La barre reste sur la jaquette là où les chiffres sont descendus dessous : elle ne se
            lit pas, elle se voit — c'est ce qui permet de repérer une série presque finie en
            balayant une grille, sans lire une seule fraction.
          */}
          {ratio !== null ? (
            <div className="absolute inset-x-0 bottom-0 h-1 bg-black/50">
              <div
                className="h-full bg-primary transition-[width] duration-300 motion-reduce:transition-none"
                style={{ width: `${Math.round(ratio * 100)}%` }}
              />
            </div>
          ) : null}
        </div>

        <div className="mt-2 space-y-0.5">
          {/*
            **Une seule ligne, coupée aux points de suspension.** Deux lignes faisaient varier la
            hauteur d'une carte à l'autre selon la longueur du titre, donc décalaient tout ce qui la
            suit : dans une grille, une rangée dont chaque colonne commence à une hauteur différente
            se lit comme un escalier. Le titre complet reste dans l'`title` du lien et sur la fiche.
          */}
          <p
            className="truncate font-medium text-sm leading-snug transition-colors group-hover:text-primary"
            title={title}
          >
            {title}
          </p>

          {/*
            Ma note et ma progression, sous la jaquette et non plus dessus.

            Posées sur l'image, elles en cachaient un coin et demandaient un fond opaque pour rester
            lisibles sur n'importe quelle jaquette ; ici elles ne coûtent rien à personne et se
            lisent dans le même mouvement que le titre. `tabular-nums` pour que la colonne de
            chiffres s'aligne d'une carte à l'autre.
          */}
          {score || progress?.label ? (
            <p className="flex items-center gap-2 font-medium text-foreground text-xs tabular-nums">
              {score ? (
                <span className="flex items-center gap-0.5">
                  <StarIcon
                    aria-hidden="true"
                    className="size-3 fill-primary text-primary"
                  />
                  <span className="sr-only">Ma note : </span>
                  {score}
                </span>
              ) : null}

              {progress?.label ? (
                <span>
                  <span className="sr-only">Progression : </span>
                  {progress.label}
                </span>
              ) : null}
            </p>
          ) : null}

          {meta ? (
            <p className="truncate text-muted-foreground text-xs">{meta}</p>
          ) : null}
        </div>
      </Link>

      {/*
        Coin haut-droit de la jaquette : le conteneur commence là où l'image commence, donc la
        position ne dépend pas de la hauteur du titre — qui va de une à deux lignes selon l'œuvre.
      */}
      {action ? (
        <div className="absolute top-1.5 right-1.5">{action}</div>
      ) : null}
    </div>
  );
}
