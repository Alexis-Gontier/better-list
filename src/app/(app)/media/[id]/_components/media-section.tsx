import Link from "next/link";

/**
 * Un bloc titré à l'intérieur d'un onglet de la fiche.
 *
 * **Il ne pose qu'un rythme, et c'est tout ce qu'on lui demande.** Ces titres se ressemblent parce
 * qu'ils sont écrits une fois ici plutôt que recopiés dans chaque composant — l'endroit exact où
 * deux blocs recommenceraient sinon à diverger.
 *
 * Le titre est un `h2` : le `h1` de la page est le titre de l'œuvre, et ces blocs sont ses enfants
 * directs dans le plan du document — la barre d'onglets, elle, n'est pas un niveau de titre.
 */
export function MediaSection({
  title,
  href,
  children,
}: {
  title: string;
  /**
   * L'onglet où ce bloc se lit en entier.
   *
   * **C'est ce qui fait tenir l'aperçu.** Celui-ci ne montre qu'un échantillon de chaque chose
   * (décision d'Alexis du 11 septembre 2026) : sans une sortie explicite, un visiteur n'a aucune
   * raison de deviner que six personnages sur vingt-cinq lui sont cachés, et l'échantillon se lit
   * alors comme la totalité. Absent dans les onglets dédiés, où le bloc *est* déjà complet.
   */
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      {/*
        Le lien est sur la **ligne du titre**, pas en pied de bloc : c'est là qu'on décide si l'on
        veut en voir plus, avant d'avoir parcouru l'échantillon, et non après l'avoir dépassé.
      */}
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold">{title}</h2>

        {href ? (
          <Link
            className="shrink-0 text-sm text-muted-foreground transition-colors hover:text-foreground"
            href={href}
            scroll={false}
          >
            Tout voir
          </Link>
        ) : null}
      </div>

      {children}
    </section>
  );
}
