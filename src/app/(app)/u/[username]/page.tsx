import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ActivityCalendar } from "@/app/(app)/u/[username]/_components/activity-calendar";
import { GenreChart } from "@/app/(app)/u/[username]/_components/genre-chart";
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
import { CataloguePagination } from "@/components/shared/catalogue-pagination";
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
 * La longueur d'une page de journal.
 *
 * Vingt et non cinquante : au-delà, l'historique occupe à lui seul plus de hauteur que les blocs de
 * statistiques réunis, et le profil cesse d'être un profil pour devenir un journal avec des graphes
 * en chapeau.
 */
const TIMELINE_PAGE_SIZE = 20;

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
 * 3. **le journal** — une page de vingt lignes, jointe au miroir pour les jaquettes.
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
      **Un seul écart pour toute la colonne, et c'est un correctif.** La page mélangeait deux
      rythmes : 32 px entre les blocs suspendus, 16 px entre les cartes d'un même bloc — mesuré à
      l'écran le 12 septembre 2026, « Activité → Répartition : 32, Répartition → Notes : 16,
      Genres → Historique : 32 ». Rien ne justifiait cette hiérarchie : les cinq cartes sont de
      même rang, et deux d'entre elles se trouvaient simplement partager une frontière de
      suspension. Un espacement qui suit le découpage technique plutôt que le contenu se voit.
    */
    <div className="flex flex-col gap-4">
      <Suspense fallback={<HeaderSkeleton />}>
        <ProfileIdentityBlock params={params} />
      </Suspense>

      <Suspense fallback={<SectionSkeleton contentClassName="h-44" />}>
        <ProfileActivityBlock params={params} />
      </Suspense>

      <Suspense fallback={<StatsSkeleton />}>
        <ProfileStatsBlock params={params} />
      </Suspense>

      {/*
        **Le journal est le seul repli qui annonce moins que ce qui vient, et c'est délibéré.** Une
        page en fait vingt, soit près de neuf cents pixels sur écran large et le double sur
        téléphone : un pavé gris de cette taille pèse plus que le saut qu'il éviterait. Il tient
        donc le plancher — la carte, son en-tête, et de quoi ne pas laisser un trou.
      */}
      <Suspense fallback={<SectionSkeleton contentClassName="h-96" />}>
        <ProfileJournalBlock params={params} searchParams={searchParams} />
      </Suspense>
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

  const { tiles } = await getProfileStats({
    userId: profile.id,
    isOwner: profile.isOwner,
    includeAdult,
  });

  return (
    /*
      Le même écart que partout ailleurs : le trait qui clôt l'identité reçoit autant d'air au-dessus
      qu'en dessous, et la colonne garde un seul rythme du haut du profil jusqu'au pied du journal.
    */
    <div className="flex flex-col gap-4">
      <ProfileHeader
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
        Deux colonnes à partir de `lg` seulement. En `md`, l'histogramme des notes tombe sous
        380 px de large et ses dix graduations se chevauchent — une échelle illisible vaut moins
        qu'une rangée de plus à faire défiler.
      */}
      <div className="grid gap-4 lg:grid-cols-2">
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

/** Le journal, une page à la fois. */
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

  /*
    `skip` part de la page demandée **avant** de connaître le total : on ne peut pas borner ce qu'on
    n'a pas encore compté. Une page au-delà de la fin rend une liste vide, que le bloc ci-dessous
    traite comme telle — et `CataloguePagination` reçoit ensuite un numéro serré.
  */
  const { events, total } = await getProfileJournal({
    userId: profile.id,
    isOwner: profile.isOwner,
    includeAdult,
    titleLanguage,
    skip: (Math.max(page, 1) - 1) * TIMELINE_PAGE_SIZE,
    take: TIMELINE_PAGE_SIZE,
  });

  const pageCount = Math.max(1, Math.ceil(total / TIMELINE_PAGE_SIZE));
  const boundedPage = Math.min(Math.max(page, 1), pageCount);

  return (
    <ProfileSection
      description="Chaque progression, chaque note, chaque changement de statut — dans l'ordre."
      title="Historique"
    >
      {/*
        **Deux vides qui ne disent pas la même chose**, et les confondre laissait un cul-de-sac : à
        `?page=999`, la liste était vide *et* la pagination disparaissait avec elle, donc plus aucun
        moyen de revenir au journal autrement qu'en corrigeant l'adresse à la main. Un journal qui
        n'a jamais rien eu est un état ; une page au-delà de la fin est une erreur d'adresse, et
        elle doit porter sa sortie.
      */}
      {events.length === 0 && total > 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Cette page n'existe pas</EmptyTitle>
            <EmptyDescription>
              Le journal compte {pageCount} pages ; celle-ci est au-delà.
            </EmptyDescription>
          </EmptyHeader>

          <Button asChild variant="outline">
            <Link href={routes.profile(profile.username)}>
              Revenir au début du journal
            </Link>
          </Button>
        </Empty>
      ) : events.length === 0 ? (
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

          <CataloguePagination
            hrefFor={(target) =>
              serializeProfileFilters(routes.profile(profile.username), {
                page: target,
              })
            }
            page={boundedPage}
            pageCount={pageCount}
          />
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
      **Le trait est dans le squelette, et ce n'est pas un détail.** Sans lui, la coquille annonçait
      dix-sept pixels de moins que le bloc réel — l'écart plus l'épaisseur du trait —, et tout
      l'écran sautait d'autant à l'arrivée des données. La structure est donc celle du bloc rendu,
      écart pour écart.
    */
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Skeleton className="size-16 rounded-full" />
          <div className="flex flex-col gap-0.5">
            <Skeleton className="h-8 w-44" />
            <Skeleton className="h-5 w-56" />
          </div>
        </div>

        {/*
          **Les quatre tuiles, et pas un pavé d'une hauteur figée.** Elles passent en deux colonnes
          sous `sm` : à `h-26`, la coquille annonçait 104 px là où le bloc replié en fait 171, et
          tout le profil remontait de soixante-sept pixels sur téléphone. Rendue avec la grille du
          bloc, elle se replie avec lui.
        */}
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-4">
          {TILE_SKELETON_KEYS.map((key) => (
            <div
              className="flex flex-col-reverse gap-1 bg-background p-4"
              key={key}
            >
              <Skeleton className="h-4 w-20" />
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
const TILE_SKELETON_KEYS = Array.from(
  { length: 4 },
  (_, index) => `tuile-${index}`,
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

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionSkeleton contentClassName="h-72" />
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
