import type { ReactNode } from "react";

import {
  CircleFragment,
  JournalFragment,
  ListsFragment,
  ShelfFragment,
  TrackingFragment,
} from "@/app/(welcome)/welcome/_components/carnet-fragments";
import { LandingBand } from "@/app/(welcome)/welcome/_components/landing-frame";
import { cn } from "@/lib/utils";

const FEATURES: {
  title: string;
  text: string;
  visual: ReactNode;
  wide?: boolean;
}[] = [
  {
    title: "Le suivi",
    text: "Les épisodes sortis en tête de l'accueil, le retard compté épisode par épisode, et une alerte sur votre salon Discord.",
    visual: <TrackingFragment />,
  },
  {
    title: "Le journal",
    text: "Chaque « +1 » est daté, sans rien remplir. Une année se lit d'un coup d'œil.",
    visual: <JournalFragment />,
  },
  {
    title: "L'étagère",
    text: "Votre collection tome par tome, ceux qui manquent, une plage posée d'un glissé.",
    visual: <ShelfFragment />,
  },
  {
    title: "Les listes",
    text: "Des classements à aimer et à copier, et un lien pour les montrer à qui n'a pas de compte.",
    visual: <ListsFragment />,
  },
  {
    title: "Entre vous",
    text: "Rien n'est public. Chaque section de votre profil se règle, membre par membre.",
    visual: <CircleFragment />,
    wide: true,
  },
];

/** La grille des fonctionnalités : des cellules bordées, chacune avec son vrai fragment d'app. */
export function LandingFeatures() {
  return (
    <LandingBand id="fonctionnalites">
      <div className="flex flex-col items-center gap-3 px-5 py-16 text-center sm:px-8 sm:py-20">
        <h2 className="text-balance font-heading font-semibold text-[clamp(30px,4vw,44px)] leading-tight tracking-tight">
          Tout ce que vous suivez,{" "}
          <span className="text-primary">au même endroit</span>
        </h2>
        <p className="max-w-[48ch] text-muted-foreground">
          Animes, mangas, webtoons et light novels, avec les données d'AniList.
        </p>
      </div>
      <div className="grid border-border border-t sm:grid-cols-2">
        {FEATURES.map((feature, index) => (
          <article
            className={cn(
              "flex flex-col gap-6 border-border p-6 sm:p-8",
              index > 0 && "border-t",
              index % 2 === 1 && "sm:border-l",
              index === 1 && "sm:border-t-0",
              feature.wide &&
                "sm:col-span-2 sm:grid sm:grid-cols-2 sm:items-center sm:gap-8 sm:border-l-0",
            )}
            key={feature.title}
          >
            <div className="flex flex-col gap-2">
              <h3 className="font-heading font-semibold text-xl">
                {feature.title}
              </h3>
              <p className="text-muted-foreground">{feature.text}</p>
            </div>
            <div className="rounded-lg bg-card p-4" data-ui>
              {feature.visual}
            </div>
          </article>
        ))}
      </div>
    </LandingBand>
  );
}
