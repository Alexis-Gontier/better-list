import { Skeleton } from "@/components/ui/skeleton";

/**
 * Attente du journal.
 *
 * Volontairement court — trois lignes, pas huit : le composant ne rend **rien** quand l'œuvre n'est
 * pas suivie, et c'est le cas le plus fréquent d'une fiche. Un squelette de la taille du contenu
 * maximal ferait, à chaque visite, réserver puis rendre une place que rien ne vient occuper.
 */
export function EntryTimelineSkeleton() {
  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}
