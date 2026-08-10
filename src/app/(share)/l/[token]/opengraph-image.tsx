import { ImageResponse } from "next/og";

import { site } from "@/config/site";
import { getSharedList } from "@/features/lists/server/lists.queries";

/**
 * La carte qu'affiche une messagerie quand on y colle le lien d'une liste.
 *
 * C'est la seule chose que verront la plupart des gens à qui le lien est envoyé avant de décider
 * s'ils l'ouvrent. Elle montre donc ce qui donne envie — des jaquettes — plutôt qu'un logo.
 *
 * **Aucune donnée privée n'y passe** : le fichier est servi à qui possède le jeton, exactement comme
 * la page, et il rend la même chose qu'elle. Un jeton faux ou révoqué produit une image neutre, pas
 * une erreur — une carte cassée dans une conversation en dirait plus qu'une carte sobre.
 */

export const alt = "Une liste partagée sur Better-List";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const list = await getSharedList(token);

  /**
   * Les jaquettes viennent d'AniList et sont **chargées par le rendu de l'image**, côté serveur.
   * Cinq au maximum : chacune est un aller-retour réseau avant que l'image ne soit produite, et une
   * carte de partage qui met trop longtemps à naître n'est pas dépliée du tout par certaines
   * messageries.
   */
  const covers =
    list?.items
      .map((item) => item.media.coverImage)
      .filter((cover): cover is string => cover !== null)
      .slice(0, 5) ?? [];

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        // Les couleurs sont écrites en dur : `ImageResponse` ne connaît ni Tailwind ni les
        // variables CSS du thème, et n'a de toute façon pas de thème clair ou sombre à suivre —
        // une carte de partage s'affiche sur le fond de la messagerie qui l'affiche.
        backgroundColor: "#0a0a0a",
        color: "#fafafa",
        padding: 64,
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", fontSize: 24, color: "#a1a1a1" }}>
          {site.name} · Liste partagée
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1.1,
          }}
        >
          {list?.title ?? "Liste introuvable"}
        </div>

        {list ? (
          <div style={{ display: "flex", fontSize: 28, color: "#a1a1a1" }}>
            Par {list.owner.name ?? list.owner.username} · {list.items.length}{" "}
            {list.items.length > 1 ? "œuvres" : "œuvre"}
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", gap: 20 }}>
        {covers.map((cover) => (
          // `<img>` et non `next/image` : on est dans un rendu Satori, qui ne connaît que du
          // HTML minimal et ne passe par aucun optimiseur.
          // biome-ignore lint/performance/noImgElement: Satori n'accepte pas next/image.
          <img
            alt=""
            height={280}
            key={cover}
            src={cover}
            style={{ borderRadius: 12, objectFit: "cover" }}
            width={187}
          />
        ))}
      </div>
    </div>,
    size,
  );
}
