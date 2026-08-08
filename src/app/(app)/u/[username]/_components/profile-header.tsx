import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LOCALE, TIMEZONE } from "@/config/locale";

/**
 * L'identité du membre, en haut de son profil.
 *
 * Le mois d'inscription plutôt que le jour : sur un cercle de quatre comptes, la date exacte n'a
 * aucun usage, et « membre depuis mars 2026 » se lit d'un coup d'œil.
 */
const MEMBER_SINCE_FORMAT = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIMEZONE,
  month: "long",
  year: "numeric",
});

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ProfileHeader({
  name,
  username,
  image,
  createdAt,
  isSelf,
}: {
  name: string;
  username: string;
  image: string | null;
  createdAt: Date;
  isSelf: boolean;
}) {
  return (
    <header className="flex items-center gap-4">
      <Avatar className="size-16">
        {/* `alt` vide : le nom est juste à côté, en toutes lettres. */}
        <AvatarImage alt="" src={image ?? undefined} />
        <AvatarFallback className="text-lg">{initials(name)}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 space-y-0.5">
        <h1 className="truncate font-semibold text-xl">
          {name}
          {isSelf ? (
            <span className="ml-2 font-normal text-muted-foreground text-sm">
              vous
            </span>
          ) : null}
        </h1>

        <p className="text-muted-foreground text-sm">
          @{username} · membre depuis {MEMBER_SINCE_FORMAT.format(createdAt)}
        </p>
      </div>
    </header>
  );
}
