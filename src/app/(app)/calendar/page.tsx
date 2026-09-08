import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import {
  AiringDayList,
  type AiringRow,
} from "@/app/(app)/calendar/_components/airing-day-list";
import { AiringWeekNav } from "@/app/(app)/calendar/_components/airing-week-nav";
import {
  airingWeek,
  clampWeekOffset,
} from "@/app/(app)/calendar/_lib/airing-week";
import { loadCalendarParams } from "@/app/(app)/calendar/_lib/calendar-params";
import { PageHeading } from "@/components/shared/page-heading";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { routes } from "@/config/routes";
import { getAiringSchedule } from "@/features/media/server/media.queries";
import { getPreferences } from "@/features/preferences/server/preferences.queries";
import { getAiringWatchlist } from "@/features/tracking/server/library.queries";

export const metadata: Metadata = {
  title: "Planning",
  description: "Les épisodes à venir de ce que vous suivez.",
};

/**
 * Le planning de diffusion — **une liste verticale, groupée par jour**.
 *
 * La forme a été tranchée sur pièces plutôt qu'au goût : douze plannings en service ont été relevés
 * le 8 septembre 2026, les cinq références francophones comprises, et **aucun ne rend une grille de
 * sept colonnes** (docs/JOURNAL.md). Le raisonnement complet est dans `airing-day-list.tsx`, qui
 * porte la disposition.
 *
 * **Ce que cet écran a de plus que les calendriers publics, c'est le retard.** Icotaku, Nautiljon,
 * Myutaku et Crunchyroll disent ce qui sort ; ils ne savent pas où l'on en est. C'est la ligne de
 * partage entre un calendrier et un suivi, et Better-List est du second côté.
 *
 * **Deux lectures, et elles ne se mémorisent pas pareil.** Ce que je suis vient de mes lignes
 * `Entry` et ne doit jamais être mis en cache — le partager d'un compte à l'autre serait le pire
 * défaut possible. La grille horaire vient d'AniList et doit l'être, sous peine de vider un quota
 * de trente requêtes par minute partagé par toute l'IP de production. Elles ne se rencontrent qu'ici,
 * à l'affichage.
 *
 * La coquille — titre, trait, navigation de semaine — est rendue tout de suite ; seule la liste est
 * suspendue. Une frontière par zone, jamais de `loading.tsx` de segment (docs/ARCHITECTURE.md).
 */
export default function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <PageHeading
          description="Les épisodes à venir de ce que vous suivez, et de combien vous êtes en retard sur chacun."
          title="Planning"
        />
        <Separator />

        {/*
          **Les deux zones relisent l'adresse chacune de leur côté**, plutôt que de recevoir un
          décalage déjà décodé — c'est la règle de `/library`, et elle vaut ici pour la même raison :
          `await searchParams` au niveau de la page rendrait le composant de page entier dynamique,
          et le titre comme les traits n'arriveraient plus qu'avec la première lecture. Découpé
          ainsi, l'en-tête part immédiatement et chaque zone attend seulement ce dont elle a besoin.

          Ce n'est **pas** ce qui explique le « Could not validate `instant` » qu'affiche la console
          de développement : ce message vaut pour toutes les routes de `(app)`, dont les quatre déjà
          livrées, et vient de `app/(app)/layout.tsx`, qui pose `instant = false` en connaissance de
          cause — la garde d'accès doit savoir qui demande avant de rendre.

          `airingWeek` est donc appelée deux fois. C'est une fonction pure sur une date : la
          recalculer coûte moins qu'une frontière de moins.
        */}
        <Suspense fallback={<AiringWeekNavSkeleton />}>
          <AiringWeekBar searchParams={searchParams} />
        </Suspense>
      </div>

      <Suspense fallback={<AiringWeekSkeleton />}>
        <AiringWeekContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

/** La barre de semaine, qui a besoin de l'adresse — donc de sa propre frontière. */
async function AiringWeekBar({
  searchParams,
}: {
  searchParams: PageProps<"/calendar">["searchParams"];
}) {
  const week = await resolveWeek(searchParams);

  return <AiringWeekNav label={week.label} offset={week.offset} />;
}

/**
 * Le décalage demandé, borné, et la semaine qu'il désigne.
 *
 * Les deux zones passent par ici plutôt que de recopier les trois mêmes lignes : c'est le seul
 * endroit où `clampWeekOffset` est appliqué, donc le seul où l'on peut oublier de l'appliquer.
 */
async function resolveWeek(
  searchParams: PageProps<"/calendar">["searchParams"],
) {
  const { week } = await loadCalendarParams(searchParams);

  return airingWeek(new Date(), clampWeekOffset(week));
}

