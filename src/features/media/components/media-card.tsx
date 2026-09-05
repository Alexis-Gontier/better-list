import Image from "next/image";
import Link from "next/link";

import { routes } from "@/config/routes";
import { mediaTitle } from "@/features/media/lib/media-format";
import type { MediaCompact } from "@/features/media/schemas/media.schema";
import type { TitleLanguage } from "@/features/preferences/schemas/preferences.schema";

/**
 * La carte d'une œuvre — **la version la plus simple qui tienne debout** : une jaquette, un titre.
 *
 * Pas de note, pas de badge de format, pas de survol : la spec du 2 septembre prévoit que la méta
 * remonte dans une hover card et que la carte porte trois leviers de signature, mais tout ça se
 * décide **une fois qu'on a vu la grille**. On pose le squelette d'abord, et on ajoute ce qui
 * manque en le regardant plutôt qu'en l'imaginant.
 *
 * Elle a démarré dans le `_components/` de `/search` et **a été promue ici le 6 septembre 2026,
 * quand `/library` en a eu besoin** : deuxième route, donc `features/media/components/`, la maison
 * d'un composant qui connaît une entité métier (`MediaCompact`, `mediaTitle`, `routes.media`).
 * C'est la règle de promotion d'ARCHITECTURE.md appliquée à la lettre — celle qui avait été
 * enfreinte en connaissance de cause pour les contrôles de suivi, promus avant leur deuxième
 * appelant.
 *
 * Composant **serveur** : il ne fait que rendre du texte et une image. Le rendre client
 * embarquerait la grille entière dans le bundle pour aucun interactif.
 */

type MediaCardProps = {
  media: MediaCompact;
  titleLanguage: TitleLanguage;
  /**
   * Charger la jaquette **sans attendre**, pour la première rangée seulement.
   *
   * `next/image` diffère tout par défaut, ce qui est juste pour vingt et une vignettes dont la
   * plupart sont sous la ligne de flottaison — mais la toute première est le plus grand élément
   * affiché de la page, donc sa mesure de LCP. La différer, c'est retarder le seul instant que
   * mesure cette métrique. Next le signale d'ailleurs en clair dans la console.
   *
   * À ne donner qu'à ce qui est réellement visible au chargement : tout marquer prioritaire revient
   * à ne rien prioriser, et fait concurrencer la première image par vingt autres.
   */
  priority?: boolean;
};

export function MediaCard({ media, titleLanguage, priority }: MediaCardProps) {
  const cover = media.coverImage?.extraLarge ?? media.coverImage?.large ?? null;
  const title = mediaTitle(media.title, titleLanguage);

  return (
    /*
      **Pas de préchargement, et c'est le quota qui décide.** Next précharge par défaut les liens
      qui entrent dans le champ de vision. Chaque préchargement de `/media/[id]` exécute la
      `generateMetadata` de la fiche, qui appelle AniList : sur une grille de vingt et une cartes,
      faire défiler la recherche pourrait donc dépenser jusqu'à vingt et une des trente requêtes que
      la minute partage entre tous les visiteurs (docs/recherche-filtres.md), sans que personne
      n'ait cliqué.

      **Non vérifié à l'écran, et ça ne peut pas l'être ici** : Next désactive le préchargement des
      liens en développement — le journal réseau ne montre aucune requête vers `/media/*`. C'est
      donc une précaution raisonnée, pas une mesure. À confirmer sur un déploiement, en regardant si
      une grille affichée sans clic consomme du quota.

      Ce qu'on perd est une navigation un peu moins instantanée vers une fiche. Ce qu'on garde est
      la seule ressource que ce projet ne peut pas acheter.
    */
    <Link
      className="flex flex-col gap-2"
      href={routes.media(media.id)}
      prefetch={false}
    >
      {/*
        Le rapport 2:3 est posé sur le conteneur et non sur l'image : c'est ce qui **réserve la
        place avant le chargement**, donc ce qui empêche la grille de sauter quand les jaquettes
        arrivent une à une. Une œuvre sans jaquette occupe alors exactement la même case qu'une
        autre, au lieu de tasser sa rangée.

        Le liseré est **interne** (`inset`) plutôt qu'une bordure : une bordure ajouterait un pixel
        à la boîte et désalignerait les cartes entre elles. Il encastre la jaquette au lieu de
        l'entourer — c'est le premier des trois leviers de signature de la spec du 2 septembre, et
        le seul qui ne coûte rien à poser tout de suite.
      */}
      <div className="relative aspect-2/3 overflow-hidden rounded-md bg-muted shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]">
        {cover ? (
          <Image
            alt=""
            className="object-cover"
            fill
            priority={priority}
            /*
              Les tailles suivent les paliers de la grille — sans elles, `next/image` sert une
              image pleine largeur de viewport pour une vignette de 140 px, soit dix fois trop de
              pixels sur une page qui en affiche vingt et une.
            */
            sizes="(min-width: 1280px) 12vw, (min-width: 1024px) 16vw, (min-width: 640px) 25vw, 45vw"
            src={cover}
          />
        ) : null}
      </div>

      {/*
        **Le titre tient sur une ligne**, coupé au besoin — décision d'Alexis du 6 septembre 2026.
        Sur deux lignes, la hauteur des cartes variait d'une rangée à l'autre selon la longueur des
        titres, et la grille perdait son alignement horizontal ; sur une, toutes les cartes font
        exactement la même hauteur. Le titre complet reste accessible par l'infobulle native du
        navigateur, que `truncate` déclenche sur le texte coupé.

        `alt=""` sur l'image, à dessein : le titre est juste là, en texte. Le répéter ferait lire
        deux fois la même chose à un lecteur d'écran.
      */}
      <p className="truncate text-xs" title={title}>
        {title}
      </p>
    </Link>
  );
}
