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
import { routes } from "@/config/routes";
import { mediaTitle } from "@/features/media/lib/media-format";
import type { AiringMedia } from "@/features/media/schemas/media.schema";
import type { TitleLanguage } from "@/features/preferences/schemas/preferences.schema";
import { EntryQuickEdit } from "@/features/tracking/components/entry-quick-edit";
import type { EntryState } from "@/features/tracking/lib/entry-transition";
import { cn } from "@/lib/utils";

/**
 * La semaine **en sept colonnes verticales** — un jour par colonne.
 *
 * ⚠️ **C'est un retour en arrière assumé sur le relevé du 8 septembre 2026**, et il faut le savoir
 * en lisant ce fichier. Douze plannings en service avaient été relevés — Nautiljon, Icotaku,
 * Myutaku, Animesphere, aniSearch.fr, LiveChart, AnimeSchedule, MyAnimeList, Trakt — et **les douze
 * rendent une liste verticale groupée par jour, aucun une grille** (docs/JOURNAL.md). La liste a
 * donc été livrée d'abord, puis remplacée sur demande d'Alexis, qui la préfère en grille. C'est sa
 * décision et elle est nette ; ce commentaire n'existe que pour qu'on ne redécouvre pas le relevé
 * dans six mois en croyant à un oubli.
 *
 * **Ce que la grille coûte, et qui était prévu** : une colonne fait environ 150 px, donc le retard
 * ne peut plus s'y écrire en toutes lettres. Il est réduit à « +2 », avec le texte complet dans le
 * `title` et dans un libellé accessible — la couleur ne porte donc jamais l'information seule.
 *
 * **Le défilement est horizontal sous `lg`, et il est enfermé dans son conteneur.** Sept colonnes
 * lisibles ne tiennent pas dans 390 px : plutôt que de les comprimer à huit pixels de texte, la
 * grille garde ses colonnes à largeur minimale et glisse latéralement. C'est le corps de la page
 * qui ne doit jamais défiler de côté, pas un conteneur qui l'assume.
 */

/** Une diffusion prête à afficher : l'œuvre, l'épisode, et le suivi **s'il y en a un**. */
export type AiringCell = {
  id: number;
  airingAt: number;
  episode: number;
  media: AiringMedia;
  /**
   * Mon suivi de cette série, ou `null` quand je ne la suis pas.
   *
   * `null` est le cas **normal** depuis que le mode « tout » existe : la grille montre alors des
   * séries dont on n'a aucune ligne `Entry`. C'est ce qui distingue une case suivie d'une case de
   * découverte, et ce qui décide s'il y a un retard à calculer.
   */
  entry: EntryState | null;
  /** La bannière, pour l'en-tête de la fenêtre d'édition rapide. `null` hors du miroir local. */
  banner: string | null;
};

