import {
  CalendarClockIcon,
  ExternalLinkIcon,
  HeartIcon,
  StarIcon,
  TrophyIcon,
  UsersIcon,
} from "lucide-react";
import Image from "next/image";

import { MediaBanner } from "@/app/(app)/media/[id]/_components/media-banner";
import { MediaStatusBadge } from "@/app/(app)/media/[id]/_components/media-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatAiringDate,
  formatCount,
  formatCountdown,
  formatCountry,
  formatDateRange,
  formatDuration,
  formatMediaFormat,
  formatRanking,
  formatSeason,
  formatSource,
  mediaTitle,
} from "@/features/media/lib/media-format";
import type { MediaDetail } from "@/features/media/schemas/media.schema";
import { getPreferences } from "@/features/preferences/server/preferences.queries";

/**
 * En-tête de la fiche : bannière bord à bord, jaquette qui la chevauche, et tout ce qui situe
 * l'œuvre d'un coup d'œil.
 *
 * La répartition avec l'onglet « Aperçu » est délibérée : ici les informations d'**identité** — de
 * quoi est-ce qu'on parle, où en est sa diffusion, quelle taille ça fait, qu'en pense la
 * communauté. La fiche technique exhaustive vit dans l'onglet, pour ne pas noyer le titre.
 */
