import { DashboardSection } from "@/app/(app)/(home)/_components/dashboard-section";
import {
  HOME_CATALOGUE_ANCHOR,
  loadHomeParams,
  serializeHomeParams,
} from "@/app/(app)/(home)/_lib/home-params";
import { MediaGrid, MediaGridSkeleton } from "@/components/shared/media-grid";
import { Pagination } from "@/components/shared/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { CATALOGUE_PAGE_SIZE } from "@/config/catalogue";
import { routes } from "@/config/routes";
import { MediaCard } from "@/features/media/components/media-card";
import { mediaTotalUnits } from "@/features/media/server/media.mirror";
import { searchMedia } from "@/features/media/server/media.queries";
import { getPreferences } from "@/features/preferences/server/preferences.queries";
import { EntryCardActions } from "@/features/tracking/components/entry-card-actions";
import { getEntryStatesFor } from "@/features/tracking/server/tracking.queries";
import { tryAniList } from "@/lib/http/anilist";

/**
 * La grille qui termine l'accueil : le catalogue en vrac, pour continuer à fouiller.
 *
 * **Une grille et non une sixième rangée**, et c'est la distinction que `MediaCarousel` pose déjà :
 * une rangée est éditoriale — on en regarde le début et on la parcourt si le sujet accroche —, une
 * grille est un ensemble dans lequel on cherche. Les cinq rangées au-dessus répondent à « qu'est-ce
 * qui se passe » ; celle-ci répond à « montre-moi juste des choses », qui est la question qu'il reste
 * quand on a fini de lire les cinq autres. C'est aussi la raison de sa place : en dernier, parce que
 * c'est le seul bloc de la page qui n'a pas de fin.
 *
 * **Elle est paginée, et chaque page tournée coûte une requête AniList** — la première fois
 * seulement : `searchMedia` porte `"use cache"` avec `cacheLife("hours")`, donc la page 2 est payée
 * une fois par heure pour l'ensemble des visiteurs, pas une fois par visiteur. Sur un quota de trente
 * requêtes par minute partagé, c'est ce qui rend le bloc tenable ; une grille à défilement infini
 * aurait fait l'inverse, en dépensant une requête à chaque fin d'écran.
 *
 * Le tri est **figé côté serveur**. L'accueil n'est pas la recherche : lui donner des contrôles de
 * tri en ferait une deuxième page de résultats, moins bonne que celle qui existe, et le lien « Tout
 * voir » de l'en-tête mène précisément là pour qui veut régler quelque chose.
 */
export async function HomeCatalogue({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { page } = await loadHomeParams(searchParams);

  /**
   * Le 18+ vient de la préférence du compte, jamais de l'adresse — comme partout ailleurs
   * (`search-results.tsx`). L'accueil n'expose d'ailleurs aucun autre paramètre : il n'y a rien à
   * forger ici.
   */
  const { includeAdult } = await getPreferences();

  /*
    Même repli que le bandeau : muet. La grille est le dernier bloc de la page, et un troisième
    encadré « AniList ne répond pas » trois écrans sous le premier n'apprendrait rien à personne.
  */
  const result = await tryAniList(() =>
    searchMedia({
      sortField: "POPULARITY",
      sortDirection: "DESC",
      page,
      includeAdult,
    }),
  );

  if (!result) return null;

  const { media, pageInfo } = result;

  if (media.length === 0) return null;

  /** Ce que ce compte suit déjà, en une requête pour toute la grille — même règle que la recherche. */
  const entries = await getEntryStatesFor(media.map((item) => item.id));

  return (
    <DashboardSection
      description="Animes, mangas, webtoons et light novels, du plus suivi au moins suivi."
      href={routes.search}
      linkLabel="Affiner"
      title="Explorer le catalogue"
    >
      {/*
        L'ancre est posée sur la section et non sur la grille : atterrir sur la première jaquette
        cacherait le titre qui explique ce qu'on regarde.
      */}
      <div id={HOME_CATALOGUE_ANCHOR} className="space-y-6">
        <MediaGrid>
          {media.map((item) => (
            <li key={item.id}>
              <MediaCard
                action={
                  <EntryCardActions
                    bannerImage={item.bannerImage}
                    entry={entries.get(item.id) ?? null}
                    media={item}
                    total={mediaTotalUnits(item)}
                  />
                }
                /* Même contrat que les rangées : le catalogue a les genres, pas le synopsis. */
                genres={item.genres}
                media={item}
              />
            </li>
          ))}
        </MediaGrid>

        <Pagination
          currentPage={pageInfo.currentPage ?? page}
          // AniList plafonne `total` à 5 000 et laisse parfois les champs à `null` : on lui fait
          // confiance sur « y a-t-il une suite », qu'il sait, plutôt que sur le calcul par défaut du
          // composant, qui repose sur un dernier numéro de page inventé.
          hasNextPage={pageInfo.hasNextPage ?? undefined}
          /*
            Le fragment est ce qui rend la pagination utilisable ici : sans lui, chaque page tournée
            renverrait en haut de l'accueil, au-dessus du bandeau et des cinq rangées qu'on venait de
            dépasser.

            **Il ne suffit pas de le poser sur cette grille-ci** : elle arrive en flux, donc la cible
            n'existe pas encore au moment où le navigateur cherche le fragment, et le saut est perdu
            (mesuré : `scrollY` restait à 0). C'est `HomeCatalogueSkeleton` qui porte la même ancre,
            parce que lui est dans la première réponse.
          */
          hrefForPage={(next) =>
            `${serializeHomeParams(routes.home, { page: next })}#${HOME_CATALOGUE_ANCHOR}`
          }
          label="Pagination du catalogue"
          lastPage={pageInfo.lastPage ?? pageInfo.currentPage ?? page}
        />
      </div>
    </DashboardSection>
  );
}

/**
 * Le squelette, dans le même fichier que la grille qu'il remplace — même règle que partout ailleurs
 * dans le projet : c'est la seule façon de garantir qu'ils ne divergent pas.
 *
 * **Il porte l'ancre**, et ce n'est pas une commodité : c'est ce qui fait fonctionner la pagination.
 * Le fragment `#catalogue` est résolu par le navigateur dès la première réponse, bien avant qu'AniList
 * ait répondu ; sans cible à ce moment-là, le saut est simplement abandonné et « Suivant » ramène en
 * haut de l'accueil — au-dessus du bandeau et des cinq rangées qu'on venait de dépasser. Le squelette
 * étant, lui, dans le document initial, il offre la cible au bon instant.
 *
 * Les deux ne coexistent jamais : React remplace le repli par le contenu, donc l'`id` reste unique.
 *
 * `CATALOGUE_PAGE_SIZE` et non un nombre choisi : le squelette doit avoir **la hauteur de la grille
 * qu'il remplace**, sinon la page se décale au moment de l'échange — et elle se décalerait ici juste
 * après que le navigateur a calé le défilement sur l'ancre, c'est-à-dire au pire moment possible.
 */
export function HomeCatalogueSkeleton() {
  return (
    <section className="space-y-3" id={HOME_CATALOGUE_ANCHOR}>
      <div className="space-y-1.5">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      <MediaGridSkeleton count={CATALOGUE_PAGE_SIZE} />
    </section>
  );
}
