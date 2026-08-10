import Image from "next/image";
import Link from "next/link";

import { LOCALE } from "@/config/locale";
import { routes } from "@/config/routes";

/**
 * Une liste, vue de l'extérieur : quatre jaquettes, un titre, un compte.
 *
 * **Une liste se reconnaît à ce qu'elle contient** bien avant qu'on lise son intitulé — d'où
 * l'aperçu, qui est l'essentiel de la carte et non sa décoration.
 *
 * Elle a démarré dans le `_components/` de `/lists` ; l'accueil en a eu besoin à son tour, donc
 * elle est montée ici. Elle connaît `List`, donc `features/lists/` et non `components/shared/`.
 * Les deux appelants n'en diffèrent que par le nombre de cartes qu'ils en rendent.
 */

/** Ce que la carte lit d'une liste. Satisfait par `getMyLists`, sans y être couplée. */
export type ListCardData = {
  id: string;
  title: string;
  /** Le jeton du lien non listé, ou `null`. La carte n'affiche pas sa valeur — c'est un secret. */
  shareToken: string | null;
  _count: { items: number };
  items: { id: string; media: { coverImage: string | null } }[];
};

/** Cases d'aperçu. Voir le commentaire de la grille : elles sont toujours quatre. */
const PREVIEW_SLOTS = [0, 1, 2, 3];

export function ListCard({ list }: { list: ListCardData }) {
  return (
    <Link
      className="group block space-y-3 rounded-lg border bg-card p-3 transition-colors hover:border-foreground/20"
      href={routes.lists.detail(list.id)}
    >
      {/*
        Quatre cases toujours dessinées, même vides : sans ça, une liste de deux œuvres et une
        liste de quatre n'auraient pas la même hauteur, et la grille sauterait d'une carte à
        l'autre.
      */}
      <div className="grid grid-cols-4 gap-1.5">
        {PREVIEW_SLOTS.map((index) => {
          const cover = list.items[index]?.media.coverImage;

          return (
            <div
              className="relative aspect-[2/3] overflow-hidden rounded bg-muted"
              key={index}
            >
              {cover ? (
                <Image
                  alt=""
                  className="object-cover"
                  fill
                  sizes="(max-width: 640px) 20vw, 90px"
                  src={cover}
                />
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="space-y-0.5">
        <p className="font-medium text-sm group-hover:underline">
          {list.title}
        </p>
        <p className="text-muted-foreground text-xs">
          {list._count.items.toLocaleString(LOCALE)}{" "}
          {list._count.items > 1 ? "œuvres" : "œuvre"}
          {list.shareToken ? " · partagée par lien" : null}
        </p>
      </div>
    </Link>
  );
}
