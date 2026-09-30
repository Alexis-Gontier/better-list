import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import * as z from "zod";

import { MediaCharacters } from "@/app/(app)/media/[id]/_components/media-characters";
import { MediaDetailSkeleton } from "@/app/(app)/media/[id]/_components/media-detail-skeleton";
import { MediaHero } from "@/app/(app)/media/[id]/_components/media-hero";
import { MediaOverview } from "@/app/(app)/media/[id]/_components/media-overview";
import { MediaRecommendations } from "@/app/(app)/media/[id]/_components/media-recommendations";
import { MediaRelations } from "@/app/(app)/media/[id]/_components/media-relations";
import { MediaStaff } from "@/app/(app)/media/[id]/_components/media-staff";
import {
  type MediaTabLink,
  MediaTabs,
} from "@/app/(app)/media/[id]/_components/media-tabs";
import { MediaTags } from "@/app/(app)/media/[id]/_components/media-tags";
import {
  sampleRecommendations,
  visibleRelations,
  visibleTags,
} from "@/app/(app)/media/[id]/_lib/media-panels";
import {
  loadMediaTab,
  MEDIA_TAB_LABELS,
  type MediaTab,
  serializeMediaTab,
} from "@/app/(app)/media/[id]/_lib/media-tab-params";
import { ReportAniListStatus } from "@/components/layout/anilist-outage-notice";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { routes } from "@/config/routes";
import { isFavorite } from "@/features/favorites/server/favorites.queries";
import { getListMembership } from "@/features/lists/server/lists.queries";
import {
  cleanDescription,
  mediaTitle,
} from "@/features/media/lib/media-format";
import type { MediaDetail } from "@/features/media/schemas/media.schema";
import { getMediaDetailFromMirror } from "@/features/media/server/media.mirror";
import {
  getMediaById,
  getMediaCharacters,
  getMediaRecommendations,
  getMediaStaff,
} from "@/features/media/server/media.queries";
import type { TitleLanguage } from "@/features/preferences/schemas/preferences.schema";
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
 * **Le bas de la fiche est en onglets** (décision d'Alexis du 11 septembre 2026) : aperçu,
 * personnages, équipe, œuvres liées, tags. La pile de sections qui les précédait n'aura tenu qu'une
 * demi-journée — elle rendait la page interminable sur une œuvre bien documentée, là où les onglets
 * donnent à chaque nature d'information la page entière.
 *
 * **Chaque onglet va chercher sa propre donnée**, et c'est ce qui distingue cette version de la
 * précédente. Le serveur ne rend que le panneau désigné par `?onglet=` : la lecture AniList part
 * avec lui, donc l'onglet Personnages peut en demander vingt-cinq là où la requête de fiche n'en
 * ramène que six. Une visite qui reste sur l'aperçu coûte exactement ce qu'elle coûtait avant — une
 * requête —, et chaque onglet ouvert en coûte une de plus, mise en cache pour la journée.
 *
 * Le prix de ce choix est explicite : la recherche du navigateur ne trouve plus que l'onglet
 * affiché, là où des panneaux tous montés la laissaient tout parcourir.
 *
 * Ce qui n'est pas encore là : les chiffres de la communauté, le journal, les tomes possédés, et ce
 * que le cercle en pense (docs/fiche-media.md).
 */
export default function MediaPage({
  params,
  searchParams,
}: PageProps<"/media/[id]">) {
  return (
    <Suspense fallback={<MediaDetailSkeleton />}>
      {/*
        Les deux promesses descendent sans être attendues ici. `searchParams` rejoint `params` pour
        la même raison qu'elle : l'attendre dans la page bloquerait la coquille statique, alors
        qu'en dessous de la frontière elle ne retarde que le contenu.
      */}
      <MediaDetailContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function MediaDetailContent({
  params,
  searchParams,
}: {
  params: PageProps<"/media/[id]">["params"];
  searchParams: PageProps<"/media/[id]">["searchParams"];
}) {
  const id = parseMediaId((await params).id);
  if (id === null) notFound();

  const { includeAdult, titleLanguage } = await getPreferences();

  /*
    Les quatre lectures partent ensemble : mon suivi et mes listes sont en base, la fiche chez
    AniList, et aucune ne dépend des autres. Les enchaîner ferait attendre la barre de suivi après
    une requête réseau qui peut prendre une seconde — ou ne jamais répondre, un jour de coupure,
    alors que ce que je sais de l'œuvre, lui, est toujours là.

    `getListMembership` est **lue ici et pas par la fenêtre de rangement** : celle-ci est cliente, et
    une lecture demandée par un composant client devrait passer par un route handler (CLAUDE.md).
    Elle n'a rien à aller chercher — quelques lignes voyagent avec le rendu, et la fenêtre les reçoit
    déjà remplies au premier clic.
  */
  const [{ media, isPartial }, entry, lists, favorite] = await Promise.all([
    loadMediaDetail(id, includeAdult),
    getEntryFor(id),
    getListMembership(id),
    isFavorite("MEDIA", id),
  ]);

  // `null` couvre deux cas volontairement confondus : l'id n'existe pas, ou l'œuvre est classée
  // adulte alors que la préférence est éteinte. Dans les deux cas, la page n'existe pas — et
  // répondre différemment reviendrait à confirmer l'existence de ce qu'on refuse de montrer.
  // Pendant une coupure s'y ajoute l'œuvre qu'aucun compte n'a jamais suivie : absente du miroir,
  // on n'a rien à en dire.
  if (!media) notFound();

  /*
    **Un onglet dont le panneau serait vide n'est pas ouvert**, barre comprise. C'est la règle que
    l'ancienne fiche appliquait déjà avant la mise à blanc (`buildTabs`, docs/JOURNAL.md).

    Elle se décide **sur l'échantillon de la requête de fiche**, jamais sur les lectures dédiées : un
    onglet vide doit pouvoir être écarté sans dépenser le crédit de quota qui servirait à le
    remplir. Un échantillon vide vaut preuve que l'ensemble l'est — AniList ne rend pas une première
    page vide devant une deuxième pleine.

    C'est aussi ce qui fait **dégrader la fiche toute seule** un jour de coupure AniList : le repli
    sur le miroir local n'a ni personnages, ni équipe, ni relations, donc il ne reste que l'aperçu —
    sans qu'aucun composant n'ait à connaître l'existence de la panne. Une règle « ne montre pas ce
    qui est vide » est aussi, gratuitement, une règle de dégradation.
  */
  const hasCharacters = media.characters.edges.length > 0;
  const hasStaff = media.staff.edges.some((edge) => edge.node.name.full);
  const hasRelated =
    visibleRelations(media, includeAdult).length > 0 ||
    sampleRecommendations(media, includeAdult).length > 0;
  const hasTags =
    media.genres.length > 0 || visibleTags(media, includeAdult).length > 0;

  /*
    Les liens de la barre passent par le sérialiseur de nuqs plutôt que par une chaîne construite à
    la main : ce sont les mêmes parseurs qui écrivent l'adresse et qui la relisent, donc l'onglet par
    défaut disparaît de l'URL tout seul et un lien ne peut pas désigner une valeur que le parseur
    refuserait.
  */
  const tabHref = (tab: MediaTab) =>
    `${routes.media(media.id)}${serializeMediaTab({ onglet: tab })}`;

  // L'ordre suit `MEDIA_TABS`, qui porte le vocabulaire d'URL et désigne le défaut par son premier
  // élément.
  const tabs: MediaTabLink[] = [
    // Toujours là, et c'est une garantie : le synopsis a son propre texte pour le cas vide, donc
    // l'aperçu ne peut pas être nul. C'est ce qui assure qu'il reste au moins un onglet, y compris
    // sur une fiche entièrement servie par le miroir.
    "apercu" as const,
    hasCharacters ? ("personnages" as const) : null,
    hasStaff ? ("equipe" as const) : null,
    hasRelated ? ("oeuvres" as const) : null,
    hasTags ? ("tags" as const) : null,
  ]
    .filter((tab): tab is MediaTab => tab !== null)
    .map((tab) => ({
      value: tab,
      label: MEDIA_TAB_LABELS[tab],
      href: tabHref(tab),
    }));

  /*
    **Le repli quand l'onglet demandé n'existe pas sur cette fiche.** `?onglet=equipe` sur un webtoon
    sans équipe désignerait un panneau absent, et la fiche paraîtrait cassée. On retombe sur l'aperçu
    sans toucher à l'URL : la corriger effacerait l'intention de celui qui a partagé le lien, alors
    qu'elle redeviendra valide sur une fiche mieux fournie.
  */
  const requested = loadMediaTab(await searchParams).onglet;
  const active = tabs.some((tab) => tab.value === requested)
    ? requested
    : "apercu";

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
        favorite={favorite}
        lists={lists}
        media={media}
        titleLanguage={titleLanguage}
      />

      <Separator />

      <MediaTabs active={active} tabs={tabs}>
        {/*
          **Une frontière de suspense par onglet, et sa clé est l'onglet lui-même.** Sans la clé,
          React réutiliserait la frontière d'un onglet à l'autre : le panneau précédent resterait à
          l'écran pendant la lecture du suivant, et le clic paraîtrait sans effet une seconde
          entière. Avec elle, le squelette paraît immédiatement et le contenu arrive en flux.

          L'aperçu n'attend rien — sa donnée est déjà là —, mais il traverse la même frontière : deux
          chemins de rendu pour un même emplacement produiraient deux hauteurs de départ.
        */}
        <Suspense fallback={<MediaTabSkeleton />} key={active}>
          <MediaTabPanel
            active={active}
            includeAdult={includeAdult}
            media={media}
            tabHref={tabHref}
            titleLanguage={titleLanguage}
          />
        </Suspense>
      </MediaTabs>
    </article>
  );
}

/**
 * Le panneau de l'onglet actif, **et lui seul**.
 *
 * Trois des cinq onglets partent chercher leur propre donnée chez AniList (décision d'Alexis du
 * 11 septembre 2026) : c'est ce qui leur permet de montrer vingt-cinq personnages là où la requête
 * de fiche n'en ramène que six. La dépense suit l'intention — un visiteur qui reste sur l'aperçu ne
 * coûte pas un crédit de plus qu'avant.
 *
 * Les deux autres se servent dans la fiche déjà lue : les tags y voyagent gratuitement, et les
 * relations n'acceptent aucune pagination chez AniList, donc il n'y a rien de plus à aller
 * chercher.
 *
 * **Chaque lecture peut échouer indépendamment** : `tryAniList` rend `null` si AniList ne répond
 * pas pour cet onglet. Le panneau le dit alors en une phrase plutôt que d'emporter la fiche
 * entière, dont le hero est déjà à l'écran.
 */
async function MediaTabPanel({
  active,
  media,
  titleLanguage,
  includeAdult,
  tabHref,
}: {
  active: MediaTab;
  media: MediaDetail;
  titleLanguage: TitleLanguage;
  includeAdult: boolean;
  tabHref: (tab: MediaTab) => string;
}) {
  if (active === "apercu") {
    return (
      <MediaOverview
        includeAdult={includeAdult}
        media={media}
        tabHref={tabHref}
        titleLanguage={titleLanguage}
      />
    );
  }

  if (active === "tags") {
    return (
      <MediaTags
        genres={media.genres.filter(Boolean)}
        tags={visibleTags(media, includeAdult)}
      />
    );
  }

  if (active === "personnages") {
    const characters = await tryAniList(() =>
      getMediaCharacters(media.id, { includeAdult }),
    );

    if (!characters) return <TabUnavailable />;
    return <MediaCharacters characters={characters} />;
  }

  if (active === "equipe") {
    const staff = await tryAniList(() =>
      getMediaStaff(media.id, { includeAdult }),
    );

    if (!staff) return <TabUnavailable />;
    return <MediaStaff staff={staff} />;
  }

  /*
    Les relations viennent de la fiche, les recommandations d'une lecture dédiée : c'est le seul
    onglet à moitié servi d'avance. Une panne sur les secondes ne doit donc pas emporter les
    premières — d'où le repli sur un tableau vide plutôt qu'un message d'indisponibilité.
  */
  const recommendations =
    (await tryAniList(() =>
      getMediaRecommendations(media.id, { includeAdult }),
    )) ?? [];

  const relations = visibleRelations(media, includeAdult);

  return (
    <div className="flex flex-col gap-6">
      <MediaRelations relations={relations} titleLanguage={titleLanguage} />
      {/* Le trait n'a de sens qu'entre deux blocs réellement présents, et chacun peut manquer. */}
      {relations.length > 0 && recommendations.length > 0 ? (
        <Separator />
      ) : null}
      <MediaRecommendations
        recommendations={recommendations}
        titleLanguage={titleLanguage}
      />
    </div>
  );
}

/**
 * Ce que dit un onglet dont la lecture n'a pas abouti.
 *
 * Une phrase, pas une erreur : le reste de la fiche est à l'écran et reste utilisable, donc il n'y
 * a rien à réparer ici — seulement à ne pas mentir sur ce qui manque. Le bandeau de panne du
 * layout, lui, a déjà été prévenu par la lecture de la fiche.
 */
function TabUnavailable() {
  return (
    <p className="text-sm text-muted-foreground">
      Ces informations n'ont pas pu être chargées. AniList ne répond pas pour le
      moment.
    </p>
  );
}

/**
 * Le squelette d'un onglet en cours de lecture.
 *
 * Aux proportions des cartes de personnages et d'équipe — les deux onglets qui attendent réellement
 * une réponse réseau. Approximatif pour les autres, et sans importance : ils ne passent jamais par
 * ici assez longtemps pour qu'on le voie.
 */
function MediaTabSkeleton() {
  return (
    <div className="grid gap-2 sm:grid-cols-2 sm:gap-x-4 lg:grid-cols-3">
      {SKELETON_CARDS.map((index) => (
        <Skeleton className="h-20 rounded-lg" key={index} />
      ))}
    </div>
  );
}

/** Six cases : deux rangées pleines au palier large, assez pour occuper l'attente sans la simuler. */
const SKELETON_CARDS = [0, 1, 2, 3, 4, 5];
