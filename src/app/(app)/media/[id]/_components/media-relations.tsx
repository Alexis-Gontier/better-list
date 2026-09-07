import Image from "next/image";
import Link from "next/link";

import type { RelationGroup } from "@/app/(app)/media/[id]/_lib/media-related";
import { routes } from "@/config/routes";
import {
  formatMediaFormat,
  mediaTitle,
} from "@/features/media/lib/media-format";
import type { MediaCompact } from "@/features/media/schemas/media.schema";
import type { TitleLanguage } from "@/features/preferences/schemas/preferences.schema";

type MediaRelationsProps = {
  /** Déjà groupées, ordonnées et filtrées par `relatedMedia` — voir `_lib/media-related.ts`. */
  groups: RelationGroup[];
  titleLanguage: TitleLanguage;
};

/**
 * Les œuvres liées — **la vraie raison d'ouvrir cet onglet.**
 *
 * Un anime pointe vers le manga dont il est tiré, une saison vers la précédente, une série vers son
 * film récapitulatif. C'est la seule donnée de la fiche qui répond à une question qu'on se pose
 * vraiment souvent : *dans quel ordre ?*
 *
 * **Des cartes couchées, et pas la vignette du catalogue** — corrigé à l'écran le 7 septembre 2026.
 * La première version groupait les jaquettes sous un titre par nature de lien ; à l'usage, une
 * franchise donne cinq groupes d'une seule œuvre, donc cinq titres de section pour cinq vignettes,
 * et une colonne deux fois plus haute que son contenu. La nature du lien est donc **portée par la
 * carte**, en surtitre, et l'ordre des groupes survit dans l'ordre des cartes : l'information de
 * regroupement est gardée, sa mise en page abandonnée.
 *
 * L'autre gain est le titre : couché, il tient sur deux lignes au lieu d'être coupé à quinze
 * caractères — or « Frieren: Beyond Jo… » deux fois de suite ne distingue pas une suite de son
 * manga.
 *
 * Aucune requête de plus : `relations` arrive dans la même réponse que le reste de la fiche
 * (docs/fiche-media.md §1.1).
 */
export function MediaRelations({ groups, titleLanguage }: MediaRelationsProps) {
  if (groups.length === 0) return null;

  // À plat, mais dans l'ordre des groupes : l'intitulé voyage avec chaque œuvre.
  const relations = groups.flatMap((group) =>
    group.items.map((item) => ({ label: group.label, item })),
  );

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-semibold text-lg">Œuvres liées</h2>

      <ul className="grid gap-3 sm:grid-cols-2">
        {relations.map(({ label, item }) => (
          <li key={`${label}-${item.id}`}>
            <RelationCard
              item={item}
              label={label}
              titleLanguage={titleLanguage}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function RelationCard({
  item,
  label,
  titleLanguage,
}: {
  item: MediaCompact;
  label: string;
  titleLanguage: TitleLanguage;
}) {
  const cover = item.coverImage?.large ?? item.coverImage?.extraLarge ?? null;
  const title = mediaTitle(item.title, titleLanguage);
  const format = formatMediaFormat(item.format);

  return (
    /*
      **Pas de préchargement**, comme sur la carte du catalogue et pour la même raison : chaque
      `/media/[id]` préchargé exécute une `generateMetadata` qui interroge AniList, et une fiche de
      franchise affiche facilement dix liens. Ce qu'on perd est une navigation un peu moins
      instantanée ; ce qu'on garde est le quota (`media-card.tsx`).
    */
    <Link
      className="flex h-full items-center gap-3 rounded-lg border p-2 transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring-accent focus-visible:outline-offset-2"
      href={routes.media(item.id)}
      prefetch={false}
    >
      <div className="relative h-18 w-12 shrink-0 overflow-hidden rounded bg-muted shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]">
        {cover ? (
          <Image
            alt=""
            className="object-cover"
            fill
            sizes="48px"
            src={cover}
          />
        ) : null}
      </div>

      <div className="flex min-w-0 flex-col gap-0.5">
        {/*
          Le lien en surtitre, dans la graisse des intitulés du panneau de référence : c'est lui
          qu'on balaie du regard quand on cherche « la suite », et il doit se lire avant le titre.
        */}
        <p className="font-medium text-muted-foreground text-[0.6875rem] uppercase tracking-[0.12em]">
          {label}
        </p>

        {/*
          Deux lignes, contrairement à la vignette du catalogue : ici la hauteur des cartes est
          fixée par la jaquette couchée, donc un titre long ne désaligne plus rien — l'argument qui
          imposait la troncature dans la grille ne s'applique pas.
        */}
        <p className="line-clamp-2 font-medium text-sm" title={title}>
          {title}
        </p>

        {format ? (
          <p className="text-muted-foreground text-xs">{format}</p>
        ) : null}
      </div>
    </Link>
  );
}
