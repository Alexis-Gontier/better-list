import { LibraryBigIcon, type LucideIcon, TelescopeIcon } from "lucide-react";

import { routes } from "@/config/routes";

/**
 * Structure de la navigation principale, construite à partir de `routes`.
 *
 * Ce fichier ne contient aucune URL en dur : un chemin qui n'existe pas dans `routes.ts` n'a rien
 * à faire dans la nav.
 *
 * Elle suit la carte de `docs/conception.md` §5 — la découverte (chercher, planning) et deux espaces
 * personnels (bibliothèque, listes). Il n'y a **pas** de section de découverte sociale : le cercle
 * est privé, il n'y a pas de communauté à explorer.
 *
 * « Parcourir » a disparu avec `/browse` : le catalogue éditorialisé vit sur l'accueil, qui est déjà
 * dans l'en-tête. Une entrée de nav de plus pour la même chose aurait fait hésiter entre deux portes
 * qui mènent au même endroit.
 *
 * **« Ma collection » est revenue le 19 septembre 2026, avec son écran.** Elle en était partie à
 * la mise à blanc, sous la règle qu'une entrée de nav qui répond 404 est pire qu'une entrée
 * absente — elle se lit comme une panne, pas comme un chantier. La condition posée alors est
 * remplie : `/collection` existe.
 *
 * Elle rejoint « Ma bibliothèque » et non « Découvrir », et c'est le sens de la section : ce qu'on
 * y trouve est à soi. L'étagère est le troisième espace personnel, après le suivi et les listes.
 */

export type NavLink = {
  href: string;
  label: string;
  description: string;
};

export type NavSection = {
  href: string;
  label: string;
  /** Celle de l'intitulé : le déclencheur du menu desktop, le titre de groupe du tiroir mobile. */
  icon: LucideIcon;
  links: NavLink[];
};

export const mainNav: NavSection[] = [
  {
    href: routes.search,
    label: "Découvrir",
    icon: TelescopeIcon,
    links: [
      {
        href: routes.search,
        label: "Rechercher",
        description:
          "Trouver un anime, un manga, un webtoon — ou voir les tendances.",
      },
      {
        href: routes.calendar,
        label: "Planning",
        description: "Les épisodes à venir de ce que vous suivez.",
      },
    ],
  },
  {
    href: routes.library,
    label: "Ma bibliothèque",
    icon: LibraryBigIcon,
    links: [
      {
        href: routes.library,
        label: "Suivi",
        description: "En cours, à reprendre, terminés, prévus.",
      },
      {
        href: routes.lists.root,
        label: "Mes listes",
        description: "Classements, tier lists, sélections en tout genre.",
      },
      {
        href: routes.collection.root,
        label: "Ma collection",
        description: "Mon étagère : les tomes que j'ai, et ceux qui manquent.",
      },
    ],
  },
];

/**
 * Routes accessibles sans compte approuvé.
 *
 * Sert de source unique à `src/proxy.ts` **et** à la garde du layout `(app)` : deux listes
 * distinctes finiraient par diverger, et la divergence ouvrirait un trou d'accès.
 */
export const publicRoutes: string[] = [
  routes.auth.login,
  routes.auth.signup,
  routes.auth.waitlist,
];

/**
 * Routes publiques dont le chemin **ne peut pas être connu d'avance**.
 *
 * Une liste partagée s'adresse par un jeton (`/l/<jeton>`) : l'égalité de `publicRoutes` ne peut
 * rien en dire, il faut comparer un préfixe. Elles sont dans une liste séparée précisément pour que
 * la différence se voie — un préfixe ouvre **tout ce qui commence par**, ce qui est une promesse
 * bien plus large qu'un chemin exact, et qui mérite d'être relue quand on en ajoute un.
 *
 * Ce n'est pas une autorisation : le proxy laisse passer, et c'est la page qui décide. Un jeton faux
 * y donne la même page introuvable qu'un jeton révoqué (`getSharedList`).
 */
export const publicRoutePrefixes: string[] = [routes.share.prefix];
