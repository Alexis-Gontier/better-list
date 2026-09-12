export const site = {
  name: "Better-List",
  description:
    "Créez, partagez et suivez des listes. Vos favoris, vos envies, vos découvertes — au même endroit.",

  /**
   * La source de tout le catalogue, et **l'attribution que ses CGU attendent** (docs/PRODUCT.md
   * §9 : usage non commercial, attribution attendue). Elle est due partout où l'on affiche leurs
   * données, c'est-à-dire sur l'application comme sur une liste partagée.
   *
   * L'adresse est ici plutôt qu'écrite dans le pied de page, et ici plutôt que dans `routes.ts` :
   * celui-ci est la carte des chemins **de ce site**, et y ranger un domaine tiers en ferait un
   * fourre-tout d'URL. `lib/http/anilist.ts` a bien une constante voisine, mais c'est l'endpoint
   * GraphQL — une adresse de machine, pas celle qu'on donne à lire à quelqu'un.
   */
  attribution: {
    name: "AniList",
    url: "https://anilist.co",
  },
} as const;
