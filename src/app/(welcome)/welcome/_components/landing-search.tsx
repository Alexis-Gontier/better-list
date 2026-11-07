import { Suspense } from "react";

import {
  SearchFragment,
  Showcased,
} from "@/app/(welcome)/welcome/_components/landing-fragments";

/** La palette Ctrl K, montrée ouverte sur trois tendances du moment. */
export function LandingSearch() {
  return (
    <section className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-24">
      <div className="reveal flex max-w-md flex-col gap-4">
        <h2 className="text-balance font-heading font-semibold text-3xl tracking-tight sm:text-[44px] sm:leading-[1.1]">
          Toute œuvre, en une touche
        </h2>
        <p className="text-pretty text-lg text-muted-foreground">
          Ctrl K ouvre la recherche partout dans l'app. Animes, mangas, webtoons
          et light novels : tout le catalogue d'AniList, avec vos statuts.
        </p>
      </div>
      <div className="reveal w-full lg:max-w-xl lg:[--reveal-start:15%]" inert>
        <Suspense fallback={<SearchFragment covers={[]} />}>
          <Showcased
            render={({ covers }) => <SearchFragment covers={covers} />}
          />
        </Suspense>
      </div>
    </section>
  );
}
