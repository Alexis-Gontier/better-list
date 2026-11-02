import { ChevronDownIcon } from "lucide-react";

import { LandingBand } from "@/app/(welcome)/welcome/_components/landing-frame";

const QUESTIONS = [
  {
    question: "Qui peut entrer ?",
    answer:
      "Tout le monde peut se connecter, mais le compte reste en attente jusqu'à ce qu'un membre le valide. Le cercle reste petit : une dizaine de personnes.",
  },
  {
    question: "Faut-il créer un mot de passe ?",
    answer:
      "Non. On entre avec un compte GitHub, Discord ou Google, et l'on peut les lier entre eux depuis les paramètres.",
  },
  {
    question: "Mes listes et mon journal sont-ils publics ?",
    answer:
      "Rien n'est public. Les autres membres voient ce que vous choisissez de leur montrer, section par section. Une liste peut se partager par un lien.",
  },
  {
    question: "D'où viennent les fiches et les jaquettes ?",
    answer:
      "D'AniList, qui décrit les animes, mangas, webtoons et light novels. Better-List y ajoute votre suivi, votre journal et votre collection.",
  },
  {
    question: "Est-ce payant ?",
    answer:
      "Non. Better-List est un projet entre amis, sans abonnement ni publicité.",
  },
] as const;

/** Les questions, en `<details>` natif : ouvrable au clavier, lisible sans JavaScript. */
export function LandingFaq() {
  return (
    <LandingBand id="questions">
      <div className="grid gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1fr_1.6fr]">
        <h2 className="font-heading font-semibold text-[clamp(30px,4vw,44px)] leading-tight tracking-tight">
          Questions <span className="text-primary">fréquentes</span>
        </h2>
        <div className="flex flex-col">
          {QUESTIONS.map((item) => (
            <details
              className="group border-border border-b py-4 first:pt-0"
              key={item.question}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                {item.question}
                <ChevronDownIcon
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                />
              </summary>
              <p className="pt-3 text-muted-foreground">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </LandingBand>
  );
}
