import { UserIcon } from "lucide-react";
import Image from "next/image";

/**
 * Portrait carré d'un personnage ou d'une personne.
 *
 * L'image est décorative : le nom est écrit juste à côté, un `alt` la répéterait pour rien dans un
 * lecteur d'écran. Le repli n'est pas un vide mais une icône — AniList a beaucoup de fiches sans
 * portrait, et une grille trouée se lit mal.
 */
export function PersonAvatar({
  src,
  name,
}: {
  src: string | null;
  name: string | null;
}) {
  return (
    <div className="relative size-12 shrink-0 overflow-hidden rounded-md bg-muted">
      {src ? (
        <Image
          alt=""
          className="object-cover"
          fill
          sizes="48px"
          src={src}
          title={name ?? undefined}
        />
      ) : (
        <UserIcon
          aria-hidden="true"
          className="absolute inset-0 m-auto size-5 text-muted-foreground"
        />
      )}
    </div>
  );
}
