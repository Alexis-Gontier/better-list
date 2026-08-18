import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { CarouselItem } from "@/components/ui/carousel";
import { routes } from "@/config/routes";
import {
  formatMediaFormat,
  mediaTitle,
} from "@/features/media/lib/media-format";
import type { MediaCompact } from "@/features/media/schemas/media.schema";
import { getPreferences } from "@/features/preferences/server/preferences.queries";
import {
  type EntryUnit,
  formatEntryProgress,
  formatSince,
} from "@/features/tracking/lib/entry-format";

/**
 * La carte de reprise : une œuvre en cours, **en largeur**.
 *
 * **Ce n'est pas `MediaCard` élargie.** Une vignette de catalogue répond à « laquelle ? » et met
 * donc toute sa surface dans la jaquette ; celle-ci répond à « où j'en étais ? », qui est une
 * question de chiffres. La jaquette y tombe à soixante-quatre pixels — juste de quoi reconnaître la
 * série qu'on cherche — et la place ainsi libérée va à ce qu'on vient lire : l'épisode courant, la
 * fraîcheur du geste, la part du chemin parcourue. Les mêmes données rangées autrement, exactement
 * comme `MediaRow` l'est vis-à-vis de `MediaCard`.
 *
 * Elle vit dans `_components/` de l'accueil et pas dans `features/tracking/` : une seule route
 * l'emploie. C'est la règle de promotion de `docs/ARCHITECTURE.md` — on remonte le fichier le jour
 * où un deuxième endroit en a besoin, pas avant.
 *
 * Server Component, comme `MediaCard` et `MediaRow` : elle lit elle-même la langue des titres.
 * `getPreferences` porte le `cache` de React, donc les douze cartes d'une rangée ne coûtent qu'une
 * requête.
 */
