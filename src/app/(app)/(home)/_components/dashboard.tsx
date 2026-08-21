import { CompassIcon } from "lucide-react";
import Link from "next/link";

import { DashboardSection } from "@/app/(app)/(home)/_components/dashboard-section";
import {
  ResumeCard,
  ResumeCarouselItem,
} from "@/app/(app)/(home)/_components/resume-card";
import { MediaCarousel } from "@/components/shared/media-carousel";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { routes } from "@/config/routes";
import { ListCard } from "@/features/lists/components/list-card";
import { getMyLists } from "@/features/lists/server/lists.queries";
import {
  compactFromMirror,
  mirroredTitle,
} from "@/features/media/lib/media-format";
import { mediaTotalUnits } from "@/features/media/server/media.mirror";
import { getPreferences } from "@/features/preferences/server/preferences.queries";
import { EntryDialog } from "@/features/tracking/components/entry-dialog";
import { EntryQuickProgress } from "@/features/tracking/components/entry-quick-progress";
import { serializeLibraryFilters } from "@/features/tracking/lib/library-params";
import { getDashboard } from "@/features/tracking/server/tracking.queries";

/**
 * La part personnelle de l'accueil (docs/PRODUCT.md §5).
 *
 * Elle n'invente rien : elle compose ce que le suivi et les listes ont déjà posé. Trois questions,
 * dans l'ordre où on se les pose en ouvrant l'application — qu'est-ce que je regarde, qu'est-ce que
 * j'ai laissé en plan, qu'est-ce que j'ai rangé quelque part.
 *
 * **Elle passe avant la découverte, et c'est le choix qui structure la page.** Le geste le plus
 * fréquent du produit est le « +1 » (§6) : le mettre sous des rangées de catalogue le ferait payer
 * un défilement à chaque ouverture.
 *
 * Deux lectures locales en parallèle, une seule frontière de suspension : elles répondent en même
 * temps et n'ont aucune raison d'arriver séparément. Les rangées AniList, elles, ont leur propre
 * frontière — voir `discovery.tsx`.
 *
 * Le composant rend une **liste de sections**, pas un conteneur : c'est la page qui tient
 * l'espacement, pour que le suivi, la découverte et le journal respirent de la même façon.
 */

/** Assez de listes pour donner envie d'aller voir, pas assez pour recopier `/lists` ici. */
const DASHBOARD_LISTS_COUNT = 3;

