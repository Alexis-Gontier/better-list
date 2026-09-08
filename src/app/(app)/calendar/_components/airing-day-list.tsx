import Image from "next/image";
import Link from "next/link";

import {
  episodeLag,
  formatLag,
  hasAired,
} from "@/app/(app)/calendar/_lib/airing-lag";
import {
  type AiringWeek,
  formatAiringTime,
  groupAiringByDay,
} from "@/app/(app)/calendar/_lib/airing-week";
import { Separator } from "@/components/ui/separator";
import { routes } from "@/config/routes";
import { mediaTitle } from "@/features/media/lib/media-format";
import type { TitleLanguage } from "@/features/preferences/schemas/preferences.schema";
import { EntryQuickEdit } from "@/features/tracking/components/entry-quick-edit";
import { EntryStatusDot } from "@/features/tracking/components/entry-status-dot";
import type { AiringWatchlistItem } from "@/features/tracking/server/library.queries";
import { cn } from "@/lib/utils";

/**
 * La semaine, **en une colonne, sept sections**.
 *
 * C'est la forme qu'ont retenue les douze plannings relevés le 8 septembre 2026 — Nautiljon,
 * Icotaku, Myutaku, Animesphere et aniSearch.fr côté francophone, LiveChart, AnimeSchedule,
 * MyAnimeList et Trakt ailleurs —, et aucun ne rend une grille de sept colonnes
 * (docs/JOURNAL.md). La raison tient en une phrase : **des épisodes sont un flux chronologique, pas
 * une grille d'horaires.** Une semaine d'anime n'a pas de créneaux fixes à remplir, elle a trois
 * diffusions le samedi et zéro le mercredi.
 *
 * `airing-week.ts` avait d'ailleurs déjà tranché sans le dire : ses docstrings parlent de
 * « colonnes », mais son `label` vaut « Lundi 3 août » — jour et mois en toutes lettres, capitalisés
 * par une fonction écrite exprès. C'est un intitulé de section ; un en-tête de colonne de 142 px
 * voudrait « Lun 7 ».
 *
 * **Et c'est la seule forme où le retard tient en toutes lettres**, ce qui est tout l'intérêt de
 * l'écran : les calendriers publics disent ce qui sort, pas où l'on en est.
 *
 * Composant **serveur**. Seule la fenêtre d'édition rapide posée sur chaque ligne part au
 * navigateur, comme sur les vignettes de `/search` et de `/library`.
 */

/** Une diffusion, jointe à ce qu'on sait du suivi de la série. */
export type AiringRow = {
  /** L'id de la diffusion chez AniList — la clé de rendu, stable d'une semaine à l'autre. */
  id: number;
  /** Horodatage Unix **en secondes**, l'unité d'AniList. */
  airingAt: number;
  episode: number;
  watch: AiringWatchlistItem;
};

