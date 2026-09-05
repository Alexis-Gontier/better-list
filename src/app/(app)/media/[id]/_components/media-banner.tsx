import Image from "next/image";

import { cn } from "@/lib/utils";

type MediaBannerProps = {
  /** `bannerImage` d'AniList. **Nul sur la plupart des mangas et des webtoons.** */
  src: string | null;
};

/**
 * La bannière de la fiche : pleine largeur de fenêtre, fondue dans le fond de la page.
 *
 * **Elle déborde volontairement du conteneur.** Le `main` du layout `(app)` est en `max-w-6xl` ;
 * une bannière qui s'y tiendrait laisserait deux marges visibles de chaque côté. D'où
 * `left-1/2 w-screen -translate-x-1/2`, et le `overflow-x-clip` déjà posé sur le conteneur du
 * layout — sur le `main`, il rognerait la bannière au lieu de la laisser passer.
 *
 * Le fondu descend jusqu'à `--background` opaque : c'est lui qui fait disparaître la couture avec
 * le contenu du hero, sans qu'aucun trait n'ait à la masquer.
 */
export function MediaBanner({ src }: MediaBannerProps) {
  const hasImage = src !== null;

  return (
    <div
      aria-hidden
      className={cn(
        "relative left-1/2 -mt-6 w-screen -translate-x-1/2 sm:-mt-6",
        /*
          Sans image, la bande reste plus courte — elle sépare l'en-tête de la fiche au lieu de
          prétendre montrer quelque chose —, mais **pas au point de ne plus rien pouvoir
          accueillir** : la jaquette empiète dessus de 176 px au plus (`media-hero.tsx`), et une
          bande plus basse que ce débordement la laisserait passer sous l'en-tête.
        */
        hasImage ? "h-44 sm:h-56 lg:h-72" : "h-32 sm:h-44 lg:h-52",
      )}
    >
      {hasImage ? (
        <Image
          alt=""
          className="object-cover"
          fill
          // Elle occupe toute la largeur de fenêtre à toutes les tailles : c'est ce que dit `100vw`,
          // et c'est ce qui évite à Next de servir une image trop petite étirée.
          priority
          sizes="100vw"
          src={src}
        />
      ) : (
        <div className="absolute inset-0 bg-surface-raised" />
      )}

      {/*
        Deux dégradés plutôt qu'un : le premier assombrit le haut pour que l'en-tête collant reste
        lisible par-dessus n'importe quelle jaquette, le second fond le bas dans la page.
      */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/25 to-background" />
    </div>
  );
}
