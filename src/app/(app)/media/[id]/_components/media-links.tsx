import { ExternalLinkIcon } from "lucide-react";

import { MediaSection } from "@/app/(app)/media/[id]/_components/media-section";
import { Badge } from "@/components/ui/badge";
import type { MediaDetail } from "@/features/media/schemas/media.schema";

/**
 * Liens externes, groupés par nature.
 *
 * Le streaming vient en premier : « où est-ce que je peux le regarder » (docs/PRODUCT.md §8) est
 * la question qu'on se pose vraiment depuis une fiche. Le reste — site officiel, réseaux — suit,
 * plutôt que d'être jeté : c'est de l'information gratuite, déjà chargée par la même requête.
 *
 * `type` est libre côté AniList ; les valeurs inconnues tombent dans « Autres liens » au lieu de
 * disparaître.
 */
const LINK_GROUPS: Array<{ type: string; title: string }> = [
  { type: "STREAMING", title: "Où le regarder" },
  { type: "INFO", title: "Fiches et bases de données" },
  { type: "SOCIAL", title: "Officiel et réseaux" },
];

export function MediaLinks({ media }: { media: MediaDetail }) {
  const links = media.externalLinks.filter((link) => link.url);
  if (links.length === 0) return null;

  const known = new Set(LINK_GROUPS.map((group) => group.type));

  const groups = [
    ...LINK_GROUPS.map((group) => ({
      ...group,
      links: links.filter((link) => link.type === group.type),
    })),
    {
      type: "OTHER",
      title: "Autres liens",
      links: links.filter((link) => !link.type || !known.has(link.type)),
    },
  ].filter((group) => group.links.length > 0);

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <MediaSection
          id={`liens-${group.type.toLowerCase()}`}
          key={group.type}
          title={group.title}
        >
          <ul className="flex flex-wrap gap-2">
            {group.links.map((link) => (
              <li key={link.id}>
                <Badge asChild variant="outline">
                  {/*
                    `noreferrer` autant que `noopener` : on n'a aucune raison d'annoncer aux
                    plateformes depuis quelle fiche le visiteur arrive.
                  */}
                  <a
                    href={link.url ?? "#"}
                    rel="noreferrer noopener"
                    target="_blank"
                  >
                    {link.site}
                    <ExternalLinkIcon aria-hidden="true" className="size-3" />
                  </a>
                </Badge>
              </li>
            ))}
          </ul>
        </MediaSection>
      ))}
    </div>
  );
}
