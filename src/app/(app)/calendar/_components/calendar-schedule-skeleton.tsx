import { Skeleton } from "@/components/ui/skeleton";

/**
 * Trois jours et non sept, avec un nombre de lignes décroissant.
 *
 * Le squelette n'a à couvrir que ce qu'on voit pendant l'attente : sept jours pleins dessineraient
 * une semaine bien plus chargée que celle qui arrive, et la barre de défilement sauterait au moment
 * du remplacement. Le décroissant évite l'autre défaut — un damier parfaitement régulier se lit
 * comme un tableau vide plutôt que comme un chargement.
 */
const DAYS = [3, 2, 1];

export function CalendarScheduleSkeleton() {
  return (
    <div className="space-y-6">
      {DAYS.map((rows) => (
        <div className="space-y-2" key={rows}>
          <Skeleton className="h-4 w-32" />

          <div className="space-y-2">
            {Array.from({ length: rows }, (_, row) => row).map((row) => (
              // La hauteur est celle d'une ligne réelle — jaquette de 36 px plus le padding de la
              // bordure —, faute de quoi la page se décale à la fin du chargement.
              <Skeleton className="h-15.5 w-full" key={row} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
