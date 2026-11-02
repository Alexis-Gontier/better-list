import {
  EpisodeRow,
  type EpisodeState,
} from "@/app/(welcome)/welcome/_components/episode-row";

const STATES: { state: EpisodeState; word: string }[] = [
  { state: "arrive", word: "Sorti" },
  { state: "live", word: "Vu" },
  { state: "done", word: "Noté" },
];

/** « Un épisode, une trace » : la même rangée trois fois, de la sortie au journal. */
export function LandingEpisode() {
  return (
    <section
      className="mx-auto grid w-full max-w-5xl scroll-mt-8 grid-cols-1 gap-6 px-4 py-24 sm:px-8 lg:grid-cols-[1fr_640px_1fr] lg:gap-x-8 lg:py-36"
      id="episode"
    >
      <h2 className="font-heading font-medium text-[26px] tracking-tight lg:col-start-2 lg:text-[32px]">
        Un épisode, une trace
      </h2>
      {STATES.map(({ state, word }) => (
        <div className="contents" key={state}>
          <span className="text-[17px] text-muted-foreground max-lg:order-last max-lg:hidden lg:col-start-1 lg:self-center lg:text-right lg:text-[22px]">
            {word}
          </span>
          <div className="flex flex-col gap-2.5 lg:col-start-2">
            <EpisodeRow state={state} />
            <span className="text-[17px] text-muted-foreground lg:hidden">
              {word}
            </span>
          </div>
        </div>
      ))}
      <p className="text-muted-foreground lg:col-start-2">
        Un clic sur « +1 », rien d'autre à remplir : la date et l'heure vont
        seules au journal.
      </p>
    </section>
  );
}
