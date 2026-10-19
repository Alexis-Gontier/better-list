import Image from "next/image";
import Link from "next/link";

import { routes } from "@/config/routes";
import { MediaHoverCard } from "@/features/media/components/media-hover-card";
import { MediaPreview } from "@/features/media/components/media-preview";
import { mediaTitle } from "@/features/media/lib/media-format";
import type { MediaCompact } from "@/features/media/schemas/media.schema";
import type { TitleLanguage } from "@/features/preferences/schemas/preferences.schema";

/**
 * La carte d'une œuvre — une jaquette, un titre, et une action qui paraît au survol.
 *
 * Elle a démarré dans le `_components/` de `/search` et **a été promue ici le 6 septembre 2026,
 * quand `/library` en a eu besoin** : deuxième route, donc `features/media/components/`, la maison
 * d'un composant qui connaît une entité métier (`MediaCompact`, `mediaTitle`, `routes.media`).
 * C'est la règle de promotion d'CLAUDE.md appliquée à la lettre — celle qui avait été
 * enfreinte en connaissance de cause pour les contrôles de suivi, promus avant leur deuxième
 * appelant.
 *
 * **L'image ne bouge pas au survol**, et c'est la seule chose que la spec du 2 septembre impose
 * vraiment ici : l'agrandissement (`scale-105`, le geste par défaut de n'importe quelle grille) y
 * est explicitement écarté — cinquante jaquettes qui respirent au passage de la souris font vibrer
 * la grille. Ce qui paraît, c'est l'action posée en haut à gauche.
 *
 * Composant **serveur**, et il le reste : le geste est du CSS, le contenu qu'il révèle vient de
 * l'appelant par le slot `action`. Rendre cette carte cliente embarquerait la grille entière dans
 * le bundle pour un bouton.
 *
 * **Le survol dit aussi ce que la carte ne peut pas montrer** (14 septembre 2026) : un panneau paraît
 * sous le curseur avec la jaquette, le titre entier, la note, l'état de diffusion, le volume, la
 * saison, les genres et le synopsis — `media-preview.tsx`. Il n'ouvre aucune lecture ; tout ce qu'il affiche est déjà
 * dans le `MediaCompact` que la carte a en main, c'est d'ailleurs pour lui que cette forme s'est
 * élargie de cinq champs. Et la carte ne devient pas cliente pour autant : le déclencheur est un
 * composant client minuscule qui reçoit la carte et le panneau en props, tous deux rendus ici.
 */

type MediaCardProps = {
  media: MediaCompact;
  titleLanguage: TitleLanguage;
  /**
   * Charger la jaquette **sans attendre**, pour la première rangée seulement.
   *
   * `next/image` diffère tout par défaut, ce qui est juste pour vingt et une vignettes dont la
   * plupart sont sous la ligne de flottaison — mais la toute première est le plus grand élément
   * affiché de la page, donc sa mesure de LCP. La différer, c'est retarder le seul instant que
   * mesure cette métrique. Next le signale d'ailleurs en clair dans la console.
   *
   * À ne donner qu'à ce qui est réellement visible au chargement : tout marquer prioritaire revient
   * à ne rien prioriser, et fait concurrencer la première image par vingt autres.
   */
  priority?: boolean;
  /**
   * Un marqueur posé **à gauche du titre** — aujourd'hui la pastille de statut de suivi.
   *
   * C'est un emplacement, pas un statut, et l'écart est délibéré. `MediaCard` vit dans
   * `features/media/` ; lui passer un `EntryStatus` ferait dépendre le domaine du catalogue de
   * celui du suivi pour un rond de huit pixels. Le dépôt refuse déjà ce couplage ailleurs pour
   * moins que ça — `entry-format.ts` réécrit six libellés plutôt que d'importer ceux de `media`.
   *
   * L'appelant fournit donc son propre marqueur : `/library` y met un `EntryStatusDot`, et un autre
   * écran pourra y mettre autre chose sans que cette carte ait à le savoir.
   */
  marker?: React.ReactNode;
  /**
   * L'action posée **en bas à droite de la jaquette** — aujourd'hui le bouton d'édition rapide du
   * suivi.
   *
   * Même contrat que `marker`, et pour la même raison : la carte pose l'emplacement et le geste,
   * l'appelant pose le métier. Elle demeure donc un Server Component ; seul ce qu'on glisse dedans
   * est un îlot client, et il n'embarque que lui.
   *
   * **Ce contenu est rendu hors du `<Link>`, jamais dedans.** Un `<button>` dans un `<a>` est du
   * HTML invalide : le navigateur referme l'ancre avant le bouton, et la moitié de la carte se
   * retrouve hors du lien à un endroit qu'on n'a pas choisi. L'action est donc un **frère** du
   * lien, posé par-dessus la jaquette en position absolue.
   */
  action?: React.ReactNode;
  /**
   * Des lignes d'information **sous le titre**, une par entrée, chacune tronquée.
   *
   * Ajoutée le 14 septembre 2026 pour la rangée « À reprendre » de l'accueil, qui a besoin de dire
   * où l'on en est et depuis quand — c'est toute l'information de cette rangée. Absente partout
   * ailleurs, et c'est voulu : dans une grille, des cartes de hauteurs différentes cassent
   * l'alignement horizontal (voir le titre sur une ligne, plus bas). Un appelant qui la passe la
   * passe donc **à toutes les cartes de sa rangée**, avec le même nombre de lignes.
   */
  details?: string[];
  /**
   * Un contenu **sous la carte, hors du lien** — ajouté le 26 septembre 2026 pour les pages
   * Personnage et Staff, qui y posent le doubleur ou le personnage, eux-mêmes cliquables.
   *
   * Hors du `<Link>` pour la même raison qu'`action` : une ancre dans une ancre est du HTML
   * invalide. Même règle que `details` : un appelant le passe à toutes les cartes de sa grille.
   */
  footer?: React.ReactNode;
};

