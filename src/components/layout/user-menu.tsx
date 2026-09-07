"use client";

import { LogOutIcon, SettingsIcon, UserIcon } from "lucide-react";
import Link from "next/link";

import { UserAvatar } from "@/components/shared/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { routes } from "@/config/routes";
import { useSignOut } from "@/hooks/use-sign-out";

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

export function UserMenu({ name, email, username, image }: UserMenuProps) {
  const { signOut, isPending } = useSignOut();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Menu du compte"
        className="rounded-full outline-none transition-opacity hover:opacity-80 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <UserAvatar image={image} name={name} />
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
          {/*
            `preventDefault` sur `onSelect`, et ce n'est pas une précaution de style : un item de
            menu Radix referme le menu au choix, donc le composant serait démonté avant la fin de
            l'appel — l'attente ne se verrait nulle part, et un échec afficherait son toast au-dessus
            d'un menu déjà fermé. Le menu reste ouvert le temps de la requête, comme
            `AlertDialogAction` reste ouvert le temps d'une suppression.
          */}
          <DropdownMenuItem
            disabled={isPending}
            onSelect={(event) => {
              event.preventDefault();
              signOut();
            }}
            variant="destructive"
          >
            {isPending ? <Spinner /> : <LogOutIcon />}
            Se déconnecter
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
