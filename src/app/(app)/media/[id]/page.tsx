import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import * as z from "zod";

import {
  EntryJournal,
  EntryJournalSkeleton,
} from "@/app/(app)/media/[id]/_components/entry-journal";
import { MediaAside } from "@/app/(app)/media/[id]/_components/media-aside";
import { MediaCharacters } from "@/app/(app)/media/[id]/_components/media-characters";
import { MediaDetailSkeleton } from "@/app/(app)/media/[id]/_components/media-detail-skeleton";
import { MediaHero } from "@/app/(app)/media/[id]/_components/media-hero";
import { MediaRecommendations } from "@/app/(app)/media/[id]/_components/media-recommendations";
import { MediaRelations } from "@/app/(app)/media/[id]/_components/media-relations";
import { MediaStaff } from "@/app/(app)/media/[id]/_components/media-staff";
import { MediaSynopsis } from "@/app/(app)/media/[id]/_components/media-synopsis";
import {
  type MediaTab,
  MediaTabs,
} from "@/app/(app)/media/[id]/_components/media-tabs";
import { MediaTags } from "@/app/(app)/media/[id]/_components/media-tags";
import { MediaTrailer } from "@/app/(app)/media/[id]/_components/media-trailer";
import { relatedMedia } from "@/app/(app)/media/[id]/_lib/media-related";
import { ReportAniListStatus } from "@/components/layout/anilist-outage-notice";
import { Separator } from "@/components/ui/separator";
import { getListMembership } from "@/features/lists/server/lists.queries";
import {
  cleanDescription,
  mediaTitle,
} from "@/features/media/lib/media-format";
import type { MediaDetail } from "@/features/media/schemas/media.schema";
import { getMediaDetailFromMirror } from "@/features/media/server/media.mirror";
import { getMediaById } from "@/features/media/server/media.queries";
import { getPreferences } from "@/features/preferences/server/preferences.queries";
import { getEntryFor } from "@/features/tracking/server/library.queries";
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
 * **Ce qui n'est pas encore là** : le journal des autres membres du cercle, les tomes possédés, et
 * les épisodes chez les diffuseurs (`streamingEpisodes`). Le reste de ce qu'AniList renvoie est à
 * l'écran depuis le 7 septembre 2026 — et sans une requête de plus, puisque tout arrivait déjà dans
 * le même objet (docs/fiche-media.md §1.1).
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

  /*
    Les trois lectures partent ensemble : mon suivi et mes listes sont en base, la fiche chez
    AniList, et aucune ne dépend des autres. Les enchaîner ferait attendre la barre de suivi après
    une requête réseau qui peut prendre une seconde — ou ne jamais répondre, un jour de coupure,
    alors que ce que je sais de l'œuvre, lui, est toujours là.

    `getListMembership` est **lue ici et pas par la fenêtre de rangement** : celle-ci est cliente, et
    une lecture demandée par un composant client devrait passer par un route handler (CLAUDE.md).
    Elle n'a rien à aller chercher — quelques lignes voyagent avec le rendu, et la fenêtre les reçoit
    déjà remplies au premier clic.
  */
  const [{ media, isPartial }, entry, lists] = await Promise.all([
    loadMediaDetail(id, includeAdult),
    getEntryFor(id),
    getListMembership(id),
  ]);

  // `null` couvre deux cas volontairement confondus : l'id n'existe pas, ou l'œuvre est classée
  // adulte alors que la préférence est éteinte. Dans les deux cas, la page n'existe pas — et
  // répondre différemment reviendrait à confirmer l'existence de ce qu'on refuse de montrer.
  // Pendant une coupure s'y ajoute l'œuvre qu'aucun compte n'a jamais suivie : absente du miroir,
  // on n'a rien à en dire.
  if (!media) notFound();

  /*
    **Tout ce qui suit est un tri, pas une lecture.** `relatedMedia` groupe et filtre ce que la
    fiche cite ; les trois booléens décident quels onglets existent. Aucune requête n'est en jeu :
    personnages, équipe, relations et recommandations sont arrivés avec le reste de la fiche, dans
    la même réponse.

    Le calcul est fait **ici** et pas dans les composants parce qu'un onglet ne doit exister que
    s'il a quelque chose à montrer, et qu'on ne sonde pas un rendu pour le savoir. Un intitulé qui
    ouvre sur le vide apprend au visiteur que l'écran est cassé — la leçon du menu à trois points de
    cette même fiche.
  */
  const related = relatedMedia(media, includeAdult);
  const hasCharacters = media.characters.edges.length > 0;
  const hasCast = hasCharacters || media.staff.edges.length > 0;
  const hasRelated =
    related.groups.length > 0 || related.recommendations.length > 0;

  const tabs: MediaTab[] = [
    {
      value: "apercu",
      label: "Aperçu",
      content: (
        <div className="flex flex-col gap-8">
          <MediaSynopsis description={media.description} />
          <MediaTags includeAdult={includeAdult} media={media} />
          <MediaTrailer trailer={media.trailer} />
        </div>
      ),
    },
    /*
      **L'intitulé suit ce qu'il y a derrière.** Une fiche de manga n'a souvent que son auteur au
      staff et aucun personnage renseigné : l'appeler « Personnages » serait promettre des visages
      qui n'existent pas.
    */
    ...(hasCast
      ? [
          {
            value: "distribution",
            label: hasCharacters ? "Personnages" : "Équipe",
            content: (
              <div className="flex flex-col gap-8">
                <MediaCharacters media={media} />
                <MediaStaff media={media} />
              </div>
            ),
          },
        ]
      : []),
    ...(hasRelated
      ? [
          {
            value: "liees",
            label:
              related.groups.length > 0 ? "Œuvres liées" : "Recommandations",
            content: (
              <div className="flex flex-col gap-8">
                <MediaRelations
                  groups={related.groups}
                  titleLanguage={titleLanguage}
                />
                <MediaRecommendations
                  items={related.recommendations}
                  titleLanguage={titleLanguage}
                />
              </div>
            ),
          },
        ]
      : []),
    {
      value: "journal",
      label: "Journal",
      /*
        **Le journal a sa propre frontière, et l'onglet fermé ne la retarde pas.** Le contenu des
        panneaux est rendu côté serveur avant que l'onglet actif soit connu — un `<Suspense>` posé
        ici laisse donc partir la fiche pendant que la seconde lecture en base se fait, au lieu de
        la faire attendre derrière AniList *puis* derrière Postgres.

        L'unité vient de l'œuvre et non de l'événement : `EntryEvent` ne la porte pas, et il a
        raison — un média ne change pas de type entre deux lignes de son journal.
      */
      content: (
        <Suspense fallback={<EntryJournalSkeleton />}>
          <EntryJournal
            mediaId={id}
            unit={media.type === "ANIME" ? "episode" : "chapitre"}
          />
        </Suspense>
      ),
    },
  ];

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

      <MediaHero
        entry={entry}
        lists={lists}
        media={media}
        titleLanguage={titleLanguage}
      />

      <Separator />

      {/*
        **Deux colonnes, et la coupure n'est pas « le principal et le reste ».** Elle sépare ce
        qu'on lit de ce qu'on consulte : à gauche du contenu qui se parcourt et se déplie, à droite
        quatre réponses courtes qui restent à l'écran quel que soit l'onglet ouvert
        (`media-aside.tsx`). C'est ce que la spec du 2 septembre appelait le panneau collant.

        `minmax(0,1fr)` et non `1fr` : sans le minimum à zéro, une grille de jaquettes ou une ligne
        de titre trop longue pousserait la colonne au-delà de sa part et emporterait le panneau hors
        de l'écran. Le seuil est `lg` — en dessous, 288 px de panneau ne laisseraient plus de place
        à une grille de vignettes.
      */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-10">
        <MediaTabs tabs={tabs} />
        <MediaAside media={media} />
      </div>
    </article>
  );
}