export function AiringDayList({
  week,
  rows,
  now,
  titleLanguage,
}: {
  week: AiringWeek;
  rows: AiringRow[];
  /**
   * L'instant de référence, **décidé par la page et passé ici**.
   *
   * Un `new Date()` appelé dans ce composant rendrait « déjà diffusé » dépendant du moment où
   * chaque ligne se rend : deux lignes de la même page pourraient être calculées de part et
   * d'autre d'une diffusion. Un seul instant pour toute la page, c'est un écran cohérent avec
   * lui-même.
   */
  now: Date;
  titleLanguage: TitleLanguage;
}) {
  const days = groupAiringByDay(week, rows);

  return (
    <div className="flex flex-col">
      {days.map((day) => (
        <section key={day.key}>
          {/*
            L'intitulé du jour, ses deux marqueurs, et le trait qui le sépare de ses lignes. Le
            décompte est à droite : c'est ce qu'on lit en survolant la semaine du regard, avant même
            les titres.
          */}
          <div className="flex items-baseline gap-2.5 pt-5 pb-2">
            <h2 className="font-medium text-sm uppercase tracking-wide">
              {day.label}
            </h2>

            {day.isToday ? (
              <span className="rounded-full border border-primary/40 px-2 py-px text-primary text-xs">
                aujourd'hui
              </span>
            ) : null}

            <span className="ml-auto text-muted-foreground text-xs tabular-nums">
              {day.items.length === 0
                ? "—"
                : day.items.length === 1
                  ? "1 épisode"
                  : `${day.items.length} épisodes`}
            </span>
          </div>

          <Separator />

          {/*
            **Un jour vide s'affiche, il ne se masque pas.** `groupAiringByDay` rend les sept jours
            exprès, et sa docstring dit pourquoi : « savoir qu'il n'y a rien le jeudi est une
            information, et la masquer ferait glisser le vendredi à sa place ». Icotaku écrit
            « Aucune diffusion » au même endroit et pour la même raison.
          */}
          {day.items.length === 0 ? (
            <p className="py-3 text-muted-foreground text-sm italic">
              Rien ce jour-là.
            </p>
          ) : (
            <ul className="flex flex-col">
              {day.items.map((row) => (
                <AiringLine
                  key={row.id}
                  now={now}
                  row={row}
                  titleLanguage={titleLanguage}
                />
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

/**
 * Une diffusion : l'heure, la jaquette, le titre, où j'en suis, et de combien je suis en retard.
 *
 * **Le retard est écrit en toutes lettres**, à droite, seul dans sa colonne. C'est la décision qui
 * a écarté la grille de sept colonnes : à 142 px, « 11 épisodes de retard » devenait « +11 ».
 */
function AiringLine({
  row,
  now,
  titleLanguage,
}: {
  row: AiringRow;
  now: Date;
  titleLanguage: TitleLanguage;
}) {
  const { media, entry, banner, total } = row.watch;
  const title = mediaTitle(media.title, titleLanguage);

  const aired = hasAired(row.airingAt, now);
  const lag = episodeLag({
    episode: row.episode,
    progress: entry.progress,
    aired,
  });

  return (
    <li className="flex items-center gap-3 border-b py-2.5 last:border-b-0 sm:gap-4">
      {/*
        L'heure d'abord, en chiffres de largeur fixe : c'est la clé de lecture d'un planning, et
        une colonne d'heures qui ne s'aligne pas se relit une fois de trop. Masquée sous `sm`, où
        elle repart dans la ligne de détail — 390 px ne tiennent pas quatre colonnes.
      */}
      <span className="hidden w-12 shrink-0 font-mono text-sm tabular-nums sm:inline">
        {formatAiringTime(row.airingAt)}
      </span>

      <Link
        className="relative aspect-2/3 w-10 shrink-0 overflow-hidden rounded-sm bg-surface-raised"
        href={routes.media(media.id)}
        tabIndex={-1}
        // Le titre juste à côté mène au même endroit et porte déjà le nom : deux arrêts de
        // tabulation pour une seule destination allongent le parcours sans rien ajouter.
        aria-hidden
      >
        {media.coverImage?.large ? (
          <Image
            alt=""
            className="object-cover"
            fill
            sizes="40px"
            src={media.coverImage.large}
          />
        ) : null}
      </Link>

      <div className="flex min-w-0 flex-col gap-0.5">
        <Link
          className="truncate font-medium text-sm hover:underline"
          href={routes.media(media.id)}
        >
          {title}
        </Link>

        <p className="flex flex-wrap items-center gap-x-2 text-muted-foreground text-xs tabular-nums">
          <EntryStatusDot status={entry.status} />
          {/* Sous `sm`, l'heure revient ici — elle n'a pas disparu, elle a changé de place. */}
          <span className="font-mono sm:hidden">
            {formatAiringTime(row.airingAt)}
          </span>
          <span>ép. {row.episode}</span>
          <span>
            vu {entry.progress} / {total ?? "?"}
          </span>
          {/* Le retard aussi, sous `sm` : c'est l'information de l'écran, elle ne se coupe pas. */}
          <span className={cn("sm:hidden", lagTone(lag))}>
            {formatLag(lag)}
          </span>
        </p>
      </div>

      <span
        className={cn(
          "ml-auto hidden shrink-0 text-right text-xs tabular-nums sm:inline",
          lagTone(lag),
        )}
      >
        {formatLag(lag)}
      </span>

      {/*
        L'édition rapide, la même que sur les vignettes du catalogue et de la bibliothèque. Un
        planning qui annonce deux épisodes de retard sans offrir de dire « c'est rattrapé » oblige à
        aller ailleurs pour le geste qu'il vient lui-même de suggérer.
      */}
      <div className="shrink-0">
        <EntryQuickEdit
          banner={banner}
          compact
          entry={entry}
          mediaId={media.id}
          title={title}
          total={total}
          unit="episode"
        />
      </div>
    </li>
  );
}

/**
 * La couleur du retard — **et rien d'autre n'est coloré sur la ligne.**
 *
 * Les deux teintes sont celles des statuts de suivi (`globals.css`), pas des couleurs inventées :
 * l'ambre de « en pause » pour un retard qui se rattrape, le rouge d'« abandonné » au-delà de cinq
 * épisodes, où la série décroche vraiment. Le seuil est arbitraire mais assumé — il fallait un
 * chiffre, et cinq est la limite au-delà de laquelle on ne rattrape plus en une soirée.
 *
 * **La couleur ne porte jamais l'information seule** : le texte dit « 11 épisodes de retard » quoi
 * qu'il arrive, et la teinte ne fait que le hiérarchiser.
 */
function lagTone(lag: number): string {
  if (lag <= 0) return "text-muted-foreground";

  return lag > 5 ? "text-status-dropped" : "text-status-paused";
}
