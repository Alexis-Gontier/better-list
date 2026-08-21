import Link from "next/link";

import { Skeleton } from "@/components/ui/skeleton";
import { LOCALE } from "@/config/locale";
import { routes } from "@/config/routes";
import { getProfileStats } from "@/features/profile/server/profile.queries";
import { formatScore } from "@/features/tracking/lib/entry-format";
import { serializeLibraryFilters } from "@/features/tracking/lib/library-params";
import { getStalledCount } from "@/features/tracking/server/tracking.queries";
import { getSession } from "@/lib/auth/session";

/**
 * Les chiffres du compte, en tête d'accueil (docs/PRODUCT.md §5).
 *
 * **Quatre tuiles, deux d'activité et deux de bilan.** « En cours » et « À reprendre » disent ce qui
 * est ouvert en ce moment ; « épisodes vus » et « note moyenne » disent ce qu'il y a derrière. Un
 * bandeau qui ne montrerait que le bilan serait un profil déplacé en accueil, et un bandeau qui ne
 * montrerait que l'activité redirait ce que la rangée juste dessous montre déjà en images.
 *
 * **La tuile « À reprendre » est ce qui remplace une section entière.** L'accueil affichait six
 * vignettes de séries oubliées, sous le suivi et au-dessus de la découverte ; c'était beaucoup
 * d'écran pour une information qui tient en un nombre, et le nombre mène de toute façon à la
 * bibliothèque filtrée, où l'on voit les mêmes œuvres avec de quoi les trier.
 *
 * **Chaque tuile qui peut mener quelque part y mène.** Un chiffre posé sur une page dont tout le
 * reste est cliquable se lit comme une commande en panne — c'est le raisonnement des puces de genre
 * du bandeau. « Épisodes vus » et « note moyenne » n'ont pas de destination : aucun écran ne
 * représente ces ensembles, et un lien vers la bibliothèque entière serait un lien qui ment.
 *
 * **Sa place est sous le bandeau, avant « En cours ».** C'est la ligne de bilan qu'on lit d'un coup
 * d'œil avant d'entrer dans le détail, et elle tient en une bande de soixante pixels : au-dessous de
 * la rangée, elle aurait repoussé la découverte sans rien gagner.
 *
 * Server Component, deux lectures locales en parallèle, sa propre frontière de suspension : elles
 * répondent en quelques millisecondes et n'ont aucune raison d'attendre les listes.
 */
export async function HomeStats() {
  const session = await getSession();
  if (!session) return null;

  /*
    `isSelf` vaut vrai sans condition : on est chez soi par construction, l'accueil n'existant que
    pour le compte connecté. C'est ce qui inclut les entrées privées dans le compte — les masquer
    sur son propre écran ferait un total que rien d'autre dans l'application ne confirme.
  */
  const [stats, stalled] = await Promise.all([
    getProfileStats({ userId: session.user.id, isSelf: true }),
    getStalledCount(),
  ]);

  /*
    Une bibliothèque vide n'a pas de chiffres à montrer : quatre zéros posés sous le bandeau
    n'apprendraient rien et occuperaient la place de l'encadré d'accueil que `Dashboard` affiche
    juste dessous.
  */
  if (stats.total === 0) return null;

  const count = (value: number) => value.toLocaleString(LOCALE);

  const libraryHref = (status: "CURRENT" | "PAUSED") =>
    serializeLibraryFilters(routes.library, {
      status,
      type: null,
      sort: "recent",
      page: 1,
    });

  return (
    <section aria-labelledby="chiffres">
      {/*
        Le titre de la section est caché : la bande se lit d'elle-même — quatre nombres surmontant
        quatre intitulés —, et un « En chiffres » de plus au-dessus ferait un troisième niveau de
        titre entre le bandeau et « En cours ». Il reste pour qui parcourt la page par sa structure,
        où une région sans nom ne se distingue d'aucune autre.
      */}
      <h2 className="sr-only" id="chiffres">
        En chiffres
      </h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          href={libraryHref("CURRENT")}
          label="en cours"
          value={count(stats.byStatus.CURRENT ?? 0)}
        />
        <StatTile
          href={stalled > 0 ? libraryHref("PAUSED") : undefined}
          label="à reprendre"
          value={count(stalled)}
        />
        <StatTile label="épisodes vus" value={count(stats.episodes)} />
        <StatTile
          label="note moyenne"
          value={
            stats.averageScore === null ? "—" : formatScore(stats.averageScore)
          }
        />
      </div>
    </section>
  );
}

/**
 * Une tuile, lien ou non.
 *
 * Les deux variantes partagent exactement la même boîte : une tuile cliquable qui se distinguerait
 * d'une tuile inerte par sa taille ou son fond ferait quatre cases de deux formes sur une même
 * ligne. Ce qui les sépare est le survol, qui n'apparaît que là où il y a quelque chose à atteindre.
 *
 * L'échelle de note est celle du visiteur — c'est une préférence de lecture, résolue par
 * `formatScore` chez l'appelant, comme sur le profil.
 */
function StatTile({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <>
      <p className="font-semibold text-lg tabular-nums">{value}</p>
      <p className="text-muted-foreground text-xs">{label}</p>
    </>
  );

  const className = "block rounded-lg border bg-card px-4 py-3";

  if (!href) return <div className={className}>{content}</div>;

  return (
    <Link
      className={`${className} transition-colors hover:bg-accent/40 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2`}
      href={href}
    >
      {content}
    </Link>
  );
}

/**
 * Attente des chiffres : quatre tuiles de la hauteur exacte des vraies.
 *
 * `h-[70px]` est la mesure de la tuile réelle (deux lignes de texte plus le rembourrage) et non un
 * arrondi : la bande est juste sous le bandeau, donc tout écart pousse ou tire l'ensemble de la page
 * au moment où elle se remplit.
 */
export function HomeStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[0, 1, 2, 3].map((index) => (
        <Skeleton className="h-[70px] rounded-lg" key={index} />
      ))}
    </div>
  );
}
