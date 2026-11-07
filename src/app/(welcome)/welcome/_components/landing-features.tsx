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
 * Une tuile : un vrai composant de l'app en haut, `inert` (ni focus ni lecteur d'écran, ses liens
 * mèneraient à des fiches fermées au visiteur), le titre et la phrase qui portent le sens.
 */
function Tile({
  id,
  title,
  text,
  className,
  children,
}: {
  id?: string;
  title: string;
  text: string;
  className: string;
  children: ReactNode;
}) {
  return (
    <li
      className={cn(
        "reveal flex min-w-0 scroll-mt-24 flex-col justify-between gap-6 rounded-2xl border bg-card p-5 transition-colors hover:border-foreground/20 sm:p-7",
        className,
      )}
      id={id}
    >
      <div className="pointer-events-none select-none" inert>
        {children}
      </div>
      <div className="flex flex-col gap-1.5">
        <h3 className="font-semibold text-lg">{title}</h3>
        <p className="text-pretty text-muted-foreground">{text}</p>
      </div>
    </li>
  );
}

/**
 * « Tout votre suivi au même endroit » : six tuiles sur une grille de six colonnes (4 + 2, 2 + 4,
 * 3 + 3), une seule colonne en dessous de `lg`.
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
          id="tier-lists"
          text="Classez une saison, puis aimez et copiez les classements des autres."
          title="Des tier lists à partager"
        >
          <Suspense fallback={<Skeleton className="h-60 w-full rounded-lg" />}>
            <Showcased render={({ media }) => <TierFragment media={media} />} />
          </Suspense>
        </Tile>
        <Tile
          className="lg:col-span-3"
          text="Où en sont vos séries, statut par statut, sur votre profil."
          title="Votre année en chiffres"
        >
          <StatsFragment />
        </Tile>
        <Tile
          className="lg:col-span-3 lg:[--reveal-start:15%]"
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
