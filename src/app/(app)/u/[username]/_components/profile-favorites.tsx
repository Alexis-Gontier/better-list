import Image from "next/image";
import Link from "next/link";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { routes } from "@/config/routes";
import type {
  FavoriteGroups,
  FavoriteTile,
} from "@/features/favorites/lib/favorites-groups";

/**
 * Les favoris d'un membre, en quatre rangées comme sur AniList : anime, manga, personnages, staff.
 *
 * **Des vignettes serrées, le nom au survol.** La section vit dans la colonne latérale du profil,
 * large de 22 rem : un nom sous chaque jaquette doublait la hauteur de la grille et se coupait au
 * bout de dix caractères. L'image suffit à reconnaître une œuvre ou un visage ; le nom reste le nom
 * accessible du lien, et l'infobulle le donne à qui hésite.
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
    <div className="flex flex-col gap-5">
      {BLOCKS.map(({ key, label, href }) =>
        groups[key].length === 0 ? null : (
          <section className="flex flex-col gap-2" key={key}>
            <h3 className="flex items-baseline justify-between font-heading text-muted-foreground text-xs uppercase tracking-wide">
              {label}
              <span className="tabular-nums">{groups[key].length}</span>
            </h3>
            {/*
              Cinq colonnes sur téléphone, huit dès `sm`, puis cinq dans la colonne latérale en
              `lg` : la vignette garde à peu près la même taille partout, seule la rangée change.
            */}
            <ul className="grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-5">
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
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          aria-label={tile.name}
          className="group relative block aspect-2/3 overflow-hidden rounded-md bg-muted ring-1 ring-border transition-shadow hover:ring-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-accent"
          href={href}
          prefetch={false}
        >
          {tile.image ? (
            <Image
              alt=""
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              fill
              sizes="(min-width: 1024px) 56px, (min-width: 640px) 12vw, 20vw"
              src={tile.image}
            />
          ) : null}
        </Link>
      </TooltipTrigger>
      <TooltipContent>{tile.name}</TooltipContent>
    </Tooltip>
  );
}
