"use client";

import { PlayIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import type { MediaDetail } from "@/features/media/schemas/media.schema";

/**
 * Bande-annonce, en clic-pour-lire.
 *
 * Un `<iframe>` YouTube posé au rendu coûte près d'un mégaoctet de scripts tiers et une poignée de
 * cookies, **sur chaque fiche, qu'on lance la vidéo ou non**. On n'affiche donc que la vignette
 * jusqu'au clic : c'est le seul composant client de l'onglet, et il ne pèse que ce bouton.
 *
 * `youtube-nocookie` et `rel=noreferrer` pour la même raison que dans les liens externes : la
 * plateforme n'a pas à savoir depuis quelle fiche on arrive tant qu'on n'a rien demandé.
 */
const EMBED_URLS: Record<string, (id: string) => string> = {
  youtube: (id) =>
    `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`,
  dailymotion: (id) =>
    `https://www.dailymotion.com/embed/video/${id}?autoplay=1`,
};

export function MediaTrailer({
  trailer,
  title,
}: {
  trailer: NonNullable<MediaDetail["trailer"]>;
  title: string;
}) {
  const [playing, setPlaying] = useState(false);

  const embed =
    trailer.id && trailer.site ? EMBED_URLS[trailer.site]?.(trailer.id) : null;

  if (!embed) return null;

  if (playing) {
    return (
      <div className="aspect-video overflow-hidden rounded-lg bg-muted">
        <iframe
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="size-full"
          referrerPolicy="no-referrer"
          src={embed}
          title={`Bande-annonce de ${title}`}
        />
      </div>
    );
  }

  return (
    <button
      className="group relative block aspect-video w-full overflow-hidden rounded-lg bg-muted transition-opacity hover:opacity-95 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
      onClick={() => setPlaying(true)}
      type="button"
    >
      {trailer.thumbnail ? (
        <Image
          alt=""
          className="object-cover"
          fill
          sizes="(max-width: 1024px) 100vw, 720px"
          src={trailer.thumbnail}
        />
      ) : null}

      <span className="absolute inset-0 flex items-center justify-center bg-black/30">
        <span className="flex size-14 items-center justify-center rounded-full bg-background/90 shadow-lg transition-transform group-hover:scale-105">
          <PlayIcon
            aria-hidden="true"
            className="size-6 translate-x-0.5 fill-foreground text-foreground"
          />
        </span>
      </span>

      <span className="sr-only">Lire la bande-annonce de {title}</span>
    </button>
  );
}
