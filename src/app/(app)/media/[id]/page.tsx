import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import * as z from "zod";

import { AddToList } from "@/app/(app)/media/[id]/_components/add-to-list";
import { MediaCharacters } from "@/app/(app)/media/[id]/_components/media-characters";
import { MediaDetailSkeleton } from "@/app/(app)/media/[id]/_components/media-detail-skeleton";
import { MediaHero } from "@/app/(app)/media/[id]/_components/media-hero";
import { MediaOverview } from "@/app/(app)/media/[id]/_components/media-overview";
import { MediaRecommendations } from "@/app/(app)/media/[id]/_components/media-recommendations";
import { MediaRelations } from "@/app/(app)/media/[id]/_components/media-relations";
import { MediaStaff } from "@/app/(app)/media/[id]/_components/media-staff";
import {
  type MediaTabDefinition,
  MediaTabs,
} from "@/app/(app)/media/[id]/_components/media-tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  cleanDescription,
  mediaTitle,
} from "@/features/media/lib/media-format";
import type { MediaDetail } from "@/features/media/schemas/media.schema";
import { getMediaById } from "@/features/media/server/media.queries";
import { getPreferences } from "@/features/preferences/server/preferences.queries";
import { EntryPanel } from "@/features/tracking/components/entry-panel";
import { EntryPanelSkeleton } from "@/features/tracking/components/entry-panel-skeleton";
import { EntryTimeline } from "@/features/tracking/components/entry-timeline";
import { EntryTimelineSkeleton } from "@/features/tracking/components/entry-timeline-skeleton";

type MediaParams = PageProps<"/media/[id]">["params"];

/**
 * Le segment vient de l'URL, donc d'une chaîne arbitraire. On le valide avant de toucher à
 * AniList : sans ça, `/media/abc` partirait en requête pour rien, et `/media/1e999` produirait un
 * `Infinity`.
 */
const mediaIdSchema = z.coerce.number().int().positive();

function parseMediaId(raw: string): number | null {
  const result = mediaIdSchema.safeParse(raw);
  return result.success ? result.data : null;
}

export async function generateMetadata({
  params,
}: PageProps<"/media/[id]">): Promise<Metadata> {
  const id = parseMediaId((await params).id);
  if (id === null) return {};

  // `getMediaById` porte un `"use cache"` : cet appel et celui du contenu ne coûtent qu'une
  // requête AniList — à condition de lui passer le même `includeAdult`, qui fait partie de sa clé.
  const { includeAdult, titleLanguage } = await getPreferences();
  const media = await getMediaById(id, { includeAdult });
  if (!media) return {};

  const [summary] = cleanDescription(media.description);
  const title = mediaTitle(media.title, titleLanguage);
  const description = summary?.slice(0, 160);

  return {
    title,
    description,
    /**
     * L'aperçu partagé montre la jaquette, pas la bannière : elle existe sur toutes les œuvres,
     * elle est reconnaissable en vignette, et c'est elle qu'on associe au titre.
     */
    openGraph: {
      title,
      description,
      images: media.coverImage?.extraLarge ?? media.coverImage?.large ?? [],
    },
  };
}

/**
 * La page n'attend **pas** `params` : elle transmet la promesse au composant suspendu.
 *
 * C'est ce qui rend la navigation instantanée. Awaiter ici bloquerait tout le rendu jusqu'à la
 * réponse d'AniList ; en descendant l'accès dans un `<Suspense>`, la structure de la page part
 * immédiatement et le contenu arrive en flux. Sur un cache froid, c'est la différence entre un
 * squelette aux bonnes proportions et une page blanche.
 */
export default function MediaPage({ params }: PageProps<"/media/[id]">) {
  return (
    <Suspense fallback={<MediaDetailSkeleton />}>
      <MediaDetailContent params={params} />
    </Suspense>
  );
}

async function MediaDetailContent({ params }: { params: MediaParams }) {
  const id = parseMediaId((await params).id);
  if (id === null) notFound();

  const { includeAdult } = await getPreferences();
  const media = await getMediaById(id, { includeAdult });

  // `null` couvre deux cas volontairement confondus : l'id n'existe pas, ou l'œuvre est classée
  // adulte alors que la préférence est éteinte. Dans les deux cas, la page n'existe pas.
  if (!media) notFound();

  return (
    <article className="space-y-8">
      <MediaHero media={media} />

      <div className="grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
        {/*
          Le suivi passe **avant** le contenu dans le DOM : sur mobile la colonne s'empile, et
          « où j'en suis » doit être la première chose sous l'en-tête, pas ce qu'on trouve après
          deux mille pixels de personnages.
        */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          {/*
            Son propre `<Suspense>` : la lecture de l'entrée est une requête base non mémorisée,
            la fiche AniList vient d'un cache d'un jour. Les faire attendre l'une l'autre
            n'apporterait rien.
          */}
          <Suspense fallback={<EntryPanelSkeleton />}>
            <EntryPanel media={media} />
          </Suspense>

          {/*
            Le journal a le sien : c'est une seconde requête, et le panneau — celui qui porte les
            gestes — ne doit pas attendre l'historique pour s'afficher.
          */}
          {/*
            Son propre `<Suspense>` aussi : c'est une troisième requête base, et le bouton n'a pas
            besoin d'attendre le journal pour apparaître.
          */}
          <Suspense fallback={<Skeleton className="h-8 w-full" />}>
            <AddToList mediaId={media.id} />
          </Suspense>

          <Suspense fallback={<EntryTimelineSkeleton />}>
            <EntryTimeline media={media} />
          </Suspense>
        </aside>

        <div className="min-w-0">
          <MediaTabs tabs={buildTabs(media)} />
        </div>
      </div>
    </article>
  );
}

/**
 * Les onglets de la fiche.
 *
 * Un onglet vide ne s'affiche pas : un manga n'a pas de casting vocal, un film sans suite n'a pas
 * d'œuvres liées, et un onglet qui ne mène nulle part est une promesse rompue. L'aperçu, lui, est
 * toujours là — c'est le repli de `MediaTabs` quand un `?tab=` pointe sur un onglet absent.
 *
 * Les compteurs sont **avant filtrage** (adulte, recommandations mal notées) : le filtre dépend de
 * la fiche courante et se joue dans chaque composant, qui affiche alors son propre état vide.
 */
function buildTabs(media: MediaDetail): MediaTabDefinition[] {
  const tabs: MediaTabDefinition[] = [
    {
      value: "apercu",
      label: "Aperçu",
      content: <MediaOverview media={media} />,
    },
  ];

  if (media.characters.edges.length > 0) {
    tabs.push({
      value: "personnages",
      label: "Personnages",
      count: media.characters.edges.length,
      content: <MediaCharacters media={media} />,
    });
  }

  if (media.staff.edges.length > 0) {
    tabs.push({
      value: "staff",
      label: "Équipe",
      count: media.staff.edges.length,
      content: <MediaStaff media={media} />,
    });
  }

  if (media.relations.edges.length > 0) {
    tabs.push({
      value: "relations",
      label: "Œuvres liées",
      count: media.relations.edges.length,
      content: <MediaRelations media={media} />,
    });
  }

  if (media.recommendations.nodes.length > 0) {
    tabs.push({
      value: "recommandations",
      label: "Recommandations",
      content: <MediaRecommendations media={media} />,
    });
  }

  return tabs;
}
