import {
  BookOpenIcon,
  CalendarDaysIcon,
  EyeIcon,
  ListOrderedIcon,
  LockIcon,
  StarIcon,
} from "lucide-react";

const ABILITIES = [
  {
    icon: EyeIcon,
    text: "Suivre chaque épisode et chapitre, et voir d'un coup d'œil ce qui vient de sortir.",
  },
  {
    icon: CalendarDaysIcon,
    text: "Tenir un journal daté de tout ce que vous regardez, sans rien avoir à remplir.",
  },
  {
    icon: BookOpenIcon,
    text: "Ranger votre collection tome par tome, et repérer ceux qui vous manquent.",
  },
  {
    icon: ListOrderedIcon,
    text: "Composer des listes et des classements, aimer et copier ceux des autres.",
  },
  {
    icon: StarIcon,
    text: "Noter, commenter, et garder vos favoris en vitrine sur votre profil.",
  },
  {
    icon: LockIcon,
    text: "Tout garder entre vous : rien n'est public, chaque section se règle.",
  },
] as const;

/** « Better-List vous permet de… » : six tuiles d'une phrase, à la façon de Letterboxd. */
export function LandingAbilities() {
  return (
    <div className="flex flex-col gap-5">
      <h2 className="font-heading font-semibold text-muted-foreground text-sm">
        Better-List vous permet de…
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ABILITIES.map(({ icon: Icon, text }) => (
          <li
            className="flex items-start gap-4 rounded-lg bg-card p-5"
            key={text}
          >
            <Icon
              aria-hidden="true"
              className="mt-0.5 size-6 shrink-0 text-muted-foreground"
            />
            <p className="text-pretty">{text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
