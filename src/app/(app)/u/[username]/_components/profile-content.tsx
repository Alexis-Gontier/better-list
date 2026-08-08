import { ScrollTextIcon } from "lucide-react";
import { notFound } from "next/navigation";

import { ProfileHeader } from "@/app/(app)/u/[username]/_components/profile-header";
import { ProfileStats } from "@/app/(app)/u/[username]/_components/profile-stats";
import { Pagination } from "@/components/shared/pagination";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { routes } from "@/config/routes";
import { getPreferences } from "@/features/preferences/server/preferences.queries";
import {
  loadProfileFilters,
  serializeProfileFilters,
} from "@/features/profile/lib/profile-params";
import {
  getProfile,
  getProfileStats,
  getProfileTimeline,
} from "@/features/profile/server/profile.queries";
import { EntryActivityList } from "@/features/tracking/components/entry-activity-list";
import { getSession } from "@/lib/auth/session";

/**
 * Le profil d'un membre : qui il est, ses chiffres, et son journal complet.
 *
 * C'est ici que `EntryEvent` trouve sa lecture entière (docs/PRODUCT.md §4.3) — la fiche n'en montre
 * que les dernières lignes d'une œuvre, le tableau de bord un survol de la semaine.
 *
 * **`isSelf` gouverne la visibilité**, et il se déduit de la session, jamais de l'URL. Les entrées
 * marquées privées sortent des chiffres comme du journal quand on regarde le profil d'un autre
 * (§7) ; le filtre lui-même est appliqué dans `profile.queries.ts`, en un seul endroit.
 */
export async function ProfileContent({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { username } = await params;
  const profile = await getProfile(username);

  // Compte inconnu, ou pas encore approuvé : dans les deux cas la page n'existe pas. Les confondre
  // est volontaire — distinguer les deux confirmerait l'existence d'un compte en attente.
  if (!profile) notFound();

  const session = await getSession();
  const isSelf = session?.user.id === profile.id;

  const { page } = await loadProfileFilters(searchParams);

  const [{ scoreFormat }, stats, timeline] = await Promise.all([
    getPreferences(),
    getProfileStats({ userId: profile.id, isSelf }),
    getProfileTimeline({ userId: profile.id, isSelf, page }),
  ]);

  return (
    <div className="space-y-8">
      <ProfileHeader
        createdAt={profile.createdAt}
        image={profile.image}
        isSelf={isSelf}
        name={profile.name}
        username={profile.username}
      />

      <ProfileStats isSelf={isSelf} scoreFormat={scoreFormat} stats={stats} />

      <section aria-labelledby="journal" className="space-y-3">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-semibold text-base" id="journal">
            Journal
          </h2>

          {timeline.total > 0 ? (
            <p className="text-muted-foreground text-sm tabular-nums">
              {timeline.total.toLocaleString("fr-FR")} événements
            </p>
          ) : null}
        </div>

        {timeline.events.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ScrollTextIcon />
              </EmptyMedia>
              <EmptyTitle>Journal vide</EmptyTitle>
              <EmptyDescription>
                {isSelf
                  ? "Chaque progression, note et changement de statut s'inscrira ici, daté."
                  : "Ce membre n'a encore rien à raconter."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <EntryActivityList events={timeline.events} />

            <Pagination
              currentPage={timeline.currentPage}
              hrefForPage={(next) =>
                serializeProfileFilters(routes.profile(username), {
                  page: next,
                })
              }
              label="Pagination du journal"
              lastPage={timeline.lastPage}
            />
          </>
        )}
      </section>
    </div>
  );
}
