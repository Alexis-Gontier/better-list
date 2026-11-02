import Image from "next/image";
import type { ReactNode } from "react";

import { LANDING_COVERS } from "@/app/(welcome)/welcome/_lib/landing-covers";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const TRACKING = [
  {
    title: "Les Carnets de l'apothicaire",
    detail: "Ép. 14 · 2 de retard",
    cover: LANDING_COVERS.apothecary,
  },
  {
    title: "Cyberpunk: Edgerunners 2",
    detail: "Ép. 3 · sort jeudi",
    cover: LANDING_COVERS.edgerunners,
  },
  {
    title: "Overgeared",
    detail: "Ch. 212 · à jour",
    cover: LANDING_COVERS.overgeared,
  },
] as const;

const SHADES = [
  "bg-muted",
  "bg-activity-4",
  "bg-activity-3",
  "bg-activity-2",
  "bg-activity-1",
] as const;

/** Un motif fixe : un tirage différerait entre le serveur et le client. */
const DAYS = Array.from({ length: 84 }, (_, day) => ({
  id: `jour-${day}`,
  shade: day === 83 ? "bg-primary" : SHADES[((day * 37) % 11) % SHADES.length],
}));

const VOLUMES = Array.from({ length: 14 }, (_, index) => index + 1);
const MISSING = new Set([7, 11]);

const LIST_COVERS = [
  LANDING_COVERS.frieren,
  LANDING_COVERS.chainsawMan,
  LANDING_COVERS.dandadan,
  LANDING_COVERS.kaiju,
] as const;

function Slice({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3 bg-card p-5">{children}</div>;
}

function SliceTitle({ children }: { children: ReactNode }) {
  return <p className="font-medium text-sm">{children}</p>;
}

/** Les trois tranches du carnet, comme dans l'app : chacune est un vrai fragment d'interface. */
const SLICES: {
  id: string;
  panel: ReactNode;
  notes: [{ name: string; text: string }, { name: string; text: string }];
}[] = [
  {
    id: "suivi",
    panel: (
      <Slice>
        <SliceTitle>En cours</SliceTitle>
        {TRACKING.map((item) => (
          <div className="flex items-center gap-3" key={item.title}>
            <div className="relative h-12 w-8 shrink-0 overflow-hidden rounded-sm bg-muted">
              <Image
                alt=""
                className="object-cover"
                fill
                sizes="32px"
                src={item.cover}
              />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm">{item.title}</span>
              <span className="text-muted-foreground text-sm">
                {item.detail}
              </span>
            </div>
          </div>
        ))}
      </Slice>
    ),
    notes: [
      {
        name: "Le suivi",
        text: "Le retard compté épisode par épisode, les sorties en tête de l'accueil.",
      },
      {
        name: "Le planning",
        text: "Ce qui sort cette semaine, et une alerte sur votre salon Discord.",
      },
    ],
  },
  {
    id: "journal",
    panel: (
      <Slice>
        <SliceTitle>Journal · 12 semaines</SliceTitle>
        <div
          aria-hidden="true"
          className="grid grid-flow-col grid-rows-7 justify-start gap-1"
        >
          {DAYS.map((day) => (
            <span className={cn("size-3 rounded-xs", day.shade)} key={day.id} />
          ))}
        </div>
        <SliceTitle>Berserk · 12 tomes sur 14</SliceTitle>
        <div className="grid grid-cols-7 gap-1.5">
          {VOLUMES.map((volume) => (
            <span
              className={cn(
                "flex h-7 items-center justify-center rounded-sm text-sm",
                MISSING.has(volume)
                  ? "bg-background text-muted-foreground"
                  : "bg-secondary",
              )}
              key={volume}
            >
              {volume}
            </span>
          ))}
        </div>
      </Slice>
    ),
    notes: [
      {
        name: "Le journal",
        text: "Chaque épisode daté, sans rien remplir. Une année se lit d'un coup d'œil.",
      },
      {
        name: "L'étagère",
        text: "Vos tomes, ceux qui manquent, une plage posée d'un glissé.",
      },
    ],
  },
  {
    id: "listes",
    panel: (
      <Slice>
        <SliceTitle>Top de l'automne · liste de Sora</SliceTitle>
        <div className="grid grid-cols-4 gap-1.5">
          {LIST_COVERS.map((src) => (
            <div
              className="relative aspect-2/3 overflow-hidden rounded-sm bg-muted"
              key={src}
            >
              <Image
                alt=""
                className="object-cover"
                fill
                sizes="80px"
                src={src}
              />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-4 text-sm">
          Journal visible des membres
          <Switch aria-label="Journal visible des membres" checked disabled />
        </div>
      </Slice>
    ),
    notes: [
      {
        name: "Les listes",
        text: "Des classements à aimer et à copier, un lien pour qui n'a pas de compte.",
      },
      {
        name: "Entre vous",
        text: "Une dizaine de membres. Rien n'est public, chaque section du profil se règle.",
      },
    ],
  },
];

function Note({
  name,
  text,
  align,
}: {
  name: string;
  text: string;
  align: "left" | "right";
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 lg:max-w-[24ch]",
        align === "right" && "lg:ml-auto lg:text-right",
      )}
    >
      <span className="font-medium text-lg">{name}</span>
      <span className="text-[15px] text-muted-foreground">{text}</span>
    </div>
  );
}

/**
 * « Le carnet » : un seul panneau montré entier, comme une planche de manuel, annoté dans ses deux
 * marges. Sur un téléphone, il se coupe en trois tranches, chacune suivie de ses deux notes.
 */
export function LandingNotebook() {
  return (
    <section
      className="mx-auto flex w-full max-w-5xl scroll-mt-8 flex-col gap-10 px-4 py-24 sm:px-8 lg:py-36"
      id="carnet"
    >
      <h2 className="font-heading font-medium text-[26px] tracking-tight lg:text-center lg:text-[32px]">
        Tout le carnet, sur une page
      </h2>
      <div className="flex flex-col gap-14 lg:gap-0">
        {SLICES.map((slice, index) => (
          <div
            className="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-[1fr_400px_1fr] lg:items-center lg:gap-x-12"
            key={slice.id}
          >
            <div
              className={cn(
                "col-span-2 overflow-hidden lg:col-span-1 lg:col-start-2 lg:row-start-1",
                index === 0 && "lg:rounded-t-lg",
                index === SLICES.length - 1 && "lg:rounded-b-lg",
                "max-lg:rounded-lg",
              )}
              data-ui
            >
              {slice.panel}
            </div>
            <div className="lg:col-start-1 lg:row-start-1">
              <Note align="right" {...slice.notes[0]} />
            </div>
            <div className="lg:col-start-3 lg:row-start-1">
              <Note align="left" {...slice.notes[1]} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
