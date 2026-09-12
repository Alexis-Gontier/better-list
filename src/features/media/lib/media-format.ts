import type {
  MediaCompact,
  MediaFormat,
  MediaRanking,
  MediaSeason,
  MediaStatus,
  MediaTitle,
  StatusDistribution,
} from "@/features/media/schemas/media.schema";
import type { TitleLanguage } from "@/features/preferences/schemas/preferences.schema";

/**
 * Mise en forme des données AniList pour l'affichage.
 *
 * Fonctions pures, sans accès réseau ni base : elles servent à la fiche comme à la recherche, et
 * elles sont testées (`media-format.test.ts`).
 *
 * L'interface est en français, or **AniList ne fournit aucun libellé français** — les tables de
 * correspondance ci-dessous sont donc écrites à la main. Elles sont exhaustives par construction :
 * `Record<MediaFormat, string>` casse au build si AniList gagne une valeur d'énumération.
 */

export type FuzzyDate = {
  year: number | null;
  month: number | null;
  day: number | null;
};

const FORMAT_LABELS: Record<MediaFormat, string> = {
  TV: "Série TV",
  TV_SHORT: "Format court",
  MOVIE: "Film",
  SPECIAL: "Spécial",
  OVA: "OVA",
  ONA: "ONA",
  MUSIC: "Clip musical",
  MANGA: "Manga",
  NOVEL: "Light novel",
  ONE_SHOT: "One-shot",
};

const STATUS_LABELS: Record<MediaStatus, string> = {
  FINISHED: "Terminé",
  RELEASING: "En cours",
  NOT_YET_RELEASED: "À paraître",
  CANCELLED: "Annulé",
  HIATUS: "En pause",
};

const SEASON_LABELS: Record<MediaSeason, string> = {
  WINTER: "Hiver",
  SPRING: "Printemps",
  SUMMER: "Été",
  FALL: "Automne",
};

/**
 * Pays d'origine, pour distinguer manga, manhwa et manhua — une information que les lecteurs
 * cherchent et qu'AniList n'expose que par un code ISO.
 */
const COUNTRY_LABELS: Record<string, string> = {
  JP: "Japon",
  KR: "Corée du Sud",
  CN: "Chine",
  TW: "Taïwan",
};

/**
 * Œuvre d'origine. AniList expose une énumération `MediaSource` brute — sans cette table, une
 * fiche affiche « LIGHT_NOVEL » en toutes lettres. Volontairement un `Record<string, string>` et
 * non `Record<MediaSource, string>` : le champ arrive en `string` du schéma, et AniList ajoute des
 * valeurs à cette énumération plus souvent qu'aux autres. Une valeur inconnue retombe sur le brut.
 */
const SOURCE_LABELS: Record<string, string> = {
  ORIGINAL: "Œuvre originale",
  MANGA: "Manga",
  LIGHT_NOVEL: "Light novel",
  VISUAL_NOVEL: "Visual novel",
  VIDEO_GAME: "Jeu vidéo",
  OTHER: "Autre",
  NOVEL: "Roman",
  DOUJINSHI: "Dōjinshi",
  ANIME: "Anime",
  WEB_NOVEL: "Web novel",
  LIVE_ACTION: "Prise de vues réelles",
  GAME: "Jeu",
  COMIC: "Comic",
  MULTIMEDIA_PROJECT: "Projet multimédia",
  PICTURE_BOOK: "Livre illustré",
};

/**
 * Genres AniList, en français.
 *
 * **Cette table n'est pas un doublon du vocabulaire d'AniList, c'est sa traduction.** `GenreCollection`
 * rend « Slice of Life » ; l'interface est en français (docs/PRODUCT.md §7), donc il faut cette
 * correspondance de toute façon — la fetcher n'y changerait rien. Ce sont les **valeurs** (les clés)
 * qui appartiennent à AniList et qui partent dans `genre_in` ; les libellés sont à nous.
 *
 * Volontairement un `Record<string, string>` : le genre arrive en `string` du schéma, et une valeur
 * inconnue retombe sur le brut plutôt que de disparaître — c'est ce qui se passera le jour où
 * AniList en ajoute un, et c'est le bon comportement.
 */
