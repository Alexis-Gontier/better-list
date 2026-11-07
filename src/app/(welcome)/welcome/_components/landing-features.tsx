import {
  ChartPieIcon,
  CirclePlayIcon,
  EyeOffIcon,
  LibraryBigIcon,
  type LucideIcon,
  NotebookPenIcon,
  TrophyIcon,
} from "lucide-react";
import { type ReactNode, Suspense } from "react";

import {
  JournalFragment,
  PrivacyFragment,
  ProgressFragment,
  ShelfFragment,
  Showcased,
  StatsFragment,
  TierFragment,
} from "@/app/(welcome)/welcome/_components/landing-fragments";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Une tuile : l'étiquette, le titre et la phrase qui portent le sens, puis **la scène**, un cadre
 * plus sombre qui tient le vrai composant de l'app et prend toute la hauteur restante (le vide d'une
 * tuile devient le cadre de son fragment). La scène est `inert` : ni focus ni lecteur d'écran, ses
 * liens mèneraient à des fiches fermées au visiteur. `row` met le texte à gauche dès `lg`. En 390,
 * la scène va jusqu'aux bords : encadrée, elle tronquait la légende des statistiques.
 */
function Tile({
  id,
  icon: Icon,
  eyebrow,
  title,
  text,
  layout = "column",
  className,
  children,
}: {
  id?: string;
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  text: string;
  layout?: "column" | "row";
  className: string;
  children: ReactNode;
}) {
  const row = layout === "row";
  return (
    <li
      className={cn(
        "reveal group relative flex min-w-0 scroll-mt-24 flex-col overflow-hidden rounded-2xl border bg-card transition-colors hover:border-foreground/20",
        row && "lg:flex-row",
        className,
      )}
      id={id}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-8 top-0 h-px bg-linear-to-r from-transparent via-foreground/40 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      />
      <div
        className={cn(
          "flex flex-col gap-2 p-5 sm:p-7",
          row && "lg:w-2/5 lg:shrink-0 lg:justify-end lg:pr-0",
        )}
      >
        <span className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
          <Icon aria-hidden="true" className="size-4 text-primary" />
          {eyebrow}
        </span>
        <h3 className="text-balance font-heading font-semibold text-xl tracking-tight">
          {title}
        </h3>
        <p className="text-pretty text-muted-foreground">{text}</p>
      </div>
      <div
        className={cn(
          "pointer-events-none flex flex-1 select-none flex-col justify-center border-t bg-background/70 p-4 sm:mx-7 sm:mb-7 sm:rounded-xl sm:border sm:p-5",
          row && "lg:my-7 lg:ml-7",
        )}
        inert
      >
        {children}
      </div>
    </li>
  );
}

/**
 * « Tout votre suivi au même endroit » : six tuiles sur une grille de six colonnes (4 + 2, 2 + 4,
 * 3 + 3), une seule colonne en dessous de `lg`. La tier list, en `row`, casse la répétition.
 */
export function LandingFeatures() {
  return (
    <section
      aria-labelledby="fonctionnalites-titre"
      className="flex scroll-mt-24 flex-col items-center gap-8 sm:gap-14"
      id="fonctionnalites"
    >
      <div className="reveal flex max-w-2xl flex-col gap-3.5 sm:items-center sm:text-center">
        <h2
          className="text-balance font-heading font-semibold text-3xl tracking-tight sm:text-5xl"
          id="fonctionnalites-titre"
        >
          Tout votre suivi au même endroit
        </h2>
        <p className="text-pretty text-lg text-muted-foreground">
          Ce qu'AniList, un tableur et une note de téléphone faisaient chacun à
          moitié.
        </p>
      </div>
      <ul className="grid w-full gap-4 lg:grid-cols-6">
        <Tile
          className="lg:col-span-4"
          eyebrow="Journal"
          icon={NotebookPenIcon}
          text="Chaque épisode coché s'inscrit à sa date. Votre année se relit d'un coup d'œil."
          title="Un journal qui s'écrit seul"
        >
          <Suspense fallback={<Skeleton className="h-64 w-full rounded-lg" />}>
            <Showcased
              render={({ media }, now) => (
                <JournalFragment media={media} now={now} />
              )}
            />
          </Suspense>
        </Tile>
        <Tile
          className="lg:col-span-2 lg:[--reveal-start:15%]"
          eyebrow="Suivi"
          icon={CirclePlayIcon}
          text="Un épisode de plus, une note, un statut. Les épisodes sortis remontent en tête, et Discord peut vous prévenir."
          title="Le suivi en un geste"
        >
          <Suspense fallback={<Skeleton className="h-72 w-full rounded-lg" />}>
            <Showcased
              render={({ media }) => <ProgressFragment media={media} />}
            />
          </Suspense>
        </Tile>
        <Tile
          className="lg:col-span-2"
          eyebrow="Collection"
          icon={LibraryBigIcon}
          text="Cochez ceux que vous possédez, Better-List compte ceux qui manquent."
          title="Vos tomes, un par un"
        >
          <Suspense fallback={<Skeleton className="h-44 w-full rounded-lg" />}>
            <Showcased
              render={({ media }) => <ShelfFragment media={media} />}
            />
          </Suspense>
        </Tile>
        <Tile
          className="lg:col-span-4 lg:[--reveal-start:15%]"
          eyebrow="Tier lists"
          icon={TrophyIcon}
          id="tier-lists"
          layout="row"
          text="Classez une saison, puis aimez et copiez les classements des autres."
          title="Des tier lists à partager"
        >
          <Suspense fallback={<Skeleton className="h-60 w-full rounded-lg" />}>
            <Showcased render={({ media }) => <TierFragment media={media} />} />
          </Suspense>
        </Tile>
        <Tile
          className="lg:col-span-3"
          eyebrow="Statistiques"
          icon={ChartPieIcon}
          text="Où en sont vos séries, statut par statut, sur votre profil."
          title="Votre année en chiffres"
        >
          <StatsFragment />
        </Tile>
        <Tile
          className="lg:col-span-3 lg:[--reveal-start:15%]"
          eyebrow="Confidentialité"
          icon={EyeOffIcon}
          id="confidentialite"
          text="Journal, statistiques, favoris : chaque section se règle, et rien n'est public."
          title="Vous choisissez qui voit quoi"
        >
          <PrivacyFragment />
        </Tile>
      </ul>
    </section>
  );
}
