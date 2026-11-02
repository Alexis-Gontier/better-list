import { LandingBand } from "@/app/(welcome)/welcome/_components/landing-frame";
import { GridBackdrop } from "@/components/shared/grid-backdrop";
import { routes } from "@/config/routes";
import { ProviderButtons } from "@/features/auth/components/provider-buttons";
import { getLastLoginMethod } from "@/lib/auth/last-login-method";

/**
 * L'appel final, connexion comprise : pas besoin de passer par `/login`. Lit le cookie de dernière
 * méthode, d'où sa `<Suspense>` dans la page.
 */
export async function LandingJoin() {
  const lastUsed = await getLastLoginMethod();

  return (
    <LandingBand className="overflow-hidden">
      <GridBackdrop />
      <div className="relative mx-auto flex max-w-sm flex-col items-center gap-6 px-5 py-20 text-center sm:py-28">
        <h2 className="text-balance font-heading font-semibold text-[clamp(30px,4vw,44px)] leading-tight tracking-tight">
          Prêt à <span className="text-primary">entrer</span> ?
        </h2>
        <p className="text-muted-foreground">
          Une connexion suffit. Un membre valide ensuite votre compte.
        </p>
        <ProviderButtons callbackUrl={routes.home} lastUsed={lastUsed} />
      </div>
    </LandingBand>
  );
}
