import "server-only";

import { cacheLife } from "next/cache";
import {
  type FranchiseItem,
  orderFranchise,
} from "@/features/media/lib/franchise-order";
import {
  type FranchiseEdge,
  walkFranchise,
} from "@/features/media/lib/franchise-walk";
import {
  franchiseLevelDataSchema,
  type MediaDetail,
} from "@/features/media/schemas/media.schema";
import { FRANCHISE_LEVEL_QUERY } from "@/features/media/server/media.documents";
import { anilistQuery, tryAniList } from "@/lib/http/anilist";

export type Franchise = {
  items: FranchiseItem[];
  truncated: boolean;
  incomplete: boolean;
};

/**
 * Un niveau, caché **seul** : un parcours interrompu ne met en cache que les niveaux réussis, donc
 * une panne ne survit pas à elle-même. Des semaines, parce qu'une suite s'annonce rarement. Un
 * tableau plutôt qu'une `Map`, pour rester trivialement sérialisable par le cache.
 */
async function fetchFranchiseLevel(
  ids: number[],
): Promise<Array<[number, FranchiseEdge[]]>> {
  "use cache";
  cacheLife("weeks");

  const { Page } = await anilistQuery({
    query: FRANCHISE_LEVEL_QUERY,
    variables: { ids, perPage: ids.length },
    schema: franchiseLevelDataSchema,
  });

  return Page.media.map((entry) => [entry.id, entry.relations.edges]);
}

/**
 * La franchise de l'œuvre, dans l'ordre (conception.md §8). Le niveau 0 vient de la fiche, déjà
 * lue : l'onglet a toujours au moins les voisins directs, même un jour de panne. Le filtre 18+
 * passe après le cache et après l'ordre, pour qu'une suite adulte masquée ne coupe pas la chaîne.
 */
export async function getFranchise(
  media: MediaDetail,
  { includeAdult }: { includeAdult: boolean },
): Promise<Franchise> {
  const walk = await walkFranchise(
    media,
    media.relations.edges,
    async (ids) => {
      // Ids triés : deux parcours qui demandent le même lot partagent la même entrée de cache.
      const level = await tryAniList(() =>
        fetchFranchiseLevel(ids.toSorted((a, b) => a - b)),
      );
      return level ? new Map(level) : null;
    },
  );

  return {
    items: orderFranchise(walk.graph).filter(
      (item) => includeAdult || !item.media.isAdult,
    ),
    truncated: walk.truncated,
    incomplete: walk.incomplete,
  };
}
