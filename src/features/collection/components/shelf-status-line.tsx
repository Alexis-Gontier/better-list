import { formatVolumeRanges } from "@/features/collection/lib/volume-ranges";
import { cn } from "@/lib/utils";

/**
 * **La phrase qui répond à « il me manque lesquels ? »** — une seule définition pour les trois
 * endroits qui la posaient.
 *
 * Elle était écrite trois fois le 19 septembre 2026 : dans la rangée de `/collection`, dans
 * l'en-tête d'une série, et dans le tableau des tomes. Les trois avaient déjà divergé, et aucune
 * ne savait dire le cas des tomes au-delà du total. C'est la phrase, pas la réglette, qui porte la
 * réponse de l'écran (docs/conception.md §8 item 8) : elle mérite un seul endroit.
 *
 * **Elle est écrite pour être lue debout dans un rayon** (décision d'Alexis, 19 septembre 2026).
 * Le retournement qui la gouverne : en librairie, le présentoir dit déjà quels tomes existent, donc
 * l'app n'a pas besoin de connaître le total pour être utile. Ce qu'elle doit dire, c'est **où je
 * me suis arrêté** et **quels trous j'ai au milieu** — deux choses qui se calculent sans aucune
 * source, y compris sur une série en cours dont AniList ignore tout (§9).
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
  lastOwned,
  isReleasing,
  className,
}: {
  ownedCount: number;
  /** Le total **résolu** : saisie manuelle, sinon AniList. `null` quand personne ne sait. */
  volumesTotal: number | null;
  missing: number[];
  /** Les tomes possédés au-delà du total déclaré — voir `volumeGaps`. */
  extra: number[];
  isComplete: boolean;
  /** Le plus haut tome possédé. C'est l'information de la librairie. */
  lastOwned: number | null;
  /** La parution continue-t-elle ? Décide entre « complète » et « à jour ». */
  isReleasing: boolean;
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
    /*
      **« À jour » et non « complète » sur une série en cours.** Le total d'une série qui paraît
      encore est une photo qui vieillit : saisi à vingt tomes l'an dernier, il fait dire à l'écran
      qu'il ne manque rien alors que le trente et unième est en rayon. Le mot doit porter ce
      doute, sinon c'est l'écran qui ment à la place de la donnée.
    */
    return (
      <p className={cn("text-muted-foreground", className)}>
        {isReleasing
          ? `À jour au tome ${volumesTotal} — la parution continue.`
          : `Série complète, ${volumesTotal} tomes.`}
      </p>
    );
  }

  if (missing.length > 0) {
    return (
      <p className={className}>
        <span className="text-muted-foreground">Il me manque : </span>
        <span className="tabular-nums">{formatVolumeRanges(missing)}</span>
        {/*
          Le dernier tome possédé n'est ajouté **que** lorsque le total est inconnu. Quand il est
          connu, la liste des manquants se termine déjà par la traîne — « 63 → 110 » dit où l'on
          s'est arrêté, et le répéter allongerait la seule ligne qu'on lit d'un coup d'œil.
        */}
        {volumesTotal === null && lastOwned !== null ? (
          <span className="text-muted-foreground">
            {" · j'ai jusqu'au "}
            <span className="tabular-nums">{lastOwned}</span>
          </span>
        ) : null}
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
    manque » — on n'en sait rien —, et ce n'est pas non plus « parution en cours », qui était vrai
    et sans usage devant un présentoir. C'est **où je me suis arrêté**, la seule chose dont on ait
    besoin quand le rayon en face dit le reste.
  */
  return (
    <p className={cn("text-muted-foreground", className)}>
      J'ai jusqu'au tome{" "}
      <span className="tabular-nums text-foreground">{lastOwned}</span>, sans
      trou.
    </p>
  );
}
