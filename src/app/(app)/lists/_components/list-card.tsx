import { LinkIcon } from "lucide-react";
import Link from "next/link";
import { routes } from "@/config/routes";
import { ListCoverMosaic } from "@/features/lists/components/list-cover-mosaic";
import { listHeadline } from "@/features/lists/lib/list-labels";
import type { ListSummary } from "@/features/lists/server/lists.queries";

/**
 * La carte d'une liste : son aperçu, son nom, ce qu'elle dit d'elle, et ce qu'elle contient.
 *
 * Composant **serveur**, et **sans aucun geste** : décision d'Alexis du 6 septembre 2026, prise à
 * l'écran. Un menu à trois points y avait été posé, dans le coin de la mosaïque ; il tombait sur la
 * quatrième jaquette, et il donnait à une grille de consultation deux façons d'agir au lieu d'une.
 * Renommer et supprimer vivent donc dans la barre d'actions de `/lists/[id]` — là où la spec du
 * 2 septembre les mettait, et là où l'on est déjà quand on décide du sort d'une liste.
 *
 * Conséquence : **toute la grille reste serveur**, sans un octet de JavaScript. Le seul îlot client
 * de l'écran est le bouton « Nouvelle liste » de l'en-tête.
 *
 * **Elle est cliquable vers `/lists/[id]`, qui n'est encore qu'un placeholder.** C'est délibéré :
 * la route répond, et une carte inerte serait un mensonge à retirer une passe plus tard. Le dépôt
 * vient précisément de retirer deux boutons morts pour cette raison.
 *
 * `prefetch` reste au défaut, contrairement à `MediaCard` : ce qu'il précharge est `/lists/[id]`,
 * qui lit la base et n'appelle pas AniList. Il n'y a donc pas de quota à protéger, et une poignée
 * de cartes ne fait pas une grille de vingt et une.
 */
export function ListCard({ list }: { list: ListSummary }) {
  return (
    /*
      Le lien **est** la case de la grille, sans enveloppe : celle-ci n'existait que pour ancrer le
      menu en position absolue, et elle est partie avec lui. La grille étire donc directement le
      lien à la hauteur de sa rangée, ce qui donne au `mt-auto` du décompte l'espace qu'il absorbe.
    */
    <Link
      /*
        **Couchée sur téléphone, debout dès `sm`.** Debout en une colonne, une carte prenait 360 px
        et l'écran ne montrait qu'une liste ; couchée, il en montre trois ou quatre. Le contour vient
        du jeton `border` : codé en blanc, il disparaissait en thème clair.
      */
      className="flex gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/40 sm:flex-col"
      href={routes.lists.detail(list.id)}
    >
      {/*
        **La mosaïque est rendue même sans jaquette** — décision d'Alexis du 6 septembre 2026, prise
        à l'écran. Une liste vide montre donc quatre cases vides plutôt qu'un bloc en pointillés :
        toutes les cartes de la grille ont alors exactement la même charpente, et c'est le décompte
        qui dit « Aucune œuvre ». Un bloc de remplacement aurait donné une deuxième silhouette de
        carte à tenir, pour une phrase que la ligne du bas dit déjà.

        C'est aussi ce qui rend lisible la liste entièrement 18+ d'une préférence qui la masque :
        elle a la même mosaïque vide, et son décompte la distingue.
      */}
      <ListCoverMosaic covers={list.covers} empty={list.itemCount === 0} />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {/*
          Le titre tient sur une ligne, coupé au besoin — la décision de `MediaCard` du 6 septembre,
          et pour la même raison : sur deux lignes, la hauteur des cartes varierait d'une rangée à
          l'autre selon la longueur des titres. Le titre complet reste dans l'infobulle native.
        */}
        <h2 className="truncate font-medium" title={list.title}>
          {list.title}
        </h2>

        {/*
          **Rien du tout quand il n'y a pas de description**, et pas une place réservée. Deux lignes
          gardées vides avaient été essayées d'abord, pour aligner les cartes ; c'était inutile — la
          grille étire déjà les cartes d'une même rangée à la même hauteur — et franchement mauvais
          en une colonne, où la réserve devient un trou entre le titre et le décompte (vu à l'écran
          en 390 le 6 septembre 2026).
        */}
        {list.description ? (
          <p className="line-clamp-2 text-pretty text-muted-foreground text-sm">
            {list.description}
          </p>
        ) : null}

        {/*
          `mt-auto` pousse la ligne au bas de la carte : c'est ce qui aligne les décomptes entre
          eux sans rien réserver au-dessus. Elle nomme le genre, et signale un lien de partage
          actif — sans quoi il faut ouvrir la liste pour savoir qu'elle est visible hors du cercle.
        */}
        <p className="mt-auto flex items-center gap-1.5 pt-2 text-muted-foreground text-xs">
          <span className="truncate">
            {listHeadline(list.kind, list.cutoff, list.countsLine)}
          </span>
          {list.shared ? (
            <span className="flex shrink-0 items-center gap-1">
              <LinkIcon aria-hidden className="size-3" />
              Partagée
            </span>
          ) : null}
        </p>
      </div>
    </Link>
  );
}
