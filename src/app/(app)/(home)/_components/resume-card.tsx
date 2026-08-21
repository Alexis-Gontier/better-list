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
    /*
      Le montage de `MediaCard` et de `MediaRow` : le bouton est **frère** du lien et non son
      descendant. Un bouton dans une ancre est du HTML invalide, et le « +1 » ouvrirait la fiche.

      **La carte est une colonne, et c'est ce qui a changé.** Les commandes étaient posées en absolu
      au milieu du flanc droit, ce qui obligeait le texte à leur réserver vingt-quatre unités de
      remplissage : sur une carte de quatre cents pixels, cette réserve mangeait le quart de la seule
      colonne lisible, et un titre de série un peu long s'y coupait alors qu'il restait du vide à
      droite du bouton. Elles descendent en pied, sur leur propre ligne, où elles ne disputent plus la
      largeur à personne.

      `overflow-hidden` est ce qui permet à la barre de progression de courir d'un bord à l'autre en
      épousant l'arrondi — elle est le dernier élément de la colonne, sans remplissage.
    */
    <div className="group relative flex h-full flex-col overflow-hidden rounded-lg border bg-card transition-colors hover:bg-accent/40">
      {/*
        Le lien couvre la partie qu'on lit — jaquette et texte — et s'arrête avant le pied : une
        ancre qui engloberait les boutons ferait de chaque clic sur « +1 » une ouverture de fiche.
      */}
      <Link
        className="flex flex-1 items-start gap-3 p-3 focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2"
        href={routes.media(media.id)}
      >
        {/*
          La jaquette remonte à 112 px : elle était à 96, et la carte étant devenue plus haute d'une
          ligne de commandes, une vignette inchangée y flottait en haut d'une colonne vide.
        */}
        <div className="relative aspect-2/3 h-28 shrink-0 overflow-hidden rounded-md bg-muted">
          {media.coverImage?.large ? (
            <Image
              alt=""
              className="object-cover"
              fill
              sizes="80px"
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

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {/*
            **Le titre repasse devant.** Il était en douze pixels gris, sous un exergue de format,
            au motif que « laquelle ? » est une question tranchée sur une série qu'on suit — c'est
            vrai du regard qui cherche, faux de celui qui balaie une rangée de douze cartes. Un titre
            en gris clair plus petit que la ligne qui le suit se lit comme une légende, et la carte
            n'avait plus de nom. Il reprend donc la taille de base et la couleur du texte.

            Deux lignes au plus : les titres japonais translittérés dépassent régulièrement la
            largeur de la colonne, et une troisième ligne décalerait le pied d'une carte sur deux.
          */}
          <h3 className="line-clamp-2 font-semibold text-sm leading-snug">
            {title}
          </h3>

          {/*
            Le format et la fraîcheur du geste sur une seule ligne discrète — deux repères de
            contexte, pas deux informations à lire. Le format distingue ce qui se regarde de ce qui
            se lit ; la date dit si on a laissé la série hier ou il y a trois semaines, ce qui est la
            seule chose que cette section (trente derniers jours) laisse varier.

            « Vu » pour un anime, « Lu » pour un manga : le participe s'accorde au support, comme
            dans `ENTRY_UNIT_LABELS`. Une formulation unique aurait donné « lu il y a trois jours »
            sur une série animée.
          */}
          <p className="truncate text-muted-foreground text-xs">
            {[
              formatMediaFormat(media.format),
              `${unit === "episode" ? "Vu" : "Lu"} ${formatSince(updatedAt, now)}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>

          {/*
            Le numéro, en gras et en grand : c'est la réponse à « où j'en étais », qui est la seule
            question que cette carte existe pour trancher.

            À zéro, la carte n'écrit pas de numéro : « Épisode 0 » se lit comme une donnée fausse,
            alors que l'information est « pas encore commencé ». Le cas existe — on peut marquer une
            série « en cours » le jour où on décide de s'y mettre.
          */}
          <p className="mt-auto flex items-baseline gap-2 pt-1">
            <span className="truncate font-bold text-base leading-tight tabular-nums">
              {progress > 0
                ? `${unit === "episode" ? "Épisode" : "Chapitre"} ${progress}`
                : "Pas encore commencé"}
            </span>

            {/*
              La fraction en second : elle dit ce qu'il reste, là où le numéro dit où l'on est. Elle
              disparaît avant le premier épisode, où « 0 / 24 » n'ajouterait rien à la phrase qui la
              précède.
            */}
            {progress > 0 ? (
              <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
                {formatEntryProgress(progress, total)}
              </span>
            ) : null}
          </p>
        </div>
      </Link>

      {/*
        Le pied : les commandes, puis la barre.

        Il porte le même remplissage horizontal que le corps mais rien en bas — la barre de
        progression est collée au bord inférieur, où elle sert de trait de fin à la carte plutôt que
        d'élément flottant au milieu d'une colonne de texte.
      */}
      {action ? <div className="px-3 pb-3">{action}</div> : null}

      {/*
        La piste et son remplissage, à l'identique de `MediaRow` : deux barres de progression qui ne
        se ressembleraient pas dans la même application se liraient comme deux choses différentes.
        Seule la place change — pleine largeur, sans arrondi, en bas de carte.

        Sans dénominateur — une série en cours de diffusion n'en a pas chez AniList — il n'y a rien à
        remplir, et une piste vide se lit comme un gabarit cassé (c'est la précaution déjà prise dans
        `MediaRow`). La carte garde alors sa hauteur : ce sont la jaquette et le pied qui la fixent,
        pas ce trait de six pixels.
      */}
      {percent !== null ? (
        <div className="h-1.5 bg-muted">
          <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
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
