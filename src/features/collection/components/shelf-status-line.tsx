import { formatVolumeRanges } from "@/features/collection/lib/volume-ranges";
import { cn } from "@/lib/utils";

/**
 * **La phrase qui répond à « il me manque lesquels ? »** — une seule définition pour les trois
 * endroits qui la posaient.
 *
 * Elle était écrite trois fois le 19 septembre 2026 : dans la rangée de `/collection`, dans
 * l'en-tête d'une série, et dans le tableau des tomes. Les trois avaient déjà divergé — l'une
 * disait « Rien ne manque », l'autre « Nombre de tomes à renseigner » sur le même état —, et
 * aucune ne savait dire le cas des tomes au-delà du total. C'est la phrase, pas la réglette, qui
 * porte la réponse de l'écran (docs/PRODUCT.md §8 item 8) : elle mérite un seul endroit.
 *
 * **Ni client, ni server-only** : le tableau des tomes est un îlot client qui recalcule ses trous
 * à chaque clic pour son état optimiste, les deux autres appelants sont des Server Components.
 * Le composant ne prend donc que des primitives, et vit dans les deux mondes.
 */
export function ShelfStatusLine({
  ownedCount,
  volumesTotal,
  missing,
  extra,
  isComplete,
  className,
}: {
  ownedCount: number;
  /** Le total **résolu** : saisie manuelle, sinon AniList. `null` quand personne ne sait. */
  volumesTotal: number | null;
  missing: number[];
  /** Les tomes possédés au-delà du total déclaré — voir `volumeGaps`. */
  extra: number[];
  isComplete: boolean;
  className?: string;
}) {
  /*
    L'ordre des cas n'est pas indifférent : l'anomalie passe **avant** « complète », parce qu'une
    étagère qui déborde du total est complète au sens du calcul — tout ce qui est attendu est là —
    et que l'annoncer ainsi cacherait justement ce qui cloche.
  */
  if (extra.length > 0) {
    return (
      <p className={cn("text-muted-foreground", className)}>
        {ownedCount} tomes sur l'étagère pour un total de {volumesTotal} — le
        nombre de tomes de l'édition est à corriger.
      </p>
    );
  }

  if (isComplete) {
    return (
      <p className={cn("text-muted-foreground", className)}>
        Série complète, {volumesTotal} tomes.
      </p>
    );
  }

  if (missing.length > 0) {
    return (
      <p className={className}>
        <span className="text-muted-foreground">Il me manque : </span>
        <span className="tabular-nums">{formatVolumeRanges(missing)}</span>
      </p>
    );
  }

  if (ownedCount === 0) {
    return (
      <p className={cn("text-muted-foreground", className)}>
        Aucun tome sur l'étagère.
      </p>
    );
  }

  /*
    Il reste un seul état : des tomes sans trou, et aucun total connu. Ce n'est pas « rien ne
    manque » — on n'en sait rien —, c'est une série dont la parution continue. AniList donnera le
    total à la fin (§9), et d'ici là c'est la case « tome suivant » du tableau qui sert.
  */
  return (
    <p className={cn("text-muted-foreground", className)}>
      Parution en cours — le total viendra d'AniList quand elle se terminera.
    </p>
  );
}
