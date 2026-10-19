import Link from "next/link";

import {
  type CalendarScope,
  serializeCalendarParams,
} from "@/app/(app)/calendar/_lib/calendar-params";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { routes } from "@/config/routes";

/**
 * Le choix de portée : **ce que je suis**, ou **tout ce qui passe**.
 *
 * Demandé par Alexis le 8 septembre 2026. Il contredit `docs/conception.md` §9, qui écarte le planning
 * global et précise que le proposer supposerait « une seconde source ou un miroir des grilles
 * horaires, **pas un réglage** » — c'est-à-dire exactement ce contrôle. La contradiction est
 * documentée dans `calendar-params.ts` et bornée dans `media.queries.ts` par un plafond de pages ;
 * elle n'est pas ignorée.
 *
 * **Des liens et pas des boutons**, comme la navigation de semaine : changer de portée change
 * l'adresse. Un `<button>` qui pousserait l'historique en JavaScript perdrait l'ouverture dans un
 * nouvel onglet et rendrait cet écran client pour deux mots.
 *
 * `ButtonGroup` plutôt que `ToggleGroup` : ce dernier rend des `<button role="radio">`, et y glisser
 * des liens produirait un élément qui s'annonce comme un bouton radio tout en naviguant. Deux
 * boutons dont un seul est plein disent la même chose sans mentir sur leur nature.
 */
export function AiringScopeToggle({
  scope,
  week,
}: {
  scope: CalendarScope;
  /** Le décalage courant, pour que changer de portée **ne ramène pas à la semaine en cours**. */
  week: number;
}) {
  return (
    <ButtonGroup>
      <Button
        asChild
        size="sm"
        variant={scope === "suivis" ? "default" : "outline"}
      >
        <Link
          aria-current={scope === "suivis" ? "true" : undefined}
          href={serializeCalendarParams(routes.calendar, {
            week,
            portee: "suivis",
          })}
        >
          Ce que je suis
        </Link>
      </Button>

      <Button
        asChild
        size="sm"
        variant={scope === "tout" ? "default" : "outline"}
      >
        <Link
          aria-current={scope === "tout" ? "true" : undefined}
          href={serializeCalendarParams(routes.calendar, {
            week,
            portee: "tout",
          })}
        >
          Tout
        </Link>
      </Button>
    </ButtonGroup>
  );
}
