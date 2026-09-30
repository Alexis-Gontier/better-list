import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ActivityCalendar } from "@/app/(app)/u/[username]/_components/activity-calendar";
import { GenreChart } from "@/app/(app)/u/[username]/_components/genre-chart";
import { ProfileFavorites } from "@/app/(app)/u/[username]/_components/profile-favorites";
import { ProfileHeader } from "@/app/(app)/u/[username]/_components/profile-header";
import {
  ProfileSection,
  ProfileSectionAside,
} from "@/app/(app)/u/[username]/_components/profile-section";
import { ProfileTimeline } from "@/app/(app)/u/[username]/_components/profile-timeline";
import { ScoreDistributionChart } from "@/app/(app)/u/[username]/_components/score-distribution-chart";
import { StatusBreakdown } from "@/app/(app)/u/[username]/_components/status-breakdown";
import {
  loadProfileFilters,
  serializeProfileFilters,
} from "@/app/(app)/u/[username]/_lib/profile-params";
import { BlurredBackdrop } from "@/components/shared/blurred-backdrop";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { routes } from "@/config/routes";
import { isEmptyFavorites } from "@/features/favorites/lib/favorites-groups";
import {
  getLatestFavoriteCover,
  getProfileFavorites,
} from "@/features/favorites/server/favorites.queries";
import { getPreferences } from "@/features/preferences/server/preferences.queries";
import {
  getProfileActivity,
  getProfileIdentity,
  getProfileJournal,
  getProfileStats,
  type ProfileIdentity,
} from "@/features/profile/server/profile.queries";
import {
  formatStars,
  scoreToStars,
} from "@/features/tracking/lib/entry-format";

/**
 * Ce que le journal ajoute à chaque « Voir plus ».
 *
 * **Douze depuis le 30 septembre 2026** (demande d'Alexis) : à vingt, la carte descendait bien
 * au-dessous de la colonne latérale et le profil redevenait un journal avec des graphes en chapeau.
 * Douze entrées, soit six rangées à deux de front, tiennent à peu près à hauteur de la colonne voisine.
 */
const TIMELINE_PAGE_SIZE = 12;

/**
 * Le plafond du « Voir plus » : six cents entrées. Chaque clic relit le journal depuis le début, et
 * une adresse `?page=100000` ne doit pas pouvoir demander toute la table d'un coup.
 */
const TIMELINE_MAX_PAGES = 50;

export const metadata: Metadata = {
  title: "Profil",
  description: "Le suivi et le journal d'un membre.",
  // Le profil reste hors index : le cercle est privé, et `robots.ts` ferme déjà tout le site. Les
  // deux gardes se doublent volontairement.
  robots: { index: false, follow: false },
};

/**
 * Le profil d'un membre.
 *
 * ## L'écran raconte en trois mouvements
 *
 * **Qui** — le nom, et les quatre chiffres qui disent l'ampleur du suivi.
 * **Quand** — le calendrier de l'année.
 * **Quoi** — la bibliothèque en coupe : statuts, notes, genres.
 * **Ce qu'on aime** — les favoris : œuvres, personnages, staff.
 * **Le détail** — le journal, jour par jour.
 *
 * Un seul défilement, pas d'onglets, et c'est une décision. La fiche d'œuvre voisine en a cinq, ce
 * qui aurait plaidé pour la cohérence — mais le calendrier et le journal sont **la même donnée à
 * deux échelles**, et les séparer par un clic casserait le seul geste intéressant de la page :
 * repérer une journée dense, et aller voir ce qu'elle contenait.
 *
 * **Un sixième bloc a existé, « Anime ou manga » : douze mois d'activité empilés par type.** Il a
 * été retiré le 12 septembre 2026 (décision d'Alexis) parce qu'il était redondant deux fois — avec
 * le calendrier au-dessus, qui dit déjà le rythme à une échelle plus fine, et avec les tuiles de
 * l'en-tête, où « épisodes vus » et « chapitres lus » disent déjà l'équilibre entre les deux
 * supports, sans graphe et sans défilement.
 *
 * ## Trois frontières de suspension, découpées sur le coût
 *
 * `cacheComponents` est actif, donc tout ce qui lit l'horloge ou l'adresse rend son composant
 * dynamique et réclame une frontière. Elles suivent ici les trois natures de lecture :
 *
 * 1. **l'identité et ses compteurs** — six agrégats menés de front sur `Entry` ;
 * 2. **le calendrier** — un an de `EntryEvent`, la lecture la plus volumineuse de l'écran ;
 * 3. **le journal** — une page de douze lignes, jointe au miroir pour les jaquettes.
 *
 * Les favoris ont la leur : une lecture indexée sur `Favorite`, jointe au miroir pour les jaquettes.
 *
 * Les trois zones **relisent l'adresse chacune de leur côté** plutôt que de recevoir un pseudonyme
 * déjà décodé : `await params` au niveau de la page rendrait le composant de page entier dynamique,
 * et la coquille n'arriverait plus qu'avec la première lecture. C'est la règle de `/calendar` et de
 * `/library`, pour la même raison. `getProfileIdentity` est donc appelée trois fois — une lecture
 * sur un index unique, contre une frontière de moins.
 *
 * ⚠️ **Une frontière de suspension ne suffit pas à autoriser `new Date()`.** Next refuse la valeur
 * pendant le prérendu — « encountered the unstable value `new Date()` » — tant qu'aucun **accès
 * dynamique** ne l'a précédée dans le même composant. C'est `await params` qui joue ce rôle ici.
 */