export async function Dashboard() {
  /*
    La langue des titres est lue **ici** parce que la carte de reprise compose elle-même ses deux
    boutons : `EntryDialog` attend un titre déjà résolu, là où `EntryCardActions` allait le chercher
    pour son compte. `getPreferences` porte le `cache` de React — la lecture est donc gratuite, le
    bandeau d'ouverture l'ayant déjà payée.
  */
  const [{ current, total }, lists, { titleLanguage }] = await Promise.all([
    getDashboard(),
    getMyLists(),
    getPreferences(),
  ]);

  /**
   * L'instant de référence, lu **une fois** pour tout le tableau de bord.
   *
   * Les trois sections comparent des dates à « maintenant » — la fraîcheur d'une reprise,
   * l'ancienneté d'une série oubliée, la dernière retouche d'une liste. Prise dans chaque carte,
   * cette valeur donnerait autant d'instants que de cartes ; prise ici, tout l'écran raconte la
   * même seconde. C'est déjà ce que `ListCard` exigeait de son appelant.
   */
  const now = new Date();

  /**
   * Bibliothèque vide : une seule porte d'entrée, pas trois sections creuses.
   *
   * L'encadré ne prend plus toute la page comme au temps du tableau de bord seul — la découverte
   * s'affiche dessous, et c'est justement elle qui donne de quoi remplir la bibliothèque. On garde
   * le bouton : la recherche reste le chemin le plus court quand on sait déjà quoi suivre.
   */
  if (total === 0 && lists.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CompassIcon />
          </EmptyMedia>
          <EmptyTitle>Rien à suivre pour l'instant</EmptyTitle>
          <EmptyDescription>
            Marquez une œuvre comme en cours : elle apparaîtra ici, avec ce que
            vous en aurez fait. Il y a de quoi piocher juste en dessous.
          </EmptyDescription>
        </EmptyHeader>

        <EmptyContent>
          <Button asChild size="sm">
            <Link href={routes.search}>Chercher une œuvre</Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <>
      {current.length > 0 ? (
        <DashboardSection
          href={serializeLibraryFilters(routes.library, {
            status: "CURRENT",
            type: null,
            sort: "recent",
            page: 1,
          })}
          title="En cours"
        >
          {/*
            Une rangée qui défile, et non plus une grille.

            **C'est la seule section de suivi qui change**, et la raison tient à ce qu'elle est
            devenue : le bandeau d'ouverture montre déjà les cinq séries les plus fraîches en grand,
            donc ce qui reste ici est la **queue** de la même liste — ce qu'on parcourt pour retrouver
            une série précise, pas ce qu'on vient faire. Douze jaquettes en grille pleine y prenaient
            deux rangées d'écran sur desktop et six sur mobile, juste sous une bannière qui occupe
            déjà la moitié de la page.

            C'est désormais la **seule** section de suivi de l'accueil : « À reprendre » y montrait six
            vignettes de séries oubliées, ce qui était beaucoup d'écran pour une information qui tient
            dans un nombre. Le nombre est passé en tuile (`HomeStats`), d'où il mène à la bibliothèque
            filtrée — l'écran fait pour trier ces œuvres.

            **Les cartes y sont larges depuis qu'elles servent à reprendre et non à choisir.** Une
            jaquette répond à « laquelle ? », question déjà tranchée pour une série qu'on suit ; ce
            qu'on vient chercher ici, c'est où l'on en était. Le raisonnement complet est sur
            `ResumeCard`. La mécanique de défilement reste celle de `MediaCarousel` — même gouttière,
            mêmes flèches, même fraction de carte laissée au bord : deux rangées voisines qui se
            manœuvreraient différemment sur la même page se lisent comme un défaut.
          */}
          <MediaCarousel label="En cours">
            {current.map((entry) => (
              <ResumeCarouselItem key={entry.id}>
                <ResumeCard
                  /*
                    Les deux boutons sont composés ici plutôt que pris à `EntryCardActions`, comme
                    le fait déjà le bandeau d'ouverture : ils ont besoin d'apparences que le bloc
                    partagé ne sait pas transmettre. Ils restent la même paire, dans le même ordre —
                    le « +1 » d'abord, la fenêtre ensuite, qui est l'ordre de fréquence des deux
                    gestes.

                    **Le « +1 » porte son intitulé (`inline`), la fenêtre non (`compact`).** Depuis
                    que les commandes ont une ligne à elles en pied de carte, la place existe pour
                    dire ce que fait le bouton principal, et « Un épisode de plus » est ce qui rend
                    la rangée manœuvrable sans avoir à deviner ce que fait un « +1 ». Le crayon reste
                    muet : le geste est secondaire, et deux intitulés côte à côte feraient deux
                    boutons de même poids là où l'un des deux se clique dix fois plus souvent.
                  */
                  action={
                    <div className="flex items-center gap-2">
                      <EntryQuickProgress
                        appearance="inline"
                        mediaId={entry.media.id}
                        progress={entry.progress}
                        total={mediaTotalUnits(entry.media)}
                        unit={
                          entry.media.type === "ANIME" ? "episode" : "chapitre"
                        }
                      />

                      <EntryDialog
                        appearance="compact"
                        entry={entry}
                        image={entry.media.bannerImage}
                        mediaId={entry.media.id}
                        title={mirroredTitle(entry.media, titleLanguage)}
                        total={mediaTotalUnits(entry.media)}
                        unit={
                          entry.media.type === "ANIME" ? "episode" : "chapitre"
                        }
                      />
                    </div>
                  }
                  media={compactFromMirror(entry.media)}
                  now={now}
                  progress={entry.progress}
                  total={mediaTotalUnits(entry.media)}
                  updatedAt={entry.updatedAt}
                />
              </ResumeCarouselItem>
            ))}
          </MediaCarousel>
        </DashboardSection>
      ) : null}

      {lists.length > 0 ? (
        <DashboardSection href={routes.lists.root} title="Mes listes">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lists.slice(0, DASHBOARD_LISTS_COUNT).map((list) => (
              <li key={list.id}>
                <ListCard list={list} now={now} />
              </li>
            ))}
          </ul>
        </DashboardSection>
      ) : null}
    </>
  );
}
