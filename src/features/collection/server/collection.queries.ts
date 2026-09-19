import "server-only";

import type { CollectionState } from "@/features/collection/lib/collection-params";
import {
  formatVolumeRanges,
  resolveVolumesTotal,
  volumeGaps,
} from "@/features/collection/lib/volume-ranges";
import {
  compactFromMirror,
  MIRRORED_MEDIA_SELECT,
} from "@/features/media/lib/media-format";
import type { MediaCompact } from "@/features/media/schemas/media.schema";
import { getMediaDetailFromMirror } from "@/features/media/server/media.mirror";
import { getMediaById } from "@/features/media/server/media.queries";
import { getPreferences } from "@/features/preferences/server/preferences.queries";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

/**
 * Les lectures de l'étagère — **mes lignes `OwnedVolume`, jamais AniList.**
 *
 * Rien de ce qui est ici ne vient d'une API : AniList n'a aucune donnée au niveau du tome
 * (docs/PRODUCT.md §9), donc l'étagère est entièrement en base. C'est le seul écran du produit
 * dans ce cas, et c'est ce qui le rend gratuit — aucun quota, aucun repli de panne à prévoir.
 *
 * **Aucun `"use cache"` dans ce fichier, et ce n'est pas un oubli** : `OwnedVolume` est personnel,
 * mémoriser une étagère la servirait d'un compte à l'autre. Même raisonnement que
 * `library.queries.ts`.
 *
 * `Edition`, elle, est **partagée entre les comptes** (§4.5) : ce qui rend une édition mienne,
 * c'est d'y avoir au moins un tome. D'où le `where` sur `volumes.some`, et non sur un propriétaire
 * d'édition qui n'existe pas.
 */

/**
 * Le compte courant, pour un écran qui vit **sous la garde du layout**.
 *
 * Même règle que `library.queries.ts` : `requireApprovedUser()` est appelée une fois et une seule
 * dans `app/(app)/layout.tsx`. Arriver ici sans session est un défaut de câblage, pas un cas à
 * traiter en silence — renvoyer une étagère vide le masquerait le jour où il compte.
 */
async function currentUserId(): Promise<string> {
  const session = await getSession();

  if (!session) {
    throw new Error(
      "Lecture de collection hors de la garde de `app/(app)/layout.tsx`.",
    );
  }

  return session.user.id;
}

/**
 * Le libellé de l'édition créée en silence à la première saisie (§4.5).
 *
 * Il est **partagé** : `Edition` l'est aussi, et son unicité porte sur `(mediaId, label)`. Deux
 * membres du cercle qui commencent la même série tombent donc sur la même ligne, ce qui est le
 * but — sans quoi la comparaison entre étagères serait impossible.
 *
 * Exporté parce que l'action l'écrit et que cette lecture le rend avant qu'il existe : deux
 * définitions divergeraient et créeraient une seconde édition fantôme au premier clic.
 */
export const DEFAULT_EDITION_LABEL = "Édition standard";

/** Une série de l'étagère, trous calculés. */
export type ShelfSeries = {
  media: MediaCompact;
  edition: {
    id: string;
    label: string;
    publisher: string | null;
    /**
     * Le total **résolu** : la saisie manuelle, sinon le `volumes` d'AniList
     * (`resolveVolumesTotal`). `null` quand ni l'un ni l'autre ne sait — le cas d'une série en
     * cours de parution, qu'AniList ne compte qu'une fois terminée (§9).
     */
    volumesTotal: number | null;
  };
  ownedNumbers: number[];
  ownedCount: number;
  missing: number[];
  /** Les manquants en une phrase : `11, 12, 29, 63 → 110`. */
  missingLabel: string;
  /** Les tomes possédés au-delà du total déclaré — voir `volumeGaps`. */
  extra: number[];
  isComplete: boolean;
  /**
   * Le plus haut tome possédé, ou `null` sur une étagère vierge.
   *
   * **C'est l'information de la librairie.** Devant un présentoir, le rayon dit déjà quels tomes
   * existent ; ce que l'app doit dire, c'est où l'on s'est arrêté. Sur une série en cours, dont
   * aucune source ne connaît le total (§9), c'est même la **seule** chose utile qu'on puisse
   * afficher — et elle ne coûte rien.
   */
  lastOwned: number | null;
  /**
   * La parution continue-t-elle ?
   *
   * Sur une série en cours, « complète » est un mensonge à retardement : un total saisi l'an
   * dernier vieillit en silence, et l'écran finit par affirmer qu'il ne manque rien alors qu'un
   * tome est paru depuis. On dit donc « à jour » plutôt que « complète ».
   */
  isReleasing: boolean;
};

