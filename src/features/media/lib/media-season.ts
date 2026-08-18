import { TIMEZONE } from "@/config/locale";
import type { MediaSeason } from "@/features/media/schemas/media.schema";

/**
 * Quelle saison anime on est en train de vivre.
 *
 * C'est ce dont `/browse` a besoin pour dire « cette saison » et « la saison prochaine » sans qu'on ait
 * à mettre à jour une constante quatre fois par an. Fonctions pures et testées, comme le reste des
 * `lib/` du domaine : un décalage d'un trimestre est le genre d'erreur qui passe inaperçue neuf mois
 * sur douze.
 */

export type SeasonSlot = {
  season: MediaSeason;
  seasonYear: number;
};

/**
 * Le découpage d'AniList, et non le découpage astronomique.
 *
 * L'API documente `WINTER` comme « décembre à février » : une saison de diffusion commence un mois
 * avant l'équinoxe. **Décembre appartient donc à l'hiver de l'année suivante** — un anime de décembre
 * 2026 est un anime « hiver 2027 », et c'est ce que `seasonYear` vaut chez AniList. C'est le seul
 * endroit du calcul où l'année change en même temps que la saison, donc le seul endroit où se tromper.
 */
export function seasonOf(month: number, year: number): SeasonSlot {
  if (month === 12) return { season: "WINTER", seasonYear: year + 1 };
  if (month <= 2) return { season: "WINTER", seasonYear: year };
  if (month <= 5) return { season: "SPRING", seasonYear: year };
  if (month <= 8) return { season: "SUMMER", seasonYear: year };

  return { season: "FALL", seasonYear: year };
}

const SEASON_ORDER: MediaSeason[] = ["WINTER", "SPRING", "SUMMER", "FALL"];

/** La saison suivante. Passer de l'automne à l'hiver fait avancer l'année. */
export function nextSeason({ season, seasonYear }: SeasonSlot): SeasonSlot {
  const following =
    SEASON_ORDER[(SEASON_ORDER.indexOf(season) + 1) % SEASON_ORDER.length];

  return {
    season: following,
    seasonYear: following === "WINTER" ? seasonYear + 1 : seasonYear,
  };
}

/**
 * Mois et année **à Paris**, pas sur la machine qui rend la page.
 *
 * Le 1er janvier à 00 h 30 heure française, un serveur en UTC est encore au 31 décembre : sans fuseau
 * explicite, la page annoncerait l'hiver de l'année précédente pendant une heure, et — pire — le rendu
 * serveur et l'hydratation client pourraient ne pas tomber sur la même saison. C'est la règle de
 * `config/locale.ts` appliquée à un calcul plutôt qu'à un affichage.
 *
 * Locale figée à `en-US` volontairement : ce n'est pas du texte destiné à être lu, c'est une extraction
 * de champs de calendrier, et pinner la locale garantit des chiffres ASCII que `Number` sait relire.
 */
const CALENDAR_IN_PARIS = new Intl.DateTimeFormat("en-US", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "numeric",
});

/** La saison précédente. Passer de l'hiver à l'automne fait reculer l'année. */
export function previousSeason({ season, seasonYear }: SeasonSlot): SeasonSlot {
  const index = SEASON_ORDER.indexOf(season);
  const preceding =
    SEASON_ORDER[(index - 1 + SEASON_ORDER.length) % SEASON_ORDER.length];

  return {
    season: preceding,
    seasonYear: season === "WINTER" ? seasonYear - 1 : seasonYear,
  };
}

/**
 * Une suite de créneaux consécutifs, du plus récent au plus ancien.
 *
 * C'est ce dont le sélecteur de saison de la recherche a besoin : un filtre de saison n'a de sens
 * qu'accompagné de son année (voir `searchMediaInputSchema.season`), donc l'interface ne propose pas
 * deux contrôles à croiser mais une liste de trimestres déjà formés.
 *
 * On **descend** depuis un cran en avance : la saison prochaine est déjà annoncée chez AniList au
 * moment où l'on regarde la saison en cours, et c'est précisément ce que la rangée « La saison
 * prochaine » de l'accueil donne à voir. Commencer à la saison courante rendrait son lien
 * inexprimable dans la liste.
 */
export function recentSeasons(count: number, from: SeasonSlot): SeasonSlot[] {
  const slots: SeasonSlot[] = [];
  let slot = nextSeason(from);

  for (let index = 0; index < count; index++) {
    slots.push(slot);
    slot = previousSeason(slot);
  }

  return slots;
}

export function currentSeason(now: Date = new Date()): SeasonSlot {
  const parts = CALENDAR_IN_PARIS.formatToParts(now);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const year = Number(parts.find((part) => part.type === "year")?.value);

  return seasonOf(month, year);
}
