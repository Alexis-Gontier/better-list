import {
  ArrowLeftIcon,
  ArrowUpDownIcon,
  CheckIcon,
  LibraryBigIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AddMediaDialog } from "@/app/(app)/lists/[id]/_components/add-media-dialog";
import { ListActionsMenu } from "@/app/(app)/lists/[id]/_components/list-actions-menu";
import { ListReorderGrid } from "@/app/(app)/lists/[id]/_components/list-reorder-grid";
import {
  CatalogueGrid,
  CatalogueGridSkeleton,
  WIDEST_COLUMN_COUNT,
} from "@/components/shared/catalogue-grid";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { routes } from "@/config/routes";
import {
  itemCountLabel,
  listCountsLine,
  listHeadline,
  sectionHeading,
} from "@/features/lists/lib/list-labels";
import {
  listSections,
  sectionCounts,
} from "@/features/lists/lib/list-sections";
import {
  getList,
  getListSuggestions,
} from "@/features/lists/server/lists.queries";
import { MediaCard } from "@/features/media/components/media-card";
import { mediaTitle } from "@/features/media/lib/media-format";
import { getPreferences } from "@/features/preferences/server/preferences.queries";
import { EntryQuickEdit } from "@/features/tracking/components/entry-quick-edit";
import { EntryStatusDot } from "@/features/tracking/components/entry-status-dot";
import { getLibraryEntriesFor } from "@/features/tracking/server/library.queries";

/**
 * L'onglet porte le **nom de la liste**, et non le mot « Liste » qu'il affichait jusqu'au
 * 7 septembre 2026 : on en ouvre plusieurs côte à côte, et trois onglets nommés pareil ne se
 * distinguent plus.
 *
 * La lecture ne coûte pas une requête de plus : `getList` est déduplicée par `cache` de React, donc
 * l'appel d'ici et celui du rendu n'en font qu'une (`lists.queries.ts`).
 *
 * Le repli sur « Liste » couvre l'identifiant inconnu — la page rendra son 404, mais les métadonnées
 * sont calculées avant et ne peuvent pas s'en remettre à lui.
 */
export async function generateMetadata({
  params,
}: PageProps<"/lists/[id]">): Promise<Metadata> {
  const { id } = await params;
  const { includeAdult } = await getPreferences();
  const list = await getList(id, { includeAdult });

  return {
    title: list?.title ?? "Liste",
    description: "Une liste d'œuvres.",
    // Une liste est privée par défaut (docs/conception.md §4.4), et l'app est derrière une garde :
    // rien à indexer.
    robots: { index: false, follow: false },
  };
}

/**
 * Une liste et son contenu.
 *
 * **C'est la coquille du catalogue, réemployée telle quelle** : `CatalogueGrid`, `MediaCard`, la
 * pastille de statut et la fenêtre d'édition rapide. Une liste est une grille d'œuvres, donc elle a
 * droit à la même carte que `/search` et `/library` — si on redessinait une carte ici, c'est que
 * quelque chose n'irait pas.
 *
 * **Deux modes, et le mode vit dans l'URL** (`?mode=reorder`). En consultation, c'est la grille du
 * catalogue. En réorganisation, une grille cliente où l'on glisse — `ListReorderGrid`. Aucune des
 * deux n'est rendue quand c'est l'autre qui est demandée, donc le mode consultation ne paie pas le
 * poids de dnd-kit.
 *
 * **Ce que cet écran n'a pas**, et ce sont des décisions, pas des oublis :
 *
 * - **Pas de partage.** `generateShareToken` attend `/l/[token]`, qui est une autre branche.
 * - **On remplit aussi la liste d'ici** (D46) : la fenêtre « Ajouter des œuvres » cherche et range
 *   sans passer par la fiche. Celle de la fiche reste, pour ranger une œuvre dans plusieurs listes.
 *
 * **La page n'attend rien elle-même** : elle transmet la promesse `params` à l'enfant suspendu, ce
 * qui laisse la coquille s'afficher pendant que la base répond (CLAUDE.md).
 */
export default function ListPage({
  params,
  searchParams,
}: PageProps<"/lists/[id]">) {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<ListDetailSkeleton />}>
        <ListDetail params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

/**
 * **Le mode vit dans l'URL, pas dans un état client.**
 *
 * C'est l'idiome de la disposition de `/library` (`library-params.ts`) : un mode dans l'adresse se
 * partage, survit au retour arrière et au rechargement, et n'oblige pas la page à devenir cliente
 * pour se souvenir d'un booléen. Le basculement est donc un simple lien, et chaque mode est rendu
 * par le serveur avec exactement ce dont il a besoin — la grille du catalogue d'un côté, la grille
 * réordonnable de l'autre, jamais les deux.
 */
