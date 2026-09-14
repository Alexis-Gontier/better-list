import Image from "next/image";

import type { ListCover } from "@/features/lists/server/lists.queries";

/**
 * L'aperçu d'une liste : ses quatre premières jaquettes, côte à côte.
 *
 * **C'est la raison d'être de cet écran.** La carte de liste était textuelle avant la refonte, et
 * la spec du 2 septembre dit pourquoi ça ne pouvait pas rester : dans une app d'images, une liste
 * sans image ne donne pas envie d'être ouverte.
 *
 * **Toujours quatre cases, même quand la liste en a deux.** Les manquantes restent vides plutôt que
 * de laisser les présentes s'étaler : une liste courte n'a pas à ressembler à autre chose qu'une
 * liste, et des jaquettes qui changent de taille d'une carte à l'autre feraient perdre à la grille
 * l'alignement qu'elle vient de gagner.
 *
 * Composant **serveur** : quatre images et aucun geste.
 *
 * `alt=""` — c'est l'aperçu d'une liste, pas un catalogue d'œuvres. Le titre de chaque jaquette est
 * porté par `title` pour l'infobulle, mais l'annoncer au lecteur d'écran ferait lire quatre noms
 * d'œuvres avant celui de la liste, qui est la seule chose qu'on cherche ici.
 */

/** Quatre, et le nombre est structurel : c'est le `take` de `getLists`, et la largeur d'une carte. */
const MOSAIC_SIZE = 4;

export function ListCoverMosaic({ covers }: { covers: ListCover[] }) {
  /*
    Des clés stables, et pas l'indice de boucle : les cases vides et les jaquettes cohabitent dans
    la même rangée, et un `key` d'indice ferait réutiliser à React le nœud d'une case vide pour une
    jaquette au rafraîchissement suivant.
  */
  const cells = Array.from({ length: MOSAIC_SIZE }, (_, index) => ({
    key: covers[index]?.mediaId ?? `vide-${index}`,
    cover: covers[index] ?? null,
  }));

  return (
    <div className="flex gap-1.5">
      {cells.map(({ key, cover }) => (
        <div
          /*
            Le rapport 2:3 est posé sur la case et non sur l'image — même raison que dans
            `MediaCard` : il réserve la place avant le chargement, donc la carte ne saute pas quand
            les jaquettes arrivent. Le liseré est interne pour ne rien ajouter à la boîte.
          */
          className="relative aspect-2/3 flex-1 overflow-hidden rounded-sm bg-muted shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]"
          key={key}
        >
          {cover?.cover ? (
            <Image
              alt=""
              className="object-cover"
              fill
              /*
                Une case fait le quart d'une carte, et une carte le tiers de la grille sur écran
                large. Sans ces tailles, `next/image` servirait une image pleine largeur de fenêtre
                pour une vignette de 90 px.
              */
              sizes="(min-width: 1024px) 8vw, (min-width: 640px) 12vw, 22vw"
              src={cover.cover}
              title={cover.title || undefined}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}
