import Image from "next/image";

import { EntryActionBar } from "@/app/(app)/media/[id]/_components/entry-action-bar";
import { MediaBanner } from "@/app/(app)/media/[id]/_components/media-banner";
import { MediaFacts } from "@/app/(app)/media/[id]/_components/media-facts";
import { Separator } from "@/components/ui/separator";
import { mediaTitle } from "@/features/media/lib/media-format";
import type { MediaDetail } from "@/features/media/schemas/media.schema";
import type { TitleLanguage } from "@/features/preferences/schemas/preferences.schema";

type MediaHeroProps = {
  media: MediaDetail;
  titleLanguage: TitleLanguage;
};

/**
 * Le haut de la fiche : bannière, jaquette, titres, faits, suivi.
 *
 * **Tout ce qui compte tient avant le premier défilement**, et c'est la contrainte qui a dicté
 * l'ordre : le titre dit ce qu'on regarde, la ligne de faits répond aux cinq questions qu'on se
 * pose, et la barre de suivi porte le geste. Les deux traits ne décorent pas — ils séparent trois
 * natures d'information : ce qu'est l'œuvre, ce qu'on en sait, ce que j'en fais.
 *
 * La jaquette est la seule chose colorée de l'écran (spec du 2 septembre), et c'est elle qui tient
 * la couture entre la bannière et la page : elle remonte sur l'image, ce qui lie les deux blocs au
 * lieu de les empiler. Son cadre est un liseré clair posé sur une surface élevée — la même matière
 * que les panneaux —, de sorte qu'une jaquette sombre garde un bord visible là où une bordure
 * peinte à même l'image disparaîtrait.
 */
export function MediaHero({ media, titleLanguage }: MediaHeroProps) {
  const title = mediaTitle(media.title, titleLanguage);
  const cover = media.coverImage?.extraLarge ?? media.coverImage?.large ?? null;

  /**
   * Les titres qu'on n'affiche pas en tête. Dédupliqués et privés du titre principal : sur une
   * œuvre dont le romaji et l'anglais sont identiques, la ligne répéterait sinon le titre juste
   * au-dessous de lui-même.
   */
  const otherTitles = [
    ...new Set(
      [media.title.romaji, media.title.english, media.title.native].filter(
        (value): value is string => Boolean(value) && value !== title,
      ),
    ),
  ];

  return (
    <section>
      <MediaBanner src={media.bannerImage} />

      <div className="grid gap-6 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
        {/*
          **La jaquette est calée par le bas, pas par le haut**, et c'est ce qui la fait finir sur
          la même ligne que la barre de suivi quel que soit le contenu. Une marge négative fixe ne
          le pouvait pas : la hauteur de la colonne de droite varie avec le titre — une ou deux
          lignes — et avec le nombre de faits qui tiennent sur une rangée.

          Le mécanisme : cette colonne ne porte aucune hauteur propre, son contenu étant hors flux.
          La rangée est donc mesurée par la seule colonne de droite ; la jaquette s'y accroche par
          le bas et déborde vers le haut, sur la bannière, d'autant qu'il faut.

          Sous le seuil `sm` la grille n'a qu'une colonne : il n'y a plus rien à aligner, et on
          retombe sur une marge négative pour garder le chevauchement.

          La hauteur minimale **borne la remontée**, et elle n'est pas décorative : sans elle, une
          œuvre au titre court et aux faits peu nombreux — un webtoon sans saison ni auteur connu —
          donne une rangée si basse que la jaquette dépasse la bannière et se glisse sous
          l'en-tête. 184 px au large, soit 176 px de débordement au plus, ce que la plus courte des
          deux bannières encaisse.
        */}
        <div className="w-40 sm:relative sm:min-h-40 sm:w-auto lg:min-h-46">
          <div className="-mt-20 sm:absolute sm:inset-x-0 sm:bottom-0 sm:mt-0">
            {/*
              Le liseré est un vrai `border` de la couleur du fond : la jaquette paraît découpée
              dans la page plutôt que posée dessus, et le trait tient aussi bien sur la bannière que
              sur le fond uni. Un `ring` interne, lui, se serait peint **sous** l'image — une ombre
              interne passe derrière le contenu —, donc la jaquette aurait recouvert son propre
              cadre.
            */}
            <div className="relative aspect-2/3 overflow-hidden rounded-lg border-2 border-background bg-muted shadow-[0_16px_40px_rgb(0_0_0/0.55)]">
              {cover ? (
                <Image
                  alt=""
                  className="object-cover"
                  fill
                  priority
                  // Trois largeurs de rendu : la colonne est fixe au-delà de chaque seuil.
                  sizes="(min-width: 1024px) 240px, (min-width: 640px) 192px, 160px"
                  src={cover}
                />
              ) : null}
            </div>
          </div>
        </div>

        {/*
          Un seul écart pour toute la colonne, et les séparateurs au même niveau que ce qu'ils
          séparent : les emboîter dans un sous-groupe donnait deux rythmes verticaux dans un bloc
          qui n'en veut qu'un.
        */}
        <div className="flex min-w-0 flex-col gap-4">
          <header className="min-w-0">
            <h1 className="text-3xl font-semibold text-balance sm:text-4xl">
              {title}
            </h1>
            {otherTitles.length > 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {otherTitles.join(" · ")}
              </p>
            ) : null}
          </header>

          <Separator />

          <MediaFacts media={media} />

          <Separator />

          <EntryActionBar
            total={media.type === "ANIME" ? media.episodes : media.chapters}
            unit={media.type === "ANIME" ? "episode" : "chapitre"}
          />
        </div>
      </div>
    </section>
  );
}
