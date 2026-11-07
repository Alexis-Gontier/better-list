import { PlusIcon } from "lucide-react";

const QUESTIONS = [
  [
    "Pourquoi sur invitation ?",
    "Better-List est pensé pour une dizaine d'amis. Un membre valide chaque compte ; en attendant, la demande reste sur une liste d'attente.",
  ],
  [
    "Qu'est-ce que les autres membres voient ?",
    "Ce que vous choisissez. Profil, journal, statistiques, calendrier d'activité et favoris se règlent un par un. Rien n'est public, hormis les listes dont vous partagez le lien.",
  ],
  [
    "D'où viennent les œuvres et les images ?",
    "Du catalogue d'AniList : fiches, jaquettes et bannières. Votre suivi, lui, reste chez Better-List.",
  ],
  [
    "Puis-je supprimer mon compte ?",
    "Oui, depuis vos paramètres, en recopiant votre identifiant. Tout part avec lui : suivi, journal, collection et listes.",
  ],
] as const;

/**
 * La FAQ en `<details>` natifs : un accordéon sans JavaScript, la première question ouverte. Le
 * `name` commun n'en laisse qu'une ouverte, et `disclosure` les fait glisser.
 */
export function LandingFaq() {
  return (
    <section
      aria-labelledby="questions-titre"
      className="reveal mx-auto flex w-full max-w-3xl scroll-mt-24 flex-col gap-6 sm:items-center sm:gap-10"
      id="questions"
    >
      <h2
        className="font-heading font-semibold text-3xl tracking-tight sm:text-5xl"
        id="questions-titre"
      >
        Questions
      </h2>
      <div className="w-full">
        {QUESTIONS.map(([question, answer], index) => (
          <details
            className="disclosure group border-b"
            key={question}
            name="questions"
            open={index === 0}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-medium text-foreground/80 transition-colors hover:text-foreground group-open:text-foreground [&::-webkit-details-marker]:hidden">
              {question}
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full border text-muted-foreground transition-[rotate,background-color,color] duration-300 group-open:rotate-45 group-open:bg-foreground group-open:text-background motion-reduce:transition-none">
                <PlusIcon aria-hidden="true" className="size-3.5" />
              </span>
            </summary>
            <p className="max-w-[68ch] translate-y-1 text-pretty pb-5 text-muted-foreground transition-transform duration-300 group-open:translate-y-0 motion-reduce:transition-none">
              {answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
