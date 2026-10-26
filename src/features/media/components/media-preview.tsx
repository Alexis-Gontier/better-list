import { StarIcon } from "lucide-react";
import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import {
  cleanDescription,
  formatAverageScore,
  formatCountry,
  formatGenre,
  formatMediaCount,
  formatMediaFormat,
  formatMediaStatus,
  formatSeason,
  mediaTitle,
} from "@/features/media/lib/media-format";
import type { MediaCompact } from "@/features/media/schemas/media.schema";
import type { TitleLanguage } from "@/features/preferences/schemas/preferences.schema";

/**
 * Ce que le survol d'une jaquette ajoute à la carte — **le contenu seul**, sans le geste.
 *
 * Le geste est dans `media-hover-card.tsx`, qui est le seul client des deux. Ce composant-ci reste
 * serveur : il ne fait que mettre en forme des champs que la carte a déjà en main.
 *
 * **Ce qu'il dit, et pourquoi ces lignes-là.** Une grille de catalogue ne montre qu'une jaquette et
 * un titre coupé à une ligne : ce qu'on cherche en parcourant une page, c'est de quoi décider
 * d'ouvrir une fiche ou de passer. Le titre entier répare d'abord la troncature — c'est la moitié de
 * l'intérêt du panneau. Viennent ensuite la note, l'état de diffusion, la nature et le volume de
 * l'œuvre, sa saison, et quatre genres. C'est la sélection d'AniList sur sa propre recherche.
 *
 * **Il ne dit plus rien de mon suivi** (décision d'Alexis, 17 septembre 2026). Une ligne « Mon
 * suivi » fermait le panneau — « En cours · ép. 12 / 26 », ou « Prévu » tout seul. Elle est partie
 * avec le filet qui l'annonçait : la pastille de statut sur la carte et le crayon au survol disent
 * déjà que l'œuvre est suivie, et le panneau redevient ce qu'AniList sait de l'œuvre, sans mélange.
 *
 * **La jaquette est passée à gauche le 17 septembre 2026** (demande d'Alexis), et le panneau s'est
 * élargi avec elle. Elle fait doublon avec la carte survolée, et c'est justement ce qui la rend
 * utile : le panneau paraît maintenant sous le curseur, donc souvent **par-dessus** la grille et
 * parfois par-dessus la carte elle-même. Sans elle, on lisait un titre sans savoir de quelle
 * illustration il parlait.
 *
 * Toutes les valeurs sont facultatives, et le panneau se referme sur ce qu'il a : une œuvre annoncée
 * n'a ni note, ni saison, ni volume, et c'est le cas le plus courant sur les rangées « à paraître ».
 */
