"use client";

import { CheckIcon, PlusIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { LANDING_COVERS } from "@/app/(welcome)/welcome/_lib/landing-covers";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type EpisodeState = "arrive" | "live" | "done";

/**
 * Une rangée « En cours », telle que l'accueil la montre. La rangée `live` est **la seule chose
 * qu'on peut faire sur la landing** : son « +1 » marche, et la fait passer à l'état noté — c'est
 * tout le geste du produit, en un clic.
 */
export function EpisodeRow({ state }: { state: EpisodeState }) {
  const [done, setDone] = useState(state === "done");

  return (
    <div
      className={cn(
        "flex w-full items-center gap-4 rounded-lg bg-card p-3",
        state === "live" && !done && "ring-1 ring-border",
      )}
      data-ui
    >
      <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-sm bg-muted">
        <Image
          alt=""
          className="object-cover"
          fill
          sizes="44px"
          src={LANDING_COVERS.apothecary}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">Les Carnets de l'apothicaire</span>
        <span className="text-muted-foreground text-sm">
          {done
            ? "Ép. 14 vu · noté au journal à 22 h 40"
            : "Ép. 14 sorti ce soir · vous en êtes au 13"}
        </span>
      </div>
      {done ? (
        <span className="flex items-center gap-1.5 text-muted-foreground text-sm">
          <CheckIcon aria-hidden="true" className="size-4" />
          Noté
        </span>
      ) : state === "live" ? (
        <Button onClick={() => setDone(true)} size="sm" variant="outline">
          <PlusIcon data-icon="inline-start" />1
        </Button>
      ) : null}
    </div>
  );
}
