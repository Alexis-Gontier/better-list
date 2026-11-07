import Image from "next/image";
import type { ReactNode } from "react";

import { Kbd } from "@/components/ui/kbd";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ShelfRows } from "@/features/collection/components/shelf-rows";
import type { ShelfSeries } from "@/features/collection/server/collection.queries";
import { TierRows } from "@/features/lists/components/tier-rows";
import { DEFAULT_TIERS } from "@/features/lists/lib/tier-list";
import { MediaCard } from "@/features/media/components/media-card";
import { mediaTitle } from "@/features/media/lib/media-format";
import type { Media } from "@/features/media/schemas/media.schema";
import {
  getShowcase,
  type Showcase,
} from "@/features/media/server/showcase.queries";
import { ProfileTimeline } from "@/features/profile/components/profile-timeline";
import { StatusBreakdown } from "@/features/profile/components/status-breakdown";
import type { ProfileEvent } from "@/features/profile/server/profile.queries";
import { EntryStatusDot } from "@/features/tracking/components/entry-status-dot";
import { cn } from "@/lib/utils";

/*
  Les fragments de la landing sont **les composants de l'app**, nourris d'exemples faits des
  tendances de la vitrine (aucune requête AniList de plus, D71). Le suivi qu'ils montrent n'est
  celui de personne. L'appelant les pose dans un conteneur `inert` : leurs liens ne prennent pas le
  focus et sortent de l'arbre d'accessibilité, le sens de la tuile étant porté par son titre.
*/

type Cover = Showcase["covers"][number];

/** Langue des titres d'un visiteur sans session : celle par défaut des préférences. */
const TITLE_LANGUAGE = "ROMAJI";

/**
 * Rend `render` avec la vitrine et l'horloge. Sans vitrine, chaque fragment ne rend rien plutôt
 * qu'un exemple vide : la tuile garde son titre et sa phrase.
 */
export async function Showcased({
  render,
}: {
  render: (showcase: Showcase, now: Date) => ReactNode;
}) {
  const showcase = await getShowcase();
  if (showcase.media.length < 16) return null;
  return render(showcase, new Date());
}

const HOUR = 60 * 60 * 1000;

function example(
  media: Media,
  createdAt: Date,
  event: Pick<ProfileEvent, "type"> & Partial<ProfileEvent>,
  index: number,
): ProfileEvent {
  return {
    id: `exemple-${index}`,
    progressFrom: null,
    progressTo: null,
    statusFrom: null,
    statusTo: null,
    score: null,
    note: null,
    mediaId: media.id,
    title: mediaTitle(media.title, TITLE_LANGUAGE),
    cover: media.coverImage?.large ?? null,
    unit: "episode",
    createdAt,
    ...event,
  };
}

/** Le journal du profil, sur trois journées d'exemple qui finissent aujourd'hui. */
export function JournalFragment({ media, now }: { media: Media[]; now: Date }) {
  const at = (hoursAgo: number) => new Date(now.getTime() - hoursAgo * HOUR);
  const [a, b, c, d, e] = media;
  if (!(a && b && c && d && e)) return null;
  const events = [
    example(a, at(1), { type: "PROGRESS", progressFrom: 4, progressTo: 5 }, 0),
    example(b, at(2), { type: "PROGRESS", progressFrom: 5, progressTo: 6 }, 1),
    example(
      c,
      at(26),
      { type: "PROGRESS", progressFrom: 9, progressTo: 12 },
      2,
    ),
    example(d, at(27), { type: "STATUS_CHANGED", statusTo: "PLANNING" }, 3),
    example(e, at(50), { type: "SCORED", score: 90 }, 4),
  ];
  // Les intitulés de jour collent en haut de l'écran sur le profil ; dans une tuile, ils suivraient
  // le défilement de toute la page.
  return (
    <div className="[&_h3]:static">
      <ProfileTimeline events={events} now={now} />
    </div>
  );
}

/** La rangée « En cours » de l'accueil : la carte, sa pastille, l'épisode où l'on en est. */
export function ProgressFragment({ media }: { media: Media[] }) {
  return (
    <ul className="grid grid-cols-3 gap-3">
      {media.slice(5, 8).map((item, index) => (
        <li key={item.id}>
          <MediaCard
            details={[`Ép. ${[6, 3, 11][index]} / ${item.episodes ?? 12}`]}
            marker={<EntryStatusDot status="CURRENT" />}
            media={item}
            titleLanguage={TITLE_LANGUAGE}
          />
        </li>
      ))}
    </ul>
  );
}

