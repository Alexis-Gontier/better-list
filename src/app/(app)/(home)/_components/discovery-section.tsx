import { DashboardSection } from "@/app/(app)/(home)/_components/dashboard-section";
import {
  MediaCarousel,
  MediaCarouselItem,
  MediaCarouselSkeleton,
} from "@/components/shared/media-carousel";
import { Skeleton } from "@/components/ui/skeleton";
import { MediaCard } from "@/features/media/components/media-card";
import type { MediaBrowse } from "@/features/media/schemas/media.schema";
import { EntryCardActions } from "@/features/tracking/components/entry-card-actions";
import type { EntryState } from "@/features/tracking/lib/entry-transition";

/**
 * Une rangée de découverte : le catalogue AniList, éditorialisé.
 *
 * Elle vivait dans `/browse` ; la page a disparu et ses rangées sont descendues sur l'accueil, qui
 * est le seul endroit où l'on arrive sans savoir ce qu'on cherche (docs/PRODUCT.md §5).
 *
 * L'en-tête est celui du reste de la page (`DashboardSection`) et non le sien : ces rangées
 * cohabitent maintenant avec « En cours » et « Mes listes », et deux styles de titre sur le même
 * écran se liraient comme deux pages cousues.
 *
 * La section et son squelette vivent dans le **même fichier**, pour la raison qui a déjà fait
 * cohabiter `MediaGrid` et `MediaGridSkeleton` : c'est la seule façon de garantir qu'ils ne
 * divergent pas, et un squelette qui n'a pas la hauteur de la section décale la page à chaque fin
 * de chargement.
 */

/** Une rangée vide ne s'affiche pas du tout — même règle que les sections de suivi. */
export function DiscoverySection({
  title,
  description,
  media,
  entries,
  href,
}: {
  title: string;
  description: string;
  media: MediaBrowse[];
  /**
   * Les suivis du compte, indexés par id, lus une seule fois pour les cinq rangées (`Discovery`).
   *
   * C'est ce qui permet à une vignette de découverte de proposer « suivre » ou « modifier » selon le
   * cas. Une rangée qui interrogerait la base elle-même ferait cinq requêtes là où il en faut une.
   */
  entries: Map<number, EntryState>;
  /**
   * Vers la recherche préfiltrée, quand elle sait exprimer le même ensemble.
   *
   * Reste facultatif, mais les cinq rangées en ont désormais un : la recherche a gagné un filtre de
   * saison (`searchFilterParsers.season`), qui était ce qui manquait aux deux rangées saisonnières.
   * La règle qui les en privait tient toujours pour la suivante — un lien qui perdrait le filtre en
   * chemin serait pire que pas de lien, puisqu'il mènerait à une page qui ne montre pas ce qu'on a
   * cliqué.
   */
  href?: string;
}) {
  if (media.length === 0) return null;

  return (
    <DashboardSection description={description} href={href} title={title}>
      {/*
        Une rangée qui défile, et non plus une grille pleine : ces cinq sections se parcourent, elles
        ne se fouillent pas. Le raisonnement complet est sur `MediaCarousel` — il tient à ce que ces
        rangées sont éditoriales, là où la recherche et la bibliothèque montrent un ensemble dans
        lequel on cherche une œuvre précise, et doivent donc rester en grille.

        Les vignettes restent rendues **ici**, côté serveur, et traversent la frontière en `children` :
        `MediaCard` est asynchrone et lit elle-même la langue des titres.
      */}
      <MediaCarousel label={title}>
        {media.map((item) => (
          <MediaCarouselItem key={item.id}>
            <MediaCard
              action={
                <EntryCardActions
                  entry={entries.get(item.id) ?? null}
                  media={item}
                  /**
                   * Le document du catalogue ne demande ni `episodes` ni `chapters` : ces rangées
                   * servent à faire découvrir une œuvre, pas à mesurer une progression. La fenêtre
                   * affiche donc « sur ? » le temps de la première saisie — et dès que le suivi
                   * existe, `ensureMediaMirror` a copié le total dans le miroir, que tous les autres
                   * écrans lisent. Le plafond, lui, n'a jamais dépendu du client (PRODUCT.md §4.2).
                   */
                  total={null}
                />
              }
              /*
                Les genres, et pas de synopsis : le document du catalogue rapporte les premiers et
                pas le second (voir `MediaBrowseFields`). L'encart de survol montre donc ce qu'il a —
                c'est exactement le contrat des deux propriétés, qui n'exigent jamais une lecture de
                plus pour être remplies.
              */
              genres={item.genres}
              /*
                Pas de ligne de contexte : « Série TV · 2026 » se répétait sous chaque jaquette de
                chaque rangée pour dire ce qu'on ne cherche pas ici — une rangée de découverte se
                parcourt à l'image. Même raisonnement que la grille de recherche
                (`search-results.tsx`) : le format et l'année restent en vue liste, où la largeur
                les rend comparables d'une ligne à l'autre, et sur la fiche.
              */
              media={item}
            />
          </MediaCarouselItem>
        ))}
      </MediaCarousel>
    </DashboardSection>
  );
}

export function DiscoverySectionSkeleton({ count }: { count: number }) {
  return (
    <section className="space-y-3">
      <div className="space-y-1.5">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>

      <MediaCarouselSkeleton count={count} />
    </section>
  );
}
