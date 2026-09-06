import Link from "next/link";

import { ListCoverMosaic } from "@/app/(app)/lists/_components/list-cover-mosaic";
import { routes } from "@/config/routes";
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
      className="flex flex-col gap-3 rounded-lg p-3 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)] transition-colors hover:bg-muted/40"
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
      <ListCoverMosaic covers={list.covers} />

      <div className="flex flex-col gap-1">
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
      </div>

      {/*
        `mt-auto` pousse le décompte au bas de la carte : c'est ce qui aligne les décomptes entre
        eux sans avoir à réserver quoi que ce soit au-dessus. La carte est étirée à la hauteur de sa
        rangée par la grille, donc l'espace à absorber existe déjà.
      */}
      <p className="mt-auto text-muted-foreground text-xs">
        {itemLabel(list.itemCount)}
      </p>
    </Link>
  );
}

/**
 * « 8 œuvres », « 1 œuvre », « Aucune œuvre ».
 *
 * Le cas zéro a ses propres mots plutôt qu'un « 0 œuvre » : un décompte nul se lit comme une panne
 * de chargement, une phrase se lit comme un état.
 */
function itemLabel(count: number): string {
  if (count === 0) return "Aucune œuvre";
  return count === 1 ? "1 œuvre" : `${count} œuvres`;
}
