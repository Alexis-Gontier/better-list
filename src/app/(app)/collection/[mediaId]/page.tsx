import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SeriesHeader } from "@/app/(app)/collection/[mediaId]/_components/series-header";
import { VolumeBoard } from "@/app/(app)/collection/[mediaId]/_components/volume-board";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { routes } from "@/config/routes";
import { getSeriesShelf } from "@/features/collection/server/collection.queries";
import { getPreferences } from "@/features/preferences/server/preferences.queries";

export async function generateMetadata({
  params,
}: PageProps<"/collection/[mediaId]">): Promise<Metadata> {
  const series = await getSeriesShelf(Number((await params).mediaId));
  if (!series) return { title: "Série introuvable" };

  /*
    Le titre romaji plutôt que celui du compte : la métadonnée s'adresse à un onglet de navigateur
    et à un aperçu de lien, pas au visiteur — et c'est la seule colonne toujours remplie.
  */
  return {
    title: `${series.media.title.romaji} · ma collection`,
    description:
      "Les tomes que je possède de cette série, et ceux qui manquent.",
  };
}

/**
 * `/collection/[mediaId]` — une série de mon étagère : les tomes que j'ai, ceux qui manquent, et
 * le geste qui les pose.
 *
 * Deux arbitrages ont été rendus le 19 septembre 2026, après avoir vu les candidats à l'écran :
 *
 * - **Le geste de saisie est la grille qu'on peint**, pas une fenêtre « du tome … au tome … ».
 *   Le critère était « un seul clic pour ajouter » : poser le tome qu'on vient d'acheter coûte un
 *   clic ici, contre une fenêtre à ouvrir, remplir et refermer là-bas. La saisie par plage
 *   (conception.md §8 item 9) n'est pas un mode à part, c'est le même geste tenu.
 * - **Prix, date d'acquisition et état sont retirés de l'écran.** Ils ne vivaient que dans la
 *   fenêtre, et elle part avec l'arbitrage. Les colonnes restent au schéma — les retirer coûterait
 *   une migration pour rien —, mais plus rien ne les remplit, et le « budget cumulé » de §8
 *   item 12 tombe avec.
 *
 * La page **n'attend rien elle-même** : elle passe la promesse de `params` à ses enfants.
 */
export default function CollectionSeriesPage({
  params,
}: PageProps<"/collection/[mediaId]">) {
  return (
    <div className="flex flex-col gap-6">
      <Link
        className="inline-flex w-fit items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground"
        href={routes.collection.root}
      >
        <ArrowLeftIcon className="size-4" />
        Ma collection
      </Link>

      <Suspense fallback={<SeriesSkeleton />}>
        <Series params={params} />
      </Suspense>
    </div>
  );
}

async function Series({
  params,
}: {
  params: PageProps<"/collection/[mediaId]">["params"];
}) {
  const { mediaId } = await params;

  /*
    `Number` sur un segment d'URL rend `NaN` pour « abc », que la lecture ne trouvera pas — donc
    une page introuvable. **Une série absente de l'étagère, elle, n'est pas introuvable** :
    `getSeriesShelf` rend une grille vide, parce qu'arriver ici depuis la fiche d'un manga qu'on
    vient d'acheter doit donner de quoi cocher. Seule une œuvre inconnue du miroir, ou qui n'est
    pas un imprimé, rend `null`.
  */
  const series = await getSeriesShelf(Number(mediaId));
  if (!series) notFound();

  // Après le garde : rien ne sert de lire la langue des titres pour une série qu'on ne montre pas.
  const { titleLanguage } = await getPreferences();

  return (
    <>
      <SeriesHeader series={series} titleLanguage={titleLanguage} />

      <Separator />

      <VolumeBoard
        isReleasing={series.isReleasing}
        mediaId={series.media.id}
        owned={series.ownedNumbers}
        total={series.edition.volumesTotal}
      />
    </>
  );
}

/**
 * Le repli de la série — **aux proportions de son en-tête** : la jaquette en 2:3 sur 96 px, le
 * titre en `text-2xl` (donc `h-8`), la phrase des manquants en `text-sm` (`h-5`) et le bouton de
 * la fiche à sa hauteur `sm`.
 *
 * Le tableau des tomes n'est pas annoncé : sa hauteur dépend du `volumesTotal`, que le repli ne
 * connaît pas — treize cases ou cent dix ne font pas la même page. Un rectangle moyen se
 * tromperait dans les deux sens ; l'en-tête, lui, a toujours la même forme.
 */
function SeriesSkeleton() {
  return (
    <div className="flex gap-5">
      <Skeleton className="aspect-2/3 w-24 shrink-0 self-start rounded-md" />
      <div className="flex flex-1 flex-col gap-3">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-5 w-80 max-w-full" />
        <Skeleton className="h-8 w-28" />
      </div>
    </div>
  );
}
