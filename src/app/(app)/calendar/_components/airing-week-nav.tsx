import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { WEEK_OFFSET_LIMIT } from "@/app/(app)/calendar/_lib/airing-week";
import { serializeCalendarParams } from "@/app/(app)/calendar/_lib/calendar-params";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";

/**
 * Les deux flèches, l'intitulé de la semaine, et le retour au présent.
 *
 * **Des liens et pas des boutons** : changer de semaine change l'adresse, donc c'est une
 * navigation. Un `<button>` qui pousserait l'historique en JavaScript perdrait l'ouverture dans un
 * nouvel onglet, le clic du milieu et le survol qui montre la destination — et rendrait cet écran
 * client pour deux chevrons.
 *
 * L'adresse est bâtie avec le sérialiseur qui la relira (`calendar-params.ts`), comme la pagination
 * du catalogue : l'aller-retour est garanti, et `week=0` est omis — la semaine en cours reste donc
 * `/calendar` tout court, ce qui fait que le lien qu'on s'envoie ne date pas.
 *
 * Composant **serveur** : il ne rend que des liens.
 */
export function AiringWeekNav({
  offset,
  label,
}: {
  /** Le décalage **déjà borné** par `clampWeekOffset` — pas la valeur brute de l'URL. */
  offset: number;
  /** « 7–13 septembre 2026 », tel qu'`airingWeek` le compose. */
  label: string;
}) {
  /*
    Aux deux bouts de la plage, la flèche correspondante est désarmée plutôt que masquée : une
    flèche qui disparaît déplace celle d'à côté, et on clique alors sur l'inverse de ce qu'on
    visait. `aria-disabled` et non `disabled` — c'est un lien, et on ne désarme pas un lien en lui
    retirant son `href` sans le dire aux technologies d'assistance.
  */
  const atStart = offset <= -WEEK_OFFSET_LIMIT;
  const atEnd = offset >= WEEK_OFFSET_LIMIT;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        aria-disabled={atStart || undefined}
        asChild={!atStart}
        disabled={atStart}
        size="icon"
        variant="outline"
      >
        {atStart ? (
          <ChevronLeftIcon />
        ) : (
          <Link
            aria-label="Semaine précédente"
            href={serializeCalendarParams(routes.calendar, {
              week: offset - 1,
            })}
          >
            <ChevronLeftIcon />
          </Link>
        )}
      </Button>

      <Button
        aria-disabled={atEnd || undefined}
        asChild={!atEnd}
        disabled={atEnd}
        size="icon"
        variant="outline"
      >
        {atEnd ? (
          <ChevronRightIcon />
        ) : (
          <Link
            aria-label="Semaine suivante"
            href={serializeCalendarParams(routes.calendar, {
              week: offset + 1,
            })}
          >
            <ChevronRightIcon />
          </Link>
        )}
      </Button>

      {/*
        `tabular-nums` : l'intitulé change de largeur d'une semaine à l'autre — « 7–13 septembre »
        contre « 30 novembre – 6 décembre » —, et sans chiffres de largeur fixe les flèches
        semblent bouger sous le curseur pendant qu'on parcourt les semaines.
      */}
      <p className="font-medium text-sm tabular-nums">{label}</p>

      {/*
        Le retour au présent n'apparaît que lorsqu'on n'y est pas : sur la semaine en cours, ce
        bouton ne ferait rien, et un bouton qui ne fait rien apprend à ne plus lire la barre.
      */}
      {offset !== 0 ? (
        <Button asChild className="ml-auto" size="sm" variant="ghost">
          <Link href={routes.calendar}>Cette semaine</Link>
        </Button>
      ) : null}
    </div>
  );
}
