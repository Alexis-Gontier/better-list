import { DashboardSection } from "@/app/(app)/(home)/_components/dashboard-section";
import { routes } from "@/config/routes";
import { EntryActivityList } from "@/features/tracking/components/entry-activity-list";
import { getRecentActivity } from "@/features/tracking/server/tracking.queries";
import { getSession } from "@/lib/auth/session";

/**
 * Le journal, en bas de l'accueil.
 *
 * Il ferme la page plutôt que de la couper en deux : ce n'est pas une chose qu'on vient faire, c'est
 * une chose qu'on vérifie. Sa frontière de suspension est distincte de celle des rangées de
 * découverte — elles attendent AniList, lui une lecture locale — et `getSession` porte le `cache` de
 * React, donc la séparation ne coûte aucune lecture de plus.
 *
 * Rien du tout quand le journal est vide : un encadré vide annoncerait une panne là où il n'y a
 * simplement rien à raconter.
 */
export async function RecentActivity() {
  const [events, session] = await Promise.all([
    getRecentActivity(),
    getSession(),
  ]);

  if (events.length === 0) return null;

  /**
   * `username` est un champ additionnel de Better Auth, donc typé optionnel — il est en pratique
   * toujours rempli (hook `user.create.before`). On ne force pas le type : sans lui, le lien mène à
   * `/u/undefined`, et une section sans « voir tout » vaut mieux qu'un lien cassé.
   */
  const username = session?.user.username;

  return (
    <DashboardSection
      href={username ? routes.profile(username) : undefined}
      linkLabel="Tout le journal"
      title="Activité récente"
    >
      <EntryActivityList events={events} />
    </DashboardSection>
  );
}