const REORDER_MODE = "reorder";

async function ListDetail({
  params,
  searchParams,
}: {
  params: PageProps<"/lists/[id]">["params"];
  searchParams: PageProps<"/lists/[id]">["searchParams"];
}) {
  const { id } = await params;
  const query = await searchParams;
  const reordering = query.mode === REORDER_MODE;
  // Posé par la création (`routes.lists.fill`) : la liste neuve s'ouvre sur sa fenêtre d'ajout.
  const filling = query.ajouter === "1";
  const { includeAdult, titleLanguage } = await getPreferences();
  const list = await getList(id, { includeAdult });

  /*
    `null` couvre « elle n'existe pas » **et** « elle n'est pas à moi », et `getList` les confond
    exprès : distinguer les deux dirait à qui essaie des identifiants au hasard lesquels ont trouvé
    quelque chose.
  */
  if (!list) notFound();

  /*
    Le suivi arrive en **une** requête pour toute la page, sur l'index `[userId, mediaId]` — la
    lecture que `/search` emploie déjà, et dont le docstring prévoyait de servir les listes. Une
    clé absente veut dire « pas encore suivie », et c'est elle qui décide qu'aucune pastille ne
    s'affiche.
  */
  const [entries, suggestions] = reordering
    ? [new Map(), []]
    : await Promise.all([
        getLibraryEntriesFor(list.items.map((i) => i.media.id)),
        // Ce que la fenêtre d'ajout propose avant qu'on tape ; indépendant du suivi, donc en parallèle.
        getListSuggestions(list.id, list.kind, {
          includeAdult,
          titleLanguage,
        }),
      ]);

  /*
    Le genre décide des sections (D47). En mode réorganisation, il n'y en a pas : on réordonne la
    liste entière, et le suivi n'y est pas lu.
  */
  const sections = listSections(
    list.kind,
    list.cutoff,
    list.items.map((item) => ({
      item,
      mediaStatus: item.media.status,
      entryStatus: entries.get(item.media.id)?.status ?? null,
    })),
  );
  const countsLine = listCountsLine(list.kind, list.cutoff, {
    total: list.itemCount,
    ...sectionCounts(sections),
  });

  return (
    <>
      <div className="flex flex-col gap-4">
        {/*
          Le retour est un lien et non un `history.back()` : on arrive ici par un lien partagé ou par
          l'adresse aussi bien que par la grille, et un bouton « retour » qui ne mène nulle part est
          pire que pas de bouton.
        */}
        <Button asChild className="-ml-2 w-fit" size="sm" variant="ghost">
          <Link href={routes.lists.root}>
            <ArrowLeftIcon data-icon="inline-start" />
            Mes listes
          </Link>
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="truncate text-2xl">{list.title}</h1>
            {list.description ? (
              <p className="text-pretty text-muted-foreground text-sm">
                {list.description}
              </p>
            ) : null}
            <p className="text-muted-foreground text-xs">
              {reordering
                ? itemCountLabel(list.itemCount)
                : listHeadline(list.kind, list.cutoff, countsLine)}
            </p>
          </div>

          {/*
            La barre d'actions : la bascule de mode, puis les gestes sur la liste elle-même.

            **Le basculement est un lien, pas un bouton d'état.** Le mode est dans l'URL, donc
            l'aller-retour est une navigation ordinaire — partageable, rejouée au retour arrière, et
            sans une ligne d'état client. `replace` sur le lien de sortie pour ne pas empiler dix
            entrées d'historique à force d'entrer et de sortir du mode.
          */}
          <div className="flex shrink-0 items-center gap-2">
            {/* Ajouter est l'action principale de l'écran (D33), sauf pendant qu'on réordonne. */}
            {reordering ? null : (
              <AddMediaDialog
                initialOpen={filling}
                listId={list.id}
                memberIds={list.items.map((item) => item.media.id)}
                suggestions={suggestions}
              />
            )}
            {list.items.length > 1 ? (
              <Button
                asChild
                size="sm"
                variant={reordering ? "default" : "outline"}
              >
                <Link
                  href={
                    reordering
                      ? routes.lists.detail(list.id)
                      : `${routes.lists.detail(list.id)}?mode=${REORDER_MODE}`
                  }
                  replace={reordering}
                >
                  {reordering ? (
                    <CheckIcon data-icon="inline-start" />
                  ) : (
                    <ArrowUpDownIcon data-icon="inline-start" />
                  )}
                  {reordering ? "Terminé" : "Réorganiser"}
                </Link>
              </Button>
            ) : null}

            <ListActionsMenu list={list} />
          </div>
        </div>

        <Separator />
      </div>

      {list.items.length === 0 ? (
        <ListContentEmpty hiddenByPreference={list.itemCount > 0} />
      ) : reordering ? (
        <>
          {/*
            Ce que le mode fait, dit avant qu'on essaie. Une aide qui n'apparaît qu'après l'échec du
            premier geste arrive trop tard, et celle-ci nomme aussi le chemin clavier — sans quoi
            personne ne devinerait qu'Espace saisit.
          */}
          <p className="text-muted-foreground text-sm">
            Faites glisser une jaquette pour la déplacer. Au clavier : Tab pour
            l'atteindre, Espace pour la saisir, les flèches pour la déplacer,
            Espace pour la reposer. Chaque déplacement est enregistré aussitôt.
          </p>

          <ListReorderGrid
            items={list.items.map((item) => ({
              mediaId: item.media.id,
              cover: item.media.coverImage?.large ?? null,
              title: mediaTitle(item.media.title, titleLanguage),
            }))}
            listId={list.id}
          />
        </>
      ) : (
        <div className="flex flex-col gap-8">
          {sections.map((section, sectionIndex) => {
            const grid = (
              <CatalogueGrid key={section.key}>
                {section.items.map(({ item, rank }, index) => (
                  <MediaCard
                    action={
                      <EntryQuickEdit
                        banner={item.banner}
                        compact
                        entry={entries.get(item.media.id) ?? null}
                        mediaId={item.media.id}
                        title={mediaTitle(item.media.title, titleLanguage)}
                        total={item.total}
                        unit={item.unit}
                      />
                    }
                    key={item.media.id}
                    marker={
                      entries.has(item.media.id) ? (
                        <EntryStatusDot
                          // biome-ignore lint/style/noNonNullAssertion: `has` vient d'être vérifié.
                          status={entries.get(item.media.id)!.status}
                        />
                      ) : undefined
                    }
                    media={item.media}
                    // La première rangée de la première section porte la mesure de LCP.
                    priority={sectionIndex === 0 && index < WIDEST_COLUMN_COUNT}
                    rank={list.kind === "RANKING" ? rank : undefined}
                    titleLanguage={titleLanguage}
                  />
                ))}
              </CatalogueGrid>
            );

            if (section.label === null) {
              return <div key={section.key}>{grid}</div>;
            }

            const heading = sectionHeading(
              section.key,
              section.label,
              section.items.length,
            );

            /*
              Une section repliée est un `<details>` natif : ouvrir « Déjà vues » ne coûte pas une
              ligne de JavaScript, et la page reste serveur.
            */
            return section.collapsed ? (
              <details className="flex flex-col" key={section.key}>
                <summary className="cursor-pointer font-heading text-lg">
                  {heading}
                </summary>
                <div className="pt-4">{grid}</div>
              </details>
            ) : (
              <section className="flex flex-col gap-4" key={section.key}>
                <h2 className="font-heading text-lg">{heading}</h2>
                {grid}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

/**
 * Deux vides, et ils ne disent pas la même chose.
 *
 * Une liste réellement vide attend sa première œuvre. Une liste dont **toutes** les œuvres sont
 * masquées par la préférence 18+ n'est pas vide : le décompte, lui, les compte. Confondre les deux
 * ferait croire à une perte de données.
 */
function ListContentEmpty({
  hiddenByPreference,
}: {
  hiddenByPreference: boolean;
}) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <LibraryBigIcon />
        </EmptyMedia>
        <EmptyTitle>
          {hiddenByPreference
            ? "Rien à montrer avec vos préférences"
            : "Cette liste est vide"}
        </EmptyTitle>
        <EmptyDescription>
          {hiddenByPreference
            ? "Toutes les œuvres de cette liste sont marquées adultes, et votre préférence les masque. Elles sont toujours là."
            : "Ajoutez une première œuvre avec « Ajouter des œuvres », ou depuis la fiche d'une œuvre."}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

/** Le squelette : le fil d'Ariane, le titre, puis la grille du catalogue. */
function ListDetailSkeleton() {
  return (
    <>
      <div className="flex flex-col gap-4">
        {/* `-ml-2` comme le vrai retour, qui déborde à gauche pour aligner son texte sur le titre. */}
        <Skeleton className="-ml-2 h-8 w-28" />

        {/*
          **La ligne du titre porte aussi sa barre d'actions**, à droite : « Réorganiser » et le
          menu de la liste. Le squelette s'arrêtait au titre, et les deux boutons paraissaient d'un
          coup. Trois lignes à gauche et non deux, pour la même raison : le décompte (« 18 œuvres »)
          manquait, soit vingt pixels de moins que ce qui arrive.
        */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-5 w-96 max-w-full" />
            <Skeleton className="h-4 w-24" />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="size-9" />
          </div>
        </div>

        <Separator />
      </div>
      <CatalogueGridSkeleton />
    </>
  );
}