/** Un titre de suite (« 3rd Season », « Part 2 ») ferait une étagère invraisemblable. */
const SEQUEL = /season|part|\d(st|nd|rd|th)\b|\b(ii|2|3)\b/i;

function shelfExample(
  media: Media,
  total: number,
  owned: number[],
): ShelfSeries {
  const missing = Array.from({ length: total }, (_, i) => i + 1).filter(
    (n) => !owned.includes(n),
  );
  return {
    media,
    edition: {
      id: `exemple-${media.id}`,
      label: "Édition standard",
      publisher: null,
      volumesTotal: total,
    },
    ownedNumbers: owned,
    ownedCount: owned.length,
    missing,
    missingLabel: missing.join(", "),
    extra: [],
    isComplete: missing.length === 0,
    lastOwned: owned.at(-1) ?? null,
    isReleasing: false,
  };
}

/** L'étagère de `/collection` : deux séries, l'une à qui il manque un tome, l'autre complète. */
export function ShelfFragment({ media }: { media: Media[] }) {
  const [first, second] = media.filter(
    (item) => !SEQUEL.test(mediaTitle(item.title, TITLE_LANGUAGE)),
  );
  if (!(first && second)) return null;
  const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
  return (
    <ShelfRows
      shelf={[
        shelfExample(
          first,
          13,
          range(13).filter((n) => n !== 9),
        ),
        shelfExample(second, 8, range(8)),
      ]}
      titleLanguage={TITLE_LANGUAGE}
    />
  );
}

/** La tier list de `/lists/[id]`, sans lien : trois paliers et deux tendances encore en réserve. */
export function TierFragment({ media }: { media: Media[] }) {
  const placement = [0, 0, 1, 1, 1, 2, null, null];
  const items = media.slice(8, 16).map((item, index) => ({
    mediaId: item.id,
    cover: item.coverImage?.large ?? null,
    title: mediaTitle(item.title, TITLE_LANGUAGE),
    tierIndex: placement[index] ?? null,
  }));
  return (
    <TierRows
      items={items}
      mediaHref={null}
      tiers={DEFAULT_TIERS.slice(0, 3)}
    />
  );
}

/** La répartition par statut du profil, sur des comptes d'exemple. */
export function StatsFragment() {
  return (
    <StatusBreakdown
      data={[
        { status: "CURRENT", count: 7 },
        { status: "COMPLETED", count: 18 },
        { status: "PAUSED", count: 2 },
        { status: "DROPPED", count: 1 },
        { status: "PLANNING", count: 12 },
      ]}
    />
  );
}

/** Les réglages de `/settings`, avec leurs libellés (D64). */
const PRIVACY = [
  ["Profil visible des membres", true],
  ["Journal", true],
  ["Statistiques", true],
  ["Favoris", false],
] as const;

export function PrivacyFragment() {
  return (
    <ul className="flex flex-col divide-y">
      {PRIVACY.map(([label, on]) => (
        <li
          className="flex items-center justify-between py-3 text-sm"
          key={label}
        >
          {label}
          <Switch defaultChecked={on} tabIndex={-1} />
        </li>
      ))}
    </ul>
  );
}

function Thumb({ cover }: { cover: Cover | undefined }) {
  return (
    <span className="relative block h-12 w-8 shrink-0 overflow-hidden rounded-sm bg-muted">
      {cover ? (
        <Image
          alt=""
          className="object-cover"
          fill
          sizes="32px"
          src={cover.src}
        />
      ) : null}
    </span>
  );
}

const SEARCH_LINES = [
  "Anime · tendance du moment",
  "Anime · en cours",
  "Anime · dans votre liste « À voir »",
];

/** La palette Ctrl K, ouverte sur trois tendances ; `covers` vide en fait le squelette. */
export function SearchFragment({ covers }: { covers: Cover[] }) {
  return (
    <div className="w-full overflow-hidden rounded-2xl border bg-card lg:max-w-xl">
      <div className="flex h-13 items-center justify-between border-b px-4.5">
        <span className="text-muted-foreground">Rechercher une œuvre…</span>
        <Kbd>Échap</Kbd>
      </div>
      <div className="flex flex-col gap-0.5 p-2">
        {SEARCH_LINES.map((line, index) => (
          <div
            className={cn(
              "flex min-w-0 items-center gap-3 rounded-lg p-2.5",
              index === 0 && "bg-accent",
            )}
            key={line}
          >
            <Thumb cover={covers[index]} />
            <div className="flex min-w-0 flex-col">
              {covers[index] ? (
                <span className="truncate font-medium text-sm">
                  {covers[index].title}
                </span>
              ) : (
                <Skeleton className="h-5 w-40" />
              )}
              <span className="text-muted-foreground text-xs">{line}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
