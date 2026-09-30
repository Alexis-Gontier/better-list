import { ChevronDownIcon, ImageOffIcon, UserRoundIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
 * **Dix par rangée, le reste replié.** Éprouvé le 30 septembre 2026 avec cent dix-huit favoris : sans
 * plafond, la section faisait 2 500 px, repoussait les graphes au bas de l'écran et laissait le
 * journal seul en haut à droite. Les dix plus récents disent le goût ; le reste s'ouvre à la
 * demande, sans aller-retour — tout est déjà rendu.
 *
 * Une rangée vide n'est pas rendue — un titre au-dessus de rien ne dit rien qu'une absence ne dise
 * mieux. Né dans le `_components/` de la route : aucun autre écran n'en veut.
 */

/** Deux lignes de cinq dans la colonne latérale. */
const PREVIEW_COUNT = 10;

const BLOCKS = [
  { key: "anime", label: "Anime", href: routes.media, person: false },
  { key: "manga", label: "Manga", href: routes.media, person: false },
  {
    key: "characters",
    label: "Personnages",
    href: routes.character,
    person: true,
  },
  { key: "staff", label: "Staff", href: routes.staff, person: true },
] as const satisfies readonly {
  key: keyof FavoriteGroups;
  label: string;
  href: (id: number) => string;
  person: boolean;
}[];

/**
 * Cinq colonnes sur téléphone, huit dès `sm`, puis cinq dans la colonne latérale en `lg` : la
 * vignette garde à peu près la même taille partout, seule la rangée change.
 */
const GRID = "grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-5";

export function ProfileFavorites({ groups }: { groups: FavoriteGroups }) {
  return (
    <div className="flex flex-col gap-5">
      {BLOCKS.map(({ key, label, href, person }) => {
        const tiles = groups[key];
        if (tiles.length === 0) return null;

        const shown = tiles.slice(0, PREVIEW_COUNT);
        const rest = tiles.slice(PREVIEW_COUNT);
        const renderTiles = (list: FavoriteTile[]) =>
          list.map((tile) => (
            <li key={tile.id}>
              <FavoriteTileLink
                href={href(tile.id)}
                person={person}
                tile={tile}
              />
            </li>
          ));

        return (
          <section className="flex flex-col gap-2" key={key}>
            <h3 className="flex items-baseline justify-between font-heading text-muted-foreground text-xs uppercase tracking-wide">
              {label}
              <span className="tabular-nums">{tiles.length}</span>
            </h3>

            {rest.length === 0 ? (
              <ul className={GRID}>{renderTiles(shown)}</ul>
            ) : (
              /*
                Le reste est une **seconde liste** sous la première, pas la même grille dont on
                masquerait des cases : `CollapsibleContent` ne sait replier qu'un bloc. L'écart entre
                les deux reprend celui de la grille, et l'œil n'y voit qu'une rangée de plus.
              */
              <Collapsible className="group/favorites flex flex-col gap-2">
                <ul className={GRID}>{renderTiles(shown)}</ul>
                <CollapsibleContent>
                  <ul className={GRID}>{renderTiles(rest)}</ul>
                </CollapsibleContent>
                <CollapsibleTrigger asChild>
                  <Button className="self-start" size="sm" variant="ghost">
                    <span className="group-data-[state=open]/favorites:hidden">
                      Afficher les {rest.length} autres
                    </span>
                    <span className="hidden group-data-[state=open]/favorites:inline">
                      Replier
                    </span>
                    <ChevronDownIcon
                      className="transition-transform group-data-[state=open]/favorites:rotate-180"
                      data-icon="inline-end"
                    />
                  </Button>
                </CollapsibleTrigger>
              </Collapsible>
            )}
          </section>
        );
      })}
    </div>
  );
}

function FavoriteTileLink({
  tile,
  href,
  person,
}: {
  tile: FavoriteTile;
  href: string;
  /** Décide de l'icône de repli : une silhouette pour une personne, une image absente sinon. */
  person: boolean;
}) {
  const Fallback = person ? UserRoundIcon : ImageOffIcon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          aria-label={tile.name}
          className="group relative flex aspect-2/3 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground ring-1 ring-border transition-shadow hover:ring-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-accent"
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
          ) : (
            /*
              Sans repli, une vignette sans portrait se confondait avec une image en cours de
              chargement : une case grise ne dit pas « il n'y a rien ».
            */
            <Fallback aria-hidden className="size-5" />
          )}
        </Link>
      </TooltipTrigger>
      <TooltipContent>{tile.name}</TooltipContent>
    </Tooltip>
  );
}