const GENRE_LABELS: Record<string, string> = {
  Action: "Action",
  Adventure: "Aventure",
  Comedy: "Comédie",
  Drama: "Drame",
  Ecchi: "Ecchi",
  Fantasy: "Fantastique",
  Hentai: "Hentai",
  Horror: "Horreur",
  "Mahou Shoujo": "Magical girl",
  Mecha: "Mecha",
  Music: "Musique",
  Mystery: "Mystère",
  Psychological: "Psychologique",
  Romance: "Romance",
  "Sci-Fi": "Science-fiction",
  "Slice of Life": "Tranche de vie",
  Sports: "Sport",
  Supernatural: "Surnaturel",
  Thriller: "Thriller",
};

export function formatGenre(genre: string): string {
  return GENRE_LABELS[genre] ?? genre;
}

/**
 * Statuts de suivi de la communauté AniList (`MediaListStatus`). Mêmes valeurs que `EntryStatus`
 * en base (docs/PRODUCT.md §4.2) : le jour où le suivi arrive, cette table lui sert aussi.
 */
const LIST_STATUS_LABELS: Record<StatusDistribution["status"], string> = {
  CURRENT: "En cours",
  PLANNING: "Prévu",
  COMPLETED: "Terminé",
  PAUSED: "En pause",
  DROPPED: "Abandonné",
  REPEATING: "Relecture",
};

export function formatMediaFormat(format: MediaFormat | null): string | null {
  return format ? FORMAT_LABELS[format] : null;
}

export function formatSource(source: string | null): string | null {
  if (!source) return null;
  return SOURCE_LABELS[source] ?? source;
}

export function formatListStatus(status: StatusDistribution["status"]): string {
  return LIST_STATUS_LABELS[status];
}

/**
 * Classement AniList en français.
 *
 * L'API fournit déjà un `context` tout fait — mais en anglais (« highest rated all time »), donc
 * inutilisable ici. On le recompose depuis les champs structurés.
 *
 * L'étendue est renvoyée à part plutôt que collée au libellé : la fiche l'affiche en retrait, et
 * ça évite d'écrire l'élision saisonnière (« de l'automne » mais « du printemps »).
 */
export function formatRanking(ranking: MediaRanking): {
  label: string;
  scope: string | null;
} {
  const label = `#${ranking.rank} ${
    ranking.type === "RATED" ? "des mieux notés" : "des plus populaires"
  }`;

  if (ranking.allTime) return { label, scope: "Tous les temps" };

  return { label, scope: formatSeason(ranking.season, ranking.year) };
}

export function formatMediaStatus(status: MediaStatus | null): string | null {
  return status ? STATUS_LABELS[status] : null;
}

/**
 * Nature du lien entre deux œuvres (`MediaRelation`).
 *
 * **C'est le libellé qu'on lit avant le titre** sur une carte de relation : savoir qu'on regarde
 * la suite ou un film récapitulatif change ce qu'on fait du lien. D'où le choix de termes qui
 * tranchent — « Histoire parallèle » plutôt que « Side story », qui ne dit rien à qui ne connaît
 * pas le vocabulaire d'AniList.
 *
 * `Record<string, string>` et non `Record<MediaRelation, string>` : le champ arrive en `string` du
 * schéma (`relationEdgeSchema`), et une valeur inconnue retombe sur le brut plutôt que de faire
 * disparaître la relation.
 */
const RELATION_LABELS: Record<string, string> = {
  ADAPTATION: "Adaptation",
  PREQUEL: "Préquelle",
  SEQUEL: "Suite",
  PARENT: "Œuvre principale",
  SIDE_STORY: "Histoire parallèle",
  CHARACTER: "Personnage commun",
  SUMMARY: "Récapitulatif",
  ALTERNATIVE: "Version alternative",
  SPIN_OFF: "Spin-off",
  OTHER: "Autre",
  SOURCE: "Œuvre d'origine",
  COMPILATION: "Compilation",
  CONTAINS: "Contient",
};

export function formatRelationType(type: string | null): string | null {
  if (!type) return null;
  return RELATION_LABELS[type] ?? type;
}

/**
 * Rôle d'un personnage dans l'œuvre (`CharacterRole`).
 *
 * `BACKGROUND` n'a pas de traduction littérale utile — « arrière-plan » décrit un plan de caméra,
 * pas un rôle. « Figuration » dit ce que c'est.
 */
const CHARACTER_ROLE_LABELS: Record<string, string> = {
  MAIN: "Principal",
  SUPPORTING: "Secondaire",
  BACKGROUND: "Figuration",
};

export function formatCharacterRole(role: string | null): string | null {
  if (!role) return null;
  return CHARACTER_ROLE_LABELS[role] ?? role;
}

