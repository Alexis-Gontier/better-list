import Image from "next/image";

/**
 * Bandeau d'ouverture de la fiche, **bord à bord**.
 *
 * Il sort du `max-w-6xl` de `(app)/layout.tsx` par un `w-screen` recentré. Le layout porte un
 * `overflow-x-clip` qui absorbe le débordement : sans lui, la largeur de la barre de défilement
 * ferait apparaître un défilement horizontal sur toute l'application.
 *
 * `bannerImage` est optionnelle chez AniList et manque sur la plupart des mangas et webtoons.
 * Plutôt qu'un trou, on retombe sur un dégradé construit à partir de la couleur dominante de la
 * jaquette — la fiche garde sa hauteur et son identité colorée dans les deux cas.
 */
export function MediaBanner({
  src,
  accent,
}: {
  src: string | null;
  accent: string | null;
}) {
  return (
    <div
      aria-hidden="true"
      className="-mt-6 relative left-1/2 h-44 w-screen -translate-x-1/2 overflow-hidden bg-muted sm:h-64 lg:h-80"
    >
      {src ? (
        <Image
          alt=""
          className="object-cover object-center"
          fill
          /** Image de plus haute priorité de la page : c'est presque toujours le LCP. */
          priority
          sizes="100vw"
          src={src}
        />
      ) : null}

      {/*
        Halo teinté par l'œuvre. La couleur vient d'AniList et est donc arbitraire : elle ne sert
        qu'en fond très dilué, jamais derrière du texte, pour ne pas mettre le contraste à la merci
        d'une jaquette.
      */}
      {accent ? (
        <div
          className="absolute inset-0 opacity-40 mix-blend-multiply dark:opacity-25"
          style={{
            backgroundImage: `radial-gradient(120% 100% at 50% 0%, ${accent} 0%, transparent 70%)`,
          }}
        />
      ) : null}

      {/*
        Fondu vers le fond de page. C'est lui qui fait « fondre » la bannière dans la fiche plutôt
        que de la poser comme une vignette, et qui garantit la lisibilité de ce qui la chevauche.
      */}
      <div className="absolute inset-0 bg-linear-to-b from-background/20 via-background/40 to-background" />
    </div>
  );
}
