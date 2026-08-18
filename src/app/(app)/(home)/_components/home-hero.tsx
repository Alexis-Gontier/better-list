import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import {
  HeroCarousel,
  HeroCarouselItem,
} from "@/app/(app)/(home)/_components/hero-carousel";
import { HERO_SCRIM } from "@/app/(app)/(home)/_lib/hero-geometry";
import { routes } from "@/config/routes";
import {
  compactFromMirror,
  formatMediaFormat,
  mediaTitle,
} from "@/features/media/lib/media-format";
import { currentSeason } from "@/features/media/lib/media-season";
import { serializeSearchFilters } from "@/features/media/lib/search-params";
import type { MediaCompact } from "@/features/media/schemas/media.schema";
import { mediaTotalUnits } from "@/features/media/server/media.mirror";
import { getBrowseCatalogue } from "@/features/media/server/media.queries";
import { getPreferences } from "@/features/preferences/server/preferences.queries";
import { EntryDialog } from "@/features/tracking/components/entry-dialog";
import { EntryQuickProgress } from "@/features/tracking/components/entry-quick-progress";
import { formatEntryProgress } from "@/features/tracking/lib/entry-format";
import {
  getEntryStatesFor,
  getHeroEntries,
} from "@/features/tracking/server/tracking.queries";
import { tryAniList } from "@/lib/http/anilist";

/**
 * Le bandeau d'ouverture de l'accueil (docs/PRODUCT.md §5).
 *
 * **Il montre ce que je regarde, pas ce qui sort.** C'est la même décision que celle qui met le
 * tableau de bord au-dessus de la découverte (`dashboard.tsx`), poussée jusqu'à la première image de
 * la page : le geste le plus fréquent du produit est le « +1 » (§6), et le mettre au-dessus de la
 * ligne de flottaison lui retire le seul défilement qui lui restait. Un bandeau de tendances aurait
 * fait l'inverse — donner la plus grande surface de l'écran à des œuvres qu'on ne suit pas encore.
 *
 * **Le repli sur les tendances ne concerne qu'une bibliothèque vide**, c'est-à-dire un compte neuf.
 * L'écran n'a alors rien de personnel à montrer, et une bannière est ce qui donne envie de commencer
 * — c'est exactement la fonction que l'encadré vide du tableau de bord remplit en dessous, en mots.
 *
 * **Sa frontière de suspension lui est propre**, distincte du tableau de bord juste dessous. Il
 * porte l'image la plus lourde de la page, donc presque toujours son LCP : le faire attendre les
 * listes et le décompte de la bibliothèque retarderait le premier pixel utile derrière trois
 * requêtes dont il n'a aucun besoin. `getHeroEntries` est une lecture locale indexée, elle répond en
 * quelques millisecondes.
 *
 * Le seul cas où le bandeau attend AniList est celui de la bibliothèque vide — et `getBrowseCatalogue`
 * est alors un **succès de cache**, la découverte plus bas ayant déjà payé la requête (une par heure,
 * partagée par tout le monde).
 */
export async function HomeHero() {
  const entries = await getHeroEntries();

  if (entries.length > 0) {
    const { titleLanguage } = await getPreferences();

    return (
      <HeroCarousel count={entries.length} label="Reprendre">
        {entries.map((entry, index) => {
          const media = compactFromMirror(entry.media);
          const total = mediaTotalUnits(entry.media);
          const unit = media.type === "ANIME" ? "episode" : "chapitre";
          const title = mediaTitle(media.title, titleLanguage);

          return (
            <HeroCarouselItem index={index} key={entry.id}>
              <HeroSlide
                banner={entry.media.bannerImage}
                genres={entry.media.genres}
                media={media}
                meta={formatEntryProgress(entry.progress, total)}
                title={title}
              >
                {/*
                  Le « +1 » d'abord, la fenêtre ensuite : c'est l'ordre de fréquence des deux gestes,
                  et le même que sur les vignettes (`EntryCardActions`). En variante `inline`, parce
                  qu'ici les boutons sont seuls sur une demi-page et n'ont personne à qui céder la
                  place — le raisonnement est sur `EntryQuickProgress.appearance`.
                */}
                <EntryQuickProgress
                  appearance="inline"
                  mediaId={media.id}
                  progress={entry.progress}
                  total={total}
                  unit={unit}
                />

                <EntryDialog
                  appearance="inline"
                  entry={entry}
                  image={entry.media.bannerImage}
                  mediaId={media.id}
                  title={title}
                  total={total}
                  unit={unit}
                />
              </HeroSlide>
            </HeroCarouselItem>
          );
        })}
      </HeroCarousel>
    );
  }

  return <DiscoveryHero />;
}

/**
 * Le bandeau d'un compte qui ne suit encore rien : les tendances, en grand.
 *
 * Il se sert dans la rangée `trending` du catalogue déjà chargé par la découverte plutôt que
 * d'interroger AniList pour son compte — d'où le `bannerImage` ajouté à `MediaBrowseFields`. Les
 * œuvres sans bannière sont écartées : c'est un bandeau, et un aplat de trois cents pixels sous un
 * titre n'en est pas un.
 */