/**
 * Langue de doublage (`languageV2`).
 *
 * AniList la rend **en anglais et en toutes lettres** — « Japanese », pas un code ISO —, donc la
 * table indexe le mot anglais. La requête ne demande aujourd'hui que le japonais
 * (`MEDIA_BY_ID_QUERY`), mais elle accepte toutes les langues : les autres entrées sont là pour le
 * jour où on en demandera une deuxième, et coûtent quelques lignes.
 */
const VOICE_LANGUAGE_LABELS: Record<string, string> = {
  Japanese: "Japonais",
  English: "Anglais",
  French: "Français",
  Korean: "Coréen",
  Chinese: "Chinois",
  Spanish: "Espagnol",
  German: "Allemand",
  Italian: "Italien",
  Portuguese: "Portugais",
};

export function formatVoiceLanguage(language: string | null): string | null {
  if (!language) return null;
  return VOICE_LANGUAGE_LABELS[language] ?? language;
}

/**
 * Rôle d'un membre de l'équipe.
 *
 * **Ce n'est pas une énumération, c'est du texte libre**, et la table est donc explicitement
 * partielle : AniList y trouve « Director », mais aussi « Theme Song Performance (ED 14) » ou
 * « 2nd Key Animation ». Traduire les quelques rôles qui reviennent sur chaque fiche vaut mieux que
 * de tout laisser en anglais ; prétendre les couvrir tous serait faux, donc le brut est un repli
 * normal et non un échec.
 *
 * **La portée entre parenthèses est détachée avant la recherche, puis raccrochée.** AniList écrit
 * « Director (eps 1-278) », « Character Design (eps 385-891) » : sur une série longue, c'est la
 * forme de la *plupart* des rôles, et sans ce détachement l'onglet Équipe de One Piece restait
 * presque entièrement en anglais. Vu à l'écran le 11 septembre 2026. La portée elle-même n'est pas
 * traduite — « eps 1-278 » se lit dans toutes les langues, et « OP1, OP15 » est un nom propre.
 *
 * Les rôles composés à la virgule, eux, ne sont pas découpés : « Director, Script » demanderait deux
 * traductions et une recomposition, pour un gain qui ne se voit que sur une poignée de fiches.
 */
const STAFF_ROLE_LABELS: Record<string, string> = {
  Director: "Réalisation",
  "Chief Director": "Réalisation en chef",
  "Assistant Director": "Assistant réalisateur",
  "Episode Director": "Réalisation d'épisode",
  "Original Creator": "Œuvre originale",
  "Original Story": "Histoire originale",
  "Series Composition": "Composition de la série",
  Script: "Scénario",
  Storyboard: "Storyboard",
  "Character Design": "Character design",
  "Art Director": "Direction artistique",
  "Animation Director": "Direction de l'animation",
  "Chief Animation Director": "Direction de l'animation en chef",
  "Key Animation": "Animation clé",
  "Sound Director": "Direction du son",
  Music: "Musique",
  Producer: "Production",
  "Executive Producer": "Production exécutive",
  "Color Design": "Design des couleurs",
  "Director of Photography": "Direction de la photographie",
  Editing: "Montage",
  "Story & Art": "Scénario et dessin",
  Story: "Scénario",
  Art: "Dessin",
};

/** « Director (eps 1-278) » → le rôle d'un côté, sa portée de l'autre. */
const ROLE_SCOPE = /^(.*?)\s*(\([^()]*\))$/;

export function formatStaffRole(role: string | null): string | null {
  if (!role) return null;

  const [, base, scope] = role.match(ROLE_SCOPE) ?? [];

  // Pas de portée détachée : le rôle est cherché tel quel. Les deux groupes sont solidaires — le
  // motif ne peut pas en capturer un sans l'autre —, donc tester le premier suffit au compilateur.
  if (base === undefined) return STAFF_ROLE_LABELS[role] ?? role;

  const label = STAFF_ROLE_LABELS[base];

  // Sans traduction connue, on rend le rôle **tel qu'AniList l'a écrit** plutôt que recomposé : la
  // recomposition normaliserait l'espace avant la parenthèse, donc retoucherait une chaîne qu'on n'a
  // pas su traduire — une modification invisible et sans objet.
  return label ? `${label} ${scope}` : role;
}

export function formatCountry(code: string | null): string | null {
  if (!code) return null;
  return COUNTRY_LABELS[code] ?? code;
}