export function MediaPreview({
  media,
  titleLanguage,
}: {
  media: MediaCompact;
  titleLanguage: TitleLanguage;
}) {
  const cover = media.coverImage?.extraLarge ?? media.coverImage?.large ?? null;
  const score = formatAverageScore(media.averageScore);
  const status = formatMediaStatus(media.status);
  const synopsis = previewSynopsis(media.description);

  /*
    Les trois faits sur une seule ligne, séparés par des points médians, et **les absents
    disparaissent** plutôt que de laisser un séparateur orphelin. Un manga n'a pas de saison, un film
    pas de volume (`formatMediaCount`), une œuvre annoncée souvent ni l'un ni l'autre.
  */
  const facts = [
    formatMediaFormat(media.format),
    formatMediaCount(media),
    formatSeason(media.season, media.seasonYear),
    /*
      **Le pays, mais pas le Japon.** Il est là pour distinguer un manhwa d'un manga, ce que le
      format seul ne dit pas — et « Japon » sur les quatre cinquièmes d'un catalogue d'animes est du
      bruit qui pousse la saison hors de la ligne. On ne le nomme donc que lorsqu'il surprend.
    */
    media.countryOfOrigin === "JP"
      ? null
      : formatCountry(media.countryOfOrigin),
  ].filter((fact): fact is string => fact !== null);

  /*
    **Quatre genres au plus**, et non plus trois : le panneau a gagné en largeur avec la jaquette, et
    la ligne en accueille un de plus sans déborder sur une deuxième. AniList en attribue jusqu'à
    huit, et les huit feraient du plus gros bloc de texte d'un survol censé se lire d'un coup d'œil.
    Les premiers sont les plus caractéristiques : AniList les rend classés par pertinence.
  */
  const genres = media.genres.slice(0, PREVIEW_GENRES).map(formatGenre);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3">
        {/*
          **La jaquette, à gauche.** Le rapport 2:3 est posé sur le conteneur et non sur l'image,
          comme dans `MediaCard` : c'est ce qui réserve la place avant le chargement, donc ce qui
          empêche le panneau de changer de hauteur sous le curseur au moment où l'illustration
          arrive. Le liseré est interne pour ne rien ajouter à la boîte.

          **`self-start`, et c'est un correctif.** Un enfant de flex s'étire par défaut à la hauteur
          de la rangée : la colonne de texte étant plus haute que 192 px sur les longs synopsis, la
          jaquette était tirée avec elle et son rapport partait. L'image ne se déformait pas —
          `object-cover` recadre — mais on voyait une bande d'illustration au lieu d'une jaquette.
          Détachée du dépassement, elle fait exactement deux tiers de sa largeur, toujours.

          **Le fond est la couleur dominante de la jaquette**, qu'AniList livre déjà dans
          `coverImage.color` — elle voyageait jusqu'ici sans que rien ne la lise. Elle ne se voit
          qu'un instant, le temps que l'image arrive, et sur les œuvres qui n'en ont pas du tout :
          un rectangle teinté à l'œuvre vaut mieux qu'un trou gris.
        */}
        <div
          className="relative aspect-2/3 w-32 shrink-0 self-start overflow-hidden rounded-md bg-muted ring-1 ring-border ring-inset"
          style={
            media.coverImage?.color
              ? { backgroundColor: media.coverImage.color }
              : undefined
          }
        >
          {cover ? (
            <Image
              alt=""
              className="object-cover"
              fill
              /*
                Cent vingt-huit pixels de large, pas la largeur de la fenêtre : le panneau ne s'ouvre qu'au
                survol, donc cette image-ci n'est demandée qu'à ce moment-là, et elle doit être la
                plus légère possible pour ne pas arriver après le geste.
              */
              sizes="128px"
              src={cover}
            />
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {/*
            Le titre **entier**, sur trois lignes au plus. C'est ce que la carte ne peut pas montrer :
            elle le coupe à une ligne pour garder l'alignement horizontal de la grille
            (`media-card.tsx`), et l'infobulle native qui le rend aujourd'hui met une seconde à
            paraître et s'affiche en gris système, hors de la page.

            Trois lignes et non deux depuis que la colonne s'est rétrécie d'une jaquette : c'est la
            hauteur de celle-ci qui les paie, et un titre coupé dans le panneau qui répare les titres
            coupés serait une drôle de promesse.
          */}
          <p className="line-clamp-3 font-medium text-sm leading-snug">
            {mediaTitle(media.title, titleLanguage)}
          </p>

          {score || status || media.isAdult ? (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {score ? (
                /*
                  La note **sur cinq étoiles**, comme partout où l'on en saisit une
                  (`formatAverageScore`). `tabular-nums` pour que « 4,2 » et « 3,9 » occupent la même
                  largeur d'un panneau à l'autre : sans ça, la ligne danse quand on glisse d'une carte
                  à sa voisine.
                */
                <span className="flex items-center gap-1 font-medium tabular-nums">
                  <StarIcon className="size-3 fill-current" />
                  {score}
                </span>
              ) : null}
              {status ? (
                <span className="text-muted-foreground">{status}</span>
              ) : null}

              {/*
                **Le marqueur 18+, que rien n'affichait nulle part.** `isAdult` voyage dans la carte
                depuis toujours — c'est lui qui filtre le catalogue selon la préférence du compte —,
                mais une œuvre adulte laissée visible par un compte qui les accepte ne se distinguait
                d'aucune autre. Ce n'est pas un avertissement moral : c'est ce qui évite d'ouvrir
                une fiche à l'improviste devant quelqu'un.

                `Badge` du dépôt plutôt qu'un `span` habillé à la main : la variante `destructive`
                porte déjà le couple fond/texte, sa hauteur et son arrondi. Un badge maison aurait
                été un deuxième badge à tenir le jour où le thème bouge.
              */}
              {media.isAdult ? <Badge variant="destructive">18+</Badge> : null}
            </div>
          ) : null}

          {facts.length > 0 ? (
            <p className="text-muted-foreground text-xs">{facts.join(" · ")}</p>
          ) : null}

          {genres.length > 0 ? (
            <PreviewField label="Genres">{genres.join(" · ")}</PreviewField>
          ) : null}

          {/*
            **Le synopsis dans la colonne de droite, et non sous les deux.** Posé sous la jaquette,
            il laissait un trou à droite d'elle : la pile titre / note / faits / genres est plus
            courte qu'une jaquette, et le texte reprenait au-dessous du creux. Dans la colonne, il le
            comble — et trois cents pixels lui suffisent depuis que le panneau s'est élargi.

            Il est le seul champ vraiment lourd de la carte compacte, d'où la coupe **au serveur**
            (`previewSynopsis`) : sans elle, le texte entier de vingt et une œuvres partirait dans le
            HTML de chaque page de catalogue pour n'en montrer que trois lignes.

            **Quatre lignes, et c'est la jaquette qui les paie.** Les deux colonnes s'étirent l'une
            sur l'autre : la plus haute décide, et l'autre suit sans laisser de creux. À 128 px de
            large, la jaquette en réclame 192 de haut, ce qui laisse à droite la place d'un titre,
            de trois lignes d'étiquettes et de quatre de synopsis. En deçà, c'est elle qui mène ; au
            delà — un titre sur trois lignes —, c'est le texte, et la jaquette se recadre de quelques
            pixels plutôt que d'ouvrir un trou.

            `mt-0.5` plutôt qu'un `gap` plus large sur la colonne : c'est le seul écart de la pile
            qui sépare deux natures de texte — des étiquettes au-dessus, une phrase en dessous.
          */}
          {synopsis ? (
            <PreviewField label="Synopsis">
              <span className="line-clamp-4 leading-relaxed">{synopsis}</span>
            </PreviewField>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * Un renseignement du panneau, **précédé de ce qu'il est** (demande d'Alexis, 17 septembre 2026).
 *
 * Sans étiquette, un paragraphe posé sous une liste de genres ne dit pas qu'il est un résumé — on
 * le lit avant de savoir ce qu'on lit. Ce sont les blocs qui ne se nomment pas d'eux-mêmes qui en
 * reçoivent une : le synopsis, les genres, et ma progression. **Le reste n'en a pas**, et c'est
 * délibéré : « Série TV · 14 épisodes · Été 2026 » se passe d'un intitulé « Format », et une note
 * précédée d'une étoile n'a pas besoin qu'on écrive « Note » devant.
 *
 * **La forme est celle qu'emploie déjà l'onglet Personnages de la fiche** (`media-characters.tsx`) :
 * capitales, chasse écartée, plus petite que le texte qu'elle annonce. C'est ce qui la distingue du
 * contenu sans la rendre plus voyante que lui — la hiérarchie tient à la casse et à la graisse, pas
 * à la couleur, qui reste `text-muted-foreground` des deux côtés.
 *
 * **Contraste mesuré à l'écran** : 5,18:1 sur le fond du panneau, au-dessus des 4,5:1 exigés pour
 * du texte courant. C'est la teinte des étiquettes comme celle du corps — les réduire davantage
 * pour « adoucir » la hiérarchie serait passer sous le seuil.
 */
function PreviewField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <PreviewLabel>{label}</PreviewLabel>
      <p className="text-muted-foreground text-xs">{children}</p>
    </div>
  );
}

/**
 * L'étiquette elle-même, partagée par les champs empilés et par le pied de suivi.
 *
 * Elle est sortie de `PreviewField` le jour où le suivi a cessé d'être un champ empilé : deux
 * dispositions, une seule façon d'écrire une étiquette — sans quoi la casse ou la chasse aurait
 * divergé au premier ajustement.
 */
function PreviewLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-medium text-[0.6875rem] text-muted-foreground uppercase tracking-[0.12em]">
      {children}
    </p>
  );
}

