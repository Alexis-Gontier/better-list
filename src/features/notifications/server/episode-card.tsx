import "server-only";

import { ImageResponse } from "next/og";

import { logoPath } from "@/components/layout/logo";
import { mediaTitle } from "@/features/media/lib/media-format";
import type { EpisodeCard } from "@/features/notifications/schemas/episode-card.schema";
import { prisma } from "@/lib/db/prisma";

/**
 * La carte d'un épisode sorti — l'image que porte le message Discord.
 *
 * **Tout vient du miroir `Media`, rien d'AniList.** La route qui la sert est publique : une lecture
 * AniList par affichage mettrait le quota du cercle entre les mains de qui connaît l'adresse. Et
 * une œuvre qu'on notifie est forcément suivie, donc forcément dans le miroir — l'absence veut dire
 * « rien à montrer », pas « allez la chercher ».
 *
 * **1200 × 630**, le format Open Graph : Discord l'affiche en pleine largeur de l'embed sans la
 * rogner, et c'est aussi celui de l'aperçu des listes partagées, dont cette carte reprend l'encre,
 * le papier et le monogramme.
 */

export const EPISODE_CARD_SIZE = { width: 1200, height: 630 };

/**
 * La jaquette à fond perdu sur toute la hauteur, au format 2:3 d'une jaquette AniList.
 *
 * Elle flottait avant dans un cadre bordé de 315 × 450, plus petit que la carte et décalé de ses
 * marges (revu le 5 octobre 2026) : collée au bord, elle occupe la place qu'il lui faut sans rien
 * avoir à aligner.
 */
const COVER_WIDTH = 420;

/*
  En hexadécimal et non repris de `globals.css` : Satori ne lit ni les variables CSS ni `oklch`.
  Mêmes valeurs que `l/[token]/opengraph-image.tsx`.
*/
const INK = "#0b0d12";
const PAPER = "#f7f8fa";
const MUTED = "#8b91a1";
/** Quand AniList n'a pas de couleur dominante pour la jaquette. */
const FALLBACK_ACCENT = "#6366f1";

/**
 * Au-delà, le titre passerait sur trois lignes et pousserait le numéro d'épisode hors du cadre.
 * Satori ne sait pas couper à la ligne près : on coupe au caractère, avant le rendu.
 */
const MAX_TITLE_LENGTH = 60;

/** `null` quand l'œuvre n'est pas dans le miroir — la route en fait un 404. */
export async function renderEpisodeCard(
  card: EpisodeCard,
): Promise<ImageResponse | null> {
  const media = await prisma.media.findUnique({
    where: { id: card.mediaId },
    select: {
      titleRomaji: true,
      titleEnglish: true,
      titleNative: true,
      coverImage: true,
      bannerImage: true,
      coverColor: true,
      episodes: true,
    },
  });

  if (!media) return null;

  const title = truncate(
    mediaTitle(
      {
        romaji: media.titleRomaji,
        english: media.titleEnglish,
        // Pas de repli sur le titre natif : la police de `next/og` ne le dessinerait pas.
        native: null,
        userPreferred: null,
      },
      card.lang,
    ),
  );
  const accent = media.coverColor ?? FALLBACK_ACCENT;

  return new ImageResponse(
    <div
      style={{
        background: INK,
        color: PAPER,
        display: "flex",
        height: "100%",
        position: "relative",
        width: "100%",
      }}
    >
      {/*
        La bannière en fond, éteinte : elle donne l'ambiance de la série sans disputer la lecture
        au texte. Le dégradé par-dessus ramène l'encre franche sous la colonne de droite.
      */}
      {media.bannerImage ? (
        // biome-ignore lint/performance/noImgElement: Satori ne connaît que `<img>`, pas `next/image`.
        <img
          alt=""
          height={EPISODE_CARD_SIZE.height}
          src={media.bannerImage}
          style={{
            left: 0,
            objectFit: "cover",
            opacity: 0.35,
            position: "absolute",
            top: 0,
          }}
          width={EPISODE_CARD_SIZE.width}
        />
      ) : null}
      <div
        style={{
          background: `linear-gradient(90deg, ${INK}66 0%, ${INK}ee 45%, ${INK} 100%)`,
          display: "flex",
          height: "100%",
          left: 0,
          position: "absolute",
          top: 0,
          width: "100%",
        }}
      />

      {media.coverImage ? (
        // biome-ignore lint/performance/noImgElement: Satori ne connaît que `<img>`, pas `next/image`.
        <img
          alt=""
          height={EPISODE_CARD_SIZE.height}
          src={media.coverImage}
          style={{ objectFit: "cover", position: "relative" }}
          width={COVER_WIDTH}
        />
      ) : null}
      {/* Un filet de la couleur de la jaquette fait la couture entre l'image et le texte. */}
      {media.coverImage ? (
        <div
          style={{
            background: accent,
            display: "flex",
            height: "100%",
            position: "relative",
            width: 8,
          }}
        />
      ) : null}

      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
          position: "relative",
        }}
      >
        <div style={{ alignItems: "center", display: "flex", gap: 14 }}>
          <svg
            aria-hidden="true"
            fill={PAPER}
            height={32}
            viewBox="0 0 24 24"
            width={32}
          >
            <path d={logoPath} fillRule="evenodd" />
          </svg>
          <div style={{ color: MUTED, display: "flex", fontSize: 26 }}>
            Better-List
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              alignSelf: "flex-start",
              background: accent,
              borderRadius: 999,
              color: INK,
              display: "flex",
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 2,
              padding: "8px 20px",
            }}
          >
            NOUVEL ÉPISODE
          </div>

          <div style={{ alignItems: "baseline", display: "flex", gap: 16 }}>
            <div
              style={{
                display: "flex",
                fontSize: 104,
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              {`Épisode ${card.episode}`}
            </div>
            {media.episodes ? (
              <div style={{ color: MUTED, display: "flex", fontSize: 40 }}>
                {`/ ${media.episodes}`}
              </div>
            ) : null}
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 44,
              fontWeight: 600,
              lineHeight: 1.2,
            }}
          >
            {title}
          </div>
        </div>
      </div>
    </div>,
    {
      ...EPISODE_CARD_SIZE,
      headers: {
        /*
          Une carte ne change pas : même œuvre, même épisode, même image. Discord la met de toute
          façon en cache de son côté ; ceci évite que Vercel la redessine à chaque demande.
        */
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    },
  );
}

function truncate(title: string): string {
  return title.length > MAX_TITLE_LENGTH
    ? `${title.slice(0, MAX_TITLE_LENGTH - 1).trimEnd()}…`
    : title;
}
