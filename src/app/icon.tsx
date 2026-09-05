import { ImageResponse } from "next/og";

/**
 * L'icône d'onglet, **dessinée par le code plutôt que déposée en binaire**.
 *
 * Un `.ico` dans `public/` aurait fait l'affaire, mais il faudrait un outil hors du dépôt pour le
 * produire et un autre pour le relire : personne ne sait ce que contient un favicon avant de
 * l'ouvrir. Ici la couleur et la lettre sont dans le fichier, versionnées, modifiables en une ligne
 * et relisibles en diff — et Next met le résultat en cache, donc ça ne coûte rien à l'exécution.
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
        color: "#f7f8fa",
        display: "flex",
        fontSize: 22,
        // Pas de police chargée : Satori retombe sur sa sans-serif intégrée, ce qui évite de lire un
        // fichier de fonte pour une seule lettre de 22 pixels.
        fontWeight: 700,
        height: "100%",
        justifyContent: "center",
        // La hampe du « B » paraît basse une fois centrée sur la boîte : un pixel de compensation
        // optique, invisible ailleurs et nettement plus juste à 32 px.
        lineHeight: 1,
        paddingBottom: 1,
        width: "100%",
      }}
    >
      B
    </div>,
    size,
  );
}
