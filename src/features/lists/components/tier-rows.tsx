import Image from "next/image";
import Link from "next/link";

import { groupByTier, type Tier } from "@/features/lists/lib/tier-list";
import { cn } from "@/lib/utils";

/** Une jaquette de tier list, en lecture comme en édition. */
export type TierCover = {
  mediaId: number;
  cover: string | null;
  title: string;
  tierIndex: number | null;
};

/**
 * Les mesures de la maquette (lot 5, A) : étiquette de 88 px et jaquettes de 64 × 96 en 1440,
 * 56 px et 44 × 66 en 390. L'éditeur les reprend, pour qu'une tier list ait la même taille qu'on
 * l'édite ou qu'on la lise.
 */
export const TIER_COVER_CLASS =
  "relative aspect-2/3 w-11 shrink-0 overflow-hidden rounded-sm bg-muted ring-1 ring-border ring-inset sm:w-16";
export const TIER_COVERS_CLASS =
  "flex min-h-20 min-w-0 flex-1 flex-wrap content-start gap-1.5 p-1.5 sm:min-h-27";
export const TIER_COVER_SIZES = "(min-width: 640px) 64px, 44px";

/**
 * L'étiquette d'un palier : **le nom en noir sur son pastel**, quel que soit le thème. C'est
 * l'exception à D33 (spec §6) : le code visuel universel des tier lists, et la seule couleur de
 * l'interface hors jaquettes.
 */
export function TierLabel({
  tier,
  className,
}: {
  tier: Tier;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-14 shrink-0 items-center justify-center break-all p-1 text-center font-semibold text-black text-xl sm:w-22",
        className,
      )}
      style={{ backgroundColor: tier.color }}
    >
      {tier.label}
    </div>
  );
}

/**
 * Une tier list **en lecture** : la liste d'un autre membre et le lien de partage. Les mêmes
 * rangées que l'éditeur, sans poignée, sans menu et sans réserve (spec §6, « Ailleurs ») : ce qui
 * n'est pas classé n'est pas encore un avis.
 */
export function TierRows({
  tiers,
  items,
  mediaHref,
}: {
  tiers: Tier[];
  items: TierCover[];
  /** `null` sur le lien de partage : sans session, la fiche n'est pas ouverte au visiteur. */
  mediaHref: ((mediaId: number) => string) | null;
}) {
  // Deux paliers peuvent porter le même nom : la place est l'identité stable d'une rangée.
  const rows = groupByTier(tiers, items).rows.map((row, index) => ({
    ...row,
    key: `palier-${index}`,
  }));

  return (
    <div className="flex flex-col gap-0.5 overflow-hidden rounded-lg">
      {rows.map(({ tier, items: covers, key }) => (
        <section
          aria-label={`Palier ${tier.label}`}
          className="flex bg-card"
          key={key}
        >
          <TierLabel tier={tier} />
          <ul className={TIER_COVERS_CLASS}>
            {covers.map((item) => (
              <li className={TIER_COVER_CLASS} key={item.mediaId}>
                <CoverImage item={item} />
                {mediaHref ? (
                  <Link
                    aria-label={item.title}
                    className="absolute inset-0 rounded-sm focus-visible:ring-2 focus-visible:ring-ring"
                    href={mediaHref(item.mediaId)}
                    title={item.title}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function CoverImage({
  item,
}: {
  item: Pick<TierCover, "cover" | "title">;
}) {
  return item.cover ? (
    <Image
      alt=""
      className="object-cover"
      fill
      sizes={TIER_COVER_SIZES}
      src={item.cover}
      title={item.title}
    />
  ) : null;
}