/**
 * Titre à afficher, selon la préférence du compte (docs/PRODUCT.md §4.6).
 *
 * L'ordre de repli part du choix, puis descend vers ce qui existe : une œuvre sans titre anglais
 * doit s'afficher quand même. Le titre natif est le dernier recours par défaut — il est en japonais,
 * illisible pour la plupart —, mais il passe premier quand c'est lui qu'on a demandé.
 *
 * `userPreferred` n'entre plus dans la course : c'est le titre choisi par AniList d'après les
 * réglages du compte **qui interroge l'API**, donc le nôtre, anonyme et identique pour tout le
 * monde. Le laisser gagner rendrait la préférence sans effet.
 */
export function mediaTitle(
  title: MediaTitle,
  language: TitleLanguage = "ROMAJI",
): string {
  const order: Record<TitleLanguage, Array<string | null>> = {
    ROMAJI: [title.romaji, title.english, title.native],
    ENGLISH: [title.english, title.romaji, title.native],
    NATIVE: [title.native, title.romaji, title.english],
  };

  return order[language].find(Boolean) ?? title.userPreferred ?? "—";
}

/**
 * Les colonnes du miroir dont l'affichage a besoin. Décrites en structure plutôt qu'importées du
 * client Prisma : ce type traverse la frontière server/client avec les données qu'il décrit.
 */
export type MirroredMedia = {
  id: number;
  type: "ANIME" | "MANGA";
  format: MediaFormat | null;
  status: MediaStatus | null;
  titleRomaji: string | null;
  titleEnglish: string | null;
  titleNative: string | null;
  coverImage: string | null;
  meanScore: number | null;
  isAdult: boolean;
};

/**
 * Titre à afficher pour une ligne du miroir, sans reconstruire l'objet complet.
 *
 * Les écrans qui ne montrent qu'un intitulé — une ligne de journal, une suggestion — n'ont pas
 * besoin de `compactFromMirror` et de ses jaquettes. La règle de repli reste celle de `mediaTitle`,
 * à un seul endroit.
 */
export function mirroredTitle(
  media: {
    titleRomaji: string | null;
    titleEnglish: string | null;
    titleNative: string | null;
  },
  language: TitleLanguage = "ROMAJI",
): string {
  return mediaTitle(
    {
      romaji: media.titleRomaji,
      english: media.titleEnglish,
      native: media.titleNative,
      userPreferred: null,
    },
    language,
  );
}

/**
 * Ligne du miroir local → la forme qu'attendent les composants de catalogue.
 *
 * Le miroir aplatit ce qu'AniList imbrique : trois colonnes de titre au lieu d'un objet, une URL de
 * jaquette au lieu de quatre tailles. La couture entre les deux vit **ici, en un seul endroit**,
 * plutôt que dans chaque écran qui lit la base — sans quoi `MediaCard` finirait par accepter deux
 * formes, et la question « d'où viennent ces données ? » se poserait à chaque appel.
 *
 * `userPreferred` reste nul : c'est le titre choisi par AniList d'après les réglages du compte qui
 * interroge l'API, une notion qui n'existe pas en base. `mediaTitle` retombe alors sur le romaji,
 * qui est exactement ce qu'on veut afficher.
 */
/**
 * Les colonnes du miroir qu'une **vignette** demande : celles de `compactFromMirror`, plus les
 * trois qui voyagent à côté.
 *
 * **Promue ici le 6 septembre 2026**, avec `/lists/[id]`. Elle était écrite deux fois — dans
 * `media.mirror.ts` sous le nom `MIRROR_CARD_SELECT` et dans `library.queries.ts` sous celui-ci —
 * avec exactement les mêmes treize colonnes dans un ordre différent. Le troisième appelant a rendu
 * la duplication visible ; elle vit désormais auprès de la fonction qui la consomme.
 *
 * `episodes`, `chapters` et `bannerImage` ne sont pas dans `MediaCompact` et n'ont rien à y faire :
 * cette forme décrit une œuvre pour une vignette, et trois colonnes de plus sur toutes les listes
 * du produit pour servir la fenêtre d'édition rapide serait un mauvais échange. Elles voyagent donc
 * à côté, dans `total` et `banner` — et le plafond n'est pas un confort : un pas de progression
 * sans lui laisse taper « épisode 900 » sur une série de douze.
 *
 * C'est un littéral de sélection Prisma, donc **de la donnée** : ce fichier reste importable depuis
 * un composant client, comme il l'est déjà pour `mediaTitle`.
 */
export const MIRRORED_MEDIA_SELECT = {
  id: true,
  type: true,
  format: true,
  status: true,
  titleRomaji: true,
  titleEnglish: true,
  titleNative: true,
  coverImage: true,
  meanScore: true,
  isAdult: true,
  episodes: true,
  chapters: true,
  bannerImage: true,
} as const;

