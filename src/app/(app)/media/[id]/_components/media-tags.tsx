import { Badge } from "@/components/ui/badge";
import { formatGenre } from "@/features/media/lib/media-format";
import type { MediaDetail } from "@/features/media/schemas/media.schema";

type MediaTagsProps = {
  media: MediaDetail;
  /**
   * La préférence du compte (docs/PRODUCT.md §4.6). Elle filtre déjà l'œuvre **dans la requête**,
   * mais pas ses tags : AniList marque `isAdult` sur certains thèmes, et une œuvre tout public peut
   * en porter. Le réglage vaut donc aussi ici.
   */
  includeAdult: boolean;
};

/** Au-delà, la liste cesse d'être un repère et devient un mur de mots. */
const VISIBLE_TAGS = 14;

/**
 * Genres et thèmes — **deux listes, et il ne faut pas les confondre.**
 *
 * Les `genres` sont la douzaine de catégories officielles d'AniList, les mêmes que celles qui
 * filtrent la recherche ; les `tags` sont posés par la communauté, bien plus fins (« Time Loop »,
 * « Male Protagonist »), classés par un `rank` de pertinence. D'où deux traitements visuels
 * distincts : les premiers pleins, les seconds en liseré.
 *
 * **Les tags à spoiler sont repliés, jamais rendus tels quels.** AniList les marque
 * (`isMediaSpoiler`, `isGeneralSpoiler`) précisément parce que les afficher gâche l'œuvre : sur une
 * fiche qu'on ouvre justement pour décider si on la commence, « Major Character Death » posé en
 * clair est un tort qu'on ne rattrape pas. Le repli est un `<details>` natif — le geste ne demande
 * aucun JavaScript, donc pas de frontière cliente pour ouvrir un tiroir.
 */
export function MediaTags({ media, includeAdult }: MediaTagsProps) {
  const allowed = media.tags.filter((tag) => includeAdult || !tag.isAdult);

  const isSpoiler = (tag: (typeof allowed)[number]) =>
    Boolean(tag.isMediaSpoiler || tag.isGeneralSpoiler);

  // `rank` est la pertinence votée, de 0 à 100 : trier dessus met en tête ce qui décrit vraiment
  // l'œuvre, là où l'ordre d'AniList mélange les votes anecdotiques aux thèmes centraux.
  const byRank = [...allowed].sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0));

  const tags = byRank.filter((tag) => !isSpoiler(tag)).slice(0, VISIBLE_TAGS);
  const spoilers = byRank.filter(isSpoiler);

  if (media.genres.length === 0 && byRank.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-semibold text-lg">Genres et thèmes</h2>

      <div className="flex flex-wrap gap-2">
        {media.genres.map((genre) => (
          <Badge key={genre} variant="secondary">
            {formatGenre(genre)}
          </Badge>
        ))}

        {tags.map((tag) => (
          <Badge key={tag.id} variant="outline">
            {tag.name}
          </Badge>
        ))}
      </div>

      {spoilers.length > 0 ? (
        <details className="group">
          {/*
            Le résumé est une **cible de clic**, donc il porte son propre focus visible : sans
            `rounded` ni `outline-offset`, l'anneau colle au texte et se perd dans les puces juste
            au-dessus. `list-none` retire le triangle natif, dont le rendu diffère d'un navigateur
            à l'autre ; le libellé dit à lui seul ce que le geste fait.
          */}
          <summary className="w-fit cursor-pointer list-none rounded text-muted-foreground text-sm underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring-accent focus-visible:outline-offset-2">
            <span className="group-open:hidden">
              Afficher {spoilers.length} thème
              {spoilers.length > 1 ? "s" : ""} qui divulgâche
              {spoilers.length > 1 ? "nt" : ""} l'intrigue
            </span>
            <span className="hidden group-open:inline">
              Masquer les thèmes qui divulgâchent l'intrigue
            </span>
          </summary>

          <div className="mt-3 flex flex-wrap gap-2">
            {spoilers.map((tag) => (
              <Badge key={tag.id} variant="outline">
                {tag.name}
              </Badge>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}
