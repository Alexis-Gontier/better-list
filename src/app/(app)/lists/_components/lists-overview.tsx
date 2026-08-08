import { ListIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { LOCALE } from "@/config/locale";
import { routes } from "@/config/routes";
import { getMyLists } from "@/features/lists/server/lists.queries";

/**
 * Mes listes.
 *
 * Chaque carte porte **quatre jaquettes** en aperçu : une liste se reconnaît à ce qu'elle contient
 * bien avant qu'on lise son titre. Les quatre sont lues par la query, pas la liste entière — une
 * page de dix listes ne doit pas charger dix contenus.
 */
export async function ListsOverview() {
  const lists = await getMyLists();

  if (lists.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ListIcon />
          </EmptyMedia>
          <EmptyTitle>Aucune liste</EmptyTitle>
          <EmptyDescription>
            Une liste rassemble des œuvres pour une raison qui n'appartient qu'à
            vous : un classement, une envie de saison, ce qu'il faut faire
            découvrir à quelqu'un.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {lists.map((list) => (
        <li key={list.id}>
          <Link
            className="group block space-y-3 rounded-lg border bg-card p-3 transition-colors hover:border-foreground/20"
            href={routes.lists.detail(list.slug)}
          >
            {/*
              Quatre cases toujours dessinées, même vides : sans ça, une liste de deux œuvres et une
              liste de quatre n'auraient pas la même hauteur, et la grille sauterait d'une carte à
              l'autre.
            */}
            <div className="grid grid-cols-4 gap-1.5">
              {Array.from({ length: 4 }, (_, index) => index).map((index) => {
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
                {list.visibility === "UNLISTED" ? " · lien non listé" : null}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
