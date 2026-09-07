import { HistoryIcon } from "lucide-react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  describeEntryEvent,
  type EntryUnit,
  formatEventTime,
  groupEventsByDay,
} from "@/features/tracking/lib/entry-format";
import { getEntryJournal } from "@/features/tracking/server/journal.queries";

/**
 * Le journal d'une œuvre — **ce que `EntryEvent` enregistrait sans que personne le lise.**
 *
 * Composant **serveur** : il lit, il met en forme, rien n'y est interactif. Et il ne décide de
 * rien — `describeEntryEvent`, `groupEventsByDay`, `formatDayLabel` et `formatEventTime` étaient
 * écrits et testés avant lui (`entry-format.ts`), fuseau `Europe/Paris` compris. Ce fichier les
 * assemble, et c'est tout ce qu'il fait.
 *
 * Il naît dans le `_components/` de la route, comme la règle de promotion le demande. `/u/[username]`
 * lira le journal de **toutes** les œuvres un jour, avec le titre joint à chaque ligne — c'est
 * précisément pour ça que `groupEventsByDay` est générique. Ce sera le deuxième appelant, et donc
 * le moment de le promouvoir ; pas avant.
 */

/**
 * L'horloge est lue **une fois**, ici, et passée au regroupement.
 *
 * `groupEventsByDay` s'en sert pour dire « Aujourd'hui » et « Hier » — il porte lui-même l'appel à
 * `formatDayLabel`, donc le libellé de journée est déjà calculé quand il rend la main. Lire
 * l'heure à chaque en-tête ferait qu'un rendu à cheval sur minuit produirait deux journées
 * « aujourd'hui ». Le même raisonnement que `saveEntry`, qui lit l'heure une fois avant d'appeler
 * la transition.
 */
export async function EntryJournal({
  mediaId,
  unit,
}: {
  mediaId: number;
  /** Vient de l'œuvre (`ANIME` → épisode), jamais de l'événement : le journal ne la porte pas. */
  unit: EntryUnit;
}) {
  const events = await getEntryJournal(mediaId);

  if (events.length === 0) return <EmptyJournal />;

  const now = new Date();
  const days = groupEventsByDay(events, now);

  return (
    <div className="flex flex-col gap-6">
      {days.map((day) => (
        <section className="flex flex-col gap-3" key={day.key}>
          {/*
            La journée est un **en-tête**, pas une ligne parmi les autres : c'est elle qui porte
            l'information que PRODUCT.md §4.3 veut lire — « le 3 mars, quinze épisodes ». Les
            événements en dessous n'en sont que le détail.
          */}
          <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
            {day.label}
          </h3>

          <ul className="flex flex-col gap-2">
            {day.events.map((event) => {
              const { label, detail } = describeEntryEvent(event, unit);

              return (
                <li
                  className="flex items-baseline gap-3 text-sm"
                  key={event.id}
                >
                  {/*
                    L'heure d'abord, en chiffres tabulaires et à largeur fixe : une colonne qui
                    s'aligne se balaie du regard, là où des heures de largeurs différentes font
                    danser les libellés d'une ligne à l'autre.
                  */}
                  <time
                    className="w-10 shrink-0 text-muted-foreground text-xs tabular-nums"
                    dateTime={event.createdAt.toISOString()}
                  >
                    {formatEventTime(event.createdAt)}
                  </time>

                  <span className="text-foreground">{label}</span>

                  {/*
                    La précision est **en retrait**, jamais entre parenthèses : « +8 » est ce qu'on
                    cherche sur une ligne de progression, et des parenthèses le feraient lire comme
                    une note de bas de page.
                  */}
                  {detail ? (
                    <span className="text-muted-foreground">{detail}</span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

/**
 * Le journal vide — **et il faut qu'il dise la vérité.**
 *
 * `EntryEvent` se remplit depuis le 6 septembre 2026 et n'est **pas rétroactif** : une série
 * terminée en 2024 aura un journal vide pour toujours, et les 394 suivis repris de l'ancienne base
 * n'ont que les trois événements que l'import a fabriqués. Laisser croire à une panne, ou pire à
 * une perte, serait le pire service à rendre sur un écran dont c'est justement la raison d'être.
 *
 * Il n'y a donc **aucun bouton ici**, contrairement à l'état vide des listes. Il n'y a rien à
 * cliquer : le journal se remplit en suivant l'œuvre, et la barre de suivi est déjà à l'écran,
 * juste au-dessus.
 */
function EmptyJournal() {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <HistoryIcon />
        </EmptyMedia>
        <EmptyTitle>Rien d'enregistré ici</EmptyTitle>
        {/*
          **Tournure impersonnelle, et pas de vouvoiement.** L'application parle à la première
          personne — « Ma bibliothèque », « Ce que je regarde », « Ajouter à ma bibliothèque » —, et
          un « vos prochains gestes » posé ici en faisait le seul écran qui s'adresse à quelqu'un
          d'autre. C'est la formulation de l'état vide des listes, qui contourne la question.
        */}
        <EmptyDescription>
          Le journal note ce qui se passe le jour où ça se passe, et ne remonte
          pas le temps. Avancer d'un épisode ou poser une note écrira la
          première ligne.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

/**
 * Le squelette : deux journées, aux proportions des lignes qui arrivent.
 *
 * Le journal est une **seconde lecture en base**, derrière sa propre frontière — il ne doit pas
 * retenir la fiche, qui a déjà attendu AniList.
 */
export function EntryJournalSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {SKELETON_DAYS.map((day) => (
        <div className="flex flex-col gap-3" key={day.key}>
          <Skeleton className="h-3 w-24" />
          <div className="flex flex-col gap-2">
            {day.lines.map((line) => (
              <div className="flex items-center gap-3" key={line}>
                <Skeleton className="h-3 w-10 shrink-0" />
                <Skeleton className="h-4 w-40" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Des identifiants plutôt que l'indice de boucle — la convention des autres squelettes du dépôt. */
const SKELETON_DAYS = [
  { key: "jour-1", lines: ["jour-1-a", "jour-1-b", "jour-1-c"] },
  { key: "jour-2", lines: ["jour-2-a", "jour-2-b"] },
];
