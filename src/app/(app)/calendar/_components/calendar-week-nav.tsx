import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import {
  airingWeek,
  clampWeekOffset,
  WEEK_OFFSET_LIMIT,
} from "@/app/(app)/calendar/_lib/airing-week";
import {
  loadCalendarParams,
  serializeCalendarParams,
} from "@/app/(app)/calendar/_lib/calendar-params";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";

/**
 * D'une semaine à l'autre — en liens, pas en boutons.
 *
 * Aucun état, aucun JavaScript : le composant reste serveur, la semaine vit dans l'URL, et une
 * flèche est cliquable avant l'hydratation comme elle est ouvrable dans un nouvel onglet. C'est le
 * même choix que le filtre par statut de la bibliothèque, pour les mêmes raisons.
 *
 * Aux deux extrémités, la flèche devient un bouton **désactivé** plutôt que de disparaître : une
 * commande qui s'évapore déplace celle d'à côté, et on clique alors sur ce qu'on ne visait pas.
 */
export async function CalendarWeekNav({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { week } = await loadCalendarParams(searchParams);
  const offset = clampWeekOffset(week);
  const { label } = airingWeek(new Date(), offset);

  const href = (value: number) =>
    serializeCalendarParams(routes.calendar, { week: value });

  const steps = [
    {
      key: "previous",
      to: offset - 1,
      title: "Semaine précédente",
      icon: <ChevronLeftIcon />,
      disabled: offset <= -WEEK_OFFSET_LIMIT,
    },
    {
      key: "next",
      to: offset + 1,
      title: "Semaine suivante",
      icon: <ChevronRightIcon />,
      disabled: offset >= WEEK_OFFSET_LIMIT,
    },
  ];

  return (
    <nav
      aria-label="Changer de semaine"
      className="flex flex-wrap items-center gap-2"
    >
      {steps.map((step) => (
        <Button
          aria-label={step.title}
          asChild={!step.disabled}
          disabled={step.disabled}
          key={step.key}
          size="icon"
          title={step.title}
          variant="outline"
        >
          {step.disabled ? (
            step.icon
          ) : (
            <Link href={href(step.to)}>{step.icon}</Link>
          )}
        </Button>
      ))}

      {/*
        Le libellé est un `h2` : c'est le titre de ce que la page montre en dessous, et un lecteur
        d'écran doit pouvoir sauter dessus pour savoir quelle semaine il lit.
      */}
      <h2 className="font-medium text-sm tabular-nums">{label}</h2>

      {/*
        « Cette semaine » n'apparaît que quand on l'a quittée : proposer de revenir là où l'on est
        déjà occuperait la barre sans jamais servir.
      */}
      {offset !== 0 ? (
        <Button asChild className="ml-auto" size="sm" variant="ghost">
          <Link href={routes.calendar}>Cette semaine</Link>
        </Button>
      ) : null}
    </nav>
  );
}
