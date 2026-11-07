import type { CSSProperties } from "react";

/** La phrase de la première étape dépend des fournisseurs configurés (D62). */
const steps = (providersLabel: string) => [
  ["Connectez-vous", `Avec ${providersLabel}. Aucun mot de passe à retenir.`],
  [
    "Un membre vous valide",
    "Le cercle reste petit : chaque compte est approuvé à la main.",
  ],
  [
    "Ouvrez votre carnet",
    "Ajoutez vos séries, cochez vos épisodes, rangez vos tomes.",
  ],
];

/** « Entrer prend une minute » : les trois temps de l'entrée, de la connexion à l'approbation (D57). */
export function LandingSteps({ providersLabel }: { providersLabel: string }) {
  return (
    <section className="flex flex-col gap-8 sm:items-center sm:gap-12">
      <div className="reveal flex flex-col gap-3.5 sm:items-center sm:text-center">
        <h2 className="text-balance font-heading font-semibold text-3xl tracking-tight sm:text-5xl">
          Entrer prend une minute
        </h2>
        <p className="text-lg text-muted-foreground">
          Better-List est un cercle privé d'une dizaine de comptes.
        </p>
      </div>
      <ol className="grid w-full gap-4 sm:grid-cols-3">
        {steps(providersLabel).map(([title, text], index) => (
          <li
            className="reveal flex flex-col gap-2.5 rounded-2xl border bg-card p-6"
            style={{ "--reveal-start": `${index * 12}%` } as CSSProperties}
            key={title}
          >
            <span
              aria-hidden="true"
              className="flex size-7 items-center justify-center rounded-full bg-accent font-semibold text-sm"
            >
              {index + 1}
            </span>
            <h3 className="font-semibold text-lg">{title}</h3>
            <p className="text-pretty text-muted-foreground">{text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
