import {
  createLoader,
  createSerializer,
  parseAsStringLiteral,
} from "nuqs/server";

/**
 * Les onglets de la fiche, et leur vocabulaire d'URL.
 *
 * **Ils sont dans l'adresse** (décision d'Alexis du 11 septembre 2026) : un lien peut pointer
 * directement l'équipe d'un film, le bouton Retour parcourt les onglets visités, et un
 * rechargement garde sa place. Un onglet gardé en état local n'aurait rien de tout ça — et sur une
 * fiche qu'on partage dans une conversation, « regarde les personnages » redeviendrait une
 * instruction à suivre à la main.
 *
 * Les valeurs sont **en français et sans accent** : elles s'écrivent dans une URL, où un `ç` ou un
 * `é` part en pourcentage et rend le lien illisible dès qu'on le recopie. Le reste des paramètres
 * du dépôt suit déjà cette règle (`?portee=` du planning).
 *
 * L'ordre de ce tableau est **celui des onglets à l'écran**, et le premier est celui qui s'ouvre
 * par défaut : c'est la même liste qui sert de source au parseur, à la barre et au repli, donc
 * aucune des trois ne peut se désynchroniser des autres.
 */
export const MEDIA_TABS = [
  "apercu",
  "personnages",
  "equipe",
  "oeuvres",
  "tags",
] as const;

export type MediaTab = (typeof MEDIA_TABS)[number];

/**
 * Les libellés visibles. `Record<MediaTab, string>` et non un objet libre : ajouter un onglet à
 * `MEDIA_TABS` sans lui donner de libellé ne compile pas.
 */
export const MEDIA_TAB_LABELS: Record<MediaTab, string> = {
  apercu: "Aperçu",
  personnages: "Personnages",
  equipe: "Équipe",
  oeuvres: "Œuvres liées",
  tags: "Tags",
};

/**
 * `parseAsStringLiteral` et non `parseAsString` : une valeur inventée dans l'URL — `?onglet=tout`,
 * un lien tronqué, une faute de frappe — retombe sur le défaut au lieu de laisser la barre sans
 * onglet actif, c'est-à-dire une fiche dont le contenu a disparu.
 */
export const mediaTabParsers = {
  onglet: parseAsStringLiteral(MEDIA_TABS).withDefault(MEDIA_TABS[0]),
};

/**
 * Le lecteur serveur du paramètre.
 *
 * Il a été retiré une première fois comme export mort — les onglets étaient alors tous rendus en
 * même temps, et seule la barre cliente avait besoin de savoir lequel montrer. **Il est revenu le
 * 11 septembre 2026 avec les lectures par onglet** : c'est désormais le serveur qui décide quelle
 * requête AniList partir chercher, donc c'est lui qui doit relire le paramètre. Le dépôt retrouve
 * ici la forme de ses autres écrans à paramètres (`/search`, `/library`, `/u/[username]`).
 */
export const loadMediaTab = createLoader(mediaTabParsers);

/**
 * L'écrivain d'adresse, pendant de `loadMediaTab`.
 *
 * Les liens de la barre passent par lui plutôt que par une chaîne construite à la main : ce sont
 * alors **les mêmes parseurs** qui écrivent l'URL et qui la relisent, donc l'onglet par défaut
 * disparaît de l'adresse tout seul et un lien ne peut pas désigner une valeur que le parseur
 * refuserait. C'est déjà la façon dont la pagination du catalogue construit ses liens.
 */
export const serializeMediaTab = createSerializer(mediaTabParsers);
