import Image from "next/image";

import { getShowcase } from "@/features/media/server/showcase.queries";

/**
 * La bannière du hero : celle d'une œuvre du moment, en plein écran, **fondue dans le fond** en bas
 * pour que le texte posé dessus reste lisible (d'après Letterboxd). Sans bannière, le hero garde
 * son fond uni : rien ne casse.
 */
export async function LandingBanner() {
  const { banner } = await getShowcase();
  if (!banner) return null;

  return (
    <>
      <Image
        alt=""
        className="object-cover object-top"
        fill
        priority
        sizes="100vw"
        src={banner.src}
      />
      {/* Le voile : seule exception admise au fond uni, il porte la lisibilité du titre. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(to_bottom,rgb(0_0_0/0.35),rgb(0_0_0/0.2)_40%,var(--background)_96%)]"
      />
      <p className="absolute right-4 bottom-4 text-muted-foreground text-xs sm:right-8">
        {banner.title}
      </p>
    </>
  );
}
