import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Une section de l'accueil : un titre, une phrase, un lien de sortie, du contenu.
 *
 * **Un seul en-tête pour toute la page**, et c'est ce qui justifie le composant. L'accueil mêle
 * désormais du suivi et de la découverte (docs/PRODUCT.md §5) ; deux jeux d'en-têtes se seraient
 * ressemblés sans être identiques, et la page aurait eu l'air de deux pages cousues.
 *
 * La description est **optionnelle** : « En cours » n'a rien à expliquer, « Les mieux notés » doit
 * dire de quelle note il parle.
 *
 * Le lien l'est aussi, et pour une raison plus stricte : une section qui promet « voir tout » doit
 * mener quelque part. Tant qu'un écran n'existe pas — ou tant que la recherche ne sait pas exprimer
 * le même ensemble, ce qui est le cas des rangées saisonnières —, on ne l'annonce pas.
 */
export function DashboardSection({
  title,
  description,
  href,
  linkLabel = "Voir tout",
  children,
}: {
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="space-y-0.5">
          <h2 className="font-semibold text-base">{title}</h2>

          {description ? (
            <p className="text-muted-foreground text-sm">{description}</p>
          ) : null}
        </div>

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