export function compactFromMirror(media: MirroredMedia): MediaCompact {
  return {
    id: media.id,
    type: media.type,
    format: media.format,
    status: media.status,
    // Le miroir stocke `meanScore` (moyenne brute) là où AniList expose aussi `averageScore`
    // (pondérée). Aucun écran ne les distingue, et n'en dupliquer qu'un évitait une colonne.
    averageScore: media.meanScore,
    isAdult: media.isAdult,
    title: {
      romaji: media.titleRomaji,
      english: media.titleEnglish,
      native: media.titleNative,
      userPreferred: null,
    },
    /**
     * Une seule URL en base — la plus grande — remplit les trois tailles. `MediaCard` lit `large`,
     * la fiche `extraLarge` : leur donner la même image évite un champ vide selon l'appelant, au
     * prix de quelques kilo-octets sur une vignette.
     */
    coverImage: media.coverImage
      ? {
          extraLarge: media.coverImage,
          large: media.coverImage,
          medium: media.coverImage,
          color: null,
        }
      : null,
  };
}

const MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

/**
 * Date « floue » d'AniList : n'importe lequel des trois champs peut manquer. Une œuvre annoncée
 * sans date précise a souvent une année seule, parfois une année et un mois.
 */
export function formatFuzzyDate(date: FuzzyDate | null): string | null {
  if (!date?.year) return null;

  const month = date.month ? MONTHS[date.month - 1] : null;
  if (!month) return String(date.year);
  if (!date.day) return `${month} ${date.year}`;

  return `${date.day} ${month} ${date.year}`;
}

/** Intervalle de diffusion ou de publication, sans répéter une date identique. */
export function formatDateRange(
  start: FuzzyDate | null,
  end: FuzzyDate | null,
): string | null {
  const from = formatFuzzyDate(start);
  const to = formatFuzzyDate(end);

  if (!from) return to;
  if (!to || to === from) return from;

  return `${from} – ${to}`;
}

export function formatSeason(
  season: MediaSeason | null,
  year: number | null,
): string | null {
  const label = season ? SEASON_LABELS[season] : null;

  if (label && year) return `${label} ${year}`;
  return label ?? (year ? String(year) : null);
}

/** Durée d'un épisode, en minutes chez AniList. */
export function formatDuration(minutes: number | null): string | null {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/**
 * Grands nombres — popularité, favoris, effectifs d'une distribution.
 *
 * Espace insécable fine en séparateur, comme le veut le français. `0` est une information ici
 * (« personne ne l'a noté »), donc on ne le confond pas avec l'absence.
 */
export function formatCount(value: number | null): string | null {
  if (value === null) return null;
  return value.toLocaleString("fr-FR");
}

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Décompte avant le prochain épisode, à partir du `timeUntilAiring` d'AniList (en secondes).
 *
 * Deux unités au maximum : « 2 j 4 h » se lit, « 2 j 4 h 37 min 12 s » se déchiffre. On ne descend
 * à la minute que sous l'heure, moment où elle devient l'information utile.
 *
 * La valeur est **relative et figée au rendu** : la fiche est cachée un jour (`cacheLife("days")`),
 * donc l'appelant l'accompagne de la date absolue de diffusion, qui, elle, ne périme pas.
 */
export function formatCountdown(seconds: number): string | null {
  if (seconds <= 0) return null;

  const days = Math.floor(seconds / DAY);
  const hours = Math.floor((seconds % DAY) / HOUR);
  const minutes = Math.floor((seconds % HOUR) / MINUTE);

  if (days > 0) return hours > 0 ? `${days} j ${hours} h` : `${days} j`;
  if (hours > 0)
    return minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`;

  return `${Math.max(minutes, 1)} min`;
}

/** Horodatage Unix en secondes → date lisible. Sert à la diffusion du prochain épisode. */
export function formatAiringDate(airingAt: number): string {
  return new Date(airingAt * 1000).toLocaleString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Nettoie la description.
 *
 * On la demande en `asHtml: false`, mais AniList y laisse malgré tout des `<br>` et parfois une
 * balise d'emphase : le champ est du texte saisi par des contributeurs, pas une donnée
 * structurée. On normalise les sauts de ligne et on retire les balises restantes, plutôt que
 * d'injecter du HTML tiers dans la page.
 */
export function cleanDescription(description: string | null): string[] {
  if (!description) return [];

  return description
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\n/g, " ").trim())
    .filter(Boolean);
}
