import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

/**
 * L'avatar d'un membre : sa photo GitHub, ou ses initiales quand elle manque.
 *
 * Il naît dans `components/shared/` parce qu'il a deux appelants — le menu du compte dans l'en-tête
 * et le bloc « Compte » des paramètres. C'est la promotion prévue par CLAUDE.md, pas une
 * exception : le composant vivait déjà dans `layout/user-menu.tsx`, il en sort au deuxième usage.
 *
 * Il atterrit dans `shared/` et non dans `features/` parce qu'il ne connaît aucune entité : il met
 * en forme un nom et une URL d'image. Le même raisonnement que `page-heading.tsx`.
 *
 * Composant **serveur** : `AvatarImage` porte son propre `"use client"` via Radix, et c'est la
 * seule chose qui en ait besoin.
 */

/**
 * Les initiales de secours, **deux au plus**.
 *
 * « Alexis G » donne « AG ». Au-delà de deux lettres, elles ne tiennent plus dans le cercle à la
 * taille de l'en-tête — et un nom en quatre mots produirait une bouillie illisible.
 */
function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function UserAvatar({
  name,
  image,
  className,
}: {
  /** Sert à l'`alt` de l'image **et** aux initiales de secours : une seule source. */
  name: string;
  image?: string | null;
  /** La taille se décide chez l'appelant — 32 px dans l'en-tête, 56 px sur la fiche du compte. */
  className?: string;
}) {
  return (
    <Avatar className={className}>
      {/*
        `src` accepte `null` sans broncher : Radix ne rend l'image que lorsqu'elle charge, et bascule
        sur le repli sinon. Un `??  undefined` de plus ne changerait rien au rendu.
      */}
      <AvatarImage alt={name} src={image ?? undefined} />
      <AvatarFallback>{getInitials(name)}</AvatarFallback>
    </Avatar>
  );
}
