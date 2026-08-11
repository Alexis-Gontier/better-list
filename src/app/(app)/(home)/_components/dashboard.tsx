import { CompassIcon } from "lucide-react";
import Link from "next/link";

import { DashboardSection } from "@/app/(app)/(home)/_components/dashboard-section";
import { MediaGrid } from "@/components/shared/media-grid";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { routes } from "@/config/routes";
import { ListCard } from "@/features/lists/components/list-card";
import { getMyLists } from "@/features/lists/server/lists.queries";
import { MediaCard } from "@/features/media/components/media-card";
import { compactFromMirror } from "@/features/media/lib/media-format";
import { mediaTotalUnits } from "@/features/media/server/media.mirror";
import { EntryCardActions } from "@/features/tracking/components/entry-card-actions";
import {
  ENTRY_STATUS_LABELS,
  formatEntryProgress,
  formatScore,
  formatSince,
} from "@/features/tracking/lib/entry-format";
import { serializeLibraryFilters } from "@/features/tracking/lib/library-params";
import { getDashboard } from "@/features/tracking/server/tracking.queries";

/**
 * La part personnelle de l'accueil (docs/PRODUCT.md §5).
 *
 * Elle n'invente rien : elle compose ce que le suivi et les listes ont déjà posé. Trois questions,
 * dans l'ordre où on se les pose en ouvrant l'application — qu'est-ce que je regarde, qu'est-ce que
 * j'ai laissé en plan, qu'est-ce que j'ai rangé quelque part.
 *
 * **Elle passe avant la découverte, et c'est le choix qui structure la page.** Le geste le plus
 * fréquent du produit est le « +1 » (§6) : le mettre sous des rangées de catalogue le ferait payer
 * un défilement à chaque ouverture.
 *
 * Deux lectures locales en parallèle, une seule frontière de suspension : elles répondent en même
 * temps et n'ont aucune raison d'arriver séparément. Les rangées AniList, elles, ont leur propre
 * frontière — voir `discovery.tsx`.
 *
 * Le composant rend une **liste de sections**, pas un conteneur : c'est la page qui tient
 * l'espacement, pour que le suivi, la découverte et le journal respirent de la même façon.
 */

/** Assez de listes pour donner envie d'aller voir, pas assez pour recopier `/lists` ici. */
const DASHBOARD_LISTS_COUNT = 3;

export async function Dashboard() {
  const [{ current, stalled, total }, lists] = await Promise.all([
    getDashboard(),
    getMyLists(),
  ]);

  /**
   * Ce que chaque vignette de suivi porte, à l'identique dans les deux sections : où j'en suis, ce
   * que j'en ai pensé, et de quoi avancer ou tout corriger sans quitter l'accueil.
   *
   * Convertir une note 0–100 en étoiles appartient au suivi (docs/PRODUCT.md §4.2), pas à la
   * carte : c'est pour ça que la conversion se fait ici et que `MediaCard` ne reçoit qu'une chaîne.
   */
  const trackingProps = (entry: (typeof current)[number]) => {
    const media = compactFromMirror(entry.media);
    const totalUnits = mediaTotalUnits(entry.media);

    return {
      media,
      progress: {
        value: entry.progress,
        total: totalUnits,
        label: formatEntryProgress(entry.progress, totalUnits),
      },
      score: entry.score === null ? null : formatScore(entry.score),
      action: (
        <EntryCardActions
          bannerImage={entry.media.bannerImage}
          entry={entry}
          media={media}
          total={totalUnits}
        />
      ),
    };
  };

  /**
   * Bibliothèque vide : une seule porte d'entrée, pas trois sections creuses.
   *
   * L'encadré ne prend plus toute la page comme au temps du tableau de bord seul — la découverte
   * s'affiche dessous, et c'est justement elle qui donne de quoi remplir la bibliothèque. On garde
   * le bouton : la recherche reste le chemin le plus court quand on sait déjà quoi suivre.
   */
  if (total === 0 && lists.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CompassIcon />
          </EmptyMedia>
          <EmptyTitle>Rien à suivre pour l'instant</EmptyTitle>
          <EmptyDescription>
            Marquez une œuvre comme en cours : elle apparaîtra ici, avec ce que
            vous en aurez fait. Il y a de quoi piocher juste en dessous.
          </EmptyDescription>
        </EmptyHeader>

        <EmptyContent>
          <Button asChild size="sm">
            <Link href={routes.search}>Chercher une œuvre</Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <>
      {current.length > 0 ? (
        <DashboardSection
          href={serializeLibraryFilters(routes.library, {
            status: "CURRENT",
            type: null,
            sort: "recent",
            page: 1,
          })}
          title="En cours"
        >
          <MediaGrid>
            {current.map((entry) => (
              <li key={entry.id}>
                {/*
                  Aucune ligne de contexte : la section dit déjà le statut, et « où j'en étais » —
                  la seule information qui reste utile pour reprendre — s'affiche maintenant en
                  pastille sur la jaquette.
                */}
                <MediaCard {...trackingProps(entry)} />
              </li>
            ))}
          </MediaGrid>
        </DashboardSection>
      ) : null}

      {stalled.length > 0 ? (
        <DashboardSection title="À reprendre">
          <MediaGrid>
            {stalled.map((entry) => (
              <li key={entry.id}>
                <MediaCard
                  {...trackingProps(entry)}
                  /**
                   * L'ancienneté est ici l'information : « En pause » n'apprend rien, « en pause
                   * depuis huit mois » décide (docs/PRODUCT.md §8.4). Le statut l'accompagne, parce
                   * que la section mélange les séries en pause et celles qu'on a laissées filer
                   * sans le dire.
                   */
                  meta={[
                    ENTRY_STATUS_LABELS[entry.status],
                    formatSince(entry.updatedAt, new Date()),
                  ].join(" · ")}
                />
              </li>
            ))}
          </MediaGrid>
        </DashboardSection>
      ) : null}

      {lists.length > 0 ? (
        <DashboardSection href={routes.lists.root} title="Mes listes">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lists.slice(0, DASHBOARD_LISTS_COUNT).map((list) => (
              <li key={list.id}>
                <ListCard list={list} now={new Date()} />
              </li>
            ))}
          </ul>
        </DashboardSection>
      ) : null}
    </>
  );
}
