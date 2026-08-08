import { Skeleton } from "@/components/ui/skeleton";

/** Attente du profil : l'identité, les quatre tuiles de chiffres, quelques lignes de journal. */
export function ProfileSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Skeleton className="size-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => index).map((index) => (
          <Skeleton className="h-[4.5rem]" key={index} />
        ))}
      </div>

      <div className="space-y-2 rounded-lg border bg-card p-4">
        <Skeleton className="h-3 w-20" />
        {Array.from({ length: 5 }, (_, index) => index).map((index) => (
          <Skeleton className="h-4 w-full" key={index} />
        ))}
      </div>
    </div>
  );
}
