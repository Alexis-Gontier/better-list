import Image from "next/image";

/**
 * La bande de tête d'une page qui n'a pas de bannière : une image, agrandie et floutée, pleine
 * largeur de fenêtre — même débord que `MediaBanner` (`left-1/2 w-screen -translate-x-1/2`, sous
 * l'`overflow-x-clip` du layout).
 *
 * Née dans `features/people/` pour le portrait d'un personnage ; **promue ici le 30 septembre 2026**
 * quand le profil d'un membre en a voulu une, tirée de la jaquette de son dernier favori. Elle ne
 * connaît aucune entité : une image, ou rien.
 *
 * Le flou n'est pas un effet : une image de 230 px de large étirée sur un écran entier serait une
 * bouillie de pixels. Floutée, elle ne garde que ses couleurs, et c'est tout ce qu'on lui demande.
 */
export function BlurredBackdrop({ image }: { image: string | null }) {
  return (
    <div
      aria-hidden
      className="-mt-6 relative left-1/2 h-40 w-screen -translate-x-1/2 overflow-hidden sm:h-52"
    >
      {image ? (
        <Image
          alt=""
          className="scale-125 object-cover opacity-60 blur-2xl"
          fill
          // En haut de page, c'est souvent le plus gros élément peint : pas de chargement différé.
          loading="eager"
          // Flouté à ce point, une petite image suffit — inutile d'en demander une pleine largeur.
          sizes="256px"
          src={image}
        />
      ) : (
        <div className="absolute inset-0 bg-surface-raised" />
      )}
      <div className="absolute inset-0 bg-linear-to-b from-background/40 via-background/30 to-background" />
    </div>
  );
}
