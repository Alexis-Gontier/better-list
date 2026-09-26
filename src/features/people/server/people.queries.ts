import "server-only";

import { cacheLife } from "next/cache";

import { CATALOGUE_PAGE_SIZE } from "@/config/catalogue";
import { STAFF_TABS, type StaffTab } from "@/features/people/lib/people-params";
import {
  type Character,
  type CharacterMediaEdge,
  characterDataSchema,
  type PeopleConnection,
  type Staff,
  type StaffRoleEdge,
  staffDataSchema,
  type VoiceRoleEdge,
} from "@/features/people/schemas/people.schema";
import {
  CHARACTER_QUERY,
  STAFF_QUERY,
} from "@/features/people/server/people.documents";
import { anilistQuery, isAniListError } from "@/lib/http/anilist";

/**
 * Lectures AniList des pages Personnage et Staff.
 *
 * Même structure que `getMediaById` (`features/media/server/media.queries.ts`) : la lecture brute
 * est en `"use cache"` pour la journée — une biographie bouge à la marge —, le 404 y est rattrapé
 * parce qu'une absence d'id est définitive, et la panne **traverse** pour que la page la rattrape
 * par `tryAniList`, hors du cache. Le filtre 18+ s'applique ici, hors du cache aussi, sur des
 * données déjà en mémoire : une seule entrée par clé sert les quatre comptes.
 *
 * **Une requête AniList par affichage.** La clé est (id, page) pour un personnage, (id, onglet,
 * page) pour un staff.
 */

async function fetchCharacter(
  id: number,
  page: number,
): Promise<Character | null> {
  "use cache";
  cacheLife("days");

  try {
    const { Character } = await anilistQuery({
      query: CHARACTER_QUERY,
      variables: { id, page, perPage: CATALOGUE_PAGE_SIZE },
      schema: characterDataSchema,
    });
    return Character;
  } catch (error) {
    if (isAniListError(error) && error.isNotFound) return null;
    throw error;
  }
}

export type CharacterView = {
  character: Character;
  appearances: CharacterMediaEdge[];
  page: number;
  hasNextPage: boolean;
};

export async function getCharacter(
  id: number,
  page: number,
  { includeAdult }: { includeAdult: boolean },
): Promise<CharacterView | null> {
  const character = await fetchCharacter(id, page);
  if (!character) return null;

  return {
    character,
    appearances: (character.media?.edges ?? []).filter(
      (edge) => includeAdult || !edge.node.isAdult,
    ),
    page,
    hasNextPage: character.media?.pageInfo.hasNextPage ?? false,
  };
}

/**
 * `tab === null` : on ne sait pas encore quel onglet sera ouvert — ça dépend de ce qui est vide.
 * On demande alors la première page **des trois** listes en entier : une requête plus lourde, mais
 * une seule, et l'onglet par défaut est servi sans deuxième appel.
 */
async function fetchStaff(
  id: number,
  tab: StaffTab | null,
  page: number,
): Promise<Staff | null> {
  "use cache";
  cacheLife("days");

  const size = (candidate: StaffTab) =>
    tab === null || tab === candidate ? CATALOGUE_PAGE_SIZE : 1;
  const pageOf = (candidate: StaffTab) => (tab === candidate ? page : 1);

  try {
    const { Staff } = await anilistQuery({
      query: STAFF_QUERY,
      variables: {
        id,
        voicePage: pageOf("doublage"),
        voicePerPage: size("doublage"),
        animePage: pageOf("anime"),
        animePerPage: size("anime"),
        mangaPage: pageOf("manga"),
        mangaPerPage: size("manga"),
      },
      schema: staffDataSchema,
    });
    return Staff;
  } catch (error) {
    if (isAniListError(error) && error.isNotFound) return null;
    throw error;
  }
}

function connectionFor(
  staff: Staff,
  tab: StaffTab,
): PeopleConnection<VoiceRoleEdge | StaffRoleEdge> {
  if (tab === "doublage") return staff.voiceRoles;
  if (tab === "anime") return staff.animeRoles;
  return staff.mangaRoles;
}

/** Sous le plafond de 500, `total: 0` est exact ; faute de total, on regarde la page reçue. */
function isEmpty(connection: PeopleConnection<unknown>): boolean {
  if (!connection) return true;
  if (connection.pageInfo.total !== null)
    return connection.pageInfo.total === 0;
  return connection.edges.length === 0;
}

export type StaffView = {
  staff: Staff;
  tabs: StaffTab[];
  active: StaffTab | null;
  page: number;
  hasNextPage: boolean;
  voiceRoles: VoiceRoleEdge[];
  staffRoles: StaffRoleEdge[];
};

export async function getStaff(
  id: number,
  requested: StaffTab | null,
  page: number,
  { includeAdult }: { includeAdult: boolean },
): Promise<StaffView | null> {
  const first = await fetchStaff(id, requested, requested ? page : 1);
  if (!first) return null;

  const tabs = STAFF_TABS.filter((tab) => !isEmpty(connectionFor(first, tab)));
  const active =
    requested && tabs.includes(requested) ? requested : (tabs[0] ?? null);

  /*
    L'onglet demandé est vide sur cette personne (un lien recopié d'un autre staff) : on retombe sur
    le premier non vide, **sans corriger l'URL**, comme la fiche d'une œuvre. Sa liste n'a été
    demandée qu'en `perPage: 1` — il faut donc la seconde lecture, rare et cachée elle aussi.
  */
  const staff =
    requested && active !== requested
      ? ((await fetchStaff(id, null, 1)) ?? first)
      : first;

  const current = active === requested ? page : 1;
  const connection = active ? connectionFor(staff, active) : null;
  const visible = <E extends { node: { isAdult: boolean } }>(edges: E[]) =>
    edges.filter((edge) => includeAdult || !edge.node.isAdult);

  return {
    staff,
    tabs,
    active,
    page: current,
    hasNextPage: connection?.pageInfo.hasNextPage ?? false,
    voiceRoles:
      active === "doublage" ? visible(staff.voiceRoles?.edges ?? []) : [],
    staffRoles:
      active === "anime"
        ? visible(staff.animeRoles?.edges ?? [])
        : active === "manga"
          ? visible(staff.mangaRoles?.edges ?? [])
          : [],
  };
}