export async function ResumeCard({
  media,
  progress,
  total,
  updatedAt,
  now,
  action,
}: {
  media: MediaCompact;
  /** Où j'en suis, en unités consommées. */
  progress: number;
  /** Épisodes ou chapitres connus. `null` sur une œuvre en cours de diffusion. */
  total: number | null;
  /** Le dernier geste porté sur ce suivi — c'est ce que la colonne de tri de la section mesure. */
  updatedAt: Date;
  /**
   * L'instant de référence, **passé par l'appelant**.
   *
   * Douze cartes qui appelleraient chacune `new Date()` compareraient leur ancienneté à douze
   * instants différents. L'écart est de quelques millisecondes et ne se verrait jamais — mais c'est
   * la même raison qui fait que `MediaRow` et `ListCard` reçoivent `now` : une date lue dans le
   * rendu est une entrée cachée du composant, et un composant qui a une entrée cachée n'est pas
   * testable.
   */
  now: Date;
  /** Les commandes de suivi, déjà rendues par l'appelant. */
  action?: ReactNode;
}) {
  const { titleLanguage } = await getPreferences();
  const title = mediaTitle(media.title, titleLanguage);

  const unit: EntryUnit = media.type === "ANIME" ? "episode" : "chapitre";

  /**
   * La part parcourue, ou rien du tout.
   *
   * Même précaution que dans `MediaRow` : sans dénominateur — une série en cours de diffusion n'en a
   * pas chez AniList — une piste vide surmontée d'un pourcentage absent se lit comme un gabarit
   * cassé. La carte dit alors ce qu'elle sait, et rien de plus.
   */
  const ratio = total && total > 0 ? Math.min(progress / total, 1) : null;
  const percent = ratio === null ? null : Math.round(ratio * 100);

  return (
    // Le montage de `MediaCard` et de `MediaRow` : le bouton est **frère** du lien et non son
    // descendant. Un bouton dans une ancre est du HTML invalide, et le « +1 » ouvrirait la fiche.
    <div className="group relative h-full">
      <Link
        className="flex h-full items-center gap-3 rounded-lg border bg-card p-2.5 transition-colors hover:bg-accent/40 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
        href={routes.media(media.id)}
      >
        <div className="relative aspect-2/3 h-24 shrink-0 overflow-hidden rounded-md bg-muted">
          {media.coverImage?.large ? (
            <Image
              alt=""
              className="object-cover"
              fill
              sizes="64px"
              src={media.coverImage.large}
            />
          ) : null}

          {/*
            La pastille « 18+ », pour la raison exacte qui la met sur `MediaCard` : elle qualifie
            l'image, donc elle doit se lire **avant** qu'on la regarde. Fond opaque, parce que rien
            ne garantit le contraste d'un texte blanc sur une jaquette quelconque.
          */}
          {media.isAdult ? (
            <span className="pointer-events-none absolute top-1 left-1 rounded-sm bg-destructive px-1 py-px font-semibold text-[10px] text-white leading-tight shadow-sm">
              18+
            </span>
          ) : null}
        </div>

        {/*
          `pr-16` réserve la place des commandes, posées en absolu au-dessus — sans elle, un titre
          long passerait dessous. C'est la mesure de `MediaRow`, qui porte les deux mêmes boutons.
        */}
        {/*
          La réserve de place des commandes, posées en absolu au-dessus — sans elle, le titre et la
          barre passeraient dessous.

          `pr-24` et non les `w-16` de `MediaRow` : là-bas les deux boutons sont des pastilles
          rondes de vingt-huit pixels, ici le « +1 » porte son chiffre et s'élargit d'autant.
          Mesuré à l'écran — à seize, le titre se coupait *sous* le bouton.
        */}
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 pr-24">
          {/*
            **Le format en exergue, puis le titre, puis l'unité en grand.** C'est l'inverse d'une
            vignette, et c'est l'inverse exprès : sur une série qu'on suit déjà, « laquelle ? » est
            une question tranchée — le titre n'a plus qu'à confirmer qu'on est au bon endroit. Ce
            qu'on vient lire, c'est le numéro. Il prend donc la taille que le titre avait, et le
            titre prend celle qu'il avait.

            L'exergue dit le **format** (« Série TV », « Manga ») et non le statut de suivi : la
            section ne contient que des séries en cours, donc y écrire « En cours » aurait répété
            son propre titre sur chaque carte. Le format, lui, distingue ce qui se regarde de ce qui
            se lit — la seule chose que le reste de la carte laisse deviner sans la dire.
          */}
          {formatMediaFormat(media.format) ? (
            <p className="truncate font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
              {formatMediaFormat(media.format)}
            </p>
          ) : null}

          <h3 className="truncate text-muted-foreground text-xs">{title}</h3>

          {/*
            À zéro, la carte n'écrit pas de numéro : « Épisode 0 » se lit comme une donnée fausse,
            alors que l'information est « pas encore commencé ». Le cas existe — on peut marquer une
            série « en cours » le jour où on décide de s'y mettre.
          */}
          <p className="truncate font-bold text-base leading-tight">
            {progress > 0
              ? `${unit === "episode" ? "Épisode" : "Chapitre"} ${progress}`
              : "Pas encore commencé"}
          </p>

          <div className="flex items-baseline gap-2 text-xs">
            {/*
              La fraction, en gras : c'est elle qui dit ce qu'il reste, et elle remplace le
              « Progression / 98 % » d'avant. Le pourcentage disait la même chose en moins précis —
              la barre juste dessous le montre déjà, et sur une œuvre sans total connu il n'existait
              pas, ce qui laissait un trou à cet endroit précis de la carte.
            */}
            {progress > 0 ? (
              <span className="shrink-0 font-semibold tabular-nums">
                {formatEntryProgress(progress, total)}
              </span>
            ) : null}

            {/*
              « Vu » pour un anime, « Lu » pour un manga : le participe s'accorde au support, comme
              dans `ENTRY_UNIT_LABELS`. Une formulation unique aurait donné « lu il y a trois jours »
              sur une série animée.
            */}
            {/*
              Masquée sous `sm`, et pas seulement rognée : à cette largeur, la colonne de texte
              tombe à cent quarante pixels et la date s'y affichait « Vu il y a… ». Une durée
              amputée de son nombre ne dit rien du tout, alors que la fraction à côté garde tout son
              sens — c'est donc elle qui reste.
            */}
            <span className="hidden min-w-0 truncate text-muted-foreground sm:inline">
              {unit === "episode" ? "Vu" : "Lu"} {formatSince(updatedAt, now)}
            </span>
          </div>

          {/*
            La piste et son remplissage, à l'identique de `MediaRow` : deux barres de progression
            qui ne se ressembleraient pas dans la même application se liraient comme deux choses
            différentes.

            Sans dénominateur — une série en cours de diffusion n'en a pas chez AniList — il n'y a
            rien à remplir, et une piste vide se lit comme un gabarit cassé (c'est la précaution
            déjà prise dans `MediaRow`). La carte garde alors sa hauteur : c'est la jaquette qui la
            fixe, pas cette barre de six pixels.
          */}
          {percent !== null ? (
            <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${percent}%` }}
              />
            </div>
          ) : null}
        </div>
      </Link>

      {action ? (
        <div className="-translate-y-1/2 absolute top-1/2 right-2.5">
          {action}
        </div>
      ) : null}
    </div>
  );
}

/**
 * La largeur d'une carte dans la rangée, palier par palier.
 *
 * **Toujours une fraction de carte visible au bord** — c'est la règle de `MediaCarousel`, dont
 * cette rangée réutilise la mécanique : une rangée coupée net se lit comme une rangée qui s'arrête
 * là. Les proportions diffèrent parce que l'objet diffère : une jaquette se reconnaît en cent
 * cinquante pixels, une carte large a besoin que trois blocs tiennent côte à côte.
 *
 * **Les paliers sont mesurés, pas choisis.** Un premier jeu plus serré (jusqu'à 30 % au plus large)
 * a été essayé à l'écran : sur une carte de trois cent trente pixels, une fois retirés la jaquette,
 * la gouttière et les soixante-quatre pixels réservés aux commandes, la colonne de texte tombait à
 * cent quatre-vingts pixels et « Chapitre 143 » s'y affichait « Chapitre… ». Le plancher utile est
 * d'environ quatre cents pixels par carte, ce que ces fractions donnent à chaque palier.
 */
const RESUME_ITEM_BASIS =
  "basis-[88%] sm:basis-[62%] lg:basis-[48%] xl:basis-[38%]";

/**
 * Une carte dans la rangée défilante.
 *
 * Elle existe pour la même raison que `MediaCarouselItem` : que la largeur ne soit écrite qu'une
 * fois. `pl-3` reprend la gouttière de `MediaCarousel`, qui pose le `-ml-3` correspondant sur la
 * piste — les deux vont par paire et la moitié seule décalerait toute la rangée.
 */
export function ResumeCarouselItem({ children }: { children: ReactNode }) {
  return (
    <CarouselItem className={`${RESUME_ITEM_BASIS} pl-3`}>
      {children}
    </CarouselItem>
  );
}
