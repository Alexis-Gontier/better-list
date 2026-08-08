import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { routes } from "@/config/routes";
import { mediaTitle } from "@/features/media/lib/media-format";
import type { MediaCompact } from "@/features/media/schemas/media.schema";
import { getPreferences } from "@/features/preferences/server/preferences.queries";

/**
 * Vignette d'une œuvre : jaquette, titre, et une ligne de contexte libre.
 *
 * Typée sur `MediaCompact`, le plus petit denominateur commun — un `Media` complet le satisfait,
 * donc la même carte sert aux résultats de recherche, aux œuvres liées et aux recommandations.
 * C'est la promotion prévue par `docs/ARCHITECTURE.md` : elle a démarré dans le `_components/` de
 * la fiche, un deuxième appelant l'a fait monter ici.
 *
 * `meta` est volontairement une chaîne déjà formatée : la recherche y met « Série TV · 2023 », les
 * relations « Préquelle ». La carte ne décide pas de ce qui est pertinent selon le contexte.
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
}) {
  const { titleLanguage } = await getPreferences();
  const title = mediaTitle(media.title, titleLanguage);

  return (
    // `group` sur le conteneur et non sur le lien : le survol doit aussi agrandir la jaquette quand
    // la souris est sur le bouton, qui n'est plus un descendant du lien.
    <div className="group relative">
      <Link className="block space-y-1.5" href={routes.media(media.id)}>
        <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-muted">
          {media.coverImage?.large ? (
            <Image
              alt=""
              className="object-cover transition-transform group-hover:scale-105"
              fill
              /**
               * Ces vignettes ne dépassent jamais ~180 px de large. Sans `sizes`, Next servirait
               * l'image pleine largeur de viewport et téléchargerait bien plus que nécessaire.
               */
              sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 180px"
              src={media.coverImage.large}
            />
          ) : null}
        </div>

        <div className="space-y-0.5">
          {meta ? (
            <p className="text-muted-foreground text-xs">{meta}</p>
          ) : null}
          <p className="line-clamp-2 font-medium text-sm leading-snug group-hover:underline">
            {title}
          </p>
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
