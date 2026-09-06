import { ImageResponse } from "next/og";

import { logoPath } from "@/components/layout/logo";

/**
 * L'icône d'onglet, **dessinée par le code plutôt que déposée en binaire**.
 *
 * Un `.ico` dans `public/` aurait fait l'affaire, mais il faudrait un outil hors du dépôt pour le
 * produire et un autre pour le relire : personne ne sait ce que contient un favicon avant de
 * l'ouvrir. Ici la couleur et le tracé sont dans le dépôt, versionnés, modifiables en une ligne et
 * relisibles en diff — et Next met le résultat en cache, donc ça ne coûte rien à l'exécution.
 *
 * Le monogramme vient de `components/layout/logo.tsx`, **la seule géométrie du dépôt** : l'onglet et
 * l'en-tête ne peuvent pas se désaccorder. Et parce que c'est un tracé et non une lettre, Satori n'a
 * aucune police à charger — il n'y a plus de texte du tout dans ce fichier.
 *
 * Les couleurs sont **écrites en hexadécimal et non reprises de `globals.css`** : ce fichier est
 * rendu par Satori, qui ne lit ni les variables CSS ni `oklch`. Elles transcrivent `--primary` et
 * `--primary-foreground` du thème clair — un onglet ne suit pas le thème de l'application, il suit
 * celui du navigateur, et une icône sombre est lisible sur les deux.
 */
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        // Le bleu nuit de `--primary`, oklch(0.2079 0.0399 265.73) transcrit pour Satori.
        background: "#1b2438",
        borderRadius: 7,
        display: "flex",
        height: "100%",
        justifyContent: "center",
        width: "100%",
      }}
    >
      {/*
        20 des 32 pixels : la marque est à fond perdu dans sa grille de 24, sans marge intérieure.
        Lui en donner ici plutôt que dans le tracé laisse l'en-tête la poser au ras du texte.
      */}
      <svg
        aria-hidden="true"
        fill="#f7f8fa"
        height={20}
        viewBox="0 0 24 24"
        width={20}
      >
        <path d={logoPath} fillRule="evenodd" />
      </svg>
    </div>,
    size,
  );
}
