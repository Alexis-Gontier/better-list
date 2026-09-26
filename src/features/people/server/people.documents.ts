import "server-only";

import { MEDIA_COMPACT_FIELDS } from "@/features/media/server/media.documents";

/**
 * Documents GraphQL des pages Personnage et Staff. Calqués sur `schemas/people.schema.ts`, qui
 * reste la source de vérité des formes : un champ ajouté ici sans l'être au schéma disparaît au
 * parsing.
 *
 * Les œuvres des grilles sont la **carte du catalogue** (`MediaCompactFields`), plus l'année de
 * début qui groupe les rôles d'un staff.
 */

export const CHARACTER_QUERY = /* GraphQL */ `
  query Character($id: Int, $page: Int, $perPage: Int) {
    Character(id: $id) {
      id
      name {
        full
        native
        alternative
        alternativeSpoiler
      }
      image {
        large
      }
      description(asHtml: false)
      gender
      age
      bloodType
      favourites
      dateOfBirth {
        year
        month
        day
      }
      media(sort: [POPULARITY_DESC], page: $page, perPage: $perPage) {
        pageInfo {
          total
          hasNextPage
        }
        edges {
          characterRole
          voiceActors(language: JAPANESE, sort: [RELEVANCE]) {
            id
            name {
              full
            }
            image {
              large
            }
          }
          node {
            ...MediaCompactFields
            startDate {
              year
            }
          }
        }
      }
    }
  }
  ${MEDIA_COMPACT_FIELDS}
`;

/**
 * Le staff et **ses trois listes dans la même requête**, par alias. Seule la liste de l'onglet
 * actif est demandée en entier ; les deux autres le sont en `perPage: 1`, pour savoir si elles
 * sont vides — c'est ce qui décide des onglets affichés sans dépenser un crédit de plus.
 */
export const STAFF_QUERY = /* GraphQL */ `
  query Staff(
    $id: Int
    $voicePage: Int
    $voicePerPage: Int
    $animePage: Int
    $animePerPage: Int
    $mangaPage: Int
    $mangaPerPage: Int
  ) {
    Staff(id: $id) {
      id
      name {
        full
        native
        alternative
      }
      image {
        large
      }
      description(asHtml: false)
      gender
      age
      bloodType
      favourites
      primaryOccupations
      yearsActive
      homeTown
      dateOfBirth {
        year
        month
        day
      }
      dateOfDeath {
        year
        month
        day
      }
      voiceRoles: characterMedia(
        sort: [START_DATE_DESC]
        page: $voicePage
        perPage: $voicePerPage
      ) {
        pageInfo {
          total
          hasNextPage
        }
        edges {
          characterRole
          characters {
            id
            name {
              full
            }
            image {
              large
            }
          }
          node {
            ...MediaCompactFields
            startDate {
              year
            }
          }
        }
      }
      animeRoles: staffMedia(
        type: ANIME
        sort: [START_DATE_DESC]
        page: $animePage
        perPage: $animePerPage
      ) {
        pageInfo {
          total
          hasNextPage
        }
        edges {
          staffRole
          node {
            ...MediaCompactFields
            startDate {
              year
            }
          }
        }
      }
      mangaRoles: staffMedia(
        type: MANGA
        sort: [START_DATE_DESC]
        page: $mangaPage
        perPage: $mangaPerPage
      ) {
        pageInfo {
          total
          hasNextPage
        }
        edges {
          staffRole
          node {
            ...MediaCompactFields
            startDate {
              year
            }
          }
        }
      }
    }
  }
  ${MEDIA_COMPACT_FIELDS}
`;
