import Image from "next/image";
import Link from "next/link";
import { routes } from "@/config/routes";
import type { ProfileEvent } from "@/features/profile/server/profile.queries";
import {
  describeEntryEvent,
  formatEventTime,
  groupEventsByDay,
} from "@/features/tracking/lib/entry-format";

/**
 * Le journal : ce qui s'est passé, groupé par journée.
 *
 * **Composant serveur, et c'est la conséquence d'une décision de forme.** Il n'y a rien à hydrater
 * ici : pas de filtre, pas de repli, pas d'état. La moitié basse de l'écran ne coûte donc aucun
 * JavaScript, ce qui est exactement le contrat server-first du projet — les cinq graphes sont les
 * seules feuilles clientes de la page.
 *
 * **Presque tout ce fichier appelle du code qui existait déjà.** `groupEventsByDay`,
 * `describeEntryEvent` et `formatDayLabel` vivent dans `features/tracking/lib/entry-format.ts`
 * depuis la V1, testés, et le commentaire de `groupEventsByDay` dit lui-même qu'il a été écrit pour
 * « le tableau de bord [qui] lit le journal de toutes les œuvres ». C'est cet écran-là. Il n'y avait
 * donc pas de logique de journal à réécrire, seulement une présentation à poser dessus.
 *
 * La granularité est **le jour** (docs/PRODUCT.md §4.3) : « le 3 mars, 15 épisodes » est
 * l'information ; l'heure exacte du quinzième ne l'est pas, et elle reste au bout de la ligne, en
 * gris, pour qui la cherche.
 */

export function ProfileTimeline({
  events,
  now,
}: {
  events: ProfileEvent[];
  /**
   * L'horloge est passée, jamais lue ici : `formatDayLabel` en a besoin pour dire « Aujourd'hui »
   * plutôt que « 12 septembre », et le calendrier d'activité doit finir sur ce même jour. Deux
   * `new Date()` lus à quelques millisecondes d'écart peuvent tomber de part et d'autre de minuit.
   */
  now: Date;
}) {
  const days = groupEventsByDay(events, now);

  return (
    /*
      **Les journées restent empilées sur toute la largeur ; ce sont leurs entrées qui passent sur
      deux colonnes** à partir de `lg`.

      Une première version mettait les *journées* elles-mêmes en colonnes CSS. Elle tenait debout,
      mais elle laissait de grands blancs dès que deux journées voisines n'avaient pas le même
      nombre d'événements, et l'intitulé de date cessait d'être un repère plein format. Découper à
      l'intérieur d'une journée n'a aucun de ces deux défauts : chaque en-tête garde sa ligne, et
      les colonnes se remplissent toujours également à une entrée près.
    */
    <ol className="flex flex-col gap-4">
      {days.map((day) => (
        <li className="flex flex-col gap-2" key={day.key}>
          {/*
            L'intitulé de journée **colle en haut** pendant qu'on fait défiler ses lignes : c'est le
            seul repère temporel de la colonne, et le perdre au bout de trois événements oblige à
            remonter pour savoir quel jour on lit. (La disposition en colonnes CSS l'en empêchait —
            `sticky` n'y fonctionne pas —, et c'est une raison de plus de ne pas l'avoir gardée.)

            `bg-card` et non `bg-background` : l'intitulé colle **à l'intérieur d'une carte**, dont
            le fond est plus clair que celui de la page. Avec `bg-background`, il traînait derrière
            lui une bande sombre qui ne correspondait à rien.
          */}
          <h3 className="sticky top-0 z-10 bg-card py-1 font-heading text-muted-foreground text-xs uppercase tracking-wide">
            {day.label}
          </h3>

          {/*
            Une grille, et non des colonnes CSS : à l'intérieur d'une journée, l'ordre de lecture
            naturel est **de gauche à droite puis à la ligne**, ce que la grille fait par défaut.

            **Deux colonnes dès `sm`** (demande d'Alexis, 30 septembre 2026). Une seule colonne avait
            été essayée quand le journal a rejoint la colonne principale ; elle doublait la hauteur
            de la carte pour des lignes à moitié vides. L'heure étant désormais sous l'entrée, deux
            entrées de front ne se confondent plus.
          */}
          <ol className="grid gap-x-6 sm:grid-cols-2">
            {day.events.map((event) => (
              <TimelineRow event={event} key={event.id} />
            ))}
          </ol>
        </li>
      ))}
    </ol>
  );
}