/**
 * Ce que la base rend pour une édition de mon étagère, avant calcul des trous.
 *
 * Les tomes sont **imbriqués et filtrés sur moi** : sans le `where`, une édition partagée
 * ramènerait les tomes des trois autres comptes, et l'étagère afficherait la leur.
 */
const SHELF_EDITION_SELECT = {
  id: true,
  label: true,
  publisher: true,
  volumesTotal: true,
  /*
    `volumes` s'ajoute au select partagé du miroir : c'est le nombre de tomes qu'AniList donne pour
    la série, et il sert de valeur de repli au total de l'édition (`resolveVolumesTotal`). Il n'est
    pas ajouté à `MIRRORED_MEDIA_SELECT` lui-même — les quatre autres écrans qui lisent le miroir
    n'en ont rien à faire.
  */
  media: { select: { ...MIRRORED_MEDIA_SELECT, volumes: true } },
} as const;

function toShelfSeries(edition: {
  id: string;
  label: string;
  publisher: string | null;
  volumesTotal: number | null;
  media: Parameters<typeof compactFromMirror>[0] & { volumes: number | null };
  volumes: { number: number }[];
}): ShelfSeries {
  const ownedNumbers = edition.volumes.map((volume) => volume.number);

  /*
    Le total est **résolu ici, à chaque lecture**, et jamais recopié en base : c'est ce qui fait
    qu'une série en cours — pour laquelle AniList répond `null` — prend son vrai nombre de tomes
    toute seule le jour où la parution se termine.
  */
  const volumesTotal = resolveVolumesTotal(
    edition.volumesTotal,
    edition.media.volumes,
  );
  const { missing, extra, isComplete } = volumeGaps(ownedNumbers, volumesTotal);

  return {
    media: compactFromMirror(edition.media),
    edition: {
      id: edition.id,
      label: edition.label,
      publisher: edition.publisher,
      volumesTotal,
    },
    ownedNumbers,
    ownedCount: ownedNumbers.length,
    missing,
    missingLabel: formatVolumeRanges(missing),
    extra,
    isComplete,
    lastOwned: ownedNumbers.length > 0 ? Math.max(...ownedNumbers) : null,
    isReleasing: edition.media.status === "RELEASING",
  };
}

/**
 * Mon étagère entière, une entrée par édition possédée.
 *
 * **Le filtre « complètes / incomplètes » se calcule ici et non en `where`**, contrairement à ce
 * que fait `/library` pour ses statuts. « Complète » n'est pas une colonne : c'est la comparaison
 * entre le nombre de tomes possédés et le `volumesTotal` de l'édition, avec les trous au milieu.
 * SQL saurait compter, mais pas distinguer « j'ai 29 tomes sur 30 » de « j'ai les tomes 1 à 29 et
 * il me manque le 16 » — or c'est exactement la distinction que cet écran existe pour faire.
 *
 * Le coût est borné par la nature du produit : quatre comptes, quelques dizaines de séries
 * chacun. Le jour où une étagère en compterait mille, ce serait une colonne dénormalisée, pas une
 * requête plus habile.
 */
export async function getShelf(state: CollectionState): Promise<ShelfSeries[]> {
  const userId = await currentUserId();

  const editions = await prisma.edition.findMany({
    where: { volumes: { some: { userId } } },
    select: {
      ...SHELF_EDITION_SELECT,
      volumes: {
        where: { userId },
        select: { number: true },
        orderBy: { number: "asc" },
      },
    },
    /*
      Le tri est sur le titre romaji, pas sur la date d'ajout : une étagère se parcourt comme un
      rayon, et un rayon est rangé. `titleRomaji` plutôt que le titre préféré du compte parce que
      c'est la seule colonne toujours remplie — `titleEnglish` est souvent nul.
    */
    orderBy: { media: { titleRomaji: "asc" } },
  });

  const shelf = editions.map(toShelfSeries);

  if (state === "incomplete") return shelf.filter((one) => !one.isComplete);
  if (state === "complete") return shelf.filter((one) => one.isComplete);
  return shelf;
}

/** Les chiffres de l'en-tête, et les compteurs de la rangée d'états. */
export type ShelfSummary = {
  seriesCount: number;
  volumeCount: number;
  completeCount: number;
  missingCount: number;
};

/**
 * Les chiffres de l'étagère — PRODUCT.md §8 item 12.
 *
 * Elle prend l'étagère déjà lue plutôt que de la relire : la page en a besoin des deux côtés, et
 * compter deux fois la même chose laisserait un jour les deux se contredire.
 *
 * **Le budget cumulé n'y est pas**, et c'est une décision : `price` n'est plus rempli par aucun
 * écran depuis le 19 septembre 2026. Une somme toujours nulle serait un chiffre faux.
 */
