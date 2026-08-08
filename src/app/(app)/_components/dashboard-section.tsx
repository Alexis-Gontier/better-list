import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Une section du tableau de bord : un titre, un lien de sortie, du contenu.
 *
 * Le lien est **optionnel et explicite** : une section qui promet « voir tout » doit mener quelque
 * part. Tant qu'un écran n'existe pas, on ne l'annonce pas — c'est la même règle que les onglets
 * vides de la fiche œuvre.
 */
export function DashboardSection({
  title,
  href,
  linkLabel = "Voir tout",
  children,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-semibold text-base">{title}</h2>

        {href ? (
          <Link
            className="flex shrink-0 items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
            href={href}
          >
            {linkLabel}
            <ArrowRightIcon aria-hidden="true" className="size-3.5" />
          </Link>
        ) : null}
      </div>

      {children}
    </section>
  );
}
