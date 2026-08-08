---
name: anilist-read
description: Ajouter ou modifier une lecture de l'API AniList dans ce projet — document GraphQL, schéma Zod, query cachée, budget de requêtes. Use when fetching anime/manga data, adding a GraphQL query, touching src/lib/http/anilist.ts or src/features/media/, or when asked "récupère les X depuis AniList", "ajoute le champ Y à la fiche", "affiche les tendances / la saison / le planning".
---

# Lire des données AniList

Trois fichiers, toujours dans cet ordre. Aucune étape ne se saute.

| Étape | Fichier | Rôle |
| --- | --- | --- |
| 1 | `features/<domaine>/lib/<domaine>-documents.ts` | Le document GraphQL, en constante |
| 2 | `features/<domaine>/schemas/<domaine>.schema.ts` | Le schéma Zod de la réponse |
| 3 | `features/<domaine>/server/<domaine>.queries.ts` | La lecture cachée, `import "server-only"` |

Le transport (`src/lib/http/anilist.ts`) est écrit et ne se modifie pas pour ajouter une lecture.

## La contrainte qui commande tout : 30 requêtes/minute

AniList plafonne à **30 requêtes par minute et par IP**. En production cette IP est celle du
serveur, donc **partagée par tous les visiteurs** : une lecture non cachée n'est pas une lenteur,
c'est une panne en puissance.

Deux conséquences non négociables :

- **Ne jamais appeler `anilistQuery` depuis un composant, une page ou une Server Action.**
  Uniquement depuis une fonction de `server/*.queries.ts` qui porte le `"use cache"`.
- **Toute nouvelle lecture porte un `"use cache"` et un `cacheLife`.** Sans exception. Une lecture
  « juste pour tester » qui part sans cache est un incident.

## 1. Le document GraphQL

```ts
export const SEASON_MEDIA_QUERY = /* GraphQL */ `
  query SeasonMedia($season: MediaSeason!, $seasonYear: Int!, $page: Int!) {
    Page(page: $page, perPage: 50) {
      pageInfo { total currentPage lastPage hasNextPage }
      media(season: $season, seasonYear: $seasonYear, type: ANIME) {
        id
        title { romaji english native userPreferred }
        coverImage { extraLarge large medium color }
      }
    }
  }
`;
```

- **Jamais d'interpolation dans la query.** Tout passe par `variables`. Une valeur interpolée
  échappe à la validation et casse la clé de cache.
- Le commentaire `/* GraphQL */` n'est pas décoratif : il déclenche la coloration et le
  formatage de la chaîne.
- **Demander le strict nécessaire.** Chaque champ ajouté à une query de liste est payé sur
  toutes les cartes. Les champs lourds (`description`, `relations`, `characters`, `staff`,
  `externalLinks`) n'ont leur place que dans la query de fiche détail.

Le schéma de l'API se lit sur <https://docs.anilist.co> ou dans l'explorateur GraphQL
<https://anilist.co/graphiql>.

## 2. Le schéma Zod

Il vit dans `schemas/` et **il est la source unique du type**. On ne redéclare jamais une forme
AniList à la main : `z.infer` s'en charge.

```ts
export const seasonMediaDataSchema = z.object({
  Page: z.object({
    pageInfo: pageInfoSchema,
    media: z.array(mediaSchema),
  }),
});
```

- Réutiliser les briques déjà écrites dans `media.schema.ts` (`mediaSchema`, `pageInfoSchema`,
  les énumérations `mediaTypeSchema`, `mediaFormatSchema`, `mediaStatusSchema`…) plutôt que d'en
  recréer des variantes.
- **AniList renvoie `null` partout.** Presque tous les champs sont `nullable()` — un titre
  anglais absent, une date incomplète, une cover manquante sont des cas normaux, pas des erreurs.
- Le schéma décrit le champ `data` de la réponse, pas l'enveloppe : `anilistQuery` a déjà validé
  et déballé l'enveloppe GraphQL.

## 3. La query cachée

```ts
import "server-only";
import { cacheLife, cacheTag } from "next/cache";

export async function getSeasonMedia(input: SeasonMediaInput) {
  // La validation d'entrée est HORS du cache : la clé de cache est la sérialisation des
  // arguments, donc appliquer les défauts à l'intérieur créerait deux entrées pour un même
  // résultat ({ season } et { season, page: 1 }).
  return getSeasonMediaCached(seasonMediaInputSchema.parse(input));
}

async function getSeasonMediaCached(params: SeasonMediaParams) {
  "use cache";
  cacheLife("hours");
  cacheTag(MEDIA_CACHE_TAG);

  const data = await anilistQuery({
    query: SEASON_MEDIA_QUERY,
    variables: params,
    schema: seasonMediaDataSchema,
  });

  return { pageInfo: data.Page.pageInfo, media: data.Page.media };
}
```

Les deux règles à respecter, déjà appliquées dans `media.queries.ts` :

1. **La validation d'entrée est hors du cache** (voir le commentaire ci-dessus).
2. **Le filtrage lié à l'utilisateur est hors du cache.** L'entrée mémorisée est la donnée
   AniList brute ; une préférence de compte (contenu adulte, langue des titres) s'applique
   **après**, sinon le cache est dupliqué par utilisateur et ne sert plus à rien.

Choisir le `cacheLife` selon la volatilité réelle :

| Donnée | `cacheLife` |
| --- | --- |
| Fiche d'une œuvre terminée | `"days"` |
| Recherche, tendances, classements, saison | `"hours"` |
| Planning de diffusion (`airingSchedule`) | `"minutes"` |

Et poser les `cacheTag` : `MEDIA_CACHE_TAG` sur toute lecture du catalogue, plus
`mediaCacheTag(id)` sur une fiche précise, pour pouvoir invalider finement.

## Gestion des erreurs

`anilistQuery` lève une `AniListError` normalisée. Les deux cas à traiter :

- `error.isNotFound` → renvoyer `null` **depuis l'intérieur du cache**, pour mémoriser la réponse
  négative et ne pas rejouer la requête à chaque visite d'une URL erronée. La page traduit ce
  `null` en `notFound()`.
- `error.isRateLimited` → ne **pas** réessayer. La fenêtre de quota dure une minute, l'attendre
  dépasserait le délai de remplissage d'un `"use cache"`. L'erreur remonte ; le cache est là
  précisément pour qu'on n'y arrive jamais.

## Quand la base de données existera

Lire d'abord `docs/PRODUCT.md` §4.1. Le principe : les champs qui servent à afficher une carte et
à trier viennent du **miroir local** (`Media` en base), pas d'AniList. AniList n'est interrogé que
pour remplir ce miroir, et à la volée pour les champs lourds de la fiche détail.

Une nouvelle lecture qui parcourt la bibliothèque ou une liste de l'utilisateur **ne doit pas**
passer par AniList : elle interroge la base.

## Checklist avant de considérer la lecture terminée

- [ ] Le document est une constante, sans interpolation.
- [ ] La query ne demande que les champs réellement affichés.
- [ ] Le schéma Zod réutilise les briques existantes et marque les champs `nullable()`.
- [ ] La fonction exportée valide son entrée **avant** d'entrer dans le cache.
- [ ] `"use cache"` + `cacheLife` + `cacheTag` sont posés.
- [ ] Aucun filtrage par utilisateur à l'intérieur du cache.
- [ ] `pnpm typecheck` passe.
