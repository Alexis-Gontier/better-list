import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import * as z from "zod";

import { ReportAniListStatus } from "@/components/layout/anilist-outage-notice";
import { CataloguePagination } from "@/components/shared/catalogue-pagination";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { routes } from "@/config/routes";
import { FavoriteButton } from "@/features/favorites/components/favorite-button";
import { isFavorite } from "@/features/favorites/server/favorites.queries";
import { formatStaffRole } from "@/features/media/lib/media-format";
import { PeopleMediaGrid } from "@/features/people/components/people-media-grid";
import { PersonHeader } from "@/features/people/components/person-header";
import { PersonPageSkeleton } from "@/features/people/components/person-page-skeleton";
import {
  formatAge,
  formatFuzzyDate,
  formatGender,
  formatOccupations,
  formatYearsActive,
  groupByYear,
  mergeStaffRoles,
  mergeVoiceRoles,
} from "@/features/people/lib/people-format";
import {
  loadPeopleParams,
  STAFF_TAB_LABELS,
  type StaffTab,
  serializePeopleParams,
  toPage,
} from "@/features/people/lib/people-params";
import {
  getStaff,
  type StaffView,
} from "@/features/people/server/people.queries";
import type { TitleLanguage } from "@/features/preferences/schemas/preferences.schema";
import { getPreferences } from "@/features/preferences/server/preferences.queries";
import { tryAniList } from "@/lib/http/anilist";

const idSchema = z.coerce.number().int().positive();

function parseId(raw: string): number | null {
  const result = idSchema.safeParse(raw);
  return result.success ? result.data : null;
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/staff/[id]">): Promise<Metadata> {
  const id = parseId((await params).id);
  if (id === null) return {};
  const { page, onglet } = loadPeopleParams(await searchParams);
  const { includeAdult } = await getPreferences();
  // Même lecture que le contenu, donc même entrée de cache ; une panne rend des métadonnées vides.
  const view = await tryAniList(() =>
    getStaff(id, onglet, toPage(page), { includeAdult }),
  );
  const name = view?.staff.name.full;
  return name ? { title: name } : {};
}

/**
 * Un membre du staff : qui il est, ce qu'il a doublé, ce qu'il a fait.
 *
 * Les trois listes sont des **onglets en lien** (`?onglet=`), comme ceux de la fiche d'une œuvre :
 * le serveur ne demande en entier que la liste ouverte, et un onglet vide n'est pas proposé.
 */
