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

/** La FAQ en `<details>` natifs : un accordéon sans JavaScript, la première question ouverte. */
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
          <details className="group border-b" key={question} open={index === 0}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-medium [&::-webkit-details-marker]:hidden">
              {question}
              <PlusIcon
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-45 motion-reduce:transition-none"
              />
            </summary>
            <p className="max-w-[68ch] text-pretty pb-5 text-muted-foreground">
              {answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
