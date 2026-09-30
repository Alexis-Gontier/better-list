import Image from "next/image";
import Link from "next/link";

import { routes } from "@/config/routes";
import type {
  FavoriteGroups,
  FavoriteTile,
} from "@/features/favorites/lib/favorites-groups";

/**
 * Les favoris d'un membre, en quatre rangées comme sur AniList : anime, manga, personnages, staff.
 *
 * Une rangée vide n'est pas rendue — un titre au-dessus de rien ne dit rien qu'une absence ne dise
 * mieux. Né dans le `_components/` de la route : aucun autre écran n'en veut.
 */
const BLOCKS = [
  { key: "anime", label: "Anime", href: routes.media },
  { key: "manga", label: "Manga", href: routes.media },
  { key: "characters", label: "Personnages", href: routes.character },
  { key: "staff", label: "Staff", href: routes.staff },
] as const satisfies readonly {
  key: keyof FavoriteGroups;
  label: string;
  href: (id: number) => string;
}[];

export function ProfileFavorites({ groups }: { groups: FavoriteGroups }) {
  return (
    <div className="flex flex-col gap-6">
      {BLOCKS.map(({ key, label, href }) =>
        groups[key].length === 0 ? null : (
          <section className="flex flex-col gap-3" key={key}>
            <h3 className="font-medium text-muted-foreground text-sm">
              {label}
            </h3>
            <ul className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
              {groups[key].map((tile) => (
                <li key={tile.id}>
                  <FavoriteTileLink href={href(tile.id)} tile={tile} />
                </li>
              ))}
            </ul>
          </section>
        ),
      )}
    </div>
  );
}

function FavoriteTileLink({
  tile,
  href,
}: {
  tile: FavoriteTile;
  href: string;
}) {
  return (
    <Link className="group flex flex-col gap-1.5" href={href} prefetch={false}>
      <div className="relative aspect-2/3 overflow-hidden rounded-md bg-muted">
        {tile.image ? (
          <Image
            alt=""
            className="object-cover transition-transform group-hover:scale-105"
            fill
            sizes="(min-width: 1024px) 96px, (min-width: 640px) 16vw, 25vw"
            src={tile.image}
          />
        ) : null}
      </div>
      <span className="truncate text-xs group-hover:text-foreground text-muted-foreground">
        {tile.name}
      </span>
    </Link>
  );
}
