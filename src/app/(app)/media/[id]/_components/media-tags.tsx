import { MediaSection } from "@/app/(app)/media/[id]/_components/media-section";
import { Badge } from "@/components/ui/badge";
import { formatGenre } from "@/features/media/lib/media-format";
import type { MediaTag } from "@/features/media/schemas/media.schema";

type MediaTagsProps = {
  /** Les genres officiels, déjà bruts : `formatGenre` les traduit à l'affichage. */
  genres: string[];
  /** Les tags, **déjà filtrés et triés** par `_lib/media-panels.ts`. */
  tags: MediaTag[];
};

/**
 * L'onglet Tags : comment l'œuvre est classée, de la liste officielle au vocabulaire communautaire.
 *
 * **Il ne coûte aucune requête AniList**, et c'est le seul onglet dans ce cas. Genres et tags
 * voyagent gratuitement avec la requête de fiche — leur consacrer une lecture dépenserait un crédit
 * de quota pour redemander ce qu'on a déjà en mémoire. Les personnages, l'équipe et les
 * recommandations, eux, sont paginés chez AniList : c'est ce qui justifie qu'ils aient la leur.
 *
 * Les deux listes sont dans le même onglet parce qu'elles répondent à la même question à deux
 * granularités — *de quoi c'est fait* : cinq genres officiels, puis cinquante tags votés.
 */
export function MediaTags({ genres, tags }: MediaTagsProps) {
  /*
    **Les deux marqueurs de spoiler comptent, pas seulement `isMediaSpoiler`.** `isGeneralSpoiler`
    dit que le tag divulgue quelque chose *en soi* — il gâche l'œuvre où qu'il apparaisse —, tandis
    que `isMediaSpoiler` ne vaut que pour cette fiche-ci. Ne respecter que le second laisserait
    passer les pires.
  */
  const safeTags = tags.filter(
    (tag) => !(tag.isMediaSpoiler || tag.isGeneralSpoiler),
  );
  const spoilerTags = tags.filter(
    (tag) => tag.isMediaSpoiler || tag.isGeneralSpoiler,
  );

  return (
    <div className="flex flex-col gap-8">
      {genres.length > 0 ? (
        <MediaSection title="Genres">
          <ul className="flex flex-wrap gap-2">
            {genres.map((genre) => (
              <li key={genre}>
                {/*
                  `secondary` pour les genres, `outline` pour les tags : la liste officielle est
                  courte et structurante, le vocabulaire communautaire est long et indicatif. Deux
                  matières plutôt qu'une seule répétée cinquante fois, sinon les cinq genres se
                  perdent dans la masse des tags juste en dessous.
                */}
                <Badge variant="secondary">{formatGenre(genre)}</Badge>
              </li>
            ))}
          </ul>
        </MediaSection>
      ) : null}

      {tags.length > 0 ? (
        <MediaSection title="Tags">
          <TagList tags={safeTags} />

          {spoilerTags.length > 0 ? (
            /*
              **Le repli est une obligation, pas une commodité.** AniList marque ces tags parce
              qu'ils divulguent l'intrigue, et les afficher au même titre que les autres ferait de
              la fiche d'une œuvre qu'on s'apprête à commencer le pire endroit du site. `<details>`
              natif, comme le repli des œuvres liées : le navigateur sait le faire sans JavaScript.

              Le libellé dit **ce qu'on risque**, pas « voir plus ». Un repli dont on ne sait pas ce
              qu'il cache est un piège quand ce qu'il cache est précisément ce qu'on voulait éviter.
            */
            <details className="group mt-3">
              <summary className="w-fit cursor-pointer list-none rounded-md py-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
                <span className="group-open:hidden">
                  Afficher les {spoilerTags.length} tags qui divulguent
                  l'intrigue
                </span>
                <span className="hidden group-open:inline">
                  Masquer les tags qui divulguent l'intrigue
                </span>
              </summary>

              <div className="mt-2">
                <TagList tags={spoilerTags} />
              </div>
            </details>
          ) : null}
        </MediaSection>
      ) : null}
    </div>
  );
}

/**
 * Une liste de tags avec leur pertinence.
 *
 * **Les noms restent en anglais, et c'est assumé.** Les genres ont une table de traduction parce
 * qu'ils sont dix-neuf et fermés (`media-format.ts`) ; les tags sont plusieurs centaines, ouverts,
 * et alimentés par la communauté — une table serait périmée à la semaine et rendrait invisible tout
 * tag ajouté depuis. Mieux vaut « Time Manipulation » lisible qu'un vide.
 */
function TagList({ tags }: { tags: MediaTag[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <li key={tag.id}>
          <Badge className="gap-1.5 font-normal" variant="outline">
            {tag.name}
            {/*
              La pertinence en second rang, en atténué : c'est une précision sur le tag, pas une
              partie de son nom. Un `rank` nul est tu plutôt qu'affiché « 0 % » — la différence
              entre « personne n'a voté » et « tout le monde a voté contre » n'existe pas chez
              AniList.
            */}
            {tag.rank ? (
              <span className="text-muted-foreground">{tag.rank} %</span>
            ) : null}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
