import type { Metadata } from "next";
import { Suspense } from "react";

import { CatalogueUnavailableBanner } from "@/app/(app)/(home)/_components/catalogue-unavailable";
import { Dashboard } from "@/app/(app)/(home)/_components/dashboard";
import { DashboardSkeleton } from "@/app/(app)/(home)/_components/dashboard-skeleton";
import { Discovery } from "@/app/(app)/(home)/_components/discovery";
import { DiscoverySkeleton } from "@/app/(app)/(home)/_components/discovery-skeleton";
import { HeroCarouselSkeleton } from "@/app/(app)/(home)/_components/hero-carousel";
import { HomeHero } from "@/app/(app)/(home)/_components/home-hero";
import {
  HomeStats,
  HomeStatsSkeleton,
} from "@/app/(app)/(home)/_components/home-stats";

export const metadata: Metadata = {
  title: "Accueil",
  description:
    "Où vous en êtes, ce que vous avez laissé en chemin, et ce qui sort en ce moment.",
};

/**
 * L'accueil (docs/PRODUCT.md §5).
 *
 * **Il rassemble tout** : le suivi, les listes, le catalogue du moment. C'est la conséquence directe
 * de la disparition de `/browse` — sur un cercle privé de quatre comptes, une page de découverte
 * séparée obligeait à choisir une porte avant de savoir ce qu'on venait faire. La recherche reste
 * l'écran des questions qu'on a déjà ; celui-ci répond à « et sinon, quoi ? ».
 *
 * **La page s'ouvre sur une bannière, pas sur un titre.** L'en-tête « Accueil » disait à qui venait
 * d'arriver ce qu'il savait déjà, et occupait la seule bande d'écran qui vaut quelque chose ; le
 * bandeau y met à la place la série qu'on est en train de regarder, avec son « +1 ». Le titre de la
 * page vit désormais dans les métadonnées et dans l'onglet, où il sert à quelque chose.
 *
 * **Quatre frontières de suspension, une par coût.** Le bandeau part seul parce qu'il porte le LCP ;
 * les chiffres, le suivi et les listes se lisent dans le miroir local et répondent en quelques
 * millisecondes ; les rangées de découverte attendent AniList. Une frontière unique ferait attendre
 * le « +1 » — le geste le plus fréquent du produit — derrière un appel réseau dont il n'a aucun
 * besoin. `getSession` porte le `cache` de React, donc les quatre ne coûtent qu'une lecture de
 * session.
 *
 * L'ordre du DOM est celui de la page, quel que soit l'ordre d'arrivée : la découverte reste en bas
 * même si elle est prête avant le bandeau.
 *
 * **La page n'a plus aucun paramètre d'adresse.** La grille paginée qui la fermait a été retirée :
 * elle rejouait la recherche avec un tri figé, trois écrans sous des rangées qui répondaient déjà à
 * « qu'est-ce qui se passe », et chaque page tournée y coûtait une requête AniList pour un bloc que
 * le lien « Voir tout » dessert mieux. L'accueil se termine désormais sur une rangée, comme il
 * commence sur une bannière : rien à régler, rien à paginer.
 *
 * **« À reprendre » a quitté l'accueil aussi**, et pour la même famille de raisons : six vignettes de
 * séries oubliées entre le suivi et la découverte, pour une information qui tient dans un nombre. Le
 * nombre est resté, en tuile (`HomeStats`), et il mène à la bibliothèque filtrée — l'écran fait pour
 * trier ces œuvres plutôt que pour les regretter.
 *
 * **Le journal a quitté l'accueil.** Il répondait à « qu'est-ce que j'ai fait », question qu'on ne
 * se pose pas en ouvrant l'application, et il fermait la page par une liste de texte sous six
 * rangées d'images. Il reste entier sur le profil (`/u/[username]`), qui est l'écran fait pour lui.
 */
export default function HomePage() {
  return (
    <div className="space-y-8">
      {/*
        Le bandeau de panne, sans squelette : il n'a rien à réserver, puisqu'il ne s'affiche que dans
        le cas anormal. Un repli visible ferait clignoter une bande grise en tête de page à chaque
        visite, pour annoncer une ligne qui n'arrive presque jamais.
      */}
      <Suspense fallback={null}>
        <CatalogueUnavailableBanner />
      </Suspense>

      <Suspense fallback={<HeroCarouselSkeleton />}>
        <HomeHero />
      </Suspense>

      {/*
        Le titre de la page est **visuellement caché, pas supprimé**. Un document sans `<h1>` laisse
        les sections en `<h2>` sans parent, et un lecteur d'écran qui parcourt la structure atterrit
        sur « En cours » sans savoir de quelle page il s'agit. Ce qui a disparu est le bandeau de
        titre, pas le titre.
      */}
      <h1 className="sr-only">Accueil</h1>

      {/*
        Les chiffres, entre le bandeau et le suivi : la ligne de bilan qu'on lit d'un coup d'œil
        avant d'entrer dans le détail. Leur frontière est distincte de celle du tableau de bord parce
        qu'elles n'ont pas les mêmes lectures — les tuiles agrègent, la rangée liste —, et sœurs
        parce que les deux sont locales : elles partent ensemble et arrivent ensemble.
      */}
      <Suspense fallback={<HomeStatsSkeleton />}>
        <HomeStats />
      </Suspense>

      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard />
      </Suspense>

      <Suspense fallback={<DiscoverySkeleton />}>
        <Discovery />
      </Suspense>
    </div>
  );
}
