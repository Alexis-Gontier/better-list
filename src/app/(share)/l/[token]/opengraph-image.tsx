import { ImageResponse } from "next/og";

import { logoPath } from "@/components/layout/logo";
import { getSharedList } from "@/features/lists/server/lists.queries";

/**
 * L'aperçu d'un lien de liste partagée — ce qui s'affiche quand on colle l'adresse dans un message.
 *
 * **C'est le même argument que la mosaïque de `/lists`, appliqué à une conversation** : dans une app
 * d'images, une liste sans image ne donne pas envie d'être ouverte. Un lien nu se lit comme une URL
 * suspecte ; celui-ci montre le titre, qui l'a faite, et ses premières jaquettes.
 *
 * **Il ne divulgue rien de plus que la page qu'il annonce.** Il faut déjà posséder le jeton pour le
 * demander, et `robots.ts` interdit tout le site — cet aperçu n'ouvre donc aucune porte
 * supplémentaire. Un jeton révoqué ne rend plus d'image : `getSharedList` renvoie `null` et on sert
 * une carte neutre, sans dire qu'une liste a existé ici.
 *
 * **Les jaquettes sont chargées par Satori depuis le CDN d'AniList.** C'est le seul endroit du
 * projet où une image distante entre dans un rendu serveur, et c'est acceptable ici : si un
 * chargement échoue, cette route échoue **seule** — le lien perd son aperçu, la page reste
 * parfaitement fonctionnelle. Aucun autre écran n'en dépend.
 */

export const alt = "Une liste partagée sur Better-List";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Autant de jaquettes que la largeur en accepte sans les réduire à des timbres-poste. */
const COVER_COUNT = 5;

export default async function Image({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const list = await getSharedList(token);

  /*
    Les couleurs sont **écrites en hexadécimal et non reprises de `globals.css`** : ce fichier est
    rendu par Satori, qui ne lit ni les variables CSS ni `oklch`. Même contrainte que `app/icon.tsx`,
    et mêmes valeurs transcrites.
  */
  const ink = "#0b0d12";
  const paper = "#f7f8fa";
  const muted = "#8b91a1";

  const covers = (list?.items ?? [])
    .slice(0, COVER_COUNT)
    .map((item) => item.media.coverImage?.extraLarge ?? null)
    .filter((url): url is string => url !== null);

  return new ImageResponse(
    <div
      style={{
        background: ink,
        color: paper,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        justifyContent: "space-between",
        padding: 64,
        width: "100%",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/*
          Le monogramme vient de `components/layout/logo.tsx`, seule géométrie du dépôt — l'onglet,
          l'en-tête et cet aperçu ne peuvent donc pas se désaccorder. Et parce que c'est un tracé et
          non une lettre, Satori n'a aucune police à charger pour lui.
        */}
        <svg
          /* Le rendu final est un PNG : aucune ARIA n'y survit, et le texte alternatif du lien est
             porté par l'export `alt` ci-dessus. Le marqueur est là pour la règle, pas pour Satori. */
          aria-hidden="true"
          fill={paper}
          height={40}
          viewBox="0 0 24 24"
          width={40}
        >
          <path d={logoPath} fillRule="evenodd" />
        </svg>

        <div style={{ display: "flex", fontSize: 56, fontWeight: 700 }}>
          {list ? list.title : "Better-List"}
        </div>

        <div style={{ color: muted, display: "flex", fontSize: 28 }}>
          {list
            ? `Une liste de ${list.ownerName} · ${itemLabel(list.items.length)}`
            : "Ce lien n'est plus valide."}
        </div>
      </div>

      {covers.length > 0 ? (
        <div style={{ display: "flex", gap: 16 }}>
          {covers.map((cover) => (
            // biome-ignore lint/performance/noImgElement: Satori n'exécute pas React côté client et ne connaît pas `next/image` — `<img>` est la seule balise qu'un `ImageResponse` sache dessiner.
            <img
              alt=""
              height={300}
              key={cover}
              src={cover}
              style={{ borderRadius: 8, objectFit: "cover" }}
              width={200}
            />
          ))}
        </div>
      ) : null}
    </div>,
    size,
  );
}

/** La formulation des trois écrans de listes, reprise telle quelle. */
function itemLabel(count: number): string {
  if (count === 0) return "Aucune œuvre";
  return count === 1 ? "1 œuvre" : `${count} œuvres`;
}
