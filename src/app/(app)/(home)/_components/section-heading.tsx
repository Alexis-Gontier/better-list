import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";

/**
 * Le titre d'une rangée de l'accueil — et quand la section a un écran qui la développe, **le titre
 * est le lien**.
 *
 * Un chevron le dit, sans bouton « Tout voir » à côté : deux cibles pour une même destination, à
 * deux centimètres l'une de l'autre, se lisent comme deux gestes différents.
 */
export function SectionHeading({
  title,
  href,
}: {
  title: string;
  href?: string;
}) {
  return (
    <h2 className="font-heading font-semibold text-xl">
      {href ? (
        <Link
          className="group inline-flex items-center gap-1 rounded-sm transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-accent"
          href={href}
        >
          {title}
          <ChevronRightIcon className="size-5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
        </Link>
      ) : (
        title
      )}
    </h2>
  );
}