async function DiscoveryHero() {
  const { includeAdult, titleLanguage } = await getPreferences();

  /*
    AniList coupé : le bandeau disparaît sans rien dire, comme il le fait déjà faute de bannière.
    C'est la découverte, juste dessous, qui porte le message (`CatalogueUnavailable`) — l'annoncer en
    haut de page aussi ferait deux encadrés pour une seule panne, et remplacerait le LCP par une
    excuse.
  */
  const catalogue = await tryAniList(() =>
    getBrowseCatalogue({ ...currentSeason(), includeAdult }),
  );

  if (!catalogue) return null;

  const media = catalogue.trending
    .filter((item) => item.bannerImage !== null)
    .slice(0, DISCOVERY_HERO_COUNT);

  // Aucune bannière dans les tendances du jour : le bandeau disparaît plutôt que de laisser une
  // bande grise en haut de la page. Le cas est improbable — AniList en pose une sur la quasi-totalité
  // des animes — mais un accueil sans bandeau vaut mieux qu'un accueil avec un trou.
  if (media.length === 0) return null;

  /**
   * Ce que ce compte suit déjà, parmi les œuvres du bandeau.
   *
   * La lecture paraît inutile — on n'arrive ici que faute de suivi en cours — mais « en cours » n'est
   * pas « suivi » : quelqu'un qui n'a que des séries terminées ou prévues passe par ce chemin, et
   * sans ce croisement le bandeau lui proposerait de suivre une œuvre qu'il a déjà notée, en écrasant
   * son statut.
   */
  const entries = await getEntryStatesFor(media.map((item) => item.id));

  return (
    <HeroCarousel count={media.length} label="Tendances">
      {media.map((item, index) => {
        const entry = entries.get(item.id) ?? null;
        const title = mediaTitle(item.title, titleLanguage);

        return (
          <HeroCarouselItem index={index} key={item.id}>
            <HeroSlide
              banner={item.bannerImage}
              genres={item.genres}
              media={item}
              meta={[formatMediaFormat(item.format), item.seasonYear]
                .filter(Boolean)
                .join(" · ")}
              title={title}
            >
              {/*
                Pas de « +1 » sur une œuvre non suivie, ici comme sur les vignettes : il créerait un
                suivi à l'épisode 1 avec un statut choisi par personne. Commencer à suivre est une
                décision, et c'est la fenêtre qui la prend (`EntryCardActions`).

                `total` est `null` : le document du catalogue ne demande ni `episodes` ni `chapters`,
                et le plafond n'a jamais dépendu du client (docs/PRODUCT.md §4.2).
              */}
              <EntryDialog
                appearance="inline"
                entry={entry}
                image={item.bannerImage}
                mediaId={item.id}
                title={title}
                total={null}
                unit={item.type === "ANIME" ? "episode" : "chapitre"}
              />
            </HeroSlide>
          </HeroCarouselItem>
        );
      })}
    </HeroCarousel>
  );
}

/** Autant de diapositives que le bandeau personnel — voir `HERO_COUNT` côté requête. */
const DISCOVERY_HERO_COUNT = 5;

/**
 * Combien de genres la diapositive affiche.
 *
 * AniList en pose jusqu'à huit sur une œuvre, et huit puces poussent le titre hors de la boîte sur un
 * portable. Trois suffisent à situer une série ; au-delà, on ne les lit plus, on les voit.
 */
const HERO_GENRE_COUNT = 3;

/**
 * Une diapositive : la bannière en fond, ce qu'on regarde à gauche, la jaquette à droite.
 *
 * **Le texte est en blanc sur un voile noir, et non en jeton de thème sur un dégradé vers le fond de
 * page.** La première version fondait la bannière dans l'accueil, ce qui était joli mais rendait le
 * contraste dépendant du thème : il fallait un dégradé par thème, et la couleur du texte suivait. Un
 * voile noir constant (`HERO_SCRIM`) porte du blanc dans les deux thèmes avec le même ratio — le
 * contraste cesse d'être une chose à revérifier à chaque changement de palette. C'est la même
 * logique que la pastille « 18+ » de `MediaCard` : ce qui est posé sur une image quelconque porte son
 * propre fond.
 *
 * La jaquette réapparaît à droite au-delà de `md` : la bannière AniList est un panorama très large et
 * très bas, illisible comme identification d'une œuvre — c'est la jaquette qu'on reconnaît. En
 * dessous, la place manque et elle disparaît plutôt que de rétrécir le titre.
 */
