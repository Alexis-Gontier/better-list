/**
 * Source unique des URLs de l'application.
 *
 * Aucun chemin ne doit être écrit en dur dans un composant : les routes bougent,
 * et un `href` oublié ne casse qu'à l'exécution.
 *
 * La carte des routes et le palier auquel chacune arrive sont dans `docs/PRODUCT.md` §5.
 * Les routes dynamiques sont des **fonctions** : on ne concatène jamais un id à une chaîne.
 */
export const routes = {
  /** Tableau de bord : en cours, à reprendre, activité récente. */
  home: "/",

  /** Recherche du catalogue. Les filtres vivent dans les `searchParams`, pas dans le chemin. */
  search: "/search",

  /** Catalogue éditorialisé : saison en cours, tendances, top. */
  browse: "/browse",

  /**
   * Fiche d'une œuvre. Un seul segment pour les animes comme pour les mangas : les ids AniList
   * sont uniques entre les deux types.
   */
  media: (id: number) => `/media/${id}` as const,

  /** Ma bibliothèque. Le statut et le type sont des `searchParams`, pas des segments. */
  library: "/library",

  lists: {
    root: "/lists",
    detail: (slug: string) => `/lists/${slug}` as const,
    /** Une vue posée sur une liste : classement, tier list, grille (PRODUCT.md §4.4). */
    view: (slug: string, viewId: string) => `/lists/${slug}/${viewId}` as const,
  },

  collection: {
    /** Mon étagère : séries possédées, tomes manquants. */
    root: "/collection",
    /** Une série : tomes possédés, plages, prêts. */
    detail: (mediaId: number) => `/collection/${mediaId}` as const,
  },

  /** Profil public d'un membre du cercle. */
  profile: (username: string) => `/u/${username}` as const,

  /** Planning de diffusion (V2). */
  calendar: "/calendar",

  settings: "/settings",

  auth: {
    login: "/login",
    signup: "/signup",
    /** Compte créé, en attente d'approbation (PRODUCT.md §7.1). */
    waitlist: "/waitlist",
  },
} as const;
