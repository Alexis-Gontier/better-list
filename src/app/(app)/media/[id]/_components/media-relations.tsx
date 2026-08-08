import { MediaSection } from "@/app/(app)/media/[id]/_components/media-section";
import { MediaCard } from "@/features/media/components/media-card";
import {
  formatMediaFormat,
  formatMediaStatus,
} from "@/features/media/lib/media-format";
import type { MediaDetail } from "@/features/media/schemas/media.schema";

/**
 * Les œuvres liées : suites, préquelles, adaptations, spin-offs.
 *
 * C'est la matière première de l'ordre de visionnage d'une franchise (docs/PRODUCT.md §8) — le
 * problème que personne ne résout bien et dont la donnée est déjà là. On les **groupe par type de
 * lien** plutôt que de les aligner : sur une franchise fournie, une grille de vingt jaquettes où
 * suites et adaptations se mélangent ne répond à aucune question. Le calcul d'un ordre viendra
 * plus tard.
 */

/**
 * `relationType` est une énumération AniList sans libellé lisible. Les valeurs absentes de cette
 * table retombent sur le brut plutôt que de disparaître — le catalogue en gagne parfois.
 */
const RELATION_LABELS: Record<string, string> = {
  SEQUEL: "Suites",
  PREQUEL: "Préquelles",
  PARENT: "Œuvre parente",
  SIDE_STORY: "Histoires parallèles",
  SPIN_OFF: "Spin-offs",
  ADAPTATION: "Adaptations",
  ALTERNATIVE: "Versions alternatives",
  SUMMARY: "Résumés",
  CHARACTER: "Personnages communs",
  OTHER: "Autres",
  SOURCE: "Œuvre d'origine",
  COMPILATION: "Compilations",
  CONTAINS: "Contient",
};

/**
 * Ordre d'affichage : la chronologie d'abord — c'est ce qu'on cherche quand on veut savoir dans
 * quel ordre regarder — puis les dérivés, puis le reste.
 */
const RELATION_ORDER = [
  "SOURCE",
  "PARENT",
  "PREQUEL",
  "SEQUEL",
  "SIDE_STORY",
  "SUMMARY",
  "ALTERNATIVE",
  "SPIN_OFF",
  "ADAPTATION",
  "COMPILATION",
  "CONTAINS",
  "CHARACTER",
  "OTHER",
];

function relationRank(type: string) {
  const index = RELATION_ORDER.indexOf(type);
  return index === -1 ? RELATION_ORDER.length : index;
}

export function MediaRelations({ media }: { media: MediaDetail }) {
  const relations = media.relations.edges.filter(
    (edge) => !edge.node.isAdult || media.isAdult,
  );

  if (relations.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Cette œuvre n'est reliée à aucune autre.
      </p>
    );
  }

  const groups = Map.groupBy(relations, (edge) => edge.relationType ?? "OTHER");

  const ordered = [...groups.entries()].sort(
    ([a], [b]) => relationRank(a) - relationRank(b),
  );

  return (
    <div className="space-y-6">
      {ordered.map(([type, edges]) => (
        <MediaSection
          id={`relations-${type.toLowerCase()}`}
          key={type}
          title={RELATION_LABELS[type] ?? type}
        >
          <ul className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {edges.map((edge) => (
              <li key={edge.node.id}>
                <MediaCard
                  media={edge.node}
                  meta={
                    [
                      formatMediaFormat(edge.node.format),
                      formatMediaStatus(edge.node.status),
                    ]
                      .filter(Boolean)
                      .join(" · ") || null
                  }
                />
              </li>
            ))}
          </ul>
        </MediaSection>
      ))}
    </div>
  );
}
