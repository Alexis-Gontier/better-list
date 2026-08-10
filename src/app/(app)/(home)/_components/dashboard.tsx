import { CompassIcon } from "lucide-react";
import Link from "next/link";

import { DashboardSection } from "@/app/(app)/_components/dashboard-section";
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
import { MediaCard } from "@/features/media/components/media-card";
import { compactFromMirror } from "@/features/media/lib/media-format";
import { mediaTotalUnits } from "@/features/media/server/media.mirror";
import { EntryActivityList } from "@/features/tracking/components/entry-activity-list";
import { EntryQuickProgress } from "@/features/tracking/components/entry-quick-progress";
import {
  ENTRY_STATUS_LABELS,
  formatEntryProgress,
  formatSince,
} from "@/features/tracking/lib/entry-format";
import { serializeLibraryFilters } from "@/features/tracking/lib/library-params";
import { getDashboard } from "@/features/tracking/server/tracking.queries";

/**
 * Le tableau de bord (docs/PRODUCT.md §5, V1).
 *
 * Il n'invente rien : il compose ce que le suivi, le journal et le miroir ont déjà posé. Trois
 * questions, dans l'ordre où on se les pose en ouvrant l'application — qu'est-ce que je regarde,
 * qu'est-ce que j'ai laissé en plan, qu'est-ce que j'ai fait.
 *
 * Une seule frontière de suspension pour les trois sections : les quatre lectures partent ensemble
 * dans `getDashboard`, les séparer n'avancerait rien et ferait relire la session à chaque section.
 */
export async function Dashboard() {
  const { current, stalled, activity, total } = await getDashboard();

  // Bibliothèque vide : on ne montre pas trois sections vides, on montre la porte d'entrée.
  if (total === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CompassIcon />
          </EmptyMedia>
          <EmptyTitle>Rien à suivre pour l'instant</EmptyTitle>
          <EmptyDescription>
            Cherchez une œuvre et marquez-la comme en cours : elle apparaîtra
            ici, avec ce que vous en aurez fait.
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
    <div className="space-y-8">
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
                <MediaCard
                  action={
                    <EntryQuickProgress
                      mediaId={entry.media.id}
                      progress={entry.progress}
                      total={mediaTotalUnits(entry.media)}
                      unit={
                        entry.media.type === "ANIME" ? "episode" : "chapitre"
                      }
                    />
                  }
                  media={compactFromMirror(entry.media)}
                  /**
                   * Pas de statut ici : la section le dit déjà. Reste la seule information utile
                   * pour reprendre — où j'en étais.
                   */
                  meta={formatEntryProgress(
                    entry.progress,
                    mediaTotalUnits(entry.media),
                  )}
                />
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
                  action={
                    <EntryQuickProgress
                      mediaId={entry.media.id}
                      progress={entry.progress}
                      total={mediaTotalUnits(entry.media)}
                      unit={
                        entry.media.type === "ANIME" ? "episode" : "chapitre"
                      }
                    />
                  }
                  media={compactFromMirror(entry.media)}
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

      {activity.length > 0 ? (
        <DashboardSection title="Activité récente">
          <EntryActivityList events={activity} />
        </DashboardSection>
      ) : null}
    </div>
  );
}
