import Image from "next/image";
import type { ReactNode } from "react";

import { LANDING_COVERS } from "@/app/(welcome)/welcome/_lib/landing-covers";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

/**
 * Les fragments d'interface de la landing : des morceaux **à taille réelle** de l'app, écrits en
 * dur. Ils servent deux fois, dans les onglets du hero et dans la grille des fonctionnalités.
 */

function Cover({ src, className }: { src: string; className?: string }) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-sm bg-muted",
        className,
      )}
    >
      <Image alt="" className="object-cover" fill sizes="80px" src={src} />
    </div>
  );
}

export function FragmentTitle({ children }: { children: ReactNode }) {
  return <p className="font-medium text-sm">{children}</p>;
}

const TRACKING = [
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

export function TrackingFragment() {
  return (
    <div className="flex flex-col gap-3">
      {TRACKING.map((item) => (
        <div className="flex items-center gap-3" key={item.title}>
          <Cover className="h-12 w-8" src={item.cover} />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm">{item.title}</span>
            <span className="text-muted-foreground text-sm">{item.detail}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

const SHADES = [
  "bg-muted",
  "bg-activity-4",
  "bg-activity-3",
  "bg-activity-2",
  "bg-activity-1",
] as const;

/** Un motif fixe : un tirage différerait entre le serveur et le client. */
const DAYS = Array.from({ length: 112 }, (_, day) => ({
  id: `jour-${day}`,
  shade: day === 111 ? "bg-primary" : SHADES[((day * 37) % 11) % SHADES.length],
}));

export function JournalFragment() {
  return (
    <div className="flex flex-col gap-3">
      <div
        aria-hidden="true"
        className="grid grid-flow-col grid-rows-7 justify-start gap-1 overflow-hidden"
      >
        {DAYS.map((day) => (
          <span className={cn("size-3 rounded-xs", day.shade)} key={day.id} />
        ))}
      </div>
      <p className="text-muted-foreground text-sm">
        Hier · Dragon Ball Super, ép. 4 → 5 · terminé ★★★★
      </p>
    </div>
  );
}

const VOLUMES = Array.from({ length: 14 }, (_, index) => index + 1);
const MISSING = new Set([7, 11]);

export function ShelfFragment() {
  return (
    <div className="flex items-start gap-4">
      <Cover className="aspect-2/3 w-16" src={LANDING_COVERS.kenshinManga} />
      <div className="flex flex-1 flex-col gap-2">
        <span className="text-muted-foreground text-sm">12 tomes sur 14</span>
        <div className="grid grid-cols-7 gap-1">
          {VOLUMES.map((volume) => (
            <span
              className={cn(
                "flex h-7 items-center justify-center rounded-sm text-sm",
                MISSING.has(volume)
                  ? "bg-background text-muted-foreground ring-1 ring-border ring-inset"
                  : "bg-secondary",
              )}
              key={volume}
            >
              {volume}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

const LIST_COVERS = [
  LANDING_COVERS.frieren,
  LANDING_COVERS.chainsawMan,
  LANDING_COVERS.dandadan,
  LANDING_COVERS.kaiju,
] as const;

export function ListsFragment() {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-4 gap-1.5">
        {LIST_COVERS.map((src) => (
          <Cover className="aspect-2/3 w-full" key={src} src={src} />
        ))}
      </div>
      <p className="text-muted-foreground text-sm">
        Top de l'automne · liste de Sora · 6 ♥
      </p>
    </div>
  );
}

const SETTINGS = [
  { label: "Journal visible des membres", checked: true },
  { label: "Statistiques visibles", checked: true },
  { label: "Favoris visibles", checked: false },
] as const;

export function CircleFragment() {
  return (
    <div className="flex flex-col gap-3">
      {/* Illustratifs : désactivés, ils ne règlent rien. */}
      {SETTINGS.map((setting) => (
        <div
          className="flex items-center justify-between gap-4 text-sm"
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
