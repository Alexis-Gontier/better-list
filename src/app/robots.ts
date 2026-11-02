import type { MetadataRoute } from "next";

/**
 * `robots.txt` — **tout est interdit à l'indexation, sauf la landing à la racine.**
 *
 * Ce n'est pas une précaution de façade : c'est la contrepartie directe du modèle de partage décrit
 * dans docs/conception.md §4.4. Une liste partagée s'ouvre sur `/l/<jeton>` **sans session**, et toute
 * sa confidentialité tient à ce que le jeton soit indevinable. Or un jeton n'a pas besoin d'être
 * deviné pour fuir : il suffit qu'une de ces adresses soit collée dans un espace qu'un robot
 * parcourt, ou qu'elle parte en `Referer` vers un site tiers, pour qu'elle devienne indexable — et
 * un secret indexé n'est plus un secret, il est cherchable.
 *
 * `disallow: "/"` couvre donc les trois publics d'un seul geste : l'application authentifiée, les
 * écrans de connexion, et les listes partagées. Une seule exception, explicite : `/` lui-même, qui
 * sert la landing à qui n'a pas de session (spec refonte §1, révise D8).
 *
 * Ce que ce fichier **ne fait pas**, et qu'il ne faut pas lui prêter : il n'interdit rien. Un robot
 * poli le respecte, un aspirateur d'URLs l'ignore, et il ne protège en rien contre quelqu'un qui
 * possède déjà le lien. La vraie garde reste le jeton de 144 bits
 * (`features/lists/lib/share-token.ts`) et `requireApprovedUser()` pour le reste.
 *
 * Pas de `sitemap` : une seule page publique, la racine, n'a rien à annoncer.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      // `/$` : la racine seule, qui sert la landing aux robots (ils n'ont pas de cookie). Tout le
      // reste reste fermé, listes partagées comprises.
      allow: "/$",
      disallow: "/",
    },
  };
}
