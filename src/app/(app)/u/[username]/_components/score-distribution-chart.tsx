"use client";

import { Bar, BarChart, Cell, XAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { LOCALE } from "@/config/locale";
import type { ScoreBar } from "@/features/profile/lib/profile-stats";

/**
 * Les notes données, une barre par demi-étoile.
 *
 * **Dix barres et non cinq** : la note se pose par demies (`SCORE_STAR_STEP`), et regrouper les
 * demies avec les entières effacerait exactement l'information que ce graphe cherche — est-ce qu'on
 * note en gros ou en fin ? Un profil qui n'utilise jamais les demies se voit d'un coup d'œil.
 *
 * **Une seule barre porte l'accent : la plus fréquente.** Le graphe désigne ainsi sa propre
 * conclusion — « votre note, c'est 4 » — sans qu'aucune annotation ne l'écrive.
 *
 * ⚠️ **Les neuf autres barres sont une opacité de `--muted-foreground`, pas un cran de
 * `--chart-*`.** Avec `--chart-2`, elles passaient devant la barre accentuée sur Obsidienne — le
 * graphe désignait alors tout sauf sa conclusion ; avec `--chart-3`, elles devenaient du charbon en
 * thème clair. Un cran de cette rampe est une luminosité fixe, donc un pari sur le fond. Le
 * raisonnement complet est dans `status-breakdown.tsx`.
 *
 * Pas d'axe des ordonnées : on lit une forme, pas des valeurs. Le compte exact est au survol, et le
 * total comme la moyenne sont dans l'en-tête du bloc.
 */

const CHART_CONFIG = {
  count: {
    label: "Œuvres notées",
    color: "color-mix(in oklch, var(--muted-foreground) 45%, transparent)",
  },
} satisfies ChartConfig;

/** « 3,5 » et non « 3.5 » : le séparateur décimal français, comme partout ailleurs dans l'app. */
const STARS_FORMAT = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

export function ScoreDistributionChart({ data }: { data: ScoreBar[] }) {
  /*
    Le sommet, calculé plutôt que passé : c'est une propriété de la série, pas une décision. Le
    déduire ici évite que le serveur et le graphe puissent un jour désigner deux barres différentes.
  */
  const peak = data.reduce<ScoreBar | null>(
    (best, bar) => (best === null || bar.count > best.count ? bar : best),
    null,
  );

  const rows = data.map((bar) => ({
    ...bar,
    label: `${STARS_FORMAT.format(bar.stars)}★`,
  }));

  return (
    <ChartContainer className="h-56 w-full" config={CHART_CONFIG}>
      <BarChart accessibilityLayer data={rows} margin={{ top: 4 }}>
        <XAxis
          axisLine={false}
          dataKey="label"
          /*
            **Pas d'`interval={0}`, après l'avoir essayé.** Forcer les dix graduations donnait bien
            l'échelle complète sur un grand écran, et une bouillie illisible sous 400 px — les dix
            libellés se chevauchaient les uns les autres (capture mobile du 12 septembre 2026). Le
            réglage par défaut de Recharts en saute autant qu'il le faut pour qu'ils tiennent : une
            échelle à trous se lit, une échelle superposée ne se lit pas.
          */
          tickLine={false}
          tickMargin={8}
        />

        <ChartTooltip
          content={<ChartTooltipContent indicator="line" />}
          cursor={false}
        />

        {/*
            Aucune animation de montage : Recharts fait pousser ses barres depuis zéro à chaque
            affichage, ce qui est une décoration sur une statistique figée et retarde la lecture de
            la seule chose qu'on est venu voir.
          */}
        <Bar isAnimationActive={false} dataKey="count" radius={[3, 3, 0, 0]}>
          {rows.map((bar) => (
            <Cell
              fill={
                bar.stars === peak?.stars
                  ? "var(--foreground)"
                  : "color-mix(in oklch, var(--muted-foreground) 45%, transparent)"
              }
              key={bar.stars}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
