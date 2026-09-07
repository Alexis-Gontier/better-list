import { PlayIcon } from "lucide-react";
import Image from "next/image";

import type { MediaDetail } from "@/features/media/schemas/media.schema";

type MediaTrailerProps = {
  /** `trailer` d'AniList : un identifiant, un hôte, une vignette. Souvent nul. */
  trailer: MediaDetail["trailer"];
};

/**
 * La bande-annonce — **une vignette qui mène à la vidéo, pas un lecteur intégré.**
 *
 * Un `<iframe>` YouTube charge plusieurs centaines de kilo-octets de scripts tiers et pose ses
 * cookies avant même qu'on ait cliqué, sur une page qu'on ouvre le plus souvent pour lire un
 * synopsis. La vignette coûte une image et dit exactement la même chose.
 *
 * Les deux hôtes sont ceux qu'AniList référence, et les seuls que `next.config.ts` autorise à
 * `next/image` — la liste de ce fichier et celle de la configuration doivent rester d'accord.
 */
export function MediaTrailer({ trailer }: MediaTrailerProps) {
  const url = trailerUrl(trailer);
  if (!url || !trailer) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-semibold text-lg">Bande-annonce</h2>

      <a
        className="group relative block w-full max-w-md overflow-hidden rounded-lg border focus-visible:outline-2 focus-visible:outline-ring-accent focus-visible:outline-offset-2"
        href={url}
        rel="noreferrer"
        target="_blank"
      >
        {/*
          Le rapport 16:9 est porté par le conteneur, pas par l'image : il réserve la place avant
          le chargement, et une vignette absente laisse alors un cadre plutôt qu'un pli dans la
          page. Même raisonnement que la jaquette de `MediaCard`.
        */}
        <div className="relative aspect-video bg-muted">
          {trailer.thumbnail ? (
            <Image
              alt=""
              className="object-cover"
              fill
              sizes="(min-width: 640px) 28rem, 100vw"
              src={trailer.thumbnail}
            />
          ) : null}

          {/*
            Le voile s'éclaircit au survol au lieu de bouger l'image : c'est le geste déjà retenu
            pour la carte du catalogue — cinquante vignettes qui respirent font vibrer une grille,
            et une fiche n'a pas de raison de se comporter autrement.
          */}
          <div className="absolute inset-0 flex items-center justify-center bg-background/40 transition-colors group-hover:bg-background/20">
            <span className="flex size-12 items-center justify-center rounded-full bg-overlay">
              <PlayIcon aria-hidden className="size-5 translate-x-0.5" />
            </span>
          </div>
        </div>

        <span className="sr-only">
          Voir la bande-annonce sur {trailer.site ?? "le site de l'hébergeur"}
        </span>
      </a>
    </section>
  );
}

/**
 * AniList ne donne **pas** l'URL de la vidéo : il donne un identifiant et le nom de l'hôte, à
 * charge de recomposer. Un hôte inconnu ne se devine pas — on préfère ne rien afficher qu'un lien
 * mort.
 */
function trailerUrl(trailer: MediaDetail["trailer"]): string | null {
  if (!trailer?.id) return null;

  switch (trailer.site) {
    case "youtube":
      return `https://www.youtube.com/watch?v=${trailer.id}`;
    case "dailymotion":
      return `https://www.dailymotion.com/video/${trailer.id}`;
    default:
      return null;
  }
}