function HeroSlide({
  banner,
  genres,
  media,
  meta,
  title,
  children,
}: {
  banner: string | null;
  genres: string[];
  media: MediaCompact;
  meta: string | null;
  title: string;
  /** Les commandes de suivi, déjà rendues par l'appelant qui sait de quel cas il parle. */
  children: ReactNode;
}) {
  /**
   * `extraLarge` d'abord : la jaquette est rendue à 300 px de haut ici, là où `large` en fait 230 —
   * elle serait visiblement floue sur un écran à densité doublée. C'est la seule vue du projet à
   * l'afficher aussi grande, d'où le choix inverse de celui de `MediaCard`.
   */
  const cover = media.coverImage?.extraLarge ?? media.coverImage?.large ?? null;

  return (
    <>
      {banner ? (
        <Image
          alt=""
          className="object-cover object-center"
          fill
          /**
           * L'image de plus haute priorité de l'accueil : c'est presque toujours le LCP.
           *
           * Posée sur **toutes** les diapositives et pas seulement la première : Embla les monte
           * toutes d'un coup, donc marquer la seule première ne retirerait pas les autres de la file
           * de chargement — ça les y remettrait juste plus tard, après le LCP, sans rien gagner.
           */
          priority
          /*
            80 vw et non 100 : la diapositive n'occupe plus que quatre cinquièmes de la colonne
            depuis que ses voisines débordent (`HERO_PEEK`). Le plafond suit — 80 % de `max-w-6xl`.
          */
          sizes="(max-width: 1152px) 80vw, 922px"
          src={banner}
        />
      ) : null}

      <div aria-hidden="true" className={HERO_SCRIM} />

      {/*
        **Le calque de contenu ne capte pas le pointeur, ses commandes si.**

        Il couvre toute la boîte pour disposer le texte et la jaquette ; sans `pointer-events-none`,
        il avalerait le balayage d'Embla — le carrousel deviendrait impossible à faire glisser au
        doigt, ce qui est son seul mode de navigation sur mobile puisque les flèches y sont masquées.
        Les descendants interactifs le récupèrent nommément.

        **`data-slot` est ce par quoi `HeroCarouselItem` l'attrape**, et il n'y a pas d'autre voie :
        la diapositive voisine ne montre qu'un dixième d'elle-même, où un titre de trente pixels
        arrive coupé au tiers d'un mot, sous une jaquette tranchée dans la hauteur — trois éléments
        qui se lisent comme un défaut d'affichage, pas comme une promesse. Le débordement doit ne
        montrer que l'illustration, donc ce calque s'efface hors de la diapositive active. Or il est
        rendu par le serveur et passé en `children` : le composant client qui connaît l'état d'Embla
        ne peut pas lui poser une classe, seulement le désigner depuis son parent.
      */}
      <div
        className="pointer-events-none absolute inset-0 z-2 flex items-center justify-between gap-4 px-4 transition-opacity duration-500 motion-reduce:transition-none sm:px-6 md:px-12 [&_a]:pointer-events-auto [&_button]:pointer-events-auto"
        data-slot="hero-content"
      >
        <div className="flex min-w-0 flex-1 flex-col items-start gap-3 md:max-w-150 md:gap-4">
          {/*
            Le titre est un lien vers la fiche, et le seul de la diapositive : la bannière entière
            cliquable engloberait les boutons de suivi, et un bouton dans une ancre est du HTML
            invalide que rien n'annonce correctement (même raison que sur `MediaCard`).

            Deux lignes au plus. Un titre japonais translittéré dépasse régulièrement soixante
            caractères, et le laisser courir sur quatre lignes pousserait les boutons hors de la boîte.
          */}
          <h2 className="line-clamp-2 font-bold text-2xl text-white leading-tight md:text-3xl lg:text-4xl">
            <Link
              className="transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-4"
              href={routes.media(media.id)}
            >
              {title}
            </Link>
          </h2>

          {/*
            Les genres sont des **liens vers la recherche**, pas des étiquettes.

            Une puce qui ne fait rien sur un écran dont tout le reste est cliquable se lit comme une
            commande en panne. Ici chacune ouvre la recherche préfiltrée sur ce genre — c'est la porte
            d'entrée « par goût » que l'accueil n'avait pas, à côté de la porte « par titre » qu'est la
            barre de recherche.
          */}
          {genres.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {genres.slice(0, HERO_GENRE_COUNT).map((genre) => (
                <li key={genre}>
                  <Link
                    className="inline-flex items-center rounded-md bg-white/15 px-2.5 py-1 font-medium text-white text-xs backdrop-blur-sm transition-colors hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                    href={serializeSearchFilters(routes.search, {
                      genre: [genre],
                    })}
                  >
                    {genre}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}

          {meta ? (
            <p className="text-sm text-white/80 tabular-nums">{meta}</p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">{children}</div>
        </div>

        {/*
          La jaquette, à partir de `md` seulement.

          **Et non `MediaCard`**, alors que la tentation est forte : la carte écrit le titre sous
          l'image, or il est déjà là en trente pixels de haut à quelques centimètres — la même chaîne,
          deux fois, dans le même regard.

          Décorative, donc `aria-hidden` et pas de lien : le titre juste à côté mène déjà à la fiche,
          et une seconde ancre vers la même adresse ne fait qu'allonger le parcours au clavier.
        */}
        <div
          aria-hidden="true"
          className="relative hidden aspect-2/3 h-60 shrink-0 overflow-hidden rounded-lg bg-black/20 shadow-2xl ring-1 ring-white/10 md:block lg:h-75"
        >
          {cover ? (
            <Image
              alt=""
              className="object-cover"
              fill
              sizes="200px"
              src={cover}
            />
          ) : null}
        </div>
      </div>
    </>
  );
}
