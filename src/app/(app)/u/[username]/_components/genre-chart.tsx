"use client";

import { Bar, BarChart, LabelList, XAxis, YAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { GenreBar } from "@/features/profile/lib/profile-stats";

/**
 * Les genres les plus présents dans la bibliothèque.
 *
 * **Des barres horizontales**, parce que les intitulés sont des mots : « Slice of Life » posé sous
 * une barre verticale se couche à 45° ou se tronque, et une étiquette inclinée est toujours le
 * signe qu'on a choisi la mauvaise orientation.
 *
 * **Aucune couleur, un seul gris.** Huit genres ne sont pas huit catégories à distinguer les unes
 * des autres : c'est un classement, et c'est la longueur qui le porte. Colorier chaque barre
 * ajouterait sept teintes pour zéro information — et violerait la règle de la DA au passage.
 *
 * Le compte est écrit **au bout de la barre** plutôt que laissé au survol : c'est la valeur qu'on
 * vient chercher, et un classement dont il faut survoler chaque ligne n'est pas un classement.
 *
 * ⚠️ **Le gris est une opacité de `--muted-foreground`, pas un cran de `--chart-*`.** Les crans de
 * cette rampe sont des luminosités fixes : `--chart-2` est plus clair que l'accent sur Obsidienne,
 * `--chart-3` plus sombre que lui sur blanc. Les deux ont été rendus le 12 septembre 2026, et
 * chacun faisait crier ce bloc dans le thème que l'autre réparait. Le raisonnement complet est dans
 * `status-breakdown.tsx`.
 */

const CHART_CONFIG = {
  count: {
    label: "Œuvres",
    color: "color-mix(in oklch, var(--muted-foreground) 45%, transparent)",
  },
} satisfies ChartConfig;

export function GenreChart({ data }: { data: GenreBar[] }) {
  return (
    <ChartContainer
      /*
        La hauteur suit le nombre de lignes au lieu d'être fixe : à huit genres dans 12 rem, les
        barres deviennent des filets, et à trois genres il resterait un tiers de carte vide.
      */
      className="w-full"
      config={CHART_CONFIG}
      style={{ height: `${data.length * 2.25}rem` }}
    >
      <BarChart
        accessibilityLayer
        data={data}
        layout="vertical"
        margin={{ left: 0, right: 36 }}
      >
        <XAxis hide type="number" />
        <YAxis
          axisLine={false}
          dataKey="genre"
          tickLine={false}
          tickMargin={4}
          type="category"
          /*
            Une largeur fixe pour la colonne d'intitulés : sans elle, Recharts la redimensionne au
            plus long libellé et les barres de deux profils différents ne commencent plus au même
            endroit.
          */
          width={104}
        />

        <ChartTooltip
          content={<ChartTooltipContent hideLabel />}
          cursor={false}
        />

        {/*
            Aucune animation de montage : Recharts fait pousser ses barres depuis zéro à chaque
            affichage, ce qui est une décoration sur une statistique figée et retarde la lecture de
            la seule chose qu'on est venu voir.
          */}
        {/*
          `var(--color-count)` et non la couleur en dur : c'est la variable que `ChartStyle` injecte
          depuis `CHART_CONFIG`, donc la barre, la pastille de légende et l'infobulle ne peuvent pas
          diverger. Sans `fill` du tout — l'état de ce fichier pendant dix minutes le 12 septembre
          2026 — Recharts retombe sur son noir par défaut, ce qui se voit surtout en thème clair.
        */}
        <Bar
          dataKey="count"
          fill="var(--color-count)"
          isAnimationActive={false}
          radius={[0, 3, 3, 0]}
        >
          <LabelList
            className="fill-muted-foreground tabular-nums"
            dataKey="count"
            fontSize={12}
            offset={8}
            position="right"
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
