import { ImageResponse } from "next/og";

import { logoPath, logoWidth } from "@/components/layout/logo";

/**
 * La tuile de marque : le BL-signet blanc sur l'indigo de `--primary`. Une seule fonction pour
 * l'onglet (`icon.tsx`) et l'écran d'accueil iOS (`apple-icon.tsx`), qui ne diffèrent que par la
 * taille et l'arrondi — les couleurs ne peuvent donc pas diverger entre les deux.
 *
 * **C'est le seul endroit où la marque prend la couleur d'accent.** Dans l'interface, elle hérite de
 * `currentColor` : la direction Obsidienne fait passer l'identité par la typographie et la matière,
 * pas par la teinte. Une icône, elle, vit hors de l'app — dans une barre d'onglets ou sur un écran
 * d'accueil, parmi d'autres icônes — et c'est là que la couleur sert à la retrouver.
 *
 * Les couleurs sont **écrites en hexadécimal et non reprises de `globals.css`** : Satori ne lit ni
 * les variables CSS ni `oklch`. `#4f46e5` transcrit `--primary` du thème clair
 * (oklch(0.5106 0.2301 276.97)), `#fafafa` transcrit `--primary-foreground`. Un onglet ne suit pas
 * le thème de l'application mais celui du navigateur, et cet indigo est lisible sur les deux.
 */
export function brandTile({
  size,
  radius,
}: {
  size: { width: number; height: number };
  radius: number;
}) {
  // 62 % du côté en hauteur : la marque garde une vraie marge. La boîte est cadrée sur `logoWidth`
  // et non sur le carré de 24 — le tracé y est collé à gauche, il serait décentré sinon.
  const mark = Math.round(size.width * 0.62);
  const markWidth = Math.round((mark * logoWidth) / 24);

  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "#4f46e5",
        borderRadius: radius,
        display: "flex",
        height: "100%",
        justifyContent: "center",
        width: "100%",
      }}
    >
      <svg
        aria-hidden="true"
        fill="#fafafa"
        height={mark}
        viewBox={`0 0 ${logoWidth} 24`}
        width={markWidth}
      >
        <path d={logoPath} fillRule="evenodd" />
      </svg>
    </div>,
    size,
  );
}
