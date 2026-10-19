import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AiringScopeToggle } from "@/app/(app)/calendar/_components/airing-scope-toggle";
import {
  type AiringCell,
  AiringWeekGrid,
} from "@/app/(app)/calendar/_components/airing-week-grid";
import { AiringWeekNav } from "@/app/(app)/calendar/_components/airing-week-nav";
import {
  airingWeek,
  clampWeekOffset,
} from "@/app/(app)/calendar/_lib/airing-week";
import {
  type CalendarScope,
  loadCalendarParams,
} from "@/app/(app)/calendar/_lib/calendar-params";
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
  description: "Les épisodes de la semaine, et où vous en êtes.",
};

/**
 * Le planning de diffusion — **une liste verticale, groupée par jour**.
 *
 * La forme a été tranchée sur pièces plutôt qu'au goût : douze plannings en service ont été relevés
 * le 8 septembre 2026, les cinq références francophones comprises, et **aucun ne rend une grille de
 * sept colonnes** (voir l'historique git). Le raisonnement complet est dans `airing-day-list.tsx`, qui
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
 * suspendue. Une frontière par zone, jamais de `loading.tsx` de segment (CLAUDE.md).
 */
export default function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <PageHeading
          /*
            Formulée pour valoir dans les **deux** portées : en « Tout », la semaine ne se limite
            plus à ce qu'on suit, et une description qui l'affirmerait encore serait fausse une fois
            sur deux. Elle vit dans la coquille statique, hors de la zone qui connaît la portée —
            la faire varier coûterait une frontière de plus pour une demi-phrase.
          */
          description="Les épisodes de la semaine, et de combien vous êtes en retard sur ceux que vous suivez."
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
  const { week, scope } = await resolveWeek(searchParams);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <AiringWeekNav label={week.label} offset={week.offset} />
      <AiringScopeToggle scope={scope} week={week.offset} />
    </div>
  );
}

/**
 * Le décalage demandé, borné, et la semaine qu'il désigne.
 *
 * Les deux zones passent par ici plutôt que de recopier les trois mêmes lignes : c'est le seul
 * endroit où `clampWeekOffset` est appliqué, donc le seul où l'on peut oublier de l'appliquer.
 */
async function resolveWeek(
  searchParams: PageProps<"/calendar">["searchParams"],
): Promise<{ week: ReturnType<typeof airingWeek>; scope: CalendarScope }> {
  const { week, portee } = await loadCalendarParams(searchParams);

  return {
    week: airingWeek(new Date(), clampWeekOffset(week)),
    scope: portee,
  };
}

/**
 * La semaine réelle : ce qui passe, et ce que j'en suis.
 *
 * **Deux portées, deux coûts très différents.** En « suivis », on demande à AniList la grille des
 * seuls ids qu'on suit : une requête, une clé de cache par jeu d'ids. En « tout », on demande la
 * grille entière — ce que `docs/conception.md` §9 écarte explicitement, et que le plafond de pages de
 * `media.queries.ts` borne faute de pouvoir mesurer le vrai volume (AniList répondait 403 le jour
 * où on a essayé).
 *
 * **La lecture du suivi est faite dans les deux cas**, et ce n'est pas du gâchis : en « tout », elle
 * sert à savoir lesquelles des séries affichées sont suivies, donc lesquelles portent un retard.
 * C'est une requête Prisma sur un index, pas un appel réseau.
 */
