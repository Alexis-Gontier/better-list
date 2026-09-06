import { ENTRY_STATUS_LABELS } from "@/features/tracking/lib/entry-format";
import type { EntryStatus } from "@/features/tracking/schemas/tracking.schema";
import { cn } from "@/lib/utils";

/**
 * La pastille d'un statut de suivi — **le marqueur que la spec du 2 septembre appelait de ses
 * vœux**, en six teintes plutôt qu'en une.
 *
 * Son quatrième emploi autorisé de l'accent est « le marqueur de suivi sur une jaquette », qu'elle
 * décrit comme la seule fonction nouvelle de la refonte : voir d'un coup d'œil, dans une grille, ce
 * qu'on suit déjà. Passer à six couleurs est un écart assumé (décision d'Alexis, 6 septembre 2026)
 * — sur une bibliothèque de plusieurs centaines de lignes, « en cours » et « abandonné » ne se
 * distinguent autrement qu'en lisant chaque carte. Le raisonnement complet, et les trois garde-fous
 * qui le rendent tenable, sont dans `styles/globals.css` à côté des tokens.
 *
 * Composant **serveur** : il ne rend qu'un rond.
 *
 * Les classes sont écrites en toutes lettres dans une table plutôt que composées : Tailwind lit le
 * source pour décider des classes à produire, et un nom construit à l'exécution
 * (`` `bg-status-${status}` ``) ne produit aucune règle. C'est un piège qui ne se voit qu'au build
 * de production, où la couleur disparaît sans que rien n'échoue.
 */
const STATUS_DOT_COLOR: Record<EntryStatus, string> = {
  CURRENT: "bg-status-current",
  PLANNING: "bg-status-planning",
  COMPLETED: "bg-status-completed",
  PAUSED: "bg-status-paused",
  REPEATING: "bg-status-repeating",
  DROPPED: "bg-status-dropped",
};

type EntryStatusDotProps = {
  status: EntryStatus;
  /**
   * La pastille est-elle **accompagnée de son libellé visible**.
   *
   * Dans la rangée d'onglets, oui : le mot est juste à côté, et faire lire « En cours En cours » à
   * un lecteur d'écran n'apprend rien. Sur une carte, non : la pastille est alors la **seule**
   * chose qui dit le statut, et une couleur seule n'est lisible ni au lecteur d'écran, ni à qui ne
   * distingue pas le vert du rouge. Elle porte donc son nom en texte caché et en infobulle.
   *
   * C'est le seul réglage de ce composant, et il existe parce que l'oublier produit exactement une
   * des deux fautes — la redite ou l'information réservée à ceux qui voient les couleurs.
   */
  labelled?: boolean;
  className?: string;
};

export function EntryStatusDot({
  status,
  labelled = false,
  className,
}: EntryStatusDotProps) {
  const label = ENTRY_STATUS_LABELS[status];

  return (
    <span
      aria-hidden={labelled ? true : undefined}
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        STATUS_DOT_COLOR[status],
        className,
      )}
      title={labelled ? undefined : label}
    >
      {labelled ? null : <span className="sr-only">{label}</span>}
    </span>
  );
}