export default function ProfilePage({
  params,
  searchParams,
}: PageProps<"/u/[username]">) {
  return (
    /*
      **Deux colonnes dès `lg`, refaites le 30 septembre 2026** (demande d'Alexis). La page était une
      seule colonne de six cartes de même poids, haute de 4 300 px : rien n'y hiérarchisait rien.
      Elle reprend la coupe du profil AniList — **à gauche ce qui dit le goût** (favoris, puis la
      bibliothèque en coupe), **à droite ce qui s'est passé** (le calendrier, puis le journal). Le
      calendrier et le journal restent l'un au-dessus de l'autre : c'est la décision du 12
      septembre, la même donnée à deux échelles.

      Sur téléphone les colonnes s'empilent dans l'ordre du balisage : identité, favoris,
      statistiques, puis activité et journal — le plus long en dernier.

      **Un seul écart, 16 px, partout** : entre les colonnes comme entre les cartes. C'est le
      correctif du 12 septembre, qui avait mesuré deux rythmes mêlés sans raison.
    */
    <div className="flex flex-col gap-4">
      <Suspense fallback={<HeaderSkeleton />}>
        <ProfileIdentityBlock params={params} />
      </Suspense>

      <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
        <aside className="flex flex-col gap-4">
          <Suspense fallback={<SectionSkeleton contentClassName="h-40" />}>
            <ProfileFavoritesBlock params={params} />
          </Suspense>

          <Suspense fallback={<StatsSkeleton />}>
            <ProfileStatsBlock params={params} />
          </Suspense>
        </aside>

        <div className="flex min-w-0 flex-col gap-4">
          <Suspense fallback={<SectionSkeleton contentClassName="h-36" />}>
            <ProfileActivityBlock params={params} />
          </Suspense>

          {/*
            **Le journal est le seul repli qui annonce moins que ce qui vient, et c'est délibéré.**
            Une page en fait douze : un pavé gris de cette taille pèse plus que le saut qu'il
            éviterait. Il tient donc le plancher — la carte, son en-tête, et de quoi ne pas laisser
            un trou.
          */}
          <Suspense fallback={<SectionSkeleton contentClassName="h-96" />}>
            <ProfileJournalBlock params={params} searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

/**
 * Le membre visé par l'adresse, et ce que le visiteur a le droit d'en lire.
 *
 * **Un pseudonyme inconnu — ou un compte encore en liste d'attente — vaut `notFound()`.** La page
 * répondra malgré tout 200 sous les Cache Components, comme `/l/[token]` l'a mesuré le 6 septembre
 * 2026 : la coquille part avant que la base ait répondu, donc le statut est déjà écrit. Ce qui
 * compte est que **le corps ne contienne rien** — ni nom, ni chiffre, ni titre —, et c'est le cas.
 */
async function resolveProfile(
  params: PageProps<"/u/[username]">["params"],
): Promise<ProfileIdentity> {
  const { username } = await params;
  const profile = await getProfileIdentity(username);

  if (!profile) notFound();

  return profile;
}

/** L'identité et les quatre chiffres. */
async function ProfileIdentityBlock({
  params,
}: {
  params: PageProps<"/u/[username]">["params"];
}) {
  const profile = await resolveProfile(params);
  const { includeAdult } = await getPreferences();

  const [{ tiles }, banner] = await Promise.all([
    getProfileStats({
      userId: profile.id,
      isOwner: profile.isOwner,
      includeAdult,
    }),
    getLatestFavoriteCover({ userId: profile.id, includeAdult }),
  ]);

  return (
    /*
      Le même écart que partout ailleurs : le trait qui clôt l'identité reçoit autant d'air au-dessus
      qu'en dessous, et la colonne garde un seul rythme du haut du profil jusqu'au pied du journal.
    */
    <div className="flex flex-col gap-4">
      <ProfileHeader
        banner={banner}
        image={profile.image}
        memberSince={profile.memberSince}
        name={profile.name}
        tiles={tiles}
        username={profile.username}
      />
      <Separator />
    </div>
  );
}

/** Le calendrier d'activité, et la série de jours qui le commente. */
async function ProfileActivityBlock({
  params,
}: {
  params: PageProps<"/u/[username]">["params"];
}) {
  const profile = await resolveProfile(params);
  const { includeAdult } = await getPreferences();

  const { days, total, streak } = await getProfileActivity({
    userId: profile.id,
    isOwner: profile.isOwner,
    includeAdult,
    now: new Date(),
  });

  return (
    <ProfileSection
      aside={
        // Zéro jour d'affilée n'est pas un chiffre à afficher : c'est l'absence de série.
        streak > 0 ? (
          <ProfileSectionAside
            label={streak > 1 ? "jours d'affilée" : "jour d'affilée"}
            value={String(streak)}
          />
        ) : undefined
      }
      description="Une case par jour sur les douze derniers mois. Plus elle est foncée, plus la journée a été chargée."
      title="Activité"
    >
      <ActivityCalendar data={days} totalCount={total} />
    </ProfileSection>
  );
}

/** La bibliothèque en coupe : statuts, notes, genres. */
async function ProfileStatsBlock({
  params,
}: {
  params: PageProps<"/u/[username]">["params"];
}) {
  const profile = await resolveProfile(params);
  const { includeAdult } = await getPreferences();

  const { tiles, statuses, scores, genres } = await getProfileStats({
    userId: profile.id,
    isOwner: profile.isOwner,
    includeAdult,
  });

  // Une bibliothèque vide n'a pas de coupe à montrer : trois graphes à zéro ne disent rien qu'une
  // phrase ne dise mieux.
  if (tiles.entries === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Rien à montrer pour l'instant</EmptyTitle>
          <EmptyDescription>
            {profile.isOwner
              ? "Votre bibliothèque est vide. Suivez une première œuvre depuis le catalogue, et les statistiques arriveront d'elles-mêmes."
              : `${profile.name} n'a encore rien ajouté à sa bibliothèque.`}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ProfileSection
        description="Où en sont les œuvres de la bibliothèque — mêmes couleurs que dans votre bibliothèque."
        title="Répartition"
      >
        <StatusBreakdown data={statuses} />
      </ProfileSection>

      {/*
        Côte à côte sur tablette, empilées dans la colonne latérale : à 22 rem, deux graphes de front
        ne tiendraient pas leurs graduations.
      */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
        <ProfileSection
          aside={
            tiles.meanScore === null ? undefined : (
              <ProfileSectionAside
                label="note moyenne"
                value={`${formatStars(scoreToStars(tiles.meanScore))}★`}
              />
            )
          }
          description="Une barre par demi-étoile."
          title="Notes"
        >
          <ScoreDistributionChart data={scores} />
        </ProfileSection>

        <ProfileSection
          description="Les huit genres les plus représentés dans la bibliothèque."
          title="Genres"
        >
          <GenreChart data={genres} />
        </ProfileSection>
      </div>
    </div>
  );
}

/** Les coups de cœur : œuvres, personnages, staff. Absent tant qu'il n'y en a aucun. */
async function ProfileFavoritesBlock({
  params,
}: {
  params: PageProps<"/u/[username]">["params"];
}) {
  const profile = await resolveProfile(params);
  const { includeAdult, titleLanguage } = await getPreferences();

  const groups = await getProfileFavorites({
    userId: profile.id,
    includeAdult,
    titleLanguage,
  });

  if (isEmptyFavorites(groups)) return null;

  return (
    <ProfileSection
      description="Les œuvres, personnages et membres du staff mis en favori, les plus récents d'abord."
      title="Favoris"
    >
      <ProfileFavorites groups={groups} />
    </ProfileSection>
  );
}

/**
 * Le journal, qui s'allonge à la demande.
 *
 * **« Voir plus » plutôt qu'une pagination** (demande d'Alexis, 30 septembre 2026) : un journal se
 * lit en remontant le temps, et changer de page faisait perdre ce qu'on venait de lire. `?page=n`
 * veut désormais dire « les n premiers paquets de douze », rendus d'un seul tenant.
 *
 * **Un lien, pas un îlot client.** Le bouton pointe vers `?page=n+1` sans remonter en haut
 * (`scroll={false}`) : le serveur rend la liste allongée, et React garde l'ancienne affichée
 * pendant la transition. Charger la suite côté client aurait demandé un route handler avec sa
 * propre garde (CLAUDE.md) pour quatre comptes et quelques dizaines de lignes — et l'adresse n'aurait
 * plus dit ce qu'on voit.
 */
async function ProfileJournalBlock({
  params,
  searchParams,
}: {
  params: PageProps<"/u/[username]">["params"];
  searchParams: PageProps<"/u/[username]">["searchParams"];
}) {
  const profile = await resolveProfile(params);
  const { page } = await loadProfileFilters(searchParams);
  const { includeAdult, titleLanguage } = await getPreferences();

  const pages = Math.min(Math.max(page, 1), TIMELINE_MAX_PAGES);

  const { events, total } = await getProfileJournal({
    userId: profile.id,
    isOwner: profile.isOwner,
    includeAdult,
    titleLanguage,
    skip: 0,
    take: pages * TIMELINE_PAGE_SIZE,
  });

  const remaining = total - events.length;
  const canLoadMore = remaining > 0 && pages < TIMELINE_MAX_PAGES;

  return (
    <ProfileSection
      description="Chaque progression, chaque note, chaque changement de statut — dans l'ordre."
      title="Historique"
    >
      {events.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Aucun événement</EmptyTitle>
            <EmptyDescription>
              Le journal se remplit tout seul : chaque progression, chaque note
              et chaque changement de statut y laisse une ligne datée.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-6">
          <ProfileTimeline events={events} now={new Date()} />

          {canLoadMore ? (
            <Button asChild className="self-center" variant="outline">
              <Link
                href={serializeProfileFilters(
                  routes.profile(profile.username),
                  {
                    page: pages + 1,
                  },
                )}
                prefetch={false}
                scroll={false}
              >
                Voir plus
                <span className="text-muted-foreground tabular-nums">
                  {remaining} restant{remaining > 1 ? "s" : ""}
                </span>
              </Link>
            </Button>
          ) : null}
        </div>
      )}
    </ProfileSection>
  );
}

/**
 * Les squelettes, aux proportions de ce qu'ils annoncent.
 *
 * Un squelette approximatif déplace ce qu'il remplace, et le déplacement se voit plus que
 * l'attente — c'est la règle que suivent les autres écrans du projet.
 */
function HeaderSkeleton() {
  return (
    /*
      **La structure est celle du bloc rendu, écart pour écart** — bande, avatar qui mord dessus,
      rangée de chiffres, puis le trait. Un squelette approximatif déplace tout l'écran à l'arrivée
      des données.
    */
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-6">
        <BlurredBackdrop image={null} />

        <div className="-mt-20 relative flex flex-col gap-4 sm:-mt-24 sm:flex-row sm:items-end sm:gap-6">
          <Skeleton className="size-24 rounded-full ring-4 ring-background sm:size-28" />
          <div className="flex flex-col gap-1 sm:pb-2">
            <Skeleton className="h-9 w-56 sm:h-10" />
            <Skeleton className="h-5 w-64" />
          </div>
        </div>

        <div className="flex flex-wrap gap-x-10 gap-y-4">
          {STAT_SKELETON_KEYS.map((key) => (
            <div className="flex flex-col-reverse gap-0.5" key={key}>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-14" />
            </div>
          ))}
        </div>
      </div>
      <Separator />
    </div>
  );
}

/** Les quatre chiffres de l'en-tête. */
const STAT_SKELETON_KEYS = Array.from(
  { length: 4 },
  (_, index) => `chiffre-${index}`,
);

/**
 * La répartition, puis la rangée notes / genres.
 *
 * **La rangée est une grille, pas un pavé.** Les deux cartes ne passent côte à côte qu'à partir de
 * `lg` ; en dessous elles s'empilent, et un repli d'une seule hauteur annonçait la moitié du bloc
 * sur tout ce qui est plus étroit. La grille reprise ici se replie avec lui.
 *
 * Les hauteurs de contenu ne sont pas estimées : l'histogramme des notes est en `h-72`, et le
 * graphe des genres fait `2.25rem` par genre, huit au plus — les deux valent 288 px.
 */
function StatsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {/* Barre empilée (28 px), puis six statuts sur deux rangées : 92 px de contenu. */}
      <SectionSkeleton contentClassName="h-23" />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
        <SectionSkeleton contentClassName="h-56" />
        <SectionSkeleton contentClassName="h-72" />
      </div>
    </div>
  );
}

/**
 * Le double d'un bloc du profil : la carte, son en-tête, et un contenu de la hauteur annoncée.
 *
 * **Il compose le vrai `Card`** plutôt que d'en recopier les marges. La coquille est alors juste par
 * construction — et le reste juste le jour où la carte changera de rembourrage —, si bien que le
 * seul chiffre à tenir est la hauteur du contenu, que chaque appelant connaît.
 */
function SectionSkeleton({ contentClassName }: { contentClassName: string }) {
  return (
    <Card>
      <CardHeader>
        {/* `CardTitle` est en `text-base` (24 px d'interligne), `CardDescription` en `text-sm` (20). */}
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-5 w-72 max-w-full" />
      </CardHeader>
      <CardContent>
        <Skeleton className={contentClassName} />
      </CardContent>
    </Card>
  );
}