export async function MediaHero({ media }: { media: MediaDetail }) {
  const { titleLanguage } = await getPreferences();
  const title = mediaTitle(media.title, titleLanguage);

  /**
   * Les titres secondaires, sans redite. AniList renvoie souvent le même libellé en `romaji` et en
   * `userPreferred` ; l'afficher deux fois ferait croire à deux œuvres.
   */
  const altTitles = [
    media.title.romaji,
    media.title.english,
    media.title.native,
  ].filter(
    (value, index, all): value is string =>
      Boolean(value) && value !== title && all.indexOf(value) === index,
  );

  const mainStudio = media.studios.edges.find((edge) => edge.isMain)?.node.name;

  /** Ce qui donne la taille de l'œuvre, et qui dépend donc de son type. */
  const size =
    media.type === "ANIME"
      ? [
          media.episodes ? `${media.episodes} épisodes` : null,
          formatDuration(media.duration),
        ]
      : [
          media.chapters ? `${media.chapters} chapitres` : null,
          media.volumes ? `${media.volumes} tomes` : null,
        ];

  /**
   * Depuis la suppression de la fiche technique, cette ligne **est** la fiche technique : elle
   * porte tout ce qui situe l'œuvre, et rien n'est répété ailleurs.
   *
   * L'origine n'apparaît que si ce n'est pas le Japon. « Japon » sur les neuf dixièmes du
   * catalogue est du bruit ; « Chine » sur un donghua ou « Corée du Sud » sur un manhwa est
   * précisément l'information qu'on cherchait.
   */
  const origin =
    media.countryOfOrigin && media.countryOfOrigin !== "JP"
      ? formatCountry(media.countryOfOrigin)
      : null;

  const facts = [
    formatMediaFormat(media.format),
    ...size,
    media.type === "ANIME"
      ? formatSeason(media.season, media.seasonYear)
      : null,
    origin,
    formatDateRange(media.startDate, media.endDate),
    mainStudio,
    media.source ? `D'après : ${formatSource(media.source)}` : null,
  ].filter(Boolean);

  /**
   * Un seul classement, le meilleur. AniList en renvoie parfois cinq, tous vrais et tous
   * redondants ; en aligner la liste transformerait une distinction en bruit.
   */
  const bestRanking = media.rankings
    .filter((ranking) => ranking.allTime || ranking.year !== null)
    .sort((a, b) => a.rank - b.rank)[0];
  const ranking = bestRanking ? formatRanking(bestRanking) : null;

  const nextEpisode = media.nextAiringEpisode;
  const countdown = nextEpisode
    ? formatCountdown(nextEpisode.timeUntilAiring)
    : null;

  return (
    <header>
      <MediaBanner
        accent={media.coverImage?.color ?? null}
        src={media.bannerImage}
      />

      {/*
        La grille reprend celle du contenu (`page.tsx` : `18rem` + gouttière de `gap-8`), et ce
        n'est pas une coïncidence : la colonne de texte du titre tombe alors exactement sur la
        barre d'onglets, et la jaquette sur le panneau de suivi. Trois alignements à gauche
        différents suffisaient à faire flotter toute la page.
      */}
      <div className="grid items-start gap-5 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-8">
        {/*
          **La jaquette remplit sa colonne, elle n'a pas de largeur à elle.**

          Lui en donner une la désolidarise de la piste de grille qui l'accueille, et les deux
          finissent par diverger : à `lg` elle laissait 96 px de vide à sa droite, et entre `sm` et
          `lg` elle débordait de 38 px sur la colonne de texte. `w-full` fait disparaître les deux
          d'un coup — la piste décide, la jaquette suit. La largeur explicite ne subsiste qu'en
          mobile, où il n'y a pas de piste et où `w-full` donnerait une affiche pleine page.

          Seule la jaquette remonte sur la bannière. La colonne de texte, elle, démarre sous le
          dégradé : au-dessus, sa lisibilité dépendrait de l'image de fond de chaque œuvre. La
          remontée grandit avec elle (`lg:-mt-40`) pour que le bas des deux colonnes retombe au
          même endroit.
        */}
        <div className="-mt-24 relative aspect-2/3 w-32 overflow-hidden rounded-lg border-2 border-background bg-muted shadow-lg sm:-mt-32 sm:w-full lg:-mt-40">
          {media.coverImage?.large ? (
            <Image
              alt={`Jaquette de ${title}`}
              className="object-cover"
              fill
              priority
              // Les trois paliers correspondent aux trois largeurs de piste : 8rem, 12rem, 18rem.
              sizes="(max-width: 640px) 128px, (max-width: 1024px) 192px, 288px"
              src={media.coverImage.extraLarge ?? media.coverImage.large}
            />
          ) : null}
        </div>

        <div className="min-w-0 flex-1 space-y-4 sm:pt-2">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <MediaStatusBadge status={media.status} />
              <Badge variant="outline">
                {media.type === "ANIME" ? "Anime" : "Manga"}
              </Badge>
              {media.isAdult ? <Badge variant="destructive">18+</Badge> : null}
            </div>

            <h1 className="text-balance font-semibold text-2xl leading-tight tracking-tight sm:text-3xl">
              {title}
            </h1>

            {altTitles.length > 0 ? (
              <p className="text-muted-foreground text-sm">
                {altTitles.join(" · ")}
              </p>
            ) : null}
          </div>

          {/* Les chiffres de la communauté, sur une ligne qui se replie au lieu de déborder. */}
          <dl className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            {media.averageScore ? (
              <div className="flex items-center gap-1.5">
                <StarIcon
                  aria-hidden="true"
                  className="size-4 fill-amber-400 text-amber-400"
                />
                <dt className="sr-only">Score moyen</dt>
                <dd className="font-medium tabular-nums">
                  {media.averageScore} %
                </dd>
              </div>
            ) : null}

            {media.popularity ? (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <UsersIcon aria-hidden="true" className="size-4" />
                <dt className="sr-only">Popularité</dt>
                <dd className="tabular-nums">
                  {formatCount(media.popularity)}
                </dd>
              </div>
            ) : null}

            {media.favourites ? (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <HeartIcon aria-hidden="true" className="size-4" />
                <dt className="sr-only">Favoris</dt>
                <dd className="tabular-nums">
                  {formatCount(media.favourites)}
                </dd>
              </div>
            ) : null}

            {ranking ? (
              <div className="flex items-center gap-1.5">
                <TrophyIcon
                  aria-hidden="true"
                  className="size-4 text-muted-foreground"
                />
                <dt className="sr-only">Meilleur classement</dt>
                <dd>
                  <span className="font-medium">{ranking.label}</span>
                  {ranking.scope ? (
                    <span className="text-muted-foreground">
                      {" "}
                      · {ranking.scope}
                    </span>
                  ) : null}
                </dd>
              </div>
            ) : null}
          </dl>

          {facts.length > 0 ? (
            <p className="text-muted-foreground text-sm">{facts.join(" · ")}</p>
          ) : null}

          {media.genres.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5">
              {media.genres.map((genre) => (
                <li key={genre}>
                  <Badge variant="secondary">{genre}</Badge>
                </li>
              ))}
            </ul>
          ) : null}

          {/*
            Le décompte est calculé au rendu, et la fiche est mémorisée un jour : c'est la date
            absolue qui fait foi, le « dans 2 j » n'est qu'un confort de lecture.
          */}
          {nextEpisode && countdown ? (
            <p className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm">
              <CalendarClockIcon
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground"
              />
              <span>
                <span className="font-medium">
                  Épisode {nextEpisode.episode}
                </span>{" "}
                <span className="text-muted-foreground">
                  dans {countdown} — {formatAiringDate(nextEpisode.airingAt)}
                </span>
              </span>
            </p>
          ) : null}

          {media.siteUrl ? (
            <Button asChild size="sm" variant="outline">
              <a href={media.siteUrl} rel="noreferrer noopener" target="_blank">
                Voir sur AniList
                <ExternalLinkIcon aria-hidden="true" />
              </a>
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