/** Quatre genres : ce que la ligne tient sans se replier, à la largeur actuelle du panneau. */
const PREVIEW_GENRES = 4;

/**
 * Ce qu'on garde du synopsis : **le premier paragraphe, coupé à trois cents signes.**
 *
 * `cleanDescription` désamorce le HTML saisi par les contributeurs d'AniList et rend les paragraphes
 * ; le premier suffit, les suivants sont des notes de production et des listes de récompenses.
 *
 * La coupe est **au serveur et pas seulement au `line-clamp`**, et c'est une question de poids, pas
 * d'apparence : le panneau de chaque carte est rendu côté serveur et voyage dans le HTML de la page,
 * qu'on le survole ou non. Sans coupe, vingt et un synopsis entiers partiraient à chaque page de
 * catalogue pour trois lignes affichées.
 *
 * Elle tombe sur une **frontière de mot** — couper au milieu d'un mot fait lire une faute de frappe
 * plutôt qu'une troncature — et n'ajoute les points de suspension que si elle a réellement coupé.
 */
function previewSynopsis(description: string | null): string | null {
  const paragraph = cleanDescription(description)[0];
  if (!paragraph) return null;
  if (paragraph.length <= SYNOPSIS_LENGTH) return paragraph;

  const cut = paragraph.slice(0, SYNOPSIS_LENGTH);
  const lastSpace = cut.lastIndexOf(" ");

  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

const SYNOPSIS_LENGTH = 300;
