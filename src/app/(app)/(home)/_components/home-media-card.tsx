import type {
  ResumableItem,
  TrackedItem,
} from "@/app/(app)/(home)/_lib/home-data";
import { MediaCard } from "@/features/media/components/media-card";
import { mediaTitle } from "@/features/media/lib/media-format";
import type { Media } from "@/features/media/schemas/media.schema";
import type { TitleLanguage } from "@/features/preferences/schemas/preferences.schema";
import { EntryQuickActions } from "@/features/tracking/components/entry-quick-actions";
import { EntryQuickEdit } from "@/features/tracking/components/entry-quick-edit";
import { EntryStatusDot } from "@/features/tracking/components/entry-status-dot";
import { formatLag } from "@/features/tracking/lib/airing-lag";
import {
  ENTRY_UNIT_LABELS,
  type EntryUnit,
  formatEntryProgress,
  formatSince,
} from "@/features/tracking/lib/entry-format";
import type { EntryState } from "@/features/tracking/lib/entry-transition";
import type { LibraryItem } from "@/features/tracking/server/library.queries";

/**
 * La ligne d'une carte « À reprendre » : **ce qu'il reste à finir**.
 *
 * C'est ce qui fait reprendre, et l'ancienneté qui s'écrivait ici ne le faisait pas (décision
 * d'Alexis du 14 septembre 2026) : « il y a quatre mois » est vrai de la moitié de la rangée, quand
 * « il reste six chapitres » désigne la série qu'on finit ce soir. La rangée se range d'ailleurs
 * dessus (`loadTracking`).
 *
 * **L'ancienneté reste le repli**, pour les séries dont AniList ignore le total — sans elle, ces
 * cartes-là n'auraient plus rien à dire, et une carte muette casse l'alignement d'une rangée
 * (`MediaCard`).
 */
export function resumeDetails(item: ResumableItem, now: Date): string[] {
  if (item.remaining !== null) {
    const { singular } = ENTRY_UNIT_LABELS[item.unit];
    const plural = item.remaining > 1 ? "s" : "";

    return [`Il reste ${item.remaining} ${singular}${plural}`];
  }

  const since = formatSince(item.lastActivity, now);

  return [`${since.charAt(0).toUpperCase()}${since.slice(1)}`];
}

/** L'unité abrégée : sous une jaquette de trois colonnes, « épisode » ne tient pas. */
const UNIT_ABBREVIATIONS: Record<EntryUnit, string> = {
  episode: "ép.",
  chapitre: "ch.",
};

/**
 * La ligne d'une carte « En cours » : **ce qui m'attend, ou bien où j'en suis**.
 *
 * Le retard passe devant la progression dès qu'il y en a un. « 6 épisodes de retard » dit d'un coup
 * qu'il y a du neuf et combien ; « ép. 12 / 26 » demanderait de connaître la grille de diffusion par
 * cœur pour en déduire la même chose.
 *
 * **Une ligne dans tous les cas, jamais zéro** : `MediaCard` aligne les cartes d'une rangée sur un
 * nombre de lignes constant, et une carte muette raccourcirait sa colonne.
 */
export function trackingDetails(item: TrackedItem): string[] {
  if (item.lag > 0) return [formatLag(item.lag)];

  const progress = formatEntryProgress(item.entry.progress, item.total);

  return [
    progress ? `${UNIT_ABBREVIATIONS[item.unit]} ${progress}` : "Pas commencé",
  ];
}

/**
 * Les cartes de l'accueil — **la `MediaCard` de `/search` et `/library`, avec le même câblage**.
 *
 * Décision d'Alexis du 14 septembre 2026 : les jaquettes maison de l'accueil (progression sur
 * l'image, badges, titres posés dessus) sont abandonnées au profit de la carte du catalogue. Une
 * œuvre a désormais la même apparence et le même geste — la pastille de statut à gauche du titre, la
 * fenêtre d'édition rapide au survol — sur les trois écrans où on la croise.
 *
 * Deux variantes parce que les données n'arrivent pas sous la même forme, pas parce que la carte
 * diffère : le suivi fournit une `LibraryItem` complète, le catalogue une `Media` d'AniList et, à
 * côté, l'entrée éventuelle.
 */

/**
 * Une œuvre de mon suivi : elle a toujours une entrée, donc toujours une pastille.
 *
 * `details` passe des lignes sous le titre — la rangée « À reprendre » y met où j'en suis et depuis
 * quand (`resumeDetails`). La rangée « En cours » n'en passe pas.
 */
export function TrackedMediaCard({
  item,
  titleLanguage,
  details,
}: {
  item: LibraryItem;
  titleLanguage: TitleLanguage;
  details?: string[];
}) {
  return (
    <MediaCard
      details={details}
      action={
        <EntryQuickActions
          mediaId={item.media.id}
          progress={item.entry.progress}
          total={item.total}
          tracked
          unit={item.unit}
        >
          <EntryQuickEdit
            banner={item.banner}
            compact
            entry={item.entry}
            mediaId={item.media.id}
            title={mediaTitle(item.media.title, titleLanguage)}
            total={item.total}
            unit={item.unit}
          />
        </EntryQuickActions>
      }
      marker={<EntryStatusDot status={item.entry.status} />}
      media={item.media}
      titleLanguage={titleLanguage}
    />
  );
}

/**
 * Une œuvre du catalogue : la pastille **seulement si elle est suivie**, comme sur `/search` — une
 * pastille neutre sur chaque carte ferait du marqueur un ornement.
 */
export function CatalogueMediaCard({
  media,
  entry,
  titleLanguage,
}: {
  media: Media;
  entry: EntryState | null;
  titleLanguage: TitleLanguage;
}) {
  const total = media.type === "ANIME" ? media.episodes : media.chapters;
  const unit = media.type === "ANIME" ? "episode" : "chapitre";

  return (
    <MediaCard
      action={
        <EntryQuickActions
          mediaId={media.id}
          progress={entry?.progress ?? 0}
          total={total}
          tracked={entry !== null}
          unit={unit}
        >
          <EntryQuickEdit
            banner={media.bannerImage}
            compact
            entry={entry}
            mediaId={media.id}
            title={mediaTitle(media.title, titleLanguage)}
            total={total}
            unit={unit}
          />
        </EntryQuickActions>
      }
      marker={entry ? <EntryStatusDot status={entry.status} /> : undefined}
      media={media}
      titleLanguage={titleLanguage}
    />
  );
}
