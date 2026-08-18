import { StarIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { routes } from "@/config/routes";
import {
  cleanDescription,
  formatMediaFormat,
  formatMediaStatus,
  mediaTitle,
} from "@/features/media/lib/media-format";
import type { MediaCompact } from "@/features/media/schemas/media.schema";
import { getPreferences } from "@/features/preferences/server/preferences.queries";

/**
 * Vignette d'une œuvre : jaquette, titre sur une ligne, et ce que j'en sais dessous.
 *
 * Typée sur `MediaCompact`, le plus petit denominateur commun — un `Media` complet le satisfait,
 * donc la même carte sert aux résultats de recherche, aux œuvres liées et aux recommandations.
 * C'est la promotion prévue par `docs/ARCHITECTURE.md` : elle a démarré dans le `_components/` de
 * la fiche, un deuxième appelant l'a fait monter ici.
 *
 * **Sur la jaquette, seulement ce qui me concerne** : le « 18+ » en haut à gauche parce qu'il
 * qualifie l'image et doit se lire **avant** qu'on la regarde, et en haut à droite ma progression
 * puis ma note. Ni genres au survol, ni moyenne de la communauté : dans une grille, l'image est ce
 * qui fait s'arrêter, et ce qu'une foule qu'on ne connaît pas en pense n'a pas à en manger un coin.
 * Tout ce qui décrit l'œuvre plutôt que mon rapport à elle reste sous l'image, où rien ne se dispute
 * la place.
 *
 * `meta` est volontairement une chaîne déjà formatée : la bibliothèque y met « En cours », le
 * tableau de bord « En pause · depuis 8 mois ». La carte ne décide pas de ce qui est pertinent
 * selon le contexte.
 */
/**
 * Elle lit la préférence de titre **elle-même** plutôt que de la recevoir en propriété.
 *
 * Cinq écrans rendent cette carte, dont certains à trois niveaux de profondeur : faire descendre le
 * réglage jusqu'ici traverserait toute l'arborescence pour une chaîne de caractères. `getPreferences`
 * porte le `cache` de React, donc les vingt-quatre cartes d'une page ne coûtent qu'une requête.
 *
 * Ce n'est possible que parce qu'aucun composant client ne rend `MediaCard` — un `await` ici le
 * casserait.
 */
export async function MediaCard({
  media,
  meta,
  action,
  progress,
  score,
  description,
  genres,
}: {
  media: MediaCompact;
  meta?: string | null;
  /**
   * Une commande posée sur la jaquette — le « +1 » de la bibliothèque et du tableau de bord.
   *
   * Elle est rendue **à côté** du lien et non dedans : un bouton imbriqué dans une ancre est du
   * HTML invalide, et les technologies d'assistance n'ont alors aucun moyen d'annoncer deux
   * commandes qui n'en font qu'une. C'est aussi ce qui permet au clic sur le bouton de ne pas
   * ouvrir la fiche.
   */
  action?: ReactNode;
  /**
   * Où j'en suis, **en chiffres, en haut à droite de la jaquette** — et seulement là.
   *
   * `label` est déjà formaté par l'appelant — « 12 / 24 », ou « 12 » quand le total est inconnu —,
   * comme `meta` et pour la même raison : la carte ne décide pas de la façon de compter.
   *
   * Il y avait une barre au ras du bas de l'image, au motif qu'elle se voit sans se lire. Une
   * fraction n'est pourtant lisible que sur une œuvre dont on connaît déjà le total, elle ne se
   * dessinait donc que sur une partie des cartes d'une même rangée — et une grille où une vignette
   * sur trois porte un trait coloré en bas se lit comme une grille mal alignée. La pastille dit la
   * même chose, exactement, et se pose au même endroit sur toutes les cartes.
   *
   * `value` et `total` restent dans la propriété alors que la carte n'en fait plus rien : c'est la
   * **même forme que `MediaRow`**, et les deux vues reçoivent le même objet de leur appelant
   * (`library-results.tsx`, `dashboard.tsx`). La barre de la vue liste, elle, en a toujours besoin —
   * en pleine largeur, avec sa fraction au-dessus, elle n'a pas le défaut de sa jumelle en grille.
   */
  progress?: { value: number; total: number | null; label: string | null };
  /**
   * **Ma** note, déjà mise à l'échelle du compte (« 4/5 », « 8/10 »).
   *
   * La moyenne AniList (`media.averageScore`) n'a pas d'équivalent ici : elle reste sur la fiche,
   * où elle est comparable au reste. Dans une grille, le verdict d'une foule qu'on ne connaît pas
   * ne fait pas ouvrir une œuvre, et il occuperait le coin où se lit le mien.
   *
   * Une chaîne et non un nombre : l'échelle d'affichage est un réglage du domaine `tracking`
   * (docs/PRODUCT.md §4.2), et la faire convertir ici coupleraient la carte à un domaine qu'elle
   * n'a aucune raison de connaître.
   */
  score?: string | null;
  /**
   * Le synopsis, **si l'appelant l'a déjà sous la main**.
   *
   * `MediaCompact` ne le porte pas : c'est le plus petit dénominateur commun, et une grille de
   * vingt-quatre jaquettes n'a aucune raison de traîner vingt-quatre synopsis. Les écrans qui
   * l'ont — la recherche interroge AniList avec le document complet — le passent ; les autres
   * s'en dispensent, et l'encart montre ce qu'il sait. Jamais de lecture supplémentaire pour le
   * remplir : ce serait une requête AniList par survol, sur un quota de trente par minute.
   */
  description?: string | null;
  /** Les genres, même raison que `description` : donnés par qui les a, jamais réclamés. */
  genres?: string[];
}) {
  const { titleLanguage } = await getPreferences();
  const title = mediaTitle(media.title, titleLanguage);

  /**
   * Le titre que l'encart ajoute **sous** celui qu'on affiche déjà.
   *
   * Une œuvre japonaise se cherche indifféremment sous son titre translittéré ou son titre anglais,
   * et le réglage de langue n'en montre qu'un. Le second n'apparaît que s'il diffère vraiment —
   * répéter la même chaîne en gris sous elle-même se lit comme un défaut d'affichage.
   */
  const alternateTitle = [media.title.english, media.title.romaji]
    .filter((candidate) => candidate && candidate !== title)
    .at(0);

  /** Le premier paragraphe suffit : c'est le résumé, la suite est du détail de production. */
  const summary = cleanDescription(description ?? null).at(0) ?? null;

  const facts = [
    formatMediaFormat(media.format),
    formatMediaStatus(media.status),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    /*
      **L'encart de survol enveloppe la carte, et son déclencheur est le lien.**

      Posé sur le conteneur — le premier essai —, il aurait couvert le bouton « +1 » : approcher la
      souris de la commande aurait fait surgir un panneau de trois cents pixels par-dessus la grille,
      juste avant le clic. Et surtout, `HoverCardTrigger` ouvre aussi **au focus** : sur le lien,
      l'encart devient atteignable à la tabulation, alors qu'un `div` n'est focalisable par personne.

      La racine ne rend aucun élément du DOM (c'est un fournisseur de contexte et une ancre de
      positionnement), donc la grille au-dessus voit exactement la même structure qu'avant.
    */
    <HoverCard closeDelay={HOVER_CLOSE_DELAY} openDelay={HOVER_OPEN_DELAY}>
      {/*
        `group` sur le conteneur et non sur le lien : le survol doit aussi agrandir la jaquette quand
        la souris est sur le bouton, qui n'est plus un descendant du lien.
      */}
      <div className="group relative">
        <HoverCardTrigger asChild>
          <Link className="block" href={routes.media(media.id)}>
            {/*
          Un liseré permanent, et **rien de plus au focus** : le contour natif du navigateur cerne
          déjà tout le lien, titre compris, ce qui décrit mieux la cible qu'un anneau posé sur la
          seule jaquette. Doubler les deux donnait deux cadres concentriques sans rien ajouter.
        */}
            <div className="relative aspect-2/3 overflow-hidden rounded-lg bg-muted ring-1 ring-border/60 transition-shadow group-hover:shadow-lg">
              {media.coverImage?.large ? (
                <Image
                  alt=""
                  className="object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none"
                  fill
                  /**
                   * Ces vignettes ne dépassent jamais ~180 px de large. Sans `sizes`, Next servirait
                   * l'image pleine largeur de viewport et téléchargerait bien plus que nécessaire.
                   */
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 180px"
                  src={media.coverImage.large}
                />
              ) : null}

              {/*
            La seule pastille qui reste sur la jaquette, et elle y est parce qu'elle qualifie
            l'image : c'est ce qu'on veut lire **avant** de la regarder, pas sous elle. Fond opaque,
            comme toute pastille posée sur une image quelconque — le contraste d'un texte blanc sur
            une jaquette claire n'est garanti par rien.
          */}
              {media.isAdult ? (
                /*
              `Badge` pour la forme, mais le fond reste **opaque** : la variante `destructive` est
              translucide (`bg-destructive/10`), ce qui laisserait la jaquette transparaître sous le
              texte. On garde la variante par défaut et on repeint — `cn` fait le ménage.
            */
                <Badge className="pointer-events-none absolute top-1.5 left-1.5 bg-destructive font-semibold text-white shadow-sm">
                  18+
                </Badge>
              ) : null}

              {/*
            Où j'en suis, puis ma note — coin opposé au « 18+ », et empilés plutôt que côte à côte.

            **La progression au-dessus** : c'est ce qu'on cherche en balayant une grille de suivis.
            Côte à côte, la fraction et la note se lisaient comme un seul nombre à quatre chiffres,
            et la note se décalait d'une carte à l'autre selon la largeur de la fraction qui la
            précédait ; `items-end` les cale sur le bord droit, qui est le même partout.

            Fond opaque, pour la raison du « 18+ » : rien ne garantit le contraste d'un texte sur une
            jaquette quelconque. `bg-background/95` et non un noir en dur — la pastille suit le thème
            comme le reste, et les 5 % de translucidité suffisent à ne pas la faire flotter au-dessus
            de l'image comme un autocollant.

            `pointer-events-none` : rien ici n'est cliquable, et le lien passe dessous.
          */}
              {progress?.label || score ? (
                <div className="pointer-events-none absolute top-1.5 right-1.5 flex flex-col items-end gap-1">
                  {progress?.label ? (
                    <Badge className="bg-background/95 text-foreground tabular-nums shadow-sm">
                      <span className="sr-only">Progression : </span>
                      {progress.label}
                    </Badge>
                  ) : null}

                  {score ? (
                    <Badge className="bg-background/95 text-foreground tabular-nums shadow-sm">
                      <StarIcon
                        aria-hidden="true"
                        className="fill-primary text-primary"
                      />
                      <span className="sr-only">Ma note : </span>
                      {score}
                    </Badge>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="mt-2 space-y-0.5">
              {/*
            **Une seule ligne, coupée aux points de suspension.** Deux lignes faisaient varier la
            hauteur d'une carte à l'autre selon la longueur du titre, donc décalaient tout ce qui la
            suit : dans une grille, une rangée dont chaque colonne commence à une hauteur différente
            se lit comme un escalier.

            **L'attribut `title` a disparu d'ici**, et ce n'est pas un oubli : il portait le titre
            complet en infobulle native, ce que l'encart de survol fait maintenant en mieux — et le
            garder faisait surgir deux panneaux l'un sur l'autre au même geste, l'infobulle du
            système par-dessus le nôtre.
          */}
              <p className="truncate font-medium text-sm leading-snug transition-colors group-hover:text-primary">
                {title}
              </p>

              {meta ? (
                <p className="truncate text-muted-foreground text-xs">{meta}</p>
              ) : null}
            </div>
          </Link>
        </HoverCardTrigger>

        {/*
        Bas de la jaquette, et seulement au survol.

        Le calque reprend exactement la boîte de l'image — même largeur, même `aspect-2/3`, ancré en
        haut — plutôt que le conteneur entier, qui descend jusque sous le titre : c'est ce qui fait
        que « en bas » veut dire le bas de la jaquette et non le bas de la carte, sans dépendre du
        nombre de lignes écrites dessous.

        Il ne se montre qu'au survol parce qu'une commande posée en permanence sur vingt-quatre
        vignettes se lit comme du bruit ; mais il ne se cache que là où le survol existe :
        `focus-within` le rappelle au clavier, et `pointer-coarse` le laisse en place au doigt, qui
        n'a aucun moyen de survoler.

        `pointer-events-none` sur le calque, rendu au bloc intérieur : sinon une boîte transparente
        couvrirait les deux tiers du lien et rendrait la jaquette incliquable.
      */}
        {action ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 flex aspect-2/3 items-end justify-center p-2">
            <div className="pointer-events-auto opacity-0 transition-opacity duration-200 focus-within:opacity-100 group-hover:opacity-100 motion-reduce:transition-none pointer-coarse:opacity-100">
              {action}
            </div>
          </div>
        ) : null}
      </div>

      {/*
        Ce que la vignette ne peut pas dire, et qui n'exige pas d'ouvrir la fiche.

        **L'encart ne reprend rien de ce qui est déjà à l'écran** : ni jaquette (elle est juste à
        côté, en plus grand), ni progression, ni ma note — les deux pastilles du coin les portent.
        Il complète, il ne redouble pas. C'est la même règle que celle qui a vidé la jaquette de ses
        pastilles superflues : deux fois la même information dans un seul regard, c'est une de trop.

        `side="right"` parce que ces cartes vivent en grille ou en rangée : au-dessus, le panneau
        recouvrirait la vignette qu'on désigne. Radix bascule tout seul du côté opposé quand la
        colonne touche le bord de la fenêtre.

        **Rien ici n'est atteignable au doigt**, et c'est acceptable : un encart de survol n'existe
        pas sur un écran tactile, où le geste équivalent est le clic — qui ouvre la fiche, laquelle
        dit tout cela et davantage. Aucune information n'y est donc exclusive.
      */}
      <HoverCardContent align="start" className="w-80" side="right">
        <div className="space-y-2.5">
          <div className="space-y-0.5">
            <p className="font-semibold text-sm leading-snug">{title}</p>

            {alternateTitle ? (
              <p className="text-muted-foreground text-xs leading-snug">
                {alternateTitle}
              </p>
            ) : null}
          </div>

          {facts || media.averageScore ? (
            <div className="flex items-center justify-between gap-2 text-muted-foreground text-xs">
              <span className="min-w-0 truncate">{facts}</span>

              {/*
                La moyenne de la communauté, **ici et pas sur la jaquette**.

                La vignette l'écarte volontairement : dans une grille, ce qu'une foule qu'on ne
                connaît pas pense d'une œuvre ne doit pas manger le coin où se lit ma propre note.
                L'objection portait sur cette surface-là, pas sur l'information — dans un encart
                qu'on est allé chercher, elle est exactement ce qu'on vient demander.
              */}
              {media.averageScore ? (
                <span className="flex shrink-0 items-center gap-1 font-medium text-foreground tabular-nums">
                  <StarIcon
                    aria-hidden="true"
                    className="size-3 fill-amber-500 text-amber-500"
                  />
                  <span className="sr-only">Note moyenne : </span>
                  {media.averageScore}
                </span>
              ) : null}
            </div>
          ) : null}

          {genres && genres.length > 0 ? (
            <ul className="flex flex-wrap gap-1">
              {genres.slice(0, HOVER_GENRE_COUNT).map((genre) => (
                <li key={genre}>
                  {/*
                    Des étiquettes et non des liens, contrairement au bandeau d'accueil : une cible
                    cliquable dans un panneau qui se ferme dès que la souris s'en écarte est une
                    cible qu'on rate. La recherche par genre reste à un clic, sur la fiche.
                  */}
                  <Badge variant="secondary">{genre}</Badge>
                </li>
              ))}
            </ul>
          ) : null}

          {summary ? (
            <p className="line-clamp-5 text-muted-foreground text-xs leading-relaxed">
              {summary}
            </p>
          ) : null}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

/**
 * Le temps d'immobilité avant que l'encart s'ouvre.
 *
 * Une demi-seconde, et le chiffre est ce qui sépare une aide d'une nuisance : en dessous, traverser
 * une grille de vingt-quatre jaquettes pour atteindre la barre de recherche en fait surgir six au
 * passage. La fermeture est presque immédiate — on part, le panneau s'efface —, mais pas nulle : le
 * trajet de la vignette vers le panneau passe par quelques pixels de vide qui le refermeraient sous
 * le curseur.
 */
const HOVER_OPEN_DELAY = 500;
const HOVER_CLOSE_DELAY = 120;

/**
 * Combien de genres l'encart montre.
 *
 * Quatre, comme le bandeau en montre trois et pour la même raison : AniList en pose jusqu'à huit,
 * et une rangée d'étiquettes qui passe à trois lignes repousse le synopsis hors du panneau. Au-delà
 * de quelques-uns on ne les lit plus, on les voit.
 */
const HOVER_GENRE_COUNT = 4;
