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
  /**
   * Accueil : suivi, listes, catalogue du moment, journal.
   *
   * Il n'y a **pas** de `/browse` en face, et ce n'est pas un oubli : le catalogue éditorialisé
   * était une deuxième porte de découverte pour un cercle de quatre comptes, et il a été replié ici
   * (docs/PRODUCT.md §5).
   */
  home: "/",

  /**
   * Recherche du catalogue. Les filtres vivent dans les `searchParams`, pas dans le chemin.
   * Sans terme de recherche, elle ouvre sur les tendances — voir `resolveSort`.
   */
  search: "/search",

  /**
   * Fiche d'une œuvre. Un seul segment pour les animes comme pour les mangas : les ids AniList
   * sont uniques entre les deux types.
   */
  media: (id: number) => `/media/${id}` as const,

  /** Ma bibliothèque. Le statut et le type sont des `searchParams`, pas des segments. */
  library: "/library",

  lists: {
    root: "/lists",
    /**
     * Une liste s'adresse par son `id`, pas par un slug tiré du titre : renommer ne doit rien
     * casser, et l'identifiant est déjà ce que portent les mutations.
     */
    detail: (id: string) => `/lists/${id}` as const,
    /** Une vue posée sur une liste : classement, tier list, grille (PRODUCT.md §4.4). */
    view: (id: string, viewId: string) => `/lists/${id}/${viewId}` as const,
  },

  collection: {
    /**
     * Mon étagère : séries possédées, tomes manquants (V1.5).
     *
     * **Le segment est déclaré, l'écran n'existe pas encore** — et rien ne pointe dessus : la nav et
     * la palette ont perdu leur entrée « Ma collection » le temps que la page arrive. Le chemin
     * reste ici parce que PRODUCT.md §5 le fixe, pas parce qu'il est atteignable.
     */
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