export default function StaffPage({
  params,
  searchParams,
}: PageProps<"/staff/[id]">) {
  return (
    <Suspense fallback={<PersonPageSkeleton />}>
      <StaffContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function StaffContent({
  params,
  searchParams,
}: {
  params: PageProps<"/staff/[id]">["params"];
  searchParams: PageProps<"/staff/[id]">["searchParams"];
}) {
  const id = parseId((await params).id);
  if (id === null) notFound();

  const { page, onglet } = loadPeopleParams(await searchParams);
  const { includeAdult, titleLanguage } = await getPreferences();

  // Même emballage que la page d'un personnage : le `null` de `tryAniList` ne dit que la panne.
  const [result, favorite] = await Promise.all([
    tryAniList(async () => ({
      view: await getStaff(id, onglet, toPage(page), { includeAdult }),
    })),
    isFavorite("STAFF", id),
  ]);

  if (!result) {
    return (
      <>
        <ReportAniListStatus down />
        <p className="text-muted-foreground text-sm">
          Cette personne n'a pas pu être chargée. AniList ne répond pas pour le
          moment.
        </p>
      </>
    );
  }

  const { view } = result;
  if (!view) notFound();

  const { staff, active } = view;
  const died = formatFuzzyDate(staff.dateOfDeath);

  return (
    <article className="flex flex-col gap-6">
      <ReportAniListStatus down={false} />

      <PersonHeader
        action={
          <FavoriteButton
            initial={favorite}
            target={{
              kind: "STAFF",
              anilistId: id,
              name: staff.name.full ?? "Sans nom",
              image: staff.image?.large ?? null,
            }}
          />
        }
        alternatives={staff.name.alternative}
        description={staff.description}
        facts={[
          { label: "Naissance", value: formatFuzzyDate(staff.dateOfBirth) },
          { label: "Décès", value: died },
          // AniList calcule l'âge à aujourd'hui : à côté d'un décès, ce serait faux.
          { label: "Âge", value: died ? null : formatAge(staff.age) },
          { label: "Genre", value: formatGender(staff.gender) },
          { label: "Activité", value: formatYearsActive(staff.yearsActive) },
          { label: "Ville natale", value: staff.homeTown },
          {
            label: "Métiers",
            value: formatOccupations(staff.primaryOccupations),
          },
        ]}
        favourites={staff.favourites}
        image={staff.image?.large ?? null}
        name={staff.name.full}
        native={staff.name.native}
      />

      {active ? (
        <>
          <Separator />
          <StaffTabs active={active} id={id} tabs={view.tabs}>
            <StaffRoles titleLanguage={titleLanguage} view={view} />
            <CataloguePagination
              hrefFor={(target) =>
                serializePeopleParams(routes.staff(id), {
                  onglet: active,
                  page: target,
                })
              }
              page={view.page}
              pageCount={view.hasNextPage ? view.page + 1 : view.page}
            />
          </StaffTabs>
        </>
      ) : null}
    </article>
  );
}

/**
 * La barre d'onglets du staff. Même matière et même principe que celle de la fiche
 * (`media/[id]/_components/media-tabs.tsx`) : des liens, un seul panneau rendu, et donc une seule
 * liste demandée à AniList.
 */
function StaffTabs({
  id,
  tabs,
  active,
  children,
}: {
  id: number;
  tabs: StaffTab[];
  active: StaffTab;
  children: React.ReactNode;
}) {
  return (
    <Tabs className="gap-6" value={active}>
      <div className="-mx-4 scrollbar-none overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
        <TabsList
          className="w-full justify-start rounded-none border-border/60 border-b"
          variant="line"
        >
          {tabs.map((tab) => (
            <TabsTrigger
              asChild
              className="flex-none px-3"
              key={tab}
              value={tab}
            >
              <Link
                href={serializePeopleParams(routes.staff(id), { onglet: tab })}
                scroll={false}
              >
                {STAFF_TAB_LABELS[tab]}
              </Link>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      <TabsContent className="flex flex-col gap-8" value={active}>
        {children}
      </TabsContent>
    </Tabs>
  );
}

/**
 * Les rôles de l'onglet ouvert, **groupés par année** comme sur AniList. Le groupement se fait dans
 * la page : une année peut donc être coupée entre deux pages, c'est le prix d'une pagination par
 * liens.
 */
function StaffRoles({
  view,
  titleLanguage,
}: {
  view: StaffView;
  titleLanguage: TitleLanguage;
}) {
  const rows =
    view.active === "doublage"
      ? mergeVoiceRoles(view.voiceRoles).map((row) => ({
          media: row.media,
          footer: (
            <p className="truncate text-muted-foreground text-xs">
              {row.characters.length > 0
                ? row.characters.map((character, index) => (
                    <span key={character.id}>
                      {index > 0 ? ", " : null}
                      <Link
                        className="hover:text-foreground"
                        href={routes.character(character.id)}
                        prefetch={false}
                      >
                        {character.name.full ?? "Sans nom"}
                      </Link>
                    </span>
                  ))
                : " "}
            </p>
          ),
        }))
      : mergeStaffRoles(view.staffRoles).map((row) => {
          const roles = row.roles
            .map((role) => formatStaffRole(role))
            .filter((role): role is string => Boolean(role))
            .join(", ");
          return {
            media: row.media,
            footer: (
              <p
                className="truncate text-muted-foreground text-xs"
                title={roles || undefined}
              >
                {roles || " "}
              </p>
            ),
          };
        });

  if (rows.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Rien à montrer sur cette page</EmptyTitle>
          <EmptyDescription>
            Aucune œuvre à afficher ici — elles sont peut-être masquées par
            votre réglage de contenu adulte.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const groups = groupByYear(rows, (row) => row.media.startDate?.year ?? null);

  return (
    <>
      {groups.map((group, index) => (
        <section className="flex flex-col gap-4" key={group.year ?? "a-venir"}>
          {/*
            L'année, puis un filet jusqu'au bord : sur une carrière de quarante ans, c'est lui qui
            fait lire la page comme une frise plutôt que comme une suite de titres isolés. Le compte
            dit d'un coup d'œil les années chargées.
          */}
          <div className="flex items-center gap-3">
            <h2 className="font-heading font-semibold text-xl tabular-nums tracking-tight">
              {group.year ?? "À venir"}
            </h2>
            <Badge variant="secondary">
              {group.items.length}
              <span className="sr-only">
                {group.items.length > 1 ? " œuvres" : " œuvre"}
              </span>
            </Badge>
            <Separator className="flex-1" />
          </div>
          <PeopleMediaGrid
            items={group.items}
            priority={index === 0}
            titleLanguage={titleLanguage}
          />
        </section>
      ))}
    </>
  );
}
