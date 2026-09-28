import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import * as z from "zod";

import { ReportAniListStatus } from "@/components/layout/anilist-outage-notice";
import { CataloguePagination } from "@/components/shared/catalogue-pagination";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { routes } from "@/config/routes";
import { formatCharacterRole } from "@/features/media/lib/media-format";
import { PeopleMediaGrid } from "@/features/people/components/people-media-grid";
import { PersonHeader } from "@/features/people/components/person-header";
import { PersonPageSkeleton } from "@/features/people/components/person-page-skeleton";
import {
  formatAge,
  formatFuzzyDate,
  formatGender,
} from "@/features/people/lib/people-format";
import {
  loadPeopleParams,
  serializePeopleParams,
  toPage,
} from "@/features/people/lib/people-params";
import { getCharacter } from "@/features/people/server/people.queries";
import { getPreferences } from "@/features/preferences/server/preferences.queries";
import { tryAniList } from "@/lib/http/anilist";

/** Même garde que la fiche : l'id vient de l'URL, on le valide avant d'appeler AniList. */
const idSchema = z.coerce.number().int().positive();

function parseId(raw: string): number | null {
  const result = idSchema.safeParse(raw);
  return result.success ? result.data : null;
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/character/[id]">): Promise<Metadata> {
  const id = parseId((await params).id);
  if (id === null) return {};
  const page = toPage(loadPeopleParams(await searchParams).page);
  const { includeAdult } = await getPreferences();
  // Même lecture que le contenu, donc même entrée de cache : aucune requête de plus. Et elle ne
  // doit jamais jeter — une panne rend des métadonnées vides, pas une page d'erreur.
  const view = await tryAniList(() => getCharacter(id, page, { includeAdult }));
  const name = view?.character.name.full;
  return name ? { title: name } : {};
}

/**
 * Un personnage : qui il est, et où il apparaît.
 *
 * Même squelette que la fiche d'une œuvre : la page n'attend rien, le contenu est suspendu. Une
 * requête AniList par affichage, cachée un jour par (id, page).
 */
export default function CharacterPage({
  params,
  searchParams,
}: PageProps<"/character/[id]">) {
  return (
    <Suspense fallback={<PersonPageSkeleton />}>
      <CharacterContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function CharacterContent({
  params,
  searchParams,
}: {
  params: PageProps<"/character/[id]">["params"];
  searchParams: PageProps<"/character/[id]">["searchParams"];
}) {
  const id = parseId((await params).id);
  if (id === null) notFound();

  const page = toPage(loadPeopleParams(await searchParams).page);
  const { includeAdult, titleLanguage } = await getPreferences();

  /*
    Le `null` de `tryAniList` veut dire « AniList ne répond pas » ; celui de `getCharacter`,
    « ce personnage n'existe pas ». L'emballage garde les deux distincts, comme sur la fiche.
  */
  const result = await tryAniList(async () => ({
    view: await getCharacter(id, page, { includeAdult }),
  }));

  if (!result) {
    // Aucun repli : rien de ce qui fait cette page n'est stocké en base (PRODUCT.md §4.1).
    return (
      <>
        <ReportAniListStatus down />
        <p className="text-muted-foreground text-sm">
          Ce personnage n'a pas pu être chargé. AniList ne répond pas pour le
          moment.
        </p>
      </>
    );
  }

  const { view } = result;
  if (!view) notFound();

  const { character, appearances, hasNextPage } = view;

  return (
    <article className="flex flex-col gap-6">
      <ReportAniListStatus down={false} />

      <PersonHeader
        alternatives={character.name.alternative}
        description={character.description}
        facts={[
          {
            label: "Anniversaire",
            value: formatFuzzyDate(character.dateOfBirth),
          },
          { label: "Âge", value: formatAge(character.age) },
          { label: "Genre", value: formatGender(character.gender) },
          { label: "Groupe sanguin", value: character.bloodType },
        ]}
        favourites={character.favourites}
        image={character.image?.large ?? null}
        name={character.name.full}
        native={character.name.native}
        spoilerAlternatives={character.name.alternativeSpoiler}
      />

      <Separator />

      <section className="flex flex-col gap-4">
        <h2 className="font-heading font-semibold text-xl tracking-tight">
          Apparitions
        </h2>

        {appearances.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Rien à montrer sur cette page</EmptyTitle>
              <EmptyDescription>
                Aucune œuvre à afficher ici — elles sont peut-être masquées par
                votre réglage de contenu adulte.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <PeopleMediaGrid
            items={appearances.map((edge) => {
              const [voice] = edge.voiceActors;
              const role = formatCharacterRole(edge.characterRole);
              return {
                media: edge.node,
                /*
                  Les deux lignes sont **toujours** rendues, espace insécable à défaut : une grille
                  dont certaines cartes ont une ligne de moins perd son alignement horizontal —
                  même règle que `MediaCard.details`.
                */
                footer: (
                  <>
                    <p className="truncate text-muted-foreground text-xs">
                      {role ?? " "}
                    </p>
                    {voice?.name.full ? (
                      <Link
                        className="truncate text-muted-foreground text-xs hover:text-foreground"
                        href={routes.staff(voice.id)}
                        prefetch={false}
                      >
                        {voice.name.full}
                      </Link>
                    ) : (
                      <p className="text-xs">{" "}</p>
                    )}
                  </>
                ),
              };
            })}
            priority
            titleLanguage={titleLanguage}
          />
        )}

        <CataloguePagination
          hrefFor={(target) =>
            serializePeopleParams(routes.character(id), { page: target })
          }
          page={page}
          pageCount={hasNextPage ? page + 1 : page}
        />
      </section>
    </article>
  );
}
