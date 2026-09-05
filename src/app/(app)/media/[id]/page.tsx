import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import * as z from "zod";

import { MediaDetailSkeleton } from "@/app/(app)/media/[id]/_components/media-detail-skeleton";
import { MediaHero } from "@/app/(app)/media/[id]/_components/media-hero";
import { MediaSynopsis } from "@/app/(app)/media/[id]/_components/media-synopsis";
import { ReportAniListStatus } from "@/components/layout/anilist-outage-notice";
import { Separator } from "@/components/ui/separator";
import {
  cleanDescription,
  mediaTitle,
} from "@/features/media/lib/media-format";
import type { MediaDetail } from "@/features/media/schemas/media.schema";
import { getMediaDetailFromMirror } from "@/features/media/server/media.mirror";
import { getMediaById } from "@/features/media/server/media.queries";
import { getPreferences } from "@/features/preferences/server/preferences.queries";
import { tryAniList } from "@/lib/http/anilist";

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

/**
 * La fiche, et par où elle est arrivée.
 *
 * **Les deux `null` en jeu ne veulent pas dire la même chose.** Celui de `getMediaById` dit « cette
 * œuvre n'existe pas » ; celui de `tryAniList` dit « AniList ne répond pas ». Les confondre
 * enverrait un `notFound()` à chaque coupure — d'où l'emballage dans un objet : le `null` de
 * `tryAniList` ne peut alors désigner que la panne, et l'introuvable reste porté par `media`.
 *
 * Le rattrapage est **ici, hors du `"use cache"` de la lecture AniList**. Rattrapé dedans, il
 * mémoriserait l'absence pour toute la durée du `cacheLife` — soit un jour d'écran dégradé après le
 * retour du service (docs/ARCHITECTURE.md).
 */
async function loadMediaDetail(
  id: number,
  includeAdult: boolean,
): Promise<{ media: MediaDetail | null; isPartial: boolean }> {
  const fresh = await tryAniList(async () => ({
    media: await getMediaById(id, { includeAdult }),
  }));

  if (fresh) return { media: fresh.media, isPartial: false };

  // AniList est hors service : ce que le miroir sait de cette œuvre vaut mieux qu'une page morte.
  return {
    media: await getMediaDetailFromMirror(id, { includeAdult }),
    isPartial: true,
  };
}

export async function generateMetadata({
  params,
}: PageProps<"/media/[id]">): Promise<Metadata> {
  const id = parseMediaId((await params).id);
  if (id === null) return {};

  /*
    Cet appel et celui du contenu ne coûtent **qu'une** requête AniList : `getMediaById` s'appuie
    sur une lecture `"use cache"` dont la clé est le seul id, et `getPreferences` est dédupliquée
    par `cache` de React sur la durée du rendu.
  */
  const { includeAdult, titleLanguage } = await getPreferences();
  /*
    Les métadonnées **ne doivent jamais jeter** : une exception ici emporterait le document entier,
    y compris la fiche dégradée que le contenu sait pourtant rendre. Pendant une coupure, le titre
    vient donc du miroir, et le reste sort vide plutôt que faux.
  */
  const { media } = await loadMediaDetail(id, includeAdult);
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
 * La fiche d'une œuvre.
 *
 * **La page n'attend rien elle-même** : elle transmet la promesse `params` à l'enfant suspendu.
 * Awaiter ici bloquerait tout le rendu jusqu'à la réponse d'AniList, alors qu'en descendant
 * l'accès sous un `<Suspense>` la coquille part immédiatement et le contenu arrive en flux
 * (docs/ARCHITECTURE.md — une frontière par zone, jamais de `loading.tsx` de segment).
 *
 * Ce qui n'est pas encore là : le synopsis, les onglets lourds (personnages, équipe, œuvres liées,
 * recommandations) et le journal. La barre de suivi, elle, est posée mais **n'écrit rien** — sa
 * mécanique attend que la mise en page soit validée.
 */
export default function MediaPage({ params }: PageProps<"/media/[id]">) {
  return (
    <Suspense fallback={<MediaDetailSkeleton />}>
      <MediaDetailContent params={params} />
    </Suspense>
  );
}

async function MediaDetailContent({
  params,
}: {
  params: PageProps<"/media/[id]">["params"];
}) {
  const id = parseMediaId((await params).id);
  if (id === null) notFound();

  const { includeAdult, titleLanguage } = await getPreferences();
  const { media, isPartial } = await loadMediaDetail(id, includeAdult);

  // `null` couvre deux cas volontairement confondus : l'id n'existe pas, ou l'œuvre est classée
  // adulte alors que la préférence est éteinte. Dans les deux cas, la page n'existe pas — et
  // répondre différemment reviendrait à confirmer l'existence de ce qu'on refuse de montrer.
  // Pendant une coupure s'y ajoute l'œuvre qu'aucun compte n'a jamais suivie : absente du miroir,
  // on n'a rien à en dire.
  if (!media) notFound();

  return (
    /*
      Un seul écart, porté par la colonne et non par les éléments : une marge posée sur le
      séparateur lui ferait dicter l'espacement de ses deux voisins, et la prochaine section
      ajoutée ici arriverait avec un rythme différent selon qu'elle suit un trait ou non.

      Le rapporteur de panne ne compte pas comme enfant : il ne rend rien. Il dit au bandeau du
      layout — qui, lui, vaut pour tout le site — si cette lecture est passée par AniList ou par le
      miroir (`components/layout/anilist-outage-notice.tsx`).
    */
    <article className="flex flex-col gap-4">
      <ReportAniListStatus down={isPartial} />

      <MediaHero media={media} titleLanguage={titleLanguage} />

      <Separator />

      <MediaSynopsis description={media.description} />
    </article>
  );
}
