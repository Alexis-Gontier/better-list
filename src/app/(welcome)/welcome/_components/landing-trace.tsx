import Image from "next/image";

import { LANDING_COVERS } from "@/app/(welcome)/welcome/_lib/landing-covers";
import { cn } from "@/lib/utils";

const ACTIVITY_SHADES = [
  "bg-muted",
  "bg-activity-1",
  "bg-activity-2",
  "bg-activity-3",
  "bg-activity-4",
] as const;

/**
 * 20 semaines × 7 jours, un motif **fixe** plutôt qu'aléatoire : un tirage différerait entre le
 * serveur et le client, et la case du jour (la dernière) doit toujours être la plus vive.
 */
const DAYS = Array.from({ length: 140 }, (_, day) => ({
  id: `jour-${day}`,
  shade:
    day === 139
      ? "bg-primary"
      : ACTIVITY_SHADES[((day * 37) % 11) % ACTIVITY_SHADES.length],
}));

const ENTRIES = [
  {
    when: "Ce soir",
    title: "Les Carnets de l'apothicaire",
    detail: "Ép. 13 → 14",
    cover: LANDING_COVERS.apothecary,
    current: true,
  },
  {
    when: "Hier",
    title: "Dragon Ball Super: Beerus",
    detail: "Ép. 4 → 5 · terminé ★★★★",
    cover: LANDING_COVERS.dragonBall,
    current: false,
  },
] as const;

const TITLE =
  "font-bold font-heading text-[clamp(40px,5vw,64px)] leading-none tracking-tight";

/** « Un épisode, une trace » : le geste à gauche, ce qu'il laisse dans le journal à droite. */
export function LandingTrace() {
  return (
    <section
      className="grid grid-cols-1 lg:min-h-[90svh] lg:grid-cols-2"
      id="journal"
    >
      <div className="flex min-h-[60svh] flex-col justify-between gap-12 bg-background p-6 sm:p-10 lg:p-16">
        <div className="flex flex-1 flex-col justify-center gap-2">
          <p className="text-muted-foreground text-sm">Ce soir, 22 h 40</p>
          <p className="text-xl">Les Carnets de l'apothicaire</p>
          <p className="text-xl">ép. 13 → 14</p>
          <p className="text-muted-foreground text-sm">
            Un clic sur « +1 », rien d'autre à remplir.
          </p>
        </div>
        {/* Le titre est coupé en deux colonnes ; un lecteur d'écran le reçoit entier, ici. */}
        <h2 className={TITLE}>
          Un épisode<span className="sr-only">, une trace</span>
        </h2>
      </div>

      <div className="flex min-h-[60svh] flex-col justify-between gap-12 bg-card p-6 sm:p-10 lg:p-16">
        <div className="flex flex-1 items-center justify-center">
          <div className="flex w-full max-w-md flex-col gap-5 rounded-lg border bg-background p-5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Journal</span>
              <span className="text-muted-foreground text-xs">
                Novembre 2026
              </span>
            </div>
            <div
              aria-hidden="true"
              className="grid grid-flow-col grid-rows-7 justify-start gap-1 overflow-hidden"
            >
              {DAYS.map((day) => (
                <span
                  className={cn("size-3 rounded-xs", day.shade)}
                  key={day.id}
                />
              ))}
            </div>
            <ul className="flex flex-col gap-1">
              {ENTRIES.map((entry) => (
                <li
                  className={cn(
                    "flex items-center gap-4 rounded-md p-2",
                    entry.current && "bg-muted",
                  )}
                  key={entry.title}
                >
                  <span className="w-14 shrink-0 text-muted-foreground text-xs">
                    {entry.when}
                  </span>
                  <div className="relative h-10.5 w-7 shrink-0 overflow-hidden rounded-sm bg-muted">
                    <Image
                      alt=""
                      className="object-cover"
                      fill
                      sizes="28px"
                      src={entry.cover}
                    />
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm">{entry.title}</span>
                    <span className="text-muted-foreground text-xs">
                      {entry.detail}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p aria-hidden="true" className={cn(TITLE, "text-right")}>
          une trace
        </p>
      </div>
    </section>
  );
}
