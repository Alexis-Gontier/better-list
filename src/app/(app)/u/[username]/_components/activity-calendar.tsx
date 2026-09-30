"use client";

import {
  ContributionGraph,
  ContributionGraphBlock,
  ContributionGraphCalendar,
  ContributionGraphFooter,
  ContributionGraphLegend,
} from "@/components/ui/contribution-graph";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LOCALE } from "@/config/locale";
import type { ActivityDay } from "@/features/profile/lib/profile-activity";
import { cn } from "@/lib/utils";

/**
 * Une année d'activité, une case par jour.
 *
 * **La rampe est passée aux gris le 30 septembre 2026.** Elle montait vers l'accent iris, au titre
 * de l'exception « un graphe sur un écran sans jaquette ». Depuis, le profil en montre — la bande,
 * les favoris, le journal —, et l'exception ne tient plus : la couleur de l'écran revient aux
 * jaquettes (spec du 2 septembre). Du plus sombre au plus clair, la rampe se lit aussi bien.
 *
 * **La rampe est à une seule teinte**, du `--muted` d'une journée vide jusqu'au texte. Une échelle
 * bleu-vers-rouge dirait « froid / chaud », ce qui n'a aucun sens pour un compte d'événements : il
 * n'y a pas de valeur neutre au milieu, juste plus ou moins.
 *
 * Elle passe par la famille `--activity-*` et non par des opacités de `--chart-1`. Les opacités ont
 * été essayées en premier et rendaient trois crans sur quatre indiscernables sur le quasi-noir — le
 * détail du pourquoi est dans `globals.css`, où vivent les valeurs.
 *
 * **Îlot client**, parce que le survol d'une case est la seule façon d'en lire le compte exact —
 * une grille de 365 cases ne peut pas porter 365 étiquettes.
 */

/** Les milliers espacés : le total dépasse volontiers quatre chiffres sur une année active. */
const COUNT_FORMAT = new Intl.NumberFormat(LOCALE);

/**
 * **`timeZone: "UTC"` est ici le bon fuseau, et c'est le seul endroit du projet où l'écrire.** Les
 * clés `AAAA-MM-JJ` arrivent déjà calculées à Paris par le serveur (`dayKey`) ; ce format ne fait
 * que réécrire une **date seule** en français, il ne convertit aucun instant. Relire cette clé en
 * `Europe/Paris` la décalerait d'un jour en heure d'été, puisqu'elle est reconstruite à minuit UTC.
 *
 * La locale, elle, vient bien de `config/locale.ts` : la règle du projet vaut pour tout `Intl.*`.
 */
const DAY_LABEL_FORMAT = new Intl.DateTimeFormat(LOCALE, {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const LABELS = {
  months: [
    "janv.",
    "févr.",
    "mars",
    "avr.",
    "mai",
    "juin",
    "juil.",
    "août",
    "sept.",
    "oct.",
    "nov.",
    "déc.",
  ],
  weekdays: ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."],
  legend: { less: "Moins", more: "Plus" },
};

/**
 * La rampe, posée sur le bloc plutôt que dans le composant vendu.
 *
 * `contribution-graph.tsx` vient du registre kibo et part sur des gris (`muted-foreground/20` et
 * suivants). On ne modifie pas un composant de `components/ui/` — il hérite des tokens : la teinte
 * se décide donc ici, par `className`, exactement comme on passerait un `variant`.
 */
const LEVEL_FILLS = cn(
  'data-[level="0"]:fill-muted',
  'data-[level="1"]:fill-activity-1',
  'data-[level="2"]:fill-activity-2',
  'data-[level="3"]:fill-activity-3',
  'data-[level="4"]:fill-activity-4',
  // Un liséré constant : sans lui, les cases vides disparaissent dans le fond en thème sombre.
  "stroke-[1px] stroke-border",
);

export function ActivityCalendar({
  data,
  totalCount,
}: {
  data: ActivityDay[];
  totalCount: number;
}) {
  return (
    <div className="flex flex-col gap-3">
      <ContributionGraph
        /*
          Des cases de 10 px et 3 de gouttière depuis le 30 septembre 2026 : le calendrier vit dans
          la colonne principale, large d'environ 45 rem, et 13 × 53 semaines la remplit sans
          défilement. Les 14 + 4 d'avant étaient taillés pour la pleine largeur.
        */
        blockMargin={3}
        blockRadius={2}
        blockSize={10}
        data={data}
        fontSize={12}
        labels={LABELS}
        totalCount={totalCount}
        /*
          La semaine commence **lundi** (1), pas dimanche : GitHub est américain, cette application
          ne l'est pas, et `/calendar` a déjà tranché dans le même sens.
        */
        weekStart={1}
      >
        <ContributionGraphCalendar className="text-muted-foreground">
          {({ activity, dayIndex, weekIndex }) => (
            <Tooltip>
              <TooltipTrigger asChild>
                <ContributionGraphBlock
                  activity={activity}
                  className={LEVEL_FILLS}
                  dayIndex={dayIndex}
                  weekIndex={weekIndex}
                />
              </TooltipTrigger>
              <TooltipContent>
                {/*
                  Le compte **puis** la date, dans cet ordre : on survole une case parce qu'on veut
                  savoir combien, la date on l'a déjà déduite de la position.
                */}
                {activity.count === 0
                  ? "Rien ce jour-là"
                  : `${activity.count} ${activity.count > 1 ? "événements" : "événement"}`}
                {" · "}
                {DAY_LABEL_FORMAT.format(
                  new Date(`${activity.date}T00:00:00Z`),
                )}
              </TooltipContent>
            </Tooltip>
          )}
        </ContributionGraphCalendar>

        <ContributionGraphFooter className="text-xs">
          {/*
            Le total est écrit à la main plutôt que par `ContributionGraphTotalCount` : celui-ci
            déduit l'année de la dernière case, alors que la fenêtre affichée est **glissante** —
            « 1 240 événements en 2026 » serait faux de onze mois sur douze.
          */}
          <p className="text-muted-foreground">
            {COUNT_FORMAT.format(totalCount)} événements sur les douze derniers
            mois
          </p>

          <ContributionGraphLegend>
            {({ level }) => (
              <svg height={10} width={10}>
                <title>{`Niveau ${level}`}</title>
                <rect
                  className={LEVEL_FILLS}
                  data-level={level}
                  height={10}
                  rx={2}
                  ry={2}
                  width={10}
                />
              </svg>
            )}
          </ContributionGraphLegend>
        </ContributionGraphFooter>
      </ContributionGraph>
    </div>
  );
}