async function AiringWeekContent({
  searchParams,
}: {
  searchParams: PageProps<"/calendar">["searchParams"];
}) {
  const { week, scope } = await resolveWeek(searchParams);

  const { includeAdult, titleLanguage } = await getPreferences();
  // Toute ma bibliothèque, pas seulement ce qui est en cours : prévu, en pause, abandonné — savoir
  // qu'une série sort vaut quel que soit l'endroit où je l'ai rangée.
  const watching = await getAiringWatchlist({
    includeAdult,
    wholeLibrary: true,
  });

  // En « suivis » seulement : ne rien suivre n'est pas une semaine vide, c'est un écran sans objet.
  // En « tout », la grille a tout à montrer même sans une seule ligne `Entry`.
  if (scope === "suivis" && watching.length === 0) return <NothingFollowed />;

  const result = await getAiringSchedule({
    mediaIds: scope === "tout" ? null : watching.map((item) => item.media.id),
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
  if (result === null) return <ScheduleUnavailable />;

  /*
    Le suivi, indexé par œuvre. Un `Map` plutôt qu'un `find` par diffusion : en « tout », AniList
    peut rendre trois cents lignes, et une recherche linéaire dans la liste des séries suivies pour
    chacune serait quadratique pour une question que l'index d'un `Map` répond en une fois.
  */
  const byMediaId = new Map(watching.map((item) => [item.media.id, item]));

  const cells = result.schedules.flatMap<AiringCell>((schedule) => {
    /*
      Une diffusion sans œuvre est laissée tomber : AniList rend `media: null` quand la fiche a été
      supprimée entre-temps, et une case sans titre ni jaquette n'apprendrait rien.
    */
    if (!schedule.media) return [];

    /*
      **Le filtre 18+ est appliqué ici, hors du cache** — sur des données déjà en mémoire, comme
      `getMediaById` le fait pour la fiche. C'est ce qui permet aux quatre comptes de partager une
      seule entrée de cache par semaine : mettre la préférence dans la clé doublerait les requêtes
      pour une question dont le document GraphQL ne change pas.
    */
    if (schedule.media.isAdult && !includeAdult) return [];

    const watch = byMediaId.get(schedule.mediaId);

    return [
      {
        id: schedule.id,
        airingAt: schedule.airingAt,
        episode: schedule.episode,
        media: schedule.media,
        // `null` sur une série non suivie : c'est le cas courant en « tout », et c'est ce qui décide
        // qu'aucun retard n'est calculé ni affiché.
        entry: watch?.entry ?? null,
        banner: watch?.banner ?? null,
      },
    ];
  });

  return (
    <div className="flex flex-col gap-3">
      {/*
        **La troncature se dit, elle ne se tait pas.** Une grille silencieusement incomplète est
        pire qu'une grille qui annonce l'être : on croirait que la semaine est calme.
      */}
      {result.truncated ? (
        <p className="text-muted-foreground text-xs">
          Semaine tronquée : AniList annonce plus de diffusions que le plafond
          que l'on s'impose pour ne pas épuiser son quota. Repassez sur « Ce que
          je suis » pour une semaine complète.
        </p>
      ) : null}

      <AiringWeekGrid
        cells={cells}
        now={new Date()}
        titleLanguage={titleLanguage}
        week={week}
      />
    </div>
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
        <EmptyTitle>Rien en diffusion dans votre bibliothèque</EmptyTitle>
        <EmptyDescription>
          Le planning montre les séries de votre bibliothèque encore en
          diffusion, quel que soit leur statut. Trouvez-en une dans le
          catalogue, ou rouvrez votre bibliothèque.
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
 * Le squelette de la semaine, **charpente pour charpente** : sept colonnes, l'en-tête bordé de
 * chacune, puis ses cases. Un squelette approximatif déplace ce qu'il remplace.
 */
function AiringWeekSkeleton() {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="grid min-w-[52rem] grid-cols-7 gap-px overflow-hidden rounded-md border bg-border">
        {SKELETON_DAYS.map((day) => (
          <div className="flex flex-col bg-background" key={day}>
            {/*
              L'en-tête de colonne a son propre fond et sa propre bordure dans la grille rendue :
              posé dans le rembourrage du corps, comme il l'était, le squelette perdait à la fois la
              séparation et une douzaine de pixels.
            */}
            <div className="border-b bg-surface-raised px-2 py-1.5">
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-4 w-6" />
            </div>

            <div className="flex flex-1 flex-col gap-2.5 p-2">
              {SKELETON_CELLS.map((cell) => (
                <div className="flex flex-col gap-1" key={`${day}-${cell}`}>
                  <Skeleton className="h-24 w-full rounded-sm" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Le squelette de la barre : la navigation de semaine **et la portée**.
 *
 * Il ne montrait que les flèches et l'intitulé, alors que `AiringWeekBar` pose aussi la bascule
 * « Ce que je suis / Tout » à l'autre bout de la rangée — elle paraissait d'un coup au
 * remplacement. Le retour « Aujourd'hui » n'y est pas : il ne s'affiche qu'une fois sorti de la
 * semaine en cours, et on arrive toujours dedans.
 */
function AiringWeekNavSkeleton() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="size-9" />
        <Skeleton className="size-9" />
        <Skeleton className="h-5 w-44" />
      </div>

      {/* Deux boutons `sm` collés, comme le `ButtonGroup` de la portée. */}
      <div className="flex items-center gap-px">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-14" />
      </div>
    </div>
  );
}

/** Sept jours. Des identifiants plutôt que l'indice de boucle, comme les autres squelettes. */
const SKELETON_DAYS = Array.from({ length: 7 }, (_, index) => `day-${index}`);

/**
 * **Deux cases par jour**, et c'est une espérance, pas une mesure.
 *
 * Une colonne en portait une seule, quand une semaine de suivi en aligne trois à six sur ses bons
 * jours : la grille doublait de hauteur au remplacement. Deux est le milieu honnête — la portée
 * d'arrivée est « ce que je suis », où une quinzaine d'épisodes se répartissent sur sept jours.
 * Aucune valeur fixe ne peut faire mieux : c'est le jour le plus chargé qui décide de la hauteur de
 * la grille, et on ne le connaît qu'après la réponse.
 */
const SKELETON_CELLS = Array.from({ length: 2 }, (_, index) => `case-${index}`);
