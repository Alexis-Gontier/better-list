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
