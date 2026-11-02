import { Skeleton } from "@/components/ui/skeleton";
import { routes } from "@/config/routes";
import { ProviderButtons } from "@/features/auth/components/provider-buttons";
import { getLastLoginMethod } from "@/lib/auth/last-login-method";

/**
 * La fin de page, connexion comprise : pas besoin de passer par `/login`. Lit le cookie de dernière
 * méthode, d'où sa `<Suspense>` dans la page.
 */
export async function LandingJoin() {
  const lastUsed = await getLastLoginMethod();

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-6 text-center">
      <h2 className="text-balance font-heading font-semibold text-3xl tracking-tight">
        Votre carnet vous attend
      </h2>
      <p className="text-muted-foreground">
        Une connexion suffit. Un membre valide ensuite votre compte.
      </p>
      <ProviderButtons callbackUrl={routes.home} lastUsed={lastUsed} />
    </div>
  );
}

/** Le squelette de la fin de page : titre `text-3xl` (36 px), deux lignes, trois boutons `lg` (40). */
export function LandingJoinSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-6">
      <Skeleton className="h-9 w-72" />
      <Skeleton className="h-12 w-full" />
      <div className="flex w-full flex-col gap-3.5">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}