/** Une entrée : la jaquette, puis le titre, ce qui s'est passé et l'heure, sur trois lignes. */
function TimelineRow({ event }: { event: ProfileEvent }) {
  const line = describeEntryEvent(event, event.unit);

  return (
    <li>
      {/*
        **Toute la ligne est le lien**, pas seulement le titre : une cible de 56 px de haut sur
        toute la largeur se touche du pouce, là où un titre de 14 px ne se touche qu'au deuxième
        essai. `-mx-2 px-2` fait déborder la zone cliquable du rembourrage de la carte sans décaler
        le contenu.
      */}
      <Link
        className="-mx-2 flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-accent"
        href={routes.media(event.mediaId)}
      >
        <Cover cover={event.cover} title={event.title} />

        <div className="flex min-w-0 flex-col gap-0.5">
          {/*
            Le titre de l'œuvre au-dessus de l'événement, et pas l'inverse : on parcourt cette
            colonne en cherchant une série, pas en cherchant un type d'événement.
          */}
          <span className="truncate text-sm">{event.title}</span>
          <span className="flex items-baseline gap-1.5 text-muted-foreground text-xs">
            <span className="truncate">{line.label}</span>
            {line.detail ? (
              <span className="shrink-0 tabular-nums">{line.detail}</span>
            ) : null}
          </span>
          {/*
            **L'heure en troisième ligne, sous ce qui s'est passé** (demande d'Alexis, 30 septembre
            2026). Au bout de la ligne, elle se lisait comme appartenant à l'entrée voisine ; collée
            au titre, elle le concurrençait. Dessous, elle se lit comme ce qu'elle est : un détail.
          */}
          <time
            className="text-muted-foreground text-xs tabular-nums"
            dateTime={event.createdAt.toISOString()}
          >
            {formatEventTime(event.createdAt)}
          </time>
        </div>
      </Link>
    </li>
  );
}

/**
 * La jaquette, ou ce qui la remplace.
 *
 * `Media.coverImage` est nullable au schéma — une fiche AniList peut n'en avoir aucune —, et une
 * ligne dont l'image manque doit garder sa hauteur : sans le repli, la colonne se désaligne à cet
 * endroit-là seulement, ce qui se voit bien plus qu'un rectangle vide.
 */
function Cover({ cover, title }: { cover: string | null; title: string }) {
  if (!cover) {
    return (
      /*
        Un liséré, pas seulement un aplat : `--muted` et `--card` ne sont séparés que de trois
        centièmes de luminosité, si bien qu'un repli sans bordure serait invisible — la ligne
        semblerait avoir perdu sa jaquette *et* sa place, et le texte paraîtrait indenté sans raison.

        **Ce chemin n'est emprunté par aucune donnée actuelle** : les 411 fiches du miroir ont toutes
        une jaquette (vérifié le 12 septembre 2026). Il reste parce que `Media.coverImage` est
        nullable au schéma — AniList publie des fiches sans image —, et parce qu'une colonne qui se
        désaligne à une seule ligne se voit beaucoup plus qu'un rectangle vide.
      */
      <div
        aria-hidden
        className="h-14 w-10 shrink-0 rounded-sm border border-border bg-muted"
      />
    );
  }

  return (
    <Image
      alt=""
      className="h-14 w-10 shrink-0 rounded-sm object-cover"
      height={56}
      /*
        `alt=""` et non le titre : celui-ci est déjà écrit en toutes lettres juste à côté, dans le
        même lien. Le répéter ferait annoncer l'œuvre deux fois à chaque ligne.
      */
      src={cover}
      title={title}
      width={40}
    />
  );
}
