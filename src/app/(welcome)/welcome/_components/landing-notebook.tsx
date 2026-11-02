import Image from "next/image";
import type { ReactNode } from "react";

import { LANDING_COVERS } from "@/app/(welcome)/welcome/_lib/landing-covers";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

function Cover({ src, className }: { src: string; className?: string }) {
  return (
    <div
      className={cn(
        "relative aspect-2/3 shrink-0 overflow-hidden rounded-sm bg-muted",
        className,
      )}
    >
      <Image alt="" className="object-cover" fill sizes="160px" src={src} />
    </div>
  );
}

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

function TrackingVisual() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-background p-4">
      <p className="flex items-center gap-2 font-medium text-sm">
        <span className="size-2 rounded-full bg-status-current" />
        En cours
      </p>
      {TRACKING.map((item) => (
        <div className="flex items-center gap-3" key={item.title}>
          <Cover className="w-8" src={item.cover} />
          <div className="flex min-w-0 flex-col">
            <span className="text-sm">{item.title}</span>
            <span className="text-muted-foreground text-xs">{item.detail}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

const VOLUMES = Array.from({ length: 14 }, (_, index) => index + 1);
const MISSING = new Set([7, 11]);

function ShelfVisual() {
  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="grid grid-cols-7 gap-1.5">
        {VOLUMES.map((volume) => (
          <span
            className={cn(
              "flex size-7 items-center justify-center rounded-sm text-xs",
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
      <Cover className="w-24" src={LANDING_COVERS.kenshin} />
    </div>
  );
}

function ListsVisual() {
  return (
    <div className="grid w-44 grid-cols-2 gap-1 overflow-hidden rounded-md">
      {[
        LANDING_COVERS.frieren,
        LANDING_COVERS.chainsawMan,
        LANDING_COVERS.dandadan,
        LANDING_COVERS.kaiju,
      ].map((src) => (
        <Cover className="w-full rounded-none" key={src} src={src} />
      ))}
    </div>
  );
}

const MEMBERS = ["AG", "SO", "LT", "MA", "KM"] as const;
const SETTINGS = [
  { label: "Journal visible des membres", checked: true },
  { label: "Statistiques visibles", checked: true },
  { label: "Favoris visibles", checked: false },
] as const;

function CircleVisual() {
  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-background p-4">
      <div className="flex items-center gap-3">
        <div className="flex -space-x-2">
          {MEMBERS.map((initials) => (
            <Avatar className="size-7 ring-2 ring-background" key={initials}>
              <AvatarFallback className="text-[10px]">
                {initials}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
        <span className="text-muted-foreground text-xs">9 membres</span>
      </div>
      {/* Illustratifs : désactivés, ils ne règlent rien. */}
      {SETTINGS.map((setting) => (
        <div
          className="flex items-center justify-between gap-4 text-xs"
          key={setting.label}
        >
          {setting.label}
          <Switch
            aria-label={setting.label}
            checked={setting.checked}
            disabled
          />
        </div>
      ))}
    </div>
  );
}

const BLOCKS: {
  id: string;
  title: string;
  lines: string[];
  visual: ReactNode;
}[] = [
  {
    id: "suivi",
    title: "Le suivi",
    lines: [
      "Les épisodes sortis en tête de l'accueil",
      "Le retard compté épisode par épisode",
      "Le planning de la semaine",
      "Une alerte sur votre salon Discord",
    ],
    visual: <TrackingVisual />,
  },
  {
    id: "etagere",
    title: "L'étagère",
    lines: [
      "Votre collection, tome par tome",
      "Les tomes qui vous manquent",
      "Une plage posée d'un glissé",
      "« À jour » tant que la série paraît",
    ],
    visual: <ShelfVisual />,
  },
  {
    id: "listes",
    title: "Les listes",
    lines: [
      "Des classements avec leur ligne de coupe",
      "« Quand c'est fini » vous prévient",
      "Aimer et copier celles des autres",
      "Un lien pour les montrer à qui n'a pas de compte",
    ],
    visual: <ListsVisual />,
  },
  {
    id: "entre-vous",
    title: "Entre vous",
    lines: [
      "Une dizaine de membres, sur invitation",
      "Rien n'est public",
      "Un profil que vous réglez section par section",
      "GitHub, Discord ou Google",
    ],
    visual: <CircleVisual />,
  },
];

/**
 * « Le carnet complet » : le titre tient à gauche pendant que les quatre blocs défilent. Chaque
 * bloc alterne le côté de son visuel, pour que l'œil ne lise pas une colonne de listes.
 */
export function LandingNotebook() {
  return (
    <section className="grid gap-16 bg-secondary px-6 py-24 sm:px-10 lg:grid-cols-[1fr_1.3fr] lg:px-16 lg:py-32">
      <h2 className="self-start font-bold font-heading text-[clamp(56px,6.6vw,88px)] leading-none tracking-tight lg:sticky lg:top-8">
        Le carnet complet
      </h2>

      <div className="flex flex-col gap-30">
        {BLOCKS.map((block, index) => (
          <article
            className="flex scroll-mt-8 flex-col gap-5"
            id={block.id}
            key={block.id}
          >
            <h3 className="font-bold font-heading text-[28px] tracking-tight">
              {block.title}
            </h3>
            <div className="grid items-start gap-8 sm:grid-cols-2">
              <div className={cn(index % 2 === 1 && "sm:order-last")}>
                {block.visual}
              </div>
              <ul className="flex flex-col gap-3 text-sm">
                {block.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