export function AiringWeekGrid({
  week,
  cells,
  now,
  titleLanguage,
}: {
  week: AiringWeek;
  cells: AiringCell[];
  now: Date;
  titleLanguage: TitleLanguage;
}) {
  const days = groupAiringByDay(week, cells);

  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="grid min-w-[52rem] grid-cols-7 gap-px overflow-hidden rounded-md border bg-border">
        {days.map((day) => (
          <div className="flex flex-col bg-background" key={day.key}>
            {/*
              L'en-tête de colonne. `airing-week.ts` rend « Lundi 7 septembre » — trop long pour
              150 px —, donc la colonne réaffiche le jour court et la quantième. Le libellé complet
              reste dans `title`, ce qui le rend disponible sans l'imposer.
            */}
            <div
              className={cn(
                "border-b bg-surface-raised px-2 py-1.5",
                day.isToday && "shadow-[inset_0_2px_0] shadow-primary",
              )}
              title={day.label}
            >
              <p className="font-medium text-xs uppercase tracking-wide">
                {shortDayLabel(day.label)}
              </p>
              {/*
                Le décompte **et** le marqueur du jour, pas l'un à la place de l'autre : la colonne
                d'aujourd'hui est justement celle dont on veut savoir combien elle porte.
              */}
              <p className="text-[11px] text-muted-foreground tabular-nums">
                {day.isToday ? (
                  <span className="text-primary">auj. · </span>
                ) : null}
                {day.items.length || "—"}
              </p>
            </div>

            {/*
              **Une colonne vide reste une colonne.** `groupAiringByDay` rend les sept jours exprès
              — « savoir qu'il n'y a rien le jeudi est une information » —, et en grille c'est encore
              plus vrai qu'en liste : la colonne vide se voit d'un coup d'œil.
            */}
            <div className="flex flex-1 flex-col gap-2.5 p-2">
              {day.items.length === 0 ? (
                <p className="py-2 text-[11px] text-muted-foreground italic">
                  Rien.
                </p>
              ) : (
                day.items.map((cell, index) => (
                  <AiringCard
                    cell={cell}
                    key={cell.id}
                    now={now}
                    /*
                      **La première case de chaque colonne, et elle seule.** Ce sont les sept
                      jaquettes de la rangée du haut, donc tout ce qui est au-dessus de la ligne de
                      flottaison — et l'une d'elles porte la mesure de LCP, que Next signalait en
                      clair dans la console.

                      Sept et pas 124 : en mode « tout », marquer toutes les cases prioritaires
                      reviendrait à n'en prioriser aucune, et ferait concurrencer la première image
                      par cent dix-sept autres. C'est la règle déjà appliquée par `/library`
                      avec `WIDEST_COLUMN_COUNT`, ramenée ici à la géométrie d'une grille : une
                      rangée y vaut une case par colonne.
                    */
                    priority={index === 0}
                    titleLanguage={titleLanguage}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Une case : jaquette, heure, titre, épisode — et le retard **seulement si on suit la série**.
 *
 * Une série non suivie n'a pas de progression, donc pas de retard : afficher « 12 épisodes de
 * retard » sur une série qu'on n'a jamais commencée serait un reproche, pas une information. Elle
 * porte à la place le bouton d'ajout, qui est le seul geste qui ait du sens sur elle.
 */
function AiringCard({
  cell,
  now,
  priority = false,
  titleLanguage,
}: {
  cell: AiringCell;
  now: Date;
  /** Charger la jaquette **sans attendre** — réservé à la rangée du haut, voir l'appelant. */
  priority?: boolean;
  titleLanguage: TitleLanguage;
}) {
  const { media, entry } = cell;
  const title = mediaTitle(media.title, titleLanguage);

  const lag = entry
    ? episodeLag({
        episode: cell.episode,
        progress: entry.progress,
        aired: hasAired(cell.airingAt, now),
      })
    : null;

  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        {/*
          **Une bande courte, pas une jaquette entière** (Alexis, 8 septembre 2026). En 2:3, une
          case mesurait 225 px de haut sur une colonne de 150 : le dimanche, qui porte 27
          diffusions, faisait plus de six écrans à lui seul. Une hauteur fixe de 96 px rend la
          semaine parcourable, ce qui est la seule raison d'être d'une grille.

          `object-cover` sans point d'ancrage : le centre est ce qui marche le mieux sur une
          jaquette d'anime, où le titre occupe le bas et le personnage le milieu. Ancrer en haut
          rognait les visages sur la moitié du catalogue.
        */}
        <Link
          className="relative block h-24 overflow-hidden rounded-sm bg-surface-raised"
          href={routes.media(media.id)}
          tabIndex={-1}
          aria-hidden
        >
          {media.coverImage?.large ? (
            <Image
              alt=""
              className={cn("object-cover", !entry && "opacity-70")}
              fill
              priority={priority}
              sizes="150px"
              src={media.coverImage.large}
            />
          ) : null}
        </Link>

        {/*
          L'édition rapide en coin de jaquette, exactement comme sur les vignettes de `/search` et
          de `/library` : `compact` existe pour ce cas — 32 px et non 36, parce qu'une jaquette de
          colonne n'a aucun voisin à qui s'aligner.
        */}
        <div className="absolute right-1 bottom-1">
          <EntryQuickEdit
            banner={cell.banner}
            compact
            entry={entry}
            mediaId={media.id}
            title={title}
            total={media.episodes}
            unit="episode"
          />
        </div>
      </div>

      <p className="font-mono text-[11px] tabular-nums">
        {formatAiringTime(cell.airingAt)}
      </p>

      {/*
        **Une seule ligne** (Alexis, 8 septembre 2026). Deux lignes faisaient varier la hauteur des
        cases d'une colonne à l'autre selon la longueur des titres, et une grille dont les rangées
        ne s'alignent pas ne se lit plus comme une grille.

        `truncate` et non `line-clamp-1` : les deux coupent, mais `truncate` garde le texte sur une
        ligne de bloc et n'a pas besoin du contexte `-webkit-box`. Le titre entier reste dans
        `title`, donc rien n'est perdu — seulement replié.
      */}
      <Link
        className="truncate font-medium text-xs leading-tight hover:underline"
        href={routes.media(media.id)}
        title={title}
      >
        {title}
      </Link>

      <p className="text-[11px] text-muted-foreground tabular-nums">
        ép. {cell.episode}
        {media.episodes ? ` / ${media.episodes}` : null}
      </p>

      {/*
        **Le retard, comprimé — et c'est le prix de la grille.** « +2 » à l'œil, la phrase entière
        au survol et au lecteur d'écran : la couleur et le signe ne portent jamais l'information
        seuls. Sur une série non suivie, rien du tout plutôt qu'un zéro qui n'a pas de sens.
      */}
      {entry && lag !== null ? (
        <p
          className={cn("text-[11px] tabular-nums", lagTone(lag))}
          title={formatLag(lag)}
        >
          <span aria-hidden>{lag > 0 ? `+${lag}` : "à jour"}</span>
          <span className="sr-only">{formatLag(lag)}</span>
        </p>
      ) : (
        <p className="text-[11px] text-muted-foreground italic">non suivi</p>
      )}
    </div>
  );
}

/**
 * « Lundi 7 septembre » → « Lun 7 ».
 *
 * Découpé plutôt que reformaté : `airing-week.ts` possède déjà les formateurs `Intl` du projet, avec
 * le fuseau et la locale que `config/locale.ts` impose. En reconstruire un ici pour raccourcir trois
 * mots ferait un second endroit où le fuseau peut se perdre.
 */
function shortDayLabel(label: string): string {
  const [weekday, dayNumber] = label.split(" ");

  return `${weekday?.slice(0, 3) ?? label} ${dayNumber ?? ""}`.trim();
}

/**
 * La couleur du retard — ambre jusqu'à cinq épisodes, rouge au-delà.
 *
 * Les deux teintes sont celles des statuts de suivi (`globals.css`), pas des couleurs inventées.
 * Le seuil est arbitraire mais assumé : cinq est la limite au-delà de laquelle on ne rattrape plus
 * en une soirée.
 */
function lagTone(lag: number): string {
  if (lag <= 0) return "text-muted-foreground";

  return lag > 5 ? "text-status-dropped" : "text-status-paused";
}
