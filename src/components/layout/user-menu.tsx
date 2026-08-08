"use client";

import { LogOutIcon, SettingsIcon, UserIcon } from "lucide-react";
import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { routes } from "@/config/routes";

type UserMenuProps = {
  name: string;
  email: string;
  /**
   * Porte l'URL du profil — `routes.profile(username)`, jamais un chemin écrit à la main.
   *
   * Nullable, et sans `!` pour s'en débarrasser : Better Auth déclare le champ additionnel en
   * `required: false` (voir `src/lib/auth/server.ts`), même si la colonne est non nulle et qu'un hook de
   * création la remplit. Plutôt que de forcer le type, on n'affiche pas une entrée de menu qui ne
   * mènerait nulle part.
   */
  username?: string | null;
  image?: string;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function UserMenu({ name, email, username, image }: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Menu du compte"
        className="rounded-full outline-none transition-opacity hover:opacity-80 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Avatar>
          <AvatarImage src={image} alt={name} />
          <AvatarFallback>{getInitials(name)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <div className="flex flex-col gap-0.5 px-2 py-1.5">
          <span className="truncate font-medium text-sm">{name}</span>
          <span className="truncate text-muted-foreground text-xs">
            {email}
          </span>
        </div>
        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          {username ? (
            <DropdownMenuItem asChild>
              <Link href={routes.profile(username)}>
                <UserIcon />
                Profil
              </Link>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem asChild>
            <Link href={routes.settings}>
              <SettingsIcon />
              Paramètres
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem variant="destructive">
            <LogOutIcon />
            Se déconnecter
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