export function MediaCard({
  media,
  titleLanguage,
  priority,
  marker,
  action,
  details,
  footer,
}: MediaCardProps) {
  const cover = media.coverImage?.extraLarge ?? media.coverImage?.large ?? null;
  const title = mediaTitle(media.title, titleLanguage);

  return (
    /*
      Le `group` et le `relative` sont sur cette enveloppe, pas sur le lien : le voile doit être un
      frère du `<Link>` (voir `action`), donc il leur faut un ancêtre positionné commun. Et l'état
      de survol vaut pour la carte entière — approcher la souris du bouton en frôlant le titre ne
      doit pas faire redescendre le voile sous le doigt.
    */
    <div className="group relative flex flex-col gap-2">
      {/*
        **Le panneau de survol enveloppe le lien, pas la carte entière.** Radix attache son
        déclencheur à l'élément qu'on lui donne : sur l'enveloppe, il capterait aussi le survol du
        bouton d'action, qui est son frère — approcher la souris du « +1 » ouvrirait un panneau
        par-dessus le geste qu'on vise. Sur le lien, il couvre exactement la jaquette et le titre,
        c'est-à-dire ce qu'on survole quand on regarde une œuvre. Et le lien étant focusable, le
        panneau vient aussi au clavier.
      */}
      <MediaHoverCard
        preview={<MediaPreview media={media} titleLanguage={titleLanguage} />}
      >
        {/*
            **Pas de préchargement, et c'est le quota qui décide.** Next précharge par défaut les liens
            qui entrent dans le champ de vision. Chaque préchargement de `/media/[id]` exécute la
            `generateMetadata` de la fiche, qui appelle AniList : sur une grille de vingt et une cartes,
            faire défiler la recherche pourrait donc dépenser jusqu'à vingt et une des trente requêtes
            que la minute partage entre tous les visiteurs (.claude/skills/anilist-read/references/recherche-filtres.md), sans que
            personne n'ait cliqué.

            **Non vérifié à l'écran, et ça ne peut pas l'être ici** : Next désactive le préchargement
            des liens en développement — le journal réseau ne montre aucune requête vers `/media/*`.
            C'est donc une précaution raisonnée, pas une mesure. À confirmer sur un déploiement, en
            regardant si une grille affichée sans clic consomme du quota.

            Ce qu'on perd est une navigation un peu moins instantanée vers une fiche. Ce qu'on garde est
            la seule ressource que ce projet ne peut pas acheter. **Le survol n'y touche toujours pas** :
            son panneau se contente de remettre en forme ce que la carte a déjà reçu, il n'ouvre aucune
            lecture — c'est même la contrainte qui a décidé de son contenu.
        */}
        <Link
          className="flex flex-col gap-2"
          href={routes.media(media.id)}
          prefetch={false}
        >
          {/*
            Le rapport 2:3 est posé sur le conteneur et non sur l'image : c'est ce qui **réserve la
            place avant le chargement**, donc ce qui empêche la grille de sauter quand les jaquettes
            arrivent une à une. Une œuvre sans jaquette occupe alors exactement la même case qu'une
            autre, au lieu de tasser sa rangée.

            Le liseré est **interne** (`inset`) plutôt qu'une bordure : une bordure ajouterait un
            pixel à la boîte et désalignerait les cartes entre elles. Il encastre la jaquette au lieu
            de l'entourer — c'est le premier des trois leviers de signature de la spec du 2 septembre,
            et le seul qui ne coûte rien à poser tout de suite.
          */}
          <div className="relative aspect-2/3 overflow-hidden rounded-md bg-muted shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]">
            {cover ? (
              <Image
                alt=""
                className="object-cover"
                fill
                priority={priority}
                /*
                  Les tailles suivent les paliers de la grille — sans elles, `next/image` sert une
                  image pleine largeur de viewport pour une vignette de 140 px, soit dix fois trop de
                  pixels sur une page qui en affiche vingt et une.
                */
                sizes="(min-width: 1280px) 12vw, (min-width: 1024px) 16vw, (min-width: 640px) 25vw, 45vw"
                src={cover}
              />
            ) : null}
          </div>

          {/*
            **Le titre tient sur une ligne**, coupé au besoin — décision d'Alexis du 6 septembre 2026.
            Sur deux lignes, la hauteur des cartes variait d'une rangée à l'autre selon la longueur
            des titres, et la grille perdait son alignement horizontal ; sur une, toutes les cartes
            font exactement la même hauteur. Le titre complet reste accessible par l'infobulle native
            du navigateur, que `truncate` déclenche sur le texte coupé.

            `alt=""` sur l'image, à dessein : le titre est juste là, en texte. Le répéter ferait lire
            deux fois la même chose à un lecteur d'écran.

            Le marqueur est **hors du texte tronqué**, pas dedans : `truncate` coupe le contenu de son
            propre élément, donc une pastille placée à l'intérieur disparaîtrait sur les titres longs
            — c'est-à-dire précisément ceux où l'on a besoin d'un repère. Le titre garde donc son
            `min-w-0` et sa troncature ; la pastille garde sa place, quoi qu'il arrive.
          */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              {marker}
              <p className="min-w-0 truncate text-sm" title={title}>
                {title}
              </p>
            </div>
            {details?.map((line) => (
              <p className="truncate text-muted-foreground text-xs" key={line}>
                {line}
              </p>
            ))}
          </div>
        </Link>
      </MediaHoverCard>

      {footer ? (
        <div className="flex min-w-0 flex-col gap-0.5">{footer}</div>
      ) : null}

      {action ? (
        /*
          **En bas à droite de la jaquette**, décision d'Alexis du 6 septembre 2026.

          La version précédente était le voile de la spec du 2 septembre — une barre pleine largeur
          montée depuis le bas au survol, portant « Modifier ». Elle marchait, mais elle coûtait un
          tiers de la jaquette et ne se transposait pas au catalogue, où la plupart des cartes ne
          sont pas encore suivies. **Le voile reviendra quand il aura de quoi le remplir** : la spec
          lui destine le « +1 » et la progression en barre fine, qui demandent l'un et l'autre une
          écriture qui n'existe pas encore.

          `aspect-2/3` reproduit exactement la boîte de la jaquette, qui est le premier enfant du
          lien et occupe toute la largeur : l'action se pose donc **sur l'illustration, jamais sur
          le titre**. Les deux rapports doivent rester d'accord — c'est le couplage que cette
          disposition coûte, et il est ici plutôt que dans un `calc()` sur la hauteur du titre, qui
          serait bien plus fragile.

          **Le conteneur ne capte pas la souris.** Sans `pointer-events-none`, il couvrirait toute
          la jaquette et le lien deviendrait incliquable — sur la partie de la carte qu'on vise le
          plus. Seule l'action récupère les événements, ce qui laisse « cliquer à côté du bouton »
          ouvrir la fiche.
        */
        <div className="pointer-events-none absolute inset-x-0 top-0 flex aspect-2/3 items-end justify-end p-1.5">
          {/*
            **La surface opaque sous l'action.** Elle se pose directement sur la jaquette, dont le
            contraste n'est garanti par rien — mesuré en 390, un bouton au fond semi-transparent s'y
            délavait sur les couvertures claires. C'est la carte qui la porte et pas l'appelant : le
            fond d'une pastille posée sur une jaquette est une affaire de géométrie, et une classe
            posée sur le bouton perdrait de toute façon la cascade contre le fond de son propre
            variant.

            Le token `--overlay` est écrit mot pour mot pour ce cas — « le fond d'une pastille posée
            sur une jaquette », presque opaque.

            `flex` plutôt qu'un bloc : sans lui, la ligne de base laisse quelques pixels de vide sous
            un enfant `inline-flex`, et le fond dépasse le bouton par le bas.

            **Elle n'apparaît qu'au survol ou au focus clavier, et seulement à partir de `sm`.** Un
            survol n'existe pas au doigt : en dessous, elle reste posée, sinon elle serait
            inatteignable. L'opacité plutôt qu'un `display` : ce qui n'est jamais rendu ne peut pas
            prendre le focus qui doit le révéler.

            **`has-focus-visible` et surtout pas `group-focus-within`, et c'est un correctif.**
            Une fenêtre modale rend le focus à son déclencheur en se fermant — c'est ce qu'elle doit
            faire, sinon on repart du haut du document. Avec `focus-within`, ce focus rendu gardait
            la carte allumée après la fermeture, souris partie ailleurs, jusqu'au prochain clic
            quelque part. `:focus-visible` ne retient que le focus **au clavier** : le geste que ce
            bouton doit encore servir, sans le rémanent que le geste à la souris laissait derrière
            lui.
          */}
          <div className="pointer-events-auto flex rounded-md bg-overlay transition-opacity duration-150 sm:opacity-0 sm:group-hover:opacity-100 sm:has-focus-visible:opacity-100 motion-reduce:transition-none">
            {action}
          </div>
        </div>
      ) : null}
    </div>
  );
}
