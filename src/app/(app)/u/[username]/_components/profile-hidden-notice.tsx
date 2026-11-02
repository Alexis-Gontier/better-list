import { LockIcon } from "lucide-react";

/** L'encart d'un profil caché (D64) : il dit ce qui manque, pour qu'on ne le croie pas vide. */
export function ProfileHiddenNotice({ name }: { name: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-card p-4">
      <LockIcon
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
      />
      <div className="flex flex-col gap-1">
        <p className="font-medium">{name} garde son profil pour lui</p>
        <p className="text-muted-foreground text-sm">
          Son journal, ses statistiques et ses favoris ne sont pas partagés. Ses
          listes, si.
        </p>
      </div>
    </div>
  );
}