/**
 * La semaine réelle : ce que je suis, ce qui passe, et la jonction des deux.
 *
 * L'ordre des deux lectures n'est pas parallélisable et ce n'est pas un oubli : la seconde a besoin
 * des ids que rend la première. Les lancer ensemble supposerait de demander à AniList la grille de
 * tout le catalogue pour n'en garder que vingt lignes.
 */
async function AiringWeekContent({
  searchParams,
}: {
  searchParams: PageProps<"/calendar">["searchParams"];
}) {
  const week = await resolveWeek(searchParams);

  const { includeAdult, titleLanguage } = await getPreferences();
  const watching = await getAiringWatchlist({ includeAdult });

  if (watching.length === 0) return <NothingFollowed />;

  const schedules = await getAiringSchedule({
    mediaIds: watching.map((item) => item.media.id),
    from: week.from,
    to: week.to,
  });

  /*
    `null` veut dire « AniList est tombé », et pas « rien ne passe cette semaine ». Les deux se
    ressemblent à l'écran — une semaine vide — et c'est exactement pourquoi il faut les distinguer :
    un planning muet se lit comme une panne, et une panne muette se lit comme un planning.

    Il n'y a pas de repli sur le miroir local ici, contrairement à `/search` : le miroir stocke des
    fiches, pas des grilles horaires. Il n'y a rien à servir à la place.
  */
  if (schedules === null) return <ScheduleUnavailable />;

  /*
    La jonction. Un `Map` plutôt qu'un `find` par diffusion : AniList peut rendre une centaine de
    lignes, et une recherche linéaire par ligne dans la liste des séries suivies serait quadratique
    pour une question que l'index d'un `Map` répond en une fois.

    Une diffusion sans série correspondante est ignorée plutôt que rendue de force : elle ne devrait
    pas exister — on n'a demandé que nos propres ids —, et si elle arrive quand même, une ligne sans
    titre ni progression n'apprendrait rien.
  */
  const byMediaId = new Map(watching.map((item) => [item.media.id, item]));

  const rows = schedules.flatMap<AiringRow>((schedule) => {
    const watch = byMediaId.get(schedule.mediaId);
    if (!watch) return [];

    return [
      {
        id: schedule.id,
        airingAt: schedule.airingAt,
        episode: schedule.episode,
        watch,
      },
    ];
  });

  return (
    <AiringDayList
      now={new Date()}
      rows={rows}
      titleLanguage={titleLanguage}
      week={week}
    />
  );
}

/**
 * Le vide qui n'en est pas un : rien n'est suivi en cours de diffusion.
 *
 * Distinct de la semaine sans épisode, qui se lit dans la liste elle-même — sept sections vides
 * disent « rien ne passe », pas « vous ne suivez rien ». Ici il n'y a pas de semaine à montrer du
 * tout, et le geste utile est ailleurs.
 */
function NothingFollowed() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>Rien en cours de visionnage</EmptyTitle>
        <EmptyDescription>
          Le planning suit les séries marquées « en cours » ou « en relecture ».
          Reprenez-en une depuis votre bibliothèque, ou trouvez-en une nouvelle
          dans le catalogue.
        </EmptyDescription>
      </EmptyHeader>

      <Button asChild variant="outline">
        <Link href={routes.library}>Voir ma bibliothèque</Link>
      </Button>
    </Empty>
  );
}

/** AniList est tombé. On le dit, plutôt que de montrer une semaine vide qui aurait l'air normale. */
function ScheduleUnavailable() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>Le planning est indisponible</EmptyTitle>
        <EmptyDescription>
          Les horaires de diffusion viennent d'AniList, qui ne répond pas pour
          l'instant. Votre bibliothèque, elle, reste consultable.
        </EmptyDescription>
      </EmptyHeader>

      <Button asChild variant="outline">
        <Link href={routes.library}>Voir ma bibliothèque</Link>
      </Button>
    </Empty>
  );
}

/**
 * Le squelette, aux proportions de ce qu'il annonce : sept intitulés de jour, et une ou deux lignes
 * sous chacun. Un squelette approximatif déplace ce qu'il remplace.
 */
function AiringWeekSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      {SKELETON_DAYS.map((day) => (
        <div className="flex flex-col gap-2" key={day}>
          <Skeleton className="h-4 w-40" />
          <Separator />
          <div className="flex items-center gap-4 py-2">
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-14 w-10 rounded-sm" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Le squelette de la barre : deux flèches et l'intitulé, aux mêmes dimensions. */
function AiringWeekNavSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <Skeleton className="size-9" />
      <Skeleton className="size-9" />
      <Skeleton className="h-4 w-44" />
    </div>
  );
}

/** Sept jours. Des identifiants plutôt que l'indice de boucle, comme les autres squelettes. */
const SKELETON_DAYS = Array.from({ length: 7 }, (_, index) => `day-${index}`);
