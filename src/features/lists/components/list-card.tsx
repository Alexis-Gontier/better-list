import { Share2Icon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LOCALE } from "@/config/locale";
import { routes } from "@/config/routes";
import { formatSince } from "@/features/tracking/lib/entry-format";

/**
 * Une liste, vue de l'extérieur : quatre jaquettes, un titre, ce qu'elle rassemble et depuis quand.
 *
 * **Une liste se reconnaît à ce qu'elle contient** bien avant qu'on lise son intitulé — d'où
 * l'aperçu, qui est l'essentiel de la carte et non sa décoration.
 *
 * Elle a démarré dans le `_components/` de `/lists` ; l'accueil en a eu besoin à son tour, donc
 * elle est montée ici. Elle connaît `List`, donc `features/lists/` et non `components/shared/`.
 * Les deux appelants n'en diffèrent que par le nombre de cartes qu'ils en rendent.
 *
 * **La description était lue en base et jetée.** `getMyLists` la ramenait déjà ; c'est pourtant la
 * seule phrase qui sépare « Top 2026 » de « À faire découvrir » quand les deux montrent quatre
 * jaquettes de shonen. Elle est ici, sur une ligne, coupée aux points de suspension — deux lignes
 * feraient varier la hauteur des cartes et la grille se lirait comme un escalier.
 */

/** Ce que la carte lit d'une liste. Satisfait par `getMyLists`, sans y être couplée. */
export type ListCardData = {
  id: string;
  title: string;
  description: string | null;
  /** Le jeton du lien non listé, ou `null`. La carte n'affiche pas sa valeur — c'est un secret. */
  shareToken: string | null;
  updatedAt: Date;
  _count: { items: number };
  items: { id: string; media: { coverImage: string | null } }[];
};

/** Cases d'aperçu. Voir le commentaire de la grille : elles sont toujours quatre. */
const PREVIEW_SLOTS = [0, 1, 2, 3];

export function ListCard({ list, now }: { list: ListCardData; now: Date }) {
  return (
    /*
      `h-full` sur les deux, et ce n'est pas de la décoration : une liste sans description fait une
      carte plus courte que sa voisine, et la rangée se lit comme un escalier — le défaut même que le
      titre sur une seule ligne évite ailleurs. La carte s'étire sur la hauteur de sa rangée, et le
      pied descend au bas (`mt-auto`), donc les comptes s'alignent d'une carte à l'autre.
    */
    <Link className="group block h-full" href={routes.lists.detail(list.id)}>
      <Card className="h-full gap-3 py-3 transition-colors group-hover:border-foreground/20">
        <CardContent className="px-3">
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
                  className="relative aspect-2/3 overflow-hidden rounded bg-muted"
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
        </CardContent>

        <CardHeader className="gap-1 px-3">
          <CardTitle className="truncate text-sm group-hover:underline">
            {list.title}
          </CardTitle>

          {list.description ? (
            <CardDescription className="truncate text-xs">
              {list.description}
            </CardDescription>
          ) : null}
        </CardHeader>

        {/*
          **La date de modification, parce que c'est l'ordre de la page.** `getMyLists` trie par
          `updatedAt` décroissant : sans elle, l'ordre des cartes n'a aucune explication visible, et
          une liste qui remonte en tête après un ajout paraît bouger toute seule.
        */}
        <CardFooter className="mt-auto gap-2 px-3 text-muted-foreground text-xs">
          <span>
            {list._count.items.toLocaleString(LOCALE)}{" "}
            {list._count.items > 1 ? "œuvres" : "œuvre"} ·{" "}
            {formatSince(list.updatedAt, now)}
          </span>

          {/*
            Le partage est un **état**, pas une donnée de plus : en suffixe de texte il se lisait
            comme un attribut du compte d'œuvres. Une pastille se repère sans se lire, ce qui est
            exactement ce qu'on veut d'une liste qui sort du cercle.
          */}
          {list.shareToken ? (
            <Badge className="ml-auto" variant="secondary">
              <Share2Icon aria-hidden="true" />
              Partagée
            </Badge>
          ) : null}
        </CardFooter>
      </Card>
    </Link>
  );
}
