import { formatCount, formatRanking } from "@/features/media/lib/media-format";
import type {
  MediaDetail,
  MediaRanking,
} from "@/features/media/schemas/media.schema";

type MediaCommunityProps = {
  media: MediaDetail;
};

/**
 * Les chiffres d'AniList — **ceux des autres, pas les miens.**
 *
 * La distinction est la raison d'être du produit (docs/PRODUCT.md §8) : ma note vit dans la barre
 * de suivi, en haut de l'écran et sur cinq étoiles ; celle de la communauté vit ici, en pourcentage
 * et dans la colonne de référence. Les mêler dans un même bloc reviendrait à demander laquelle des
 * deux on regarde.
 *
 * **Deux classements au plus, un par nature**, et c'est une leçon de la première mise à l'écran :
 * trié par rang, Frieren affichait trois fois « #1 des mieux notés » — tous les temps, 2023,
 * automne 2023. Trois lignes pour un seul fait. On garde donc le meilleur classement *par type*,
 * ce qui donne une note et une popularité, jamais deux fois la même chose.
 */
export function MediaCommunity({ media }: MediaCommunityProps) {
  const rankings = bestRankings(media.rankings);

  const counts = [
    /*
      « Dans les listes » et non « Popularité » : `popularity` est le nombre de comptes qui ont
      l'œuvre en liste, pas un score sur cent. Le mot d'AniList laisse croire à une note.
    */
    { label: "Dans les listes", value: formatCount(media.popularity) },
    { label: "Favoris", value: formatCount(media.favourites) },
    { label: "Moyenne simple", value: percent(media.meanScore) },
  ].filter(
    (count): count is { label: string; value: string } => count.value !== null,
  );

  const average = percent(media.averageScore);

  if (!average && counts.length === 0 && rankings.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-medium text-muted-foreground text-xs uppercase tracking-[0.12em]">
        La communauté
      </h2>

      {average ? (
        /*
          La moyenne pondérée en gros chiffre, seule de son espèce : c'est la valeur qu'on vient
          chercher, et les trois autres lignes sont le contexte qui permet de la juger. Elle reste
          en `--foreground` — l'accent est réservé à l'action en cours (spec du 2 septembre).
        */
        <p className="flex items-baseline gap-2">
          <span className="font-heading font-semibold text-3xl tabular-nums">
            {average}
          </span>
          <span className="text-muted-foreground text-sm">
            de moyenne pondérée
          </span>
        </p>
      ) : null}

      {counts.length > 0 ? (
        <dl className="flex flex-col gap-2 text-sm">
          {counts.map((count) => (
            <div
              className="flex items-baseline justify-between gap-x-6"
              key={count.label}
            >
              <dt className="shrink-0 text-muted-foreground">{count.label}</dt>
              <dd className="min-w-0 text-right font-medium tabular-nums">
                {count.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {rankings.length > 0 ? (
        <ul className="flex flex-col gap-1 text-sm">
          {rankings.map((ranking) => {
            const { label, scope } = formatRanking(ranking);

            return (
              // Un classement par type, donc le type suffit à l'identifier.
              <li key={ranking.type}>
                <span className="font-medium">{label}</span>
                {/*
                  L'étendue est **en retrait et non entre parenthèses** : c'est elle qui donne son
                  poids au rang — « #1 de tous les temps » et « #1 de l'automne 2016 » ne se valent
                  pas —, et des parenthèses la feraient lire comme une note de bas de page. Même
                  choix que le détail d'une ligne de journal.
                */}
                {scope ? (
                  <span className="text-muted-foreground"> · {scope}</span>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

/**
 * Le meilleur classement de chaque nature — « des mieux notés » et « des plus populaires ».
 *
 * **« Tous les temps » l'emporte sur une saison, quel que soit le rang.** C'est le classement qui
 * situe l'œuvre dans le catalogue entier ; « #1 de l'automne 2023 » ne dit rien de ce qu'elle vaut
 * en dehors de ses trois mois. À portée égale, le meilleur rang gagne.
 */
function bestRankings(rankings: MediaRanking[]): MediaRanking[] {
  const best = new Map<MediaRanking["type"], MediaRanking>();

  for (const ranking of rankings) {
    const current = best.get(ranking.type);
    if (!current || outranks(ranking, current)) best.set(ranking.type, ranking);
  }

  // L'ordre de la table suit celui des insertions, donc celui d'AniList. On le fixe : la note
  // d'abord, la popularité ensuite, comme le gros chiffre juste au-dessus.
  return [best.get("RATED"), best.get("POPULAR")].filter(
    (ranking) => ranking !== undefined,
  );
}

function outranks(candidate: MediaRanking, current: MediaRanking): boolean {
  if (Boolean(candidate.allTime) !== Boolean(current.allTime)) {
    return Boolean(candidate.allTime);
  }

  return candidate.rank < current.rank;
}

/**
 * AniList note sur 100, et l'affiche en pourcentage. On garde son unité plutôt que de convertir
 * sur cinq étoiles comme ma note : mélanger les deux échelles ferait comparer ce qui ne se compare
 * pas — 394 000 votants et moi.
 *
 * `0` n'est pas l'absence : une œuvre notée zéro par la communauté est une information, une œuvre
 * jamais notée en est une autre. AniList renvoie `null` dans le second cas.
 */
function percent(score: number | null): string | null {
  return score === null ? null : `${score} %`;
}
