import type { MetadataRoute } from "next";

/**
 * `robots.txt` — **tout est interdit à l'indexation, sans exception.**
 *
 * Ce n'est pas une précaution de façade : c'est la contrepartie directe du modèle de partage décrit
 * dans docs/PRODUCT.md §4.4. Une liste partagée s'ouvre sur `/l/<jeton>` **sans session**, et toute
 * sa confidentialité tient à ce que le jeton soit indevinable. Or un jeton n'a pas besoin d'être
 * deviné pour fuir : il suffit qu'une de ces adresses soit collée dans un espace qu'un robot
 * parcourt, ou qu'elle parte en `Referer` vers un site tiers, pour qu'elle devienne indexable — et
 * un secret indexé n'est plus un secret, il est cherchable.
 *
 * `disallow: "/"` couvre donc les trois publics d'un seul geste : l'application authentifiée (dont
 * rien n'a de raison d'être public), les écrans de connexion, et les listes partagées. Le cercle est
 * privé (§2) ; il n'y a **aucune** page dont on veuille du trafic de recherche, donc aucune règle
 * plus fine à écrire. Le jour où une page publique le mériterait, elle s'ajoutera en `allow`
 * explicite — l'inverse (tout ouvrir sauf ce qu'on pense à fermer) est le sens dans lequel on
 * oublie.
 *
 * Ce que ce fichier **ne fait pas**, et qu'il ne faut pas lui prêter : il n'interdit rien. Un robot
 * poli le respecte, un aspirateur d'URLs l'ignore, et il ne protège en rien contre quelqu'un qui
 * possède déjà le lien. La vraie garde reste le jeton de 144 bits
 * (`features/lists/lib/share-token.ts`) et `requireApprovedUser()` pour le reste.
 *
 * Pas de `sitemap` : il n'y a rien à annoncer à un moteur auquel on refuse tout.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