export function summarizeShelf(shelf: ShelfSeries[]): ShelfSummary {
  return {
    seriesCount: shelf.length,
    volumeCount: shelf.reduce((sum, series) => sum + series.ownedCount, 0),
    completeCount: shelf.filter((series) => series.isComplete).length,
    missingCount: shelf.reduce((sum, series) => sum + series.missing.length, 0),
  };
}

/**
 * Une série, pour `/collection/[mediaId]`.
 *
 * **Elle répond même sur une œuvre absente de l'étagère — et même absente du miroir.** C'est ce
 * qui rend l'écran utilisable : arriver sur `/collection/<id>` d'un manga qu'on vient d'acheter
 * doit donner une grille vide où cocher, pas une page introuvable. L'édition par défaut est créée
 * à la première case cochée (§4.5), par l'action et non par cette lecture — une lecture n'écrit
 * pas, et c'est l'action qui appelle `ensureMediaMirror`.
 */
export async function getSeriesShelf(
  mediaId: number,
): Promise<ShelfSeries | null> {
  /*
    **Le segment d'URL est borné ici, avant toute requête.** `Number("abc")` rend `NaN`, et Prisma
    **lève** sur un `NaN` passé à une colonne entière — une exception, donc une page d'erreur, là
    où `/collection/abc` doit simplement être introuvable. Le garder au bord de la lecture protège
    tous les appelants d'un coup, `generateMetadata` compris, qui appelait aussi avec `NaN`.
  */
  if (!Number.isInteger(mediaId) || mediaId <= 0) return null;

  const userId = await currentUserId();

  /*
    L'édition par défaut, ou celle où j'ai des tomes. Il n'y en a qu'une dans les faits — le
    sélecteur multi-éditions n'est pas construit (docs/STATE.md) —, d'où le `findFirst` plutôt
    qu'une liste : `isDefault` d'abord garantit qu'on prend toujours la même.

    Elle peut exister sans que je possède un seul tome : `Edition` est **partagée** (§4.5), donc
    un autre membre du cercle a pu la créer. Le `where` imbriqué ne ramène alors aucun tome, et
    l'écran affiche une grille vide — ce qui est exact.
  */
  const edition = await prisma.edition.findFirst({
    where: { mediaId },
    select: {
      ...SHELF_EDITION_SELECT,
      volumes: {
        where: { userId },
        select: { number: true },
        orderBy: { number: "asc" },
      },
    },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  if (edition) return toShelfSeries(edition);

  /*
    **Aucune édition : l'œuvre peut n'être nulle part en local, et c'est le cas normal.**

    Corrigé le 19 septembre 2026, après un « Série introuvable » rapporté par Alexis. Cette
    lecture ne regardait que le miroir, or le miroir ne contient que ce que quelqu'un a déjà
    suivi ou que la graine a importé. Toute série qu'on vient d'acheter sans la suivre — donc
    précisément celle qu'on veut poser sur l'étagère — répondait 404, alors que sa fiche
    s'affichait très bien juste à côté.

    L'ordre des deux sources est **l'inverse de celui de la fiche**, et c'est délibéré : là-bas
    AniList fait autorité et le miroir est le repli de panne ; ici le miroir passe d'abord parce
    qu'il est gratuit et qu'une série qu'on possède y est presque toujours. AniList n'est
    interrogé que pour l'œuvre qu'on découvre, une fois, et sa réponse est mémorisée.

    La préférence de contenu adulte est passée aux deux : une œuvre refusée par l'une doit l'être
    par l'autre, sinon le repli devient un contournement.
  */
  const { includeAdult } = await getPreferences();

  const media =
    (await getMediaDetailFromMirror(mediaId, { includeAdult })) ??
    (await getMediaById(mediaId, { includeAdult }));

  /*
    `null` est donc réservé à l'œuvre qu'aucune des deux sources ne connaît, et à celle qui n'est
    pas un imprimé : on ne collectionne pas les tomes d'un anime.
  */
  if (media?.type !== "MANGA") return null;

  return {
    media,
    edition: {
      id: "",
      label: DEFAULT_EDITION_LABEL,
      publisher: null,
      volumesTotal: resolveVolumesTotal(null, media.volumes),
    },
    ownedNumbers: [],
    ownedCount: 0,
    missing: [],
    missingLabel: "",
    extra: [],
    isComplete: false,
    lastOwned: null,
    isReleasing: media.status === "RELEASING",
  };
}
