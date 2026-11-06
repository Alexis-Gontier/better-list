import Image from "next/image";

import { getShowcase } from "@/features/media/server/showcase.queries";

/**
 * Le fond des pages d'entrée : la bannière du moment, celle de la landing, **floue et sombre**. Elle
 * donne de la couleur sans rien demander au regard ; sans bannière, le fond reste uni.
 */
export async function BannerBackdrop() {
  const { banner } = await getShowcase();
  if (!banner) return null;

  return (
    <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
      <Image
        alt=""
        className="scale-110 object-cover opacity-40 blur-2xl"
        fill
        sizes="100vw"
        src={banner.src}
      />
      <div className="absolute inset-0 bg-background/60" />
    </div>
  );
}
